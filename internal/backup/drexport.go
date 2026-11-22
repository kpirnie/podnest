// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package backup

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"podnest/internal/db"
	"podnest/internal/models"

	"golang.org/x/sys/unix"
)

const drManifestLimit = 16 << 20

var errDRPointMissing = errors.New("no published recovery point found")

func readDRLatest(ctx context.Context, s3 *s3Config, id string) (drApplicationPoint, error) {
	var point drApplicationPoint
	resp, err := drS3Request(ctx, s3, http.MethodGet, drPrefix+id+"/latest.json", nil, false)
	if err != nil {
		return point, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return point, errDRPointMissing
	}
	if resp.StatusCode != http.StatusOK {
		return point, fmt.Errorf("read latest recovery point: S3 returned HTTP %d", resp.StatusCode)
	}
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 4097))
	if err != nil || len(raw) > 4096 || json.Unmarshal(raw, &point) != nil ||
		point.Version != 1 || point.Node != id || !validDRSnapshotID(point.Snapshot) || point.Verified.IsZero() {
		return drApplicationPoint{}, errors.New("invalid recovery point")
	}
	return point, nil
}

func (m *Manager) drExportSource(ctx context.Context) (*s3Config, drApplicationPoint, string, error) {
	if err := db.ValidateNodeKey(); err != nil {
		return nil, drApplicationPoint{}, "", err
	}
	s3, err := m.loadS3Config()
	if err != nil {
		return nil, drApplicationPoint{}, "", err
	}
	if err := validateDRS3(s3); err != nil {
		return nil, drApplicationPoint{}, "", err
	}
	id, err := m.drIdentity(ctx)
	if err != nil {
		return nil, drApplicationPoint{}, "", err
	}
	point, err := readDRLatest(ctx, s3, id)
	return s3, point, drRepositoryPassword(strings.TrimSpace(os.Getenv(db.NodeKeyEnv)), id), err
}

// ExportDRApplication streams the portable application archive. The archive
// omits instance keys and repository access credentials.
func (m *Manager) ExportDRApplication(ctx context.Context, w io.Writer) error {
	work, lock, err := m.lockDRStorage(unix.LOCK_SH)
	if err != nil {
		return err
	}
	defer lock.Close()
	s3, point, password, err := m.drExportSource(ctx)
	if err != nil {
		return err
	}
	dir, err := os.MkdirTemp(work, "export-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(dir)
	repo := s3RepoURL(s3.endpoint, s3.bucket, drPrefix+point.Node+"/server")
	cmd := exec.CommandContext(ctx, resticBin, "-r", repo, "restore", point.Snapshot, "--target", dir, "--verify")
	cmd.Env = resticEnv(password, s3)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("restore application checkpoint for export: %w", err)
	}

	// Rebuild the database after deletion so old values cannot be retrieved
	// from free SQLite pages, journal files or a write-ahead log.
	rawDB := filepath.Join(dir, "podnest.db")
	info, err := os.Lstat(rawDB)
	if err != nil || !info.Mode().IsRegular() {
		return errors.New("application checkpoint database is missing")
	}
	clean := filepath.Join(dir, "portable.db")
	if err := sanitizeDRDatabase(ctx, rawDB, clean); err != nil {
		return err
	}
	if err := os.Rename(clean, rawDB); err != nil {
		return err
	}
	if err := lock.Close(); err != nil {
		return err
	}

	if writer, ok := w.(interface{ ExportReady() }); ok {
		writer.ExportReady()
	}
	gz := gzip.NewWriter(w)
	tw := tar.NewWriter(gz)
	err = filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(dir, path)
		if err != nil {
			return err
		}
		if rel == "." {
			return nil
		}
		if !portableDRPath(rel) {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if !info.IsDir() && !info.Mode().IsRegular() {
			return errors.New("unexpected file type in application checkpoint")
		}
		header, err := tar.FileInfoHeader(info, "")
		if err != nil {
			return err
		}
		header.Name = filepath.ToSlash(rel)
		if err := tw.WriteHeader(header); err != nil || info.IsDir() {
			return err
		}
		f, err := os.Open(path)
		if err != nil {
			return err
		}
		defer f.Close()
		_, err = io.Copy(tw, f)
		return err
	})
	return errors.Join(err, tw.Close(), gz.Close())
}

