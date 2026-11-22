// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package backup

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"

	"podnest/internal/db"
)

// DRStorage describes the S3 connection supplied independently of the lost host.
type DRStorage struct {
	Endpoint  string `json:"endpoint"`
	Bucket    string `json:"bucket"`
	Region    string `json:"region"`
	AccessKey string `json:"access_key"`
	SecretKey string `json:"secret_key"`
}

func (storage DRStorage) config() (*s3Config, error) {
	region := storage.Region
	if region == "" {
		region = "us-east-1"
	}
	s3 := &s3Config{
		endpoint: storage.Endpoint, bucket: storage.Bucket, region: region,
		accessKey: storage.AccessKey, secretKey: storage.SecretKey,
	}
	return s3, validateDRS3(s3)
}

// DRSource identifies an original server and its most recent recovery point.
type DRSource struct {
	ID       string `json:"id"`
	Hostname string `json:"hostname"`
	Verified string `json:"verified"`
}

// DiscoverDRSources discovers nodes with published recovery points without
// requiring the original PodNest database or host.
func DiscoverDRSources(ctx context.Context, storage DRStorage) ([]DRSource, error) {
	s3, err := storage.config()
	if err != nil {
		return nil, err
	}
	query := url.Values{"list-type": {"2"}, "prefix": {drPrefix}, "delimiter": {"/"}}
	sources := make([]DRSource, 0)
	for {
		resp, err := drS3RequestQuery(ctx, s3, http.MethodGet, "", nil, false, query)
		if err != nil {
			return nil, err
		}
		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			return nil, fmt.Errorf("list recovery sources: S3 returned HTTP %d", resp.StatusCode)
		}
		var page struct {
			Prefixes []string `xml:"CommonPrefixes>Prefix"`
			More     bool     `xml:"IsTruncated"`
			Token    string   `xml:"NextContinuationToken"`
		}
		decodeErr := xml.NewDecoder(io.LimitReader(resp.Body, 4<<20)).Decode(&page)
		resp.Body.Close()
		if decodeErr != nil {
			return nil, errors.New("could not decode S3 recovery source listing")
		}
		for _, prefix := range page.Prefixes {
			id := strings.TrimSuffix(strings.TrimPrefix(prefix, drPrefix), "/")
			if !validDRIdentity(id) {
				continue
			}
			point, err := readDRLatest(ctx, s3, id)
			if errors.Is(err, errDRPointMissing) {
				continue
			}
			if err != nil {
				return nil, fmt.Errorf("read recovery source %s: %w", id, err)
			}
			sources = append(sources, DRSource{
				ID: id, Hostname: point.Hostname,
				Verified: point.Verified.Format("2006-01-02T15:04:05Z07:00"),
			})
		}
		if !page.More {
			break
		}
		if page.Token == "" || page.Token == query.Get("continuation-token") {
			return nil, errors.New("invalid S3 recovery source continuation token")
		}
		query.Set("continuation-token", page.Token)
	}
	sort.Slice(sources, func(i, j int) bool {
		if sources[i].Hostname == sources[j].Hostname {
			return sources[i].ID < sources[j].ID
		}
		return sources[i].Hostname < sources[j].Hostname
	})
	return sources, nil
}

// StageDRBootstrap verifies a published application snapshot and stages it in
// a new private directory. It does not install or start services.
func StageDRBootstrap(ctx context.Context, storage DRStorage, id, passphrase, destination string) error {
	if !validDRIdentity(id) {
		return errors.New("invalid recovery source ID")
	}
	s3, err := storage.config()
	if err != nil {
		return err
	}
	point, err := readDRLatest(ctx, s3, id)
	if err != nil {
		return err
	}
	envelope, err := readDRKey(ctx, s3, drPrefix+id+"/key")
	if err != nil {
		return err
	}
	key, err := openDRKey(id, passphrase, envelope)
	if err != nil {
		return err
	}
	pw := drRepositoryPassword(key, id)
	sites, err := readDRManifest(ctx, s3, point, pw)
	if err != nil {
		return err
	}
	if err := os.Mkdir(destination, 0700); err != nil {
		return fmt.Errorf("create a new recovery staging directory: %w", err)
	}
	var ready bool
	defer func() {
		if !ready {
			_ = os.RemoveAll(destination)
		}
	}()
	app := filepath.Join(destination, "application")
	if err := os.Mkdir(app, 0700); err != nil {
		return err
	}
	repo := s3RepoURL(s3.endpoint, s3.bucket, drPrefix+id+"/server")
	cmd := exec.CommandContext(ctx, resticBin, "-r", repo, "restore", point.Snapshot, "--target", app, "--verify")
	cmd.Env = stripDRInstanceKey(resticEnv(pw, s3))
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("restore verified application snapshot: %w", err)
	}
	if err := fs.WalkDir(os.DirFS(app), ".", func(path string, entry fs.DirEntry, err error) error {
		if err != nil || path == "." {
			return err
		}
		if !portableDRPath(path) && path != "recovery-sites.json" {
			return errors.New("unexpected application path in recovery snapshot")
		}
		if !entry.IsDir() && !entry.Type().IsRegular() {
			return errors.New("unexpected application file type in recovery snapshot")
		}
		if entry.IsDir() {
			return os.Chmod(filepath.Join(app, path), 0700)
		}
		return os.Chmod(filepath.Join(app, path), 0600)
	}); err != nil {
		return err
	}
	if err := prepareDRDatabase(ctx, filepath.Join(app, "podnest.db"), s3, id, key, envelope, sites); err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(destination, ".pn.env"), []byte(db.NodeKeyEnv+"="+key+"\n"), 0600); err != nil {
		return err
	}
	ready = true
	return nil
}

func prepareDRDatabase(ctx context.Context, path string, s3 *s3Config, id, key string, envelope []byte, sites []drSitePoint) error {
	database, err := sql.Open("sqlite3", path+"?mode=rw&_journal_mode=delete")
	if err != nil {
		return err
	}
	defer database.Close()
	if err := db.VerifyRecoveredNodeKey(database, key); err != nil {
		return err
	}
	if err := validateDRSiteInventory(ctx, database, sites); err != nil {
		return err
	}
	var currentID string
	if err := database.QueryRowContext(ctx, "SELECT identity FROM kppn_dr_identity WHERE id = 1").Scan(&currentID); err != nil || currentID != id {
		return errors.New("restored database belongs to another recovery source")
	}
	digest := sha256.Sum256(envelope)
	if _, err := database.ExecContext(ctx, "UPDATE kppn_dr_escrow SET digest = ? WHERE id = 1", digest[:]); err != nil {
		return err
	}
	for name, value := range map[string]string{
		"s3_endpoint": s3.endpoint, "s3_bucket": s3.bucket, "s3_region": s3.region,
		"s3_access_key": s3.accessKey, "s3_secret_key": s3.secretKey,
	} {
		if err := db.SetSetting(database, name, value); err != nil {
			return err
		}
	}
	return nil
}
