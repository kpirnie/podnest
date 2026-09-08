// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package backup

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/xml"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"podnest/internal/db"
	"podnest/internal/logger"
)

// s3Config holds the S3 connection settings resolved from global settings
type s3Config struct {
	endpoint  string
	bucket    string
	region    string
	accessKey string
	secretKey string
}

// s3RepoURL builds the restic S3 repository URL for a site
func s3RepoURL(endpoint, bucket, siteName string) string {

	// restic S3 format: s3:https://endpoint/bucket/prefix
	ep := strings.TrimRight(endpoint, "/")
	return fmt.Sprintf("s3:%s/%s/%s", ep, bucket, siteName)
}

// loadS3Config reads S3 settings from the database; returns nil if incomplete
func (m *Manager) loadS3Config() (*s3Config, error) {

	// restic S3 backend requires endpoint and bucket at minimum; access key and secret key can be empty for public buckets
	keys := []string{
		"s3_endpoint", "s3_bucket", "s3_region",
		"s3_access_key", "s3_secret_key",
	}

	// read all S3 settings in one batch
	vals := make(map[string]string, len(keys))
	for _, k := range keys {
		v, err := db.GetSetting(m.db, k)
		if err != nil {
			return nil, err
		}
		vals[k] = v
	}

	// endpoint and bucket are the minimum required fields
	if vals["s3_endpoint"] == "" || vals["s3_bucket"] == "" {
		return nil, nil
	}

	// default to us-east-1 if region is not set
	region := vals["s3_region"]
	if region == "" {
		region = "us-east-1"
	}

	// return the config struct
	return &s3Config{
		endpoint:  vals["s3_endpoint"],
		bucket:    vals["s3_bucket"],
		region:    region,
		accessKey: vals["s3_access_key"],
		secretKey: vals["s3_secret_key"],
	}, nil
}

// S3 upload tuning — parts must be at least 5 MiB and there is a hard 10,000
// part ceiling; a single PUT is rejected outright above 5 GiB
const (
	s3PartSize         = 256 << 20
	s3MultipartMinimum = 512 << 20
	s3ErrorBodyLimit   = 8 << 10
)

