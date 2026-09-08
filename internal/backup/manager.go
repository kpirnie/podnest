// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package backup

import (
	"context"
	"database/sql"
	_ "embed"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"podnest/internal/db"
	"podnest/internal/fileutil"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/podman"
)

//go:embed maintenance.html
var maintenanceHTML []byte

// constants for restic binary path and maintenance mode file names
const (
	resticBin     = "/usr/bin/restic"
	resticTmpDir  = "/var/tmp"
	maintConfName = "000-maint.conf"
	maintHTMLName = "maintenance.html"
)

// Manager orchestrates restic backup and restore operations for all sites
type Manager struct {
	db          *sql.DB
	podman      *podman.Client
	podmanSock  string // socket path for podman CLI exec piping
	appPath     string
	schedulerCh chan string // send cron expression to reschedule; "" disables
	restoring   sync.Map    // map[int64]bool
	jobs        sync.WaitGroup
	jobCtx      context.Context
	jobCancel   context.CancelFunc
}

// New returns a backup Manager
func New(database *sql.DB, pc *podman.Client, podmanSock, appPath string) *Manager {

	// jobs outlive the request that started them and are only cancelled once
	// the shutdown drain expires
	jobCtx, jobCancel := context.WithCancel(context.Background())

	// return the backup manager
	return &Manager{
		db:          database,
		podman:      pc,
		podmanSock:  podmanSock,
		appPath:     appPath,
		schedulerCh: make(chan string, 1),
		jobCtx:      jobCtx,
		jobCancel:   jobCancel,
	}
}

// Go runs fn as a tracked long-running job on a context that survives the
// request that started it.
func (m *Manager) Go(fn func(ctx context.Context)) {
	m.jobs.Add(1)
	go func() {
		defer m.jobs.Done()
		fn(m.jobCtx)
	}()
}

// WaitJobs blocks until every tracked job finishes or d elapses, cancelling the
// job context either way. It reports whether the jobs drained in time.
func (m *Manager) WaitJobs(d time.Duration) bool {
	done := make(chan struct{})
	go func() {
		m.jobs.Wait()
		close(done)
	}()
	select {
	case <-done:
		m.jobCancel()
		return true
	case <-time.After(d):
		m.jobCancel()
		return false
	}
}

// localRepoPath returns the local restic repo directory for a site
func (m *Manager) localRepoPath(siteName string) string {
	return filepath.Join(m.appPath, "sites", siteName, "backups", "local")
}

// enableMaintenance writes the maintenance page and injects a catch-all nginx
// config that returns 503 for all requests
func (m *Manager) enableMaintenance(ctx context.Context, site *models.Site, siteDir string) error {

	// write the maintenance page into the site's web root
	htmlPath := filepath.Join(siteDir, "html", maintHTMLName)
	if err := os.WriteFile(htmlPath, maintenanceHTML, 0644); err != nil {
		return fmt.Errorf("write maintenance.html: %w", err)
	}

	// 000- prefix ensures this conf sorts first and takes priority
	maintConf := `server {
    listen 80 default_server;
    root /var/www/html;
    error_page 503 /maintenance.html;
    location = /maintenance.html { internal; }
    location / { return 503; }
}
`

	// write the maintenance nginx conf into the site's nginx conf.d directory
	confPath := filepath.Join(siteDir, "nginx", "conf.d", maintConfName)
	if err := os.WriteFile(confPath, []byte(maintConf), 0644); err != nil {
		return fmt.Errorf("write maintenance nginx conf: %w", err)
	}

	// reload nginx to apply the maintenance page and config
	if err := m.nginxReload(ctx, site.Name); err != nil {
		return fmt.Errorf("nginx reload (maintenance on): %w", err)
	}

	logger.Debug("enableMaintenance: maintenance mode on for site %s", site.Name)
	return nil
}

// disableMaintenance removes the maintenance conf and page, then reloads nginx
func (m *Manager) disableMaintenance(ctx context.Context, site *models.Site, siteDir string) error {

	// set up paths to the maintenance conf and page
	confPath := filepath.Join(siteDir, "nginx", "conf.d", maintConfName)

	// remove the maintenance nginx conf; ignore if it doesn't exist, but log other errors
	if err := os.Remove(confPath); err != nil && !os.IsNotExist(err) {
		logger.Warn("disableMaintenance: remove conf: %v", err)
	}
	htmlPath := filepath.Join(siteDir, "html", maintHTMLName)
	if err := os.Remove(htmlPath); err != nil && !os.IsNotExist(err) {
		logger.Warn("disableMaintenance: remove html: %v", err)
	}

	// reload nginx to apply the config change
	if err := m.nginxReload(ctx, site.Name); err != nil {
		return fmt.Errorf("nginx reload (maintenance off): %w", err)
	}

	logger.Debug("disableMaintenance: maintenance mode off for site %s", site.Name)
	return nil
}

