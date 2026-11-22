// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package backup

import (
	"bytes"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"podnest/internal/db"

	"golang.org/x/crypto/scrypt"
)

const (
	drKeyVersion     = "PNDR1"
	drKeySaltLen     = 16
	drKeyTextLen     = 64
	drKeyHeaderLen   = len(drKeyVersion) + drKeySaltLen
	drKeyEnvelopeLen = drKeyHeaderLen + 12 + drKeyTextLen + 16
)

var errDRKey = errors.New("cannot unlock recovery key with the supplied recovery passphrase")

func validDRIdentity(id string) bool {
	if len(id) != 32 {
		return false
	}
	raw, err := hex.DecodeString(id)
	return err == nil && hex.EncodeToString(raw) == id
}

func validDRKey(key string) bool {
	if len(key) != drKeyTextLen {
		return false
	}
	_, err := hex.DecodeString(key)
	return err == nil
}

// sealDRKey protects the exact installation key text, including its case.
// The node ID is authenticated to prevent substitution between nodes.
func sealDRKey(id, key, passphrase string) ([]byte, error) {
	if !validDRIdentity(id) || !validDRKey(key) {
		return nil, errors.New("invalid disaster recovery identity or instance key")
	}
	if !validDRPassphrase(passphrase) {
		return nil, errors.New("use a recovery passphrase between 16 and 1024 bytes")
	}
	header := make([]byte, len(drKeyVersion)+drKeySaltLen)
	copy(header, drKeyVersion)
	if _, err := rand.Read(header[len(drKeyVersion):]); err != nil {
		return nil, err
	}
	aead, err := drKeyAEAD(passphrase, header[len(drKeyVersion):])
	if err != nil {
		return nil, err
	}
	return aead.Seal(header, nil, []byte(key), []byte(drKeyVersion+":"+id)), nil
}

func openDRKey(id, passphrase string, sealed []byte) (string, error) {
	if !validDRIdentity(id) || !validDRPassphrase(passphrase) ||
		len(sealed) != drKeyEnvelopeLen || string(sealed[:len(drKeyVersion)]) != drKeyVersion {
		return "", errDRKey
	}
	aead, err := drKeyAEAD(passphrase, sealed[len(drKeyVersion):drKeyHeaderLen])
	if err != nil {
		return "", errDRKey
	}
	plain, err := aead.Open(nil, nil, sealed[drKeyHeaderLen:], []byte(drKeyVersion+":"+id))
	defer clear(plain)
	if err != nil || !validDRKey(string(plain)) {
		return "", errDRKey
	}
	return string(plain), nil
}

func validDRPassphrase(passphrase string) bool {
	return len(passphrase) >= 16 && len(passphrase) <= 1024
}

func drKeyAEAD(passphrase string, salt []byte) (cipher.AEAD, error) {
	key, err := scrypt.Key([]byte(passphrase), salt, 1<<17, 8, 1, 32)
	if err != nil {
		return nil, err
	}
	defer clear(key)
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	return cipher.NewGCMWithRandomNonce(block)
}

// drRepositoryPassword keeps Restic credentials distinct from other uses of the
// installation key. Bind the password to the stable node ID, not its hostname.
func drRepositoryPassword(key, id string) string {
	mac := hmac.New(sha256.New, []byte(key))
	mac.Write([]byte("podnest:disaster-recovery:restic:v1:" + id))
	return hex.EncodeToString(mac.Sum(nil))
}

const drPrefix = "disaster-recovery/"