// s3Client keeps S3 traffic off the process-wide default transport and bounds
// every phase of the request; the overall deadline stays with the context so a
// slow large upload is not cut off
var s3Client = &http.Client{
	Transport: &http.Transport{
		DialContext: (&net.Dialer{
			Timeout:   10 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		TLSHandshakeTimeout:   10 * time.Second,
		ResponseHeaderTimeout: 60 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
		IdleConnTimeout:       90 * time.Second,
		MaxIdleConns:          4,
	},
}

// s3ObjectURL builds the URL for an object request, with an optional query
func s3ObjectURL(s3 *s3Config, key string, query url.Values) (*url.URL, error) {
	ep := strings.TrimRight(s3.endpoint, "/")
	u, err := url.Parse(fmt.Sprintf("%s/%s/%s", ep, s3.bucket, key))
	if err != nil {
		return nil, err
	}
	if query != nil {
		u.RawQuery = query.Encode()
	}
	return u, nil
}

// s3Sign applies AWS Signature V4 to a request.
// https://docs.aws.amazon.com/general/latest/gr/sigv4-calculate-signature.html
func s3Sign(req *http.Request, s3 *s3Config, bodyHash string) {

	now := time.Now().UTC()
	dateStamp := now.Format("20060102")
	amzDate := now.Format("20060102T150405Z")

	// canonical headers must be sorted; this fixed trio already is
	canonHeaders := "host:" + req.URL.Host + "\n" +
		"x-amz-content-sha256:" + bodyHash + "\n" +
		"x-amz-date:" + amzDate + "\n"
	signedHeaders := "host;x-amz-content-sha256;x-amz-date"

	canonRequest := strings.Join([]string{
		req.Method,
		req.URL.EscapedPath(),
		req.URL.Query().Encode(),
		canonHeaders,
		signedHeaders,
		bodyHash,
	}, "\n")

	credScope := strings.Join([]string{dateStamp, s3.region, "s3", "aws4_request"}, "/")
	strToSign := strings.Join([]string{
		"AWS4-HMAC-SHA256",
		amzDate,
		credScope,
		fmt.Sprintf("%x", sha256.Sum256([]byte(canonRequest))),
	}, "\n")

	// derive the signing key
	sign := func(key, data []byte) []byte {
		h := hmac.New(sha256.New, key)
		h.Write(data)
		return h.Sum(nil)
	}
	signingKey := sign(
		sign(
			sign(
				sign([]byte("AWS4"+s3.secretKey), []byte(dateStamp)),
				[]byte(s3.region),
			),
			[]byte("s3"),
		),
		[]byte("aws4_request"),
	)
	mac := hmac.New(sha256.New, signingKey)
	mac.Write([]byte(strToSign))
	signature := hex.EncodeToString(mac.Sum(nil))

	req.Header.Set("Authorization", fmt.Sprintf(
		"AWS4-HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s",
		s3.accessKey, credScope, signedHeaders, signature,
	))
	req.Header.Set("X-Amz-Date", amzDate)
	req.Header.Set("X-Amz-Content-Sha256", bodyHash)
}

// s3Do signs and performs an S3 request, returning the response on success.
// The caller closes the body; error bodies are read bounded and the response
// is closed before returning.
func s3Do(req *http.Request, s3 *s3Config, bodyHash string) (*http.Response, error) {

	s3Sign(req, s3, bodyHash)

	resp, err := s3Client.Do(req)
	if err != nil {
		return nil, err
	}

	// treat 200 OK, 201 Created, and 204 No Content as success
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, s3ErrorBodyLimit))
		resp.Body.Close()
		return nil, fmt.Errorf("unexpected status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	return resp, nil
}

// s3PutObject uploads an object to an S3-compatible bucket using AWS Signature
// V4. Uses only stdlib — no AWS SDK. Anything at or above s3MultipartMinimum
// goes up as a multipart upload; a single PUT is rejected above 5 GiB. body is
// read off disk, never held in memory.
func s3PutObject(ctx context.Context, s3 *s3Config, key string, body *os.File, size int64) error {

	if size >= s3MultipartMinimum {
		return s3PutObjectMultipart(ctx, s3, key, body, size)
	}

	// hash the payload off disk, then rewind for the request body
	hasher := sha256.New()
	if _, err := io.Copy(hasher, body); err != nil {
		return fmt.Errorf("s3PutObject: hash body: %w", err)
	}
	if _, err := body.Seek(0, io.SeekStart); err != nil {
		return fmt.Errorf("s3PutObject: rewind body: %w", err)
	}
	bodyHash := hex.EncodeToString(hasher.Sum(nil))

	u, err := s3ObjectURL(s3, key, nil)
	if err != nil {
		return fmt.Errorf("s3PutObject: parse url: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPut, u.String(), body)
	if err != nil {
		return fmt.Errorf("s3PutObject: new request: %w", err)
	}
	req.Header.Set("Content-Type", "application/gzip")
	req.ContentLength = size

	resp, err := s3Do(req, s3, bodyHash)
	if err != nil {
		return fmt.Errorf("s3PutObject: %w", err)
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)

	return nil
}

// s3PutObjectMultipart uploads body as a multipart upload, reading one part at
// a time off disk. A failure anywhere aborts the upload so no orphaned parts
// are left accruing storage.
func s3PutObjectMultipart(ctx context.Context, s3 *s3Config, key string, body *os.File, size int64) error {

	uploadID, err := s3CreateMultipartUpload(ctx, s3, key)
	if err != nil {
		return fmt.Errorf("s3PutObjectMultipart: create: %w", err)
	}

	type completedPart struct {
		XMLName    xml.Name `xml:"Part"`
		PartNumber int      `xml:"PartNumber"`
		ETag       string   `xml:"ETag"`
	}
	var parts []completedPart

	partNumber := 1
	for offset := int64(0); offset < size; partNumber++ {
		n := int64(s3PartSize)
		if remaining := size - offset; remaining < n {
			n = remaining
		}

		// hash this part off disk, then hand the same section back as the body
		section := io.NewSectionReader(body, offset, n)
		hasher := sha256.New()
		if _, err := io.Copy(hasher, section); err != nil {
			s3AbortMultipartUpload(ctx, s3, key, uploadID)
			return fmt.Errorf("s3PutObjectMultipart: hash part %d: %w", partNumber, err)
		}
		if _, err := section.Seek(0, io.SeekStart); err != nil {
			s3AbortMultipartUpload(ctx, s3, key, uploadID)
			return fmt.Errorf("s3PutObjectMultipart: rewind part %d: %w", partNumber, err)
		}

		etag, err := s3UploadPart(ctx, s3, key, uploadID, partNumber, section, n, hex.EncodeToString(hasher.Sum(nil)))
		if err != nil {
			s3AbortMultipartUpload(ctx, s3, key, uploadID)
			return fmt.Errorf("s3PutObjectMultipart: part %d: %w", partNumber, err)
		}

		parts = append(parts, completedPart{PartNumber: partNumber, ETag: etag})
		offset += n
	}

	payload := struct {
		XMLName xml.Name `xml:"CompleteMultipartUpload"`
		Parts   []completedPart
	}{Parts: parts}

	doc, err := xml.Marshal(payload)
	if err != nil {
		s3AbortMultipartUpload(ctx, s3, key, uploadID)
		return fmt.Errorf("s3PutObjectMultipart: marshal completion: %w", err)
	}

	if err := s3CompleteMultipartUpload(ctx, s3, key, uploadID, doc); err != nil {
		s3AbortMultipartUpload(ctx, s3, key, uploadID)
		return fmt.Errorf("s3PutObjectMultipart: complete: %w", err)
	}

	logger.Debug("s3PutObjectMultipart: uploaded %s in %d parts", key, len(parts))
	return nil
}

// s3CreateMultipartUpload initiates a multipart upload and returns its upload ID
func s3CreateMultipartUpload(ctx context.Context, s3 *s3Config, key string) (string, error) {

	u, err := s3ObjectURL(s3, key, url.Values{"uploads": {""}})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u.String(), nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/gzip")
	req.ContentLength = 0

	resp, err := s3Do(req, s3, hex.EncodeToString(sha256.New().Sum(nil)))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var out struct {
		UploadID string `xml:"UploadId"`
	}
	if err := xml.NewDecoder(io.LimitReader(resp.Body, s3ErrorBodyLimit)).Decode(&out); err != nil {
		return "", fmt.Errorf("decode initiate response: %w", err)
	}
	if out.UploadID == "" {
		return "", fmt.Errorf("no upload id returned")
	}
	return out.UploadID, nil
}

// s3UploadPart uploads a single part and returns its ETag
func s3UploadPart(ctx context.Context, s3 *s3Config, key, uploadID string, partNumber int, body io.Reader, size int64, bodyHash string) (string, error) {

	u, err := s3ObjectURL(s3, key, url.Values{
		"partNumber": {strconv.Itoa(partNumber)},
		"uploadId":   {uploadID},
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPut, u.String(), body)
	if err != nil {
		return "", err
	}
	req.ContentLength = size

	resp, err := s3Do(req, s3, bodyHash)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)

	etag := resp.Header.Get("ETag")
	if etag == "" {
		return "", fmt.Errorf("no ETag returned")
	}
	return etag, nil
}

// s3CompleteMultipartUpload assembles the uploaded parts into the final object.
// S3 answers 200 with an error document on this call, so the body is checked.
func s3CompleteMultipartUpload(ctx context.Context, s3 *s3Config, key, uploadID string, doc []byte) error {

	u, err := s3ObjectURL(s3, key, url.Values{"uploadId": {uploadID}})
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u.String(), bytes.NewReader(doc))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/xml")
	req.ContentLength = int64(len(doc))

	resp, err := s3Do(req, s3, fmt.Sprintf("%x", sha256.Sum256(doc)))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	out, err := io.ReadAll(io.LimitReader(resp.Body, s3ErrorBodyLimit))
	if err != nil {
		return fmt.Errorf("read completion response: %w", err)
	}
	if bytes.Contains(out, []byte("<Error")) {
		return fmt.Errorf("completion failed: %s", strings.TrimSpace(string(out)))
	}
	return nil
}

// s3AbortMultipartUpload discards a failed multipart upload and its parts
func s3AbortMultipartUpload(ctx context.Context, s3 *s3Config, key, uploadID string) {

	u, err := s3ObjectURL(s3, key, url.Values{"uploadId": {uploadID}})
	if err != nil {
		logger.Warn("s3AbortMultipartUpload: %s: %v", key, err)
		return
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, u.String(), nil)
	if err != nil {
		logger.Warn("s3AbortMultipartUpload: %s: %v", key, err)
		return
	}

	resp, err := s3Do(req, s3, hex.EncodeToString(sha256.New().Sum(nil)))
	if err != nil {
		logger.Warn("s3AbortMultipartUpload: %s: %v", key, err)
		return
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)
}
