// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package backup

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"podnest/internal/config"
	"podnest/internal/db"
	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/podman"
	"podnest/internal/sftp"

	"golang.org/x/sys/unix"
)

// DRControlSocket is the owner-only socket used by the host recovery command.
const DRControlSocket = "control.sock"

// DRRestoreSite records the last restoration result for one site.
type DRRestoreSite struct {
	SiteID int64  `json:"id"`
	Name   string `json:"name"`
	State  string `json:"state"`
	Error  string `json:"error,omitempty"`
}

// DRRestoreStatus is the durable recovery state exposed to admins.
type DRRestoreStatus struct {
	Active bool            `json:"active"`
	Sites  []DRRestoreSite `json:"sites"`
}

// DRRebuildSite provisions a restored site's Podman resources.
type DRRebuildSite func(context.Context, *models.Site) error

func createDRRestoreState(ctx context.Context, database *sql.DB, sites []drSitePoint) error {
	tx, err := database.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS kppn_dr_restore (
		site_id INTEGER PRIMARY KEY, name TEXT NOT NULL, files TEXT NOT NULL, db_snapshot TEXT NOT NULL,
		original_status INTEGER NOT NULL, state TEXT NOT NULL, error TEXT NOT NULL
	);
	DELETE FROM kppn_dr_restore;
	INSERT INTO kppn_settings (key,value,updated) VALUES ('in_recovery','true',CURRENT_TIMESTAMP)
	ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated = excluded.updated;`); err != nil {
		return err
	}
	for _, site := range sites {
		if _, err := tx.ExecContext(ctx, `INSERT INTO kppn_dr_restore
			(site_id,name,files,db_snapshot,original_status,state,error)
			SELECT id,name,?,?,site_status,'pending','' FROM kppn_sites WHERE id=? AND name=?`,
			site.Files, site.DB, site.SiteID, site.Name); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// InDRRecovery reports the persisted lockout flag.
func (m *Manager) InDRRecovery() (bool, error) {
	value, err := db.GetSetting(m.db, "in_recovery")
	return value == "true", err
}

// DRRestoreStatus returns the last site's restoration state.
func (m *Manager) DRRestoreStatus(ctx context.Context) (DRRestoreStatus, error) {
	active, err := m.InDRRecovery()
	status := DRRestoreStatus{Active: active, Sites: []DRRestoreSite{}}
	if err != nil {
		return status, err
	}
	var exists bool
	if err := m.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM sqlite_schema WHERE name='kppn_dr_restore' AND type='table')`).Scan(&exists); err != nil || !exists {
		return status, err
	}
	rows, err := m.db.QueryContext(ctx, `SELECT site_id,name,state,error FROM kppn_dr_restore ORDER BY site_id`)
	if err != nil {
		return status, err
	}
	defer rows.Close()
	for rows.Next() {
		var site DRRestoreSite
		if err := rows.Scan(&site.SiteID, &site.Name, &site.State, &site.Error); err != nil {
			return status, err
		}
		status.Sites = append(status.Sites, site)
	}
	return status, rows.Err()
}

// RunDRRestore resumes the initial recovery or retries failed sites.
func (m *Manager) RunDRRestore(ctx context.Context, retry bool, name string, rebuild DRRebuildSite) error {
	_, lock, err := m.lockDRStorage(unix.LOCK_EX)
	if err != nil {
		return err
	}
	defer lock.Close()
	status, err := m.DRRestoreStatus(ctx)
	if err != nil {
		return err
	}
	if status.Active == retry {
		return errors.New("requested restore operation is unavailable in the current recovery state")
	}
	s3, err := m.loadS3Config()
	if err != nil {
		return err
	}
	if err := validateDRS3(s3); err != nil {
		return err
	}
	id, err := m.drIdentity(ctx)
	if err != nil {
		return err
	}
	password := drRepositoryPassword(strings.TrimSpace(os.Getenv(db.NodeKeyEnv)), id)

	var failures error
	matched := false
	for _, entry := range status.Sites {
		if err := ctx.Err(); err != nil {
			return err
		}
		if entry.State == "restored" || (retry && entry.State != "failed" && entry.State != "running") ||
			(!retry && entry.State == "failed") || (name != "" && entry.Name != name) {
			continue
		}
		matched = true
		claim, err := m.WaitClaim(ctx, entry.SiteID, ClaimDisasterRestore)
		if err != nil {
			return err
		}
		siteErr := m.restoreDRRecord(ctx, s3, id, password, entry, rebuild)
		claim.Release()
		if siteErr != nil {
			failures = errors.Join(failures, fmt.Errorf("%s: %w", entry.Name, siteErr))
		}
	}
	if err := ctx.Err(); err != nil {
		return err
	}
	if retry && name != "" && !matched {
		return errors.New("failed site was not found")
	}
	if !retry {
		var unfinished int
		if err := m.db.QueryRowContext(ctx, `SELECT count(*) FROM kppn_dr_restore WHERE state IN ('pending','running')`).Scan(&unfinished); err != nil {
			return err
		}
		if unfinished != 0 {
			return errors.Join(failures, errors.New("recovery progress could not be persisted"))
		}
		if err := db.SetSetting(m.db, "in_recovery", "false"); err != nil {
			return err
		}
	}
	return failures
}