// EnrollDRKey stores the recovery envelope in the configured bucket. Repeated
// enrollment verifies the existing envelope and never replaces it.
func (m *Manager) EnrollDRKey(ctx context.Context, passphrase string) (string, error) {
	if err := db.ValidateNodeKey(); err != nil {
		return "", err
	}
	if !validDRPassphrase(passphrase) {
		return "", errors.New("use a recovery passphrase between 16 and 1024 bytes")
	}
	s3, err := m.loadS3Config()
	if err != nil {
		return "", err
	}
	if err := validateDRS3(s3); err != nil {
		return "", err
	}

	id, err := m.drIdentity(ctx)
	if err != nil {
		return "", err
	}
	key := strings.TrimSpace(os.Getenv(db.NodeKeyEnv))
	path := drPrefix + id + "/key"
	sealed, err := readDRKey(ctx, s3, path)
	if err != nil {
		return "", err
	}
	if sealed == nil {
		sealed, err = sealDRKey(id, key, passphrase)
		if err != nil {
			return "", err
		}
		// Conditional creation ensures concurrent enrollment cannot replace the
		// only copy recoverable with the first administrator's passphrase.
		resp, err := drS3Request(ctx, s3, http.MethodPut, path, sealed, true)
		if err != nil {
			return "", err
		}
		resp.Body.Close()
		switch resp.StatusCode {
		case http.StatusOK, http.StatusCreated, http.StatusNoContent, http.StatusPreconditionFailed:
		default:
			return "", fmt.Errorf("create recovery envelope: S3 returned HTTP %d", resp.StatusCode)
		}
		sealed, err = readDRKey(ctx, s3, path)
		if err != nil {
			return "", err
		}
	}
	unlocked, err := openDRKey(id, passphrase, sealed)
	if err != nil {
		return "", err
	}
	if !hmac.Equal([]byte(unlocked), []byte(key)) {
		return "", errors.New("recovery envelope belongs to a different instance key")
	}
	digest := sha256.Sum256(sealed)
	if _, err := m.db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS kppn_dr_escrow (
		id INTEGER PRIMARY KEY CHECK (id = 1), digest BLOB NOT NULL
	)`); err != nil {
		return "", err
	}
	if _, err := m.db.ExecContext(ctx, `INSERT INTO kppn_dr_escrow (id, digest) VALUES (1, ?)
		ON CONFLICT (id) DO UPDATE SET digest = excluded.digest`, digest[:]); err != nil {
		return "", err
	}
	return id, nil
}

func (m *Manager) drIdentity(ctx context.Context) (string, error) {
	if _, err := m.db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS kppn_dr_identity (
		id INTEGER PRIMARY KEY CHECK (id = 1), identity TEXT NOT NULL
	)`); err != nil {
		return "", err
	}
	var random [16]byte
	if _, err := rand.Read(random[:]); err != nil {
		return "", err
	}
	if _, err := m.db.ExecContext(ctx, `INSERT INTO kppn_dr_identity (id, identity)
		VALUES (1, ?) ON CONFLICT (id) DO NOTHING`, hex.EncodeToString(random[:])); err != nil {
		return "", err
	}
	var id string
	if err := m.db.QueryRowContext(ctx, `SELECT identity FROM kppn_dr_identity WHERE id = 1`).Scan(&id); err != nil {
		return "", err
	}
	if !validDRIdentity(id) {
		return "", errors.New("invalid stored disaster recovery identity")
	}
	return id, nil
}

func validateDRS3(s3 *s3Config) error {
	if s3 == nil || s3.accessKey == "" || s3.secretKey == "" {
		return errors.New("disaster recovery requires an S3 bucket and access credentials")
	}
	endpoint, err := url.Parse(s3.endpoint)
	if err != nil || endpoint.Scheme != "https" || endpoint.Hostname() == "" ||
		endpoint.User != nil || endpoint.RawQuery != "" || endpoint.ForceQuery ||
		endpoint.Fragment != "" || strings.ContainsAny(s3.bucket, "/?#%\\") ||
		s3.bucket == "." || s3.bucket == ".." {
		return errors.New("disaster recovery requires an HTTPS S3 endpoint and a valid bucket name")
	}
	return nil
}

func readDRKey(ctx context.Context, s3 *s3Config, path string) ([]byte, error) {
	resp, err := drS3Request(ctx, s3, http.MethodGet, path, nil, false)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	switch resp.StatusCode {
	case http.StatusNotFound:
		return nil, nil
	case http.StatusOK:
	default:
		return nil, fmt.Errorf("read recovery envelope: S3 returned HTTP %d", resp.StatusCode)
	}
	const limit = 1024
	sealed, err := io.ReadAll(io.LimitReader(resp.Body, limit+1))
	if err != nil || len(sealed) > limit {
		return nil, errors.New("cannot read recovery envelope")
	}
	return sealed, nil
}

func drS3Request(ctx context.Context, s3 *s3Config, method, path string, data []byte, createOnly bool) (*http.Response, error) {
	u, err := s3ObjectURL(s3, path, nil)
	if err != nil {
		return nil, errors.New("cannot construct disaster recovery S3 request")
	}
	req, err := http.NewRequestWithContext(ctx, method, u.String(), bytes.NewReader(data))
	if err != nil {
		return nil, errors.New("cannot construct disaster recovery S3 request")
	}
	if createOnly {
		req.Header.Set("If-None-Match", "*")
	}
	hash := sha256.Sum256(data)
	s3Sign(req, s3, hex.EncodeToString(hash[:]))

	// Avoid sending a signed request to a destination chosen by a redirect.
	client := *s3Client
	client.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	client.Timeout = 90 * time.Second
	resp, err := client.Do(req)
	if err != nil {
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		return nil, errors.New("disaster recovery S3 request failed")
	}
	return resp, nil
}

// DRReadiness reports whether S3 is configured and key enrollment is recorded.
func (m *Manager) DRReadiness(ctx context.Context) (configured, enrolled bool, err error) {
	s3, err := m.loadS3Config()
	if err != nil {
		return false, false, err
	}
	if validateDRS3(s3) != nil {
		return false, false, nil
	}
	var table int
	if err := m.db.QueryRowContext(ctx, `SELECT count(*) FROM sqlite_schema
		WHERE type = 'table' AND name = 'kppn_dr_escrow'`).Scan(&table); err != nil || table == 0 {
		return true, false, err
	}
	var digest []byte
	err = m.db.QueryRowContext(ctx, `SELECT digest FROM kppn_dr_escrow WHERE id = 1`).Scan(&digest)
	if errors.Is(err, sql.ErrNoRows) {
		return true, false, nil
	}
	return true, len(digest) == sha256.Size, err
}
