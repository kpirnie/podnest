// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package backup

import (
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"podnest/internal/db"

	"golang.org/x/sys/unix"
)

// SnapshotDisasterRecovery captures an application checkpoint and verified
// snapshots for every hosted site as one recovery point.
func (m *Manager) SnapshotDisasterRecovery(ctx context.Context) (string, error) {
	if err := db.ValidateNodeKey(); err != nil {
		return "", err
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
	key, err := readDRKey(ctx, s3, drPrefix+id+"/key")
	if err != nil {
		return "", err
	}
	digest := sha256.Sum256(key)
	var enrolled []byte
	err = m.db.QueryRowContext(ctx, `SELECT digest FROM kppn_dr_escrow WHERE id = 1`).Scan(&enrolled)
	if err != nil || len(key) != drKeyEnvelopeLen || !bytes.Equal(digest[:], enrolled) {
		return "", errors.New("verify disaster recovery key enrollment in the configured bucket before taking a snapshot")
	}

	// Hold an advisory lock across staging, verification and retention. The
	// kernel releases it if the process is killed.
	work := filepath.Join(m.appPath, ".disaster-recovery")
	if err := os.MkdirAll(work, 0700); err != nil {
		return "", err
	}
	lock, err := os.OpenFile(filepath.Join(work, "lock"), os.O_CREATE|os.O_RDWR, 0600)
	if err != nil {
		return "", err
	}
	defer lock.Close()
	if err := unix.Flock(int(lock.Fd()), unix.LOCK_EX|unix.LOCK_NB); err != nil {
		return "", fmt.Errorf("acquire disaster recovery lock: %w", err)
	}

	dir, err := os.MkdirTemp(work, "stage-")
	if err != nil {
		return "", err
	}
	defer os.RemoveAll(dir)
	payload := filepath.Join(dir, "application")
	if err := os.Mkdir(payload, 0700); err != nil {
		return "", err
	}
	password := drRepositoryPassword(strings.TrimSpace(os.Getenv(db.NodeKeyEnv)), id)
	sites, err := m.captureDRSites(ctx, s3, id, password)
	if err != nil {
		return "", err
	}
	if err := m.stageDRApplication(ctx, payload); err != nil {
		return "", err
	}
	if err := writeDRManifest(ctx, payload, sites); err != nil {
		return "", err
	}
	repo := s3RepoURL(s3.endpoint, s3.bucket, drPrefix+id+"/server")
	env := stripDRInstanceKey(resticEnv(password, s3))
	if err := initRepo(ctx, repo, env); err != nil {
		return "", err
	}
	cmd := exec.CommandContext(ctx, resticBin, "-r", repo, "backup", "--json", "--host", id, "--tag", "podnest-dr-application", ".")
	cmd.Dir, cmd.Env = payload, env
	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("create application disaster recovery snapshot: %w", err)
	}
	var summary struct {
		ID string `json:"snapshot_id"`
	}
	lines := bytes.Split(bytes.TrimSpace(output), []byte("\n"))
	if err := json.Unmarshal(lines[len(lines)-1], &summary); err != nil || !validDRSnapshotID(summary.ID) {
		return "", errors.New("Restic returned no application disaster recovery snapshot")
	}

	// Restore only the candidate snapshot and verify its contents before any
	// previously verified snapshots can be retired.
	verify := exec.CommandContext(ctx, resticBin, "-r", repo, "restore", summary.ID, "--target", filepath.Join(dir, "verify"), "--verify")
	verify.Env = env
	if err := verify.Run(); err != nil {
		// A candidate backup is not a recovery point until verification succeeds.
		if ctx.Err() == nil {
			remove := exec.CommandContext(ctx, resticBin, "-r", repo, "forget", summary.ID)
			remove.Env = env
			_ = remove.Run()
		}
		return "", fmt.Errorf("verify application disaster recovery snapshot: %w", err)
	}
	hostname, err := os.Hostname()
	if err != nil {
		return "", fmt.Errorf("read source server hostname: %w", err)
	}
	point := drApplicationPoint{Version: 1, Node: id, Hostname: hostname, Snapshot: summary.ID, Verified: time.Now().UTC()}
	if err := publishDRApplication(ctx, s3, point); err != nil {
		return "", err
	}
	retentionErr := errors.Join(pruneDRApplication(ctx, repo, env, summary.ID), pruneDRSites(ctx, s3, id, password, sites))
	if retentionErr != nil {
		return summary.ID, fmt.Errorf("verified snapshot %s published; disaster recovery retention failed: %w", summary.ID, retentionErr)
	}
	return summary.ID, nil
}

type drApplicationPoint struct {
	Version  int       `json:"version"`
	Node     string    `json:"node"`
	Hostname string    `json:"hostname"`
	Snapshot string    `json:"snapshot"`
	Verified time.Time `json:"verified"`
}

func validDRSnapshotID(id string) bool {
	if len(id) != 64 {
		return false
	}
	raw, err := hex.DecodeString(id)
	return err == nil && hex.EncodeToString(raw) == id
}

func publishDRApplication(ctx context.Context, s3 *s3Config, point drApplicationPoint) error {
	raw, err := json.Marshal(point)
	if err != nil {
		return err
	}
	resp, err := drS3Request(ctx, s3, http.MethodPut, drPrefix+point.Node+"/latest.json", raw, false)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	switch resp.StatusCode {
	case http.StatusOK, http.StatusCreated, http.StatusNoContent:
		return nil
	default:
		return fmt.Errorf("publish verified application snapshot: S3 returned HTTP %d", resp.StatusCode)
	}
}