func (m *Manager) restoreDRRecord(ctx context.Context, s3 *s3Config, id, password string, entry DRRestoreSite, rebuild DRRebuildSite) error {
	if _, err := m.db.ExecContext(ctx, `UPDATE kppn_dr_restore SET state='running',error='' WHERE site_id=?`, entry.SiteID); err != nil {
		return err
	}
	point := drSitePoint{SiteID: entry.SiteID, Name: entry.Name}
	var originalStatus int
	err := m.db.QueryRowContext(ctx, `SELECT files,db_snapshot,original_status FROM kppn_dr_restore WHERE site_id=?`, entry.SiteID).
		Scan(&point.Files, &point.DB, &originalStatus)
	if err != nil {
		return err
	}
	site, err := db.GetSiteByID(m.db, entry.SiteID)
	if err == nil && (site == nil || site.Name != point.Name) {
		err = errors.New("site identity has changed since the recovery point")
	}
	if err == nil {
		err = m.restoreDRSite(ctx, s3, id, password, site, point, originalStatus, rebuild)
	}
	if err != nil && site != nil && site.Name == entry.Name {
		cleanup, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		pod := podman.PodName(site.Name)
		if stopErr := m.podman.StopPod(cleanup, pod); stopErr != nil {
			if exists, inspectErr := m.podman.PodExists(cleanup, pod); inspectErr == nil && exists {
				err = errors.Join(err, m.podman.RemovePod(cleanup, pod))
			}
		}
		cancel()
	}
	if ctx.Err() != nil {
		return ctx.Err()
	}
	state, message := "restored", ""
	if err != nil {
		state, message = "failed", err.Error()
		if site != nil && site.Name == entry.Name {
			if updateErr := db.UpdateSiteStatus(m.db, entry.SiteID, models.StatusError); updateErr != nil {
				return errors.Join(err, updateErr)
			}
		}
	}
	_, saveErr := m.db.ExecContext(ctx, `UPDATE kppn_dr_restore SET state=?,error=? WHERE site_id=?`, state, message, entry.SiteID)
	return errors.Join(err, saveErr)
}