func sanitizeDRDatabase(ctx context.Context, source, target string) error {
	database, err := sql.Open("sqlite3", source+"?mode=rw&_secure_delete=on&_journal_mode=delete")
	if err != nil {
		return err
	}
	defer database.Close()
	tx, err := database.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for _, statement := range []string{
		"DELETE FROM kppn_backup_repos",
		"DELETE FROM kppn_backups",
		"DELETE FROM kppn_settings WHERE key IN ('s3_access_key','s3_secret_key','dr_status')",
	} {
		if _, err := tx.ExecContext(ctx, statement); err != nil {
			return fmt.Errorf("remove storage credentials from portable database: %w", err)
		}
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	if _, err := database.ExecContext(ctx, "VACUUM INTO ?", target); err != nil {
		return fmt.Errorf("rebuild portable database: %w", err)
	}
	return os.Chmod(target, 0600)
}

// ExportDRSite streams a site's latest DR files and SQL in the standard
// portable export format, without its managed environment file.
func (m *Manager) ExportDRSite(ctx context.Context, siteID int64, w io.Writer) error {
	_, lock, err := m.lockDRStorage(unix.LOCK_SH)
	if err != nil {
		return err
	}
	defer lock.Close()
	s3, point, password, err := m.drExportSource(ctx)
	if err != nil {
		return err
	}
	sites, err := readDRManifest(ctx, s3, point, password)
	if err != nil {
		return err
	}
	for _, site := range sites {
		if site.SiteID != siteID || site.Files == "" {
			continue
		}
		repo, env := drSiteRepo(s3, point.Node, password, siteID)
		archiveRoot, err := drSiteSnapshotRoot(ctx, repo, env, site.Files, site.Name, site.DB != "")
		if err != nil {
			return err
		}
		return m.exportSiteSnapshots(ctx, &models.Site{ID: siteID, Name: site.Name}, &models.Backup{Created: point.Verified, Domains: site.Domains},
			repo, env, site.Files, site.DB, archiveRoot, w)
	}
	return errors.New("site is absent from the latest disaster recovery point")
}

func readDRManifest(ctx context.Context, s3 *s3Config, point drApplicationPoint, password string) ([]drSitePoint, error) {
	repo := s3RepoURL(s3.endpoint, s3.bucket, drPrefix+point.Node+"/server")
	cmd := exec.CommandContext(ctx, resticBin, "-r", repo, "dump", point.Snapshot, "/recovery-sites.json")
	cmd.Env = resticEnv(password, s3)
	output, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	if err := cmd.Start(); err != nil {
		return nil, err
	}
	raw, readErr := io.ReadAll(io.LimitReader(output, drManifestLimit+1))
	if len(raw) > drManifestLimit || readErr != nil {
		_ = cmd.Process.Kill()
	}
	if err := errors.Join(readErr, cmd.Wait()); err != nil {
		return nil, fmt.Errorf("read recovery manifest: %w", err)
	}
	var sites []drSitePoint
	if len(raw) > drManifestLimit || json.Unmarshal(raw, &sites) != nil {
		return nil, errors.New("invalid recovery manifest")
	}
	for _, site := range sites {
		if site.SiteID <= 0 || !filepath.IsLocal(site.Name) || filepath.Base(site.Name) != site.Name ||
			site.Name == "." || (site.Files != "" && !validDRSnapshotID(site.Files)) ||
			(site.DB != "" && (site.Files == "" || !validDRSnapshotID(site.DB))) {
			return nil, errors.New("invalid site recovery metadata")
		}
	}
	return sites, nil
}

func portableDRPath(path string) bool {
	for _, allowed := range []string{"podnest.db", "custom.css", "certs", "sftp/keys", "sftp/etc-ssh/sshd_config.d", "malscan/quarantine"} {
		if path == allowed || strings.HasPrefix(path, allowed+string(filepath.Separator)) ||
			strings.HasPrefix(allowed, path+string(filepath.Separator)) {
			return true
		}
	}
	return false
}

// DRSiteArchive identifies an export available from the latest recovery point.
type DRSiteArchive struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

// ListDRSiteArchives lists portable site archives in the latest recovery point.
func (m *Manager) ListDRSiteArchives(ctx context.Context) ([]DRSiteArchive, error) {
	_, lock, err := m.lockDRStorage(unix.LOCK_SH)
	if err != nil {
		return nil, err
	}
	defer lock.Close()
	s3, point, password, err := m.drExportSource(ctx)
	if err != nil {
		return nil, err
	}
	sites, err := readDRManifest(ctx, s3, point, password)
	if err != nil {
		return nil, err
	}
	archives := make([]DRSiteArchive, 0, len(sites))
	for _, site := range sites {
		if site.Files != "" {
			archives = append(archives, DRSiteArchive{ID: site.SiteID, Name: site.Name})
		}
	}
	return archives, nil
}