func pruneDRApplication(ctx context.Context, repo string, env []string, keep string) error {
	list := exec.CommandContext(ctx, resticBin, "-r", repo, "snapshots", "--json", "--tag", "podnest-dr-application")
	list.Env = env
	raw, err := list.Output()
	if err != nil {
		return fmt.Errorf("list application snapshots: %w", err)
	}
	var snapshots []struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(raw, &snapshots); err != nil {
		return fmt.Errorf("decode application snapshots: %w", err)
	}
	var obsolete []string
	verifiedListed := false
	for _, snapshot := range snapshots {
		if !validDRSnapshotID(snapshot.ID) {
			return errors.New("Restic returned an invalid application snapshot ID")
		}
		if snapshot.ID == keep {
			verifiedListed = true
		} else {
			obsolete = append(obsolete, snapshot.ID)
		}
	}
	if !verifiedListed {
		return errors.New("the latest verified application snapshot is missing")
	}
	if len(obsolete) == 0 {
		return nil
	}
	forget := exec.CommandContext(ctx, resticBin, append([]string{"-r", repo, "forget", "--prune"}, obsolete...)...)
	forget.Env = env
	return forget.Run()
}

func stripDRInstanceKey(env []string) []string {
	var clean []string
	for _, item := range env {
		if !strings.HasPrefix(item, db.NodeKeyEnv+"=") {
			clean = append(clean, item)
		}
	}
	return clean
}

func (m *Manager) stageDRApplication(ctx context.Context, payload string) error {
	destination := filepath.Join(payload, "podnest.db")
	// VACUUM INTO obtains a consistent snapshot through SQLite, including
	// committed WAL transactions, while the server remains online.
	if _, err := m.db.ExecContext(ctx, "VACUUM INTO ?", destination); err != nil {
		return fmt.Errorf("snapshot PodNest database: %w", err)
	}
	if err := os.Chmod(destination, 0600); err != nil {
		return err
	}
	snapshot, err := sql.Open("sqlite3", destination+"?mode=ro")
	if err != nil {
		return err
	}
	defer snapshot.Close()
	var result string
	if err := snapshot.QueryRowContext(ctx, "PRAGMA quick_check").Scan(&result); err != nil {
		return fmt.Errorf("verify PodNest database snapshot: %w", err)
	}
	if result != "ok" {
		return errors.New("PodNest database snapshot failed SQLite integrity check")
	}

	// SFTP user configuration is rebuilt from SQLite and CA/WAF feeds are
	// downloaded again. Include the persistent keys and custom directives.
	root, err := os.OpenRoot(m.appPath)
	if err != nil {
		return err
	}
	defer root.Close()
	for _, name := range []string{"custom.css", "certs", "sftp/keys", "sftp/etc-ssh/sshd_config.d", "malscan/quarantine"} {
		if _, err := root.Lstat(name); os.IsNotExist(err) {
			continue
		} else if err != nil {
			return err
		}
		if err := os.MkdirAll(filepath.Join(payload, filepath.Dir(name)), 0700); err != nil {
			return err
		}
		if err := copyDRState(ctx, root, payload, name); err != nil {
			return fmt.Errorf("stage disaster recovery state %s: %w", name, err)
		}
	}
	return nil
}

func copyDRState(ctx context.Context, root *os.Root, destination, name string) error {
	return fs.WalkDir(root.FS(), name, func(path string, entry os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if err := ctx.Err(); err != nil {
			return err
		}
		target := filepath.Join(destination, path)
		if entry.IsDir() {
			return os.MkdirAll(target, 0700)
		}
		if !entry.Type().IsRegular() {
			return errors.New("unsupported file type in persistent application state")
		}
		// Reject symlinks even if the source is concurrently replaced.
		src, err := root.OpenFile(path, os.O_RDONLY|unix.O_NOFOLLOW|unix.O_NONBLOCK, 0)
		if err != nil {
			return err
		}
		defer src.Close()
		info, err := src.Stat()
		if err != nil {
			return err
		}
		if !info.Mode().IsRegular() {
			return errors.New("unsupported file type in persistent application state")
		}
		dst, err := os.OpenFile(target, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
		if err != nil {
			return err
		}
		_, copyErr := io.Copy(dst, src)
		return errors.Join(copyErr, dst.Close())
	})
}

func writeDRManifest(ctx context.Context, payload string, sites []drSitePoint) error {
	// Compare against the staged database, not a second live read. Concurrent
	// creation, deletion or rename must not publish an incompatible manifest.
	snapshot, err := sql.Open("sqlite3", filepath.Join(payload, "podnest.db")+"?mode=ro")
	if err != nil {
		return err
	}
	defer snapshot.Close()
	rows, err := snapshot.QueryContext(ctx, "SELECT id, name FROM kppn_sites")
	if err != nil {
		return err
	}
	defer rows.Close()
	index := make(map[int64]string, len(sites))
	for _, site := range sites {
		index[site.SiteID] = site.Name
	}
	for rows.Next() {
		var id int64
		var name string
		if err := rows.Scan(&id, &name); err != nil {
			return err
		}
		if index[id] != name {
			return errors.New("site inventory changed during disaster recovery capture")
		}
		delete(index, id)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if len(index) > 0 {
		return errors.New("site inventory changed during disaster recovery capture")
	}
	manifest, err := json.Marshal(sites)
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(payload, "recovery-sites.json"), manifest, 0600)
}