func (m *Manager) restoreDRSite(ctx context.Context, s3 *s3Config, id, password string, site *models.Site, point drSitePoint, originalStatus int, rebuild DRRebuildSite) error {
	siteType := modules.TypeModule(site.SiteType)
	if siteType == nil {
		return errors.New("site type is unavailable")
	}
	if !siteType.HasPod() {
		return nil
	}
	if !validDRSnapshotID(point.Files) || (siteType.HasDatabase() && !validDRSnapshotID(point.DB)) ||
		!filepath.IsLocal(site.Name) || filepath.Base(site.Name) != site.Name || site.Name == "." {
		return errors.New("invalid site recovery point")
	}
	repo, env := drSiteRepo(s3, id, password, site.ID)
	source, err := drSiteSnapshotRoot(ctx, repo, env, point.Files, site.Name, siteType.HasDatabase())
	if err != nil {
		return err
	}
	base := filepath.Join(m.appPath, "sites")
	if err := os.MkdirAll(base, 0755); err != nil {
		return err
	}
	dir, err := os.MkdirTemp(base, ".dr-site-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(dir)
	restore := exec.CommandContext(ctx, resticBin, "-r", repo, "restore", point.Files+":"+source, "--target", dir, "--verify")
	restore.Env = env
	if err := restore.Run(); err != nil {
		return fmt.Errorf("restore site files: %w", err)
	}
	if err := m.prepareDRSiteTree(dir, site, siteType.HasDatabase()); err != nil {
		return err
	}

	// Only remove a previous incomplete attempt after the replacement files
	// are available. A completed site is never selected by the restore loop.
	pod := podman.PodName(site.Name)
	exists, err := m.podman.PodExists(ctx, pod)
	if err != nil {
		return err
	}
	if exists {
		if err := m.podman.RemovePod(ctx, pod); err != nil {
			return err
		}
	}
	root, err := os.OpenRoot(base)
	if err != nil {
		return err
	}
	defer root.Close()
	if err := root.RemoveAll(site.Name); err != nil {
		return err
	}
	if err := root.Rename(filepath.Base(dir), site.Name); err != nil {
		return err
	}
	siteDir := filepath.Join(base, site.Name)
	m.fixPostRestorePerms(siteDir, site.ID)
	if err := os.Chmod(siteDir, 0700); err != nil {
		return err
	}
	site.SiteStatus = models.StatusRunning
	if err := rebuild(ctx, site); err != nil {
		return err
	}
	if siteType.HasDatabase() {
		if err := m.restoreDBSnapshot(ctx, site, repo, env, point.DB, siteDir); err != nil {
			return err
		}
	}
	finalStatus := models.StatusRunning
	if originalStatus != models.StatusRunning {
		if err := m.podman.StopPod(ctx, pod); err != nil {
			return err
		}
		finalStatus = models.StatusStopped
	}
	if err := db.UpdateSiteStatus(m.db, site.ID, finalStatus); err != nil {
		return err
	}
	return os.Chmod(siteDir, 0755)
}

func drSiteSnapshotRoot(ctx context.Context, repo string, env []string, snapshotID, name string, database bool) (string, error) {
	cmd := exec.CommandContext(ctx, resticBin, "-r", repo, "cat", "snapshot", snapshotID)
	cmd.Env = env
	raw, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("read site snapshot metadata: %w", err)
	}
	var snapshot struct {
		Paths []string `json:"paths"`
	}
	if err := json.Unmarshal(raw, &snapshot); err != nil || len(snapshot.Paths) == 0 {
		return "", errors.New("invalid site snapshot metadata")
	}
	root := filepath.Dir(snapshot.Paths[0])
	if !filepath.IsAbs(root) || filepath.Base(root) != name || filepath.Base(filepath.Dir(root)) != "sites" {
		return "", errors.New("invalid source site directory")
	}
	hasHTML, hasEnv := false, false
	for _, p := range snapshot.Paths {
		if filepath.Clean(p) != p || filepath.Dir(p) != root {
			return "", errors.New("inconsistent source site paths")
		}
		switch filepath.Base(p) {
		case "html":
			hasHTML = true
		case ".env":
			hasEnv = true
		}
	}
	if !hasHTML || (database && !hasEnv) {
		return "", errors.New("snapshot is missing required site files")
	}
	return root, nil
}

func (m *Manager) prepareDRSiteTree(dir string, site *models.Site, database bool) error {
	root, err := os.OpenRoot(dir)
	if err != nil {
		return err
	}
	defer root.Close()
	for _, name := range []string{"html", "nginx", "nginx/conf.d", "nginx/logs", "varnish", "backups", "backups/import"} {
		if err := ensureDRSiteDirectory(root, name); err != nil {
			return err
		}
	}
	for _, file := range []string{".env", "nginx/nginx.conf", "nginx/conf.d/site.conf", "varnish/default.vcl"} {
		info, err := root.Lstat(file)
		if os.IsNotExist(err) {
			continue
		}
		if err != nil || !info.Mode().IsRegular() {
			return fmt.Errorf("invalid managed site file %s", file)
		}
	}
	if err := os.Chmod(dir, 0700); err != nil {
		return err
	}
	uid := sftp.UIDForSite(site.ID)
	if err := os.Chown(filepath.Join(dir, "backups/import"), uid, uid); err != nil {
		return err
	}
	if err := os.Chmod(filepath.Join(dir, "backups/import"), os.ModeSetgid|0775); err != nil {
		return err
	}
	if !database {
		return nil
	}
	for _, name := range []string{"DB_NAME", "DB_USER", "DB_PASS", "DB_ROOT_PASS"} {
		value, err := readEnvValue(filepath.Join(dir, ".env"), name)
		if err != nil || value == "" {
			return fmt.Errorf("site database settings are missing %s", name)
		}
	}
	if err := ensureDRSiteDirectory(root, "db"); err != nil {
		return err
	}
	configured, err := db.GetConfigsBySiteAndType(m.db, site.ID, models.ConfigMariaDB)
	if err != nil {
		return err
	}
	raw, err := json.Marshal(configured)
	if err != nil {
		return err
	}
	rendered, err := config.RenderMariaDB(string(raw))
	if err != nil {
		return err
	}
	file, err := root.OpenFile("db/my.cnf", os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0640)
	if err != nil {
		return err
	}
	_, writeErr := file.WriteString(rendered)
	return errors.Join(writeErr, file.Close())
}

func ensureDRSiteDirectory(root *os.Root, name string) error {
	info, err := root.Lstat(name)
	if os.IsNotExist(err) {
		return root.Mkdir(name, 0755)
	}
	if err != nil {
		return err
	}
	if !info.IsDir() {
		return fmt.Errorf("invalid managed site directory %s", name)
	}
	return nil
}