// nginxReload sends nginx -s reload inside the site's nginx container
func (m *Manager) nginxReload(ctx context.Context, siteName string) error {

	// the nginx container name is deterministic based on the site name and module type
	containerName := podman.ContainerName(siteName, "nginx")

	// create an exec instance for the reload command; we can detach immediately since we don't need to wait for it to finish
	var execResp struct {
		ID string `json:"Id"`
	}
	spec := map[string]any{
		"AttachStdout": false,
		"AttachStderr": false,
		"Detach":       true,
		"Cmd":          []string{"nginx", "-s", "reload"},
	}

	// POST to the podman API
	if err := m.podman.PostJSON(ctx,
		"/v4.0.0/libpod/containers/"+containerName+"/exec",
		spec, &execResp,
	); err != nil {
		return fmt.Errorf("nginxReload: create exec: %w", err)
	}

	// start the exec instance we just created
	if err := m.podman.PostJSON(ctx,
		"/v4.0.0/libpod/exec/"+execResp.ID+"/start",
		map[string]any{"Detach": true}, nil,
	); err != nil {
		return fmt.Errorf("nginxReload: start exec: %w", err)
	}

	logger.Debug("nginxReload: sent reload to %s", containerName)
	return nil
}

// readEnvValue reads a KEY=VALUE .env file and returns the value for the given key
func readEnvValue(path, key string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	prefix := key + "="
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimRight(line, "\r")
		if strings.HasPrefix(line, prefix) {
			return strings.TrimPrefix(line, prefix), nil
		}
	}
	return "", fmt.Errorf("key %q not found in %s", key, path)
}

// ImportDirFor returns the SFTP import drop directory path for a site
func (m *Manager) ImportDirFor(siteName string) string {
	return m.importDir(siteName)
}

// fixPostRestorePerms reapplies the correct ownership and permissions to the
// site directory after a file restore, matching what scaffoldSiteDir sets up
func (m *Manager) fixPostRestorePerms(siteDir string, siteID int64) {

	// look up the SFTP credentials to get the site UID for ownership
	cred, err := db.GetSFTPCredBySite(m.db, siteID)
	if err != nil || cred == nil {
		logger.Warn("fixPostRestorePerms: could not get sftp cred for site %d: %v", siteID, err)
		return
	}
	uid := cred.UID

	// site root — must be root:root for sshd chroot
	os.Chown(siteDir, 0, 0)
	os.Chmod(siteDir, 0755)

	// html — setgid + group-writable, siteUID owned; the restored tree carries
	// whatever ownership the archive held, so it is corrected in full here
	fileutil.ChownTree(siteDir+"/html", uid)
	os.Chmod(siteDir+"/html", 0755)

	// php-fpm, redis — siteUID owned
	for _, d := range []string{"php-fpm", "redis"} {
		os.Chown(siteDir+"/"+d, uid, uid)
	}

	// nginx dir — siteUID owned
	os.Chown(siteDir+"/nginx", uid, uid)

	// nginx/logs — nginx uid (101)
	os.Chown(siteDir+"/nginx/logs", 101, 101)
	os.Chmod(siteDir+"/nginx/logs", 0750)

	// db — mysql uid (999) inside the MariaDB container
	os.Chown(siteDir+"/db", 999, 999)

	logger.Debug("fixPostRestorePerms: permissions restored for %s", siteDir)
}

// -- import restore ----------------------------------------------------------

// importDir returns the SFTP import drop directory for a site
func (m *Manager) importDir(siteName string) string {
	return filepath.Join(m.appPath, "sites", siteName, "backups", "import")
}

// ListImportFiles returns the filenames of any importable archives in the
// site's SFTP import directory (.tar.gz, .tar.xz, .zip)
func (m *Manager) ListImportFiles(siteName string) ([]string, error) {

	// read the import directory and filter for supported archive formats
	dir := m.importDir(siteName)
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return []string{}, nil
		}
		return nil, fmt.Errorf("ListImportFiles: %w", err)
	}

	// filter for supported archive formats
	var files []string
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		n := e.Name()
		// only surface recognised archive formats
		if strings.HasSuffix(n, ".tar.gz") ||
			strings.HasSuffix(n, ".tar.xz") ||
			strings.HasSuffix(n, ".zip") {
			files = append(files, n)
		}
	}
	return files, nil
}
