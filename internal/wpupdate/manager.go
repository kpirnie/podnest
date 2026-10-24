// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package wpupdate

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
	"sync"
	"time"

	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/podman"
	"podnest/internal/sftp"
)

const (
	// wpcliPath is where wp-cli lives inside the PHP container; the rootfs is
	// read-only, so it sits on the /tmp tmpfs and reinstalls on demand
	wpcliPath = "/tmp/wp"

	// checkTimeout bounds a single site's update check
	checkTimeout = 5 * time.Minute

	// updateTimeout bounds a full update run, including the post-run recheck
	updateTimeout = 30 * time.Minute

	// staggerDelay spaces scheduled checks so sites are never hit back to back
	staggerDelay = 10 * time.Second
)

// ErrCheckRunning reports a check refused because the site already has one running
var ErrCheckRunning = errors.New("an update check or update is already running for this site")

// ErrBadScope reports an update run requested with an unknown scope
var ErrBadScope = errors.New("scope must be one of core, plugins, themes, all")

// updateSteps maps each update scope to the wp-cli commands it runs, in order
var updateSteps = map[string][][]string{
	"core":    {{"core", "update"}, {"core", "update-db"}},
	"plugins": {{"plugin", "update", "--all"}},
	"themes":  {{"theme", "update", "--all"}},
	"all":     {{"core", "update"}, {"core", "update-db"}, {"plugin", "update", "--all"}, {"theme", "update", "--all"}},
}

// ErrNotWordPress reports a check requested for a non-WordPress site
var ErrNotWordPress = errors.New("update checks are only available for WordPress sites")

// Manager checks WordPress sites for core, plugin and theme updates via WP-CLI
// and caches the results
type Manager struct {
	client *podman.Client
	db     *sql.DB

	mu     sync.Mutex
	active map[int64]bool
}

// New returns an update check manager bound to the given podman client and database
func New(client *podman.Client, database *sql.DB) *Manager {
	return &Manager{
		client: client,
		db:     database,
		active: map[int64]bool{},
	}
}

// Check runs an update check against a site and caches the result; a failed
// check is still cached with its error so the dashboard reflects it
func (m *Manager) Check(ctx context.Context, site *models.Site) (*models.WPUpdateStatus, error) {
	if site.SiteType != models.SiteTypeWordPress {
		return nil, ErrNotWordPress
	}
	if !m.acquire(site.ID) {
		return nil, ErrCheckRunning
	}
	defer m.release(site.ID)

	cCtx, cancel := context.WithTimeout(ctx, checkTimeout)
	defer cancel()

	return m.refresh(cCtx, site)
}

// ValidScope reports whether scope is a known update scope
func ValidScope(scope string) bool {
	_, ok := updateSteps[scope]
	return ok
}

// Update runs the wp-cli commands for scope against the site, streaming their
// output to w, stopping at the first failing command, then rechecks the site
// so the cached status reflects whatever was applied
func (m *Manager) Update(ctx context.Context, site *models.Site, scope string, w io.Writer) error {
	steps, ok := updateSteps[scope]
	if !ok {
		return ErrBadScope
	}
	if site.SiteType != models.SiteTypeWordPress {
		return ErrNotWordPress
	}
	if !m.acquire(site.ID) {
		return ErrCheckRunning
	}
	defer m.release(site.ID)

	uCtx, cancel := context.WithTimeout(ctx, updateTimeout)
	defer cancel()

	container := podman.ContainerName(site.Name, "php")
	user := strconv.Itoa(sftp.UIDForSite(site.ID))

	if err := m.ensureWPCLI(uCtx, container); err != nil {
		return err
	}

	var runErr error
	for _, args := range steps {
		label := strings.Join(args, " ")
		fmt.Fprintf(w, "$ wp %s\n", label)

		argv := append([]string{wpcliPath, "--path=/var/www/html", "--no-color", "--allow-root"}, args...)
		res, err := m.client.ExecStreamOut(uCtx, container, user, argv, w)
		if err != nil {
			runErr = fmt.Errorf("wp %s: %w", label, err)
			break
		}
		if len(res.Stderr) > 0 {
			w.Write(res.Stderr)
		}
		if res.ExitCode != 0 {
			runErr = fmt.Errorf("wp %s exited %d", label, res.ExitCode)
			break
		}
	}

	if _, err := m.refresh(uCtx, site); err != nil {
		logger.Warn("wpupdate: post-update recheck failed for site %s: %v", site.Name, err)
	}

	logger.Debug("wpupdate: %s update finished for site %s (err=%v)", scope, site.Name, runErr)
	return runErr
}

// refresh collects and caches the site's update status; the caller holds the site's slot
func (m *Manager) refresh(ctx context.Context, site *models.Site) (*models.WPUpdateStatus, error) {
	status := &models.WPUpdateStatus{SiteID: site.ID}
	if err := m.collect(ctx, site, status); err != nil {
		logger.Error("wpupdate: check failed for site %s: %v", site.Name, err)
		status.Error = err.Error()
	}

	if err := db.SaveWPUpdateStatus(m.db, status); err != nil {
		return nil, err
	}
	return status, nil
}

// acquire claims the site's check/update slot, reporting false if it is taken
func (m *Manager) acquire(siteID int64) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.active[siteID] {
		return false
	}
	m.active[siteID] = true
	return true
}

// CheckAll checks every running WordPress site one after another, pausing
// between sites
func (m *Manager) CheckAll(ctx context.Context) {
	sites, err := db.GetAllSites(m.db)
	if err != nil {
		logger.Error("wpupdate: list sites: %v", err)
		return
	}

	for _, site := range sites {
		if site.SiteType != models.SiteTypeWordPress || site.SiteStatus != models.StatusRunning {
			continue
		}
		if ctx.Err() != nil {
			return
		}

		if _, err := m.Check(ctx, site); err != nil {
			logger.Warn("wpupdate: skipping site %s: %v", site.Name, err)
		}

		select {
		case <-ctx.Done():
			return
		case <-time.After(staggerDelay):
		}
	}
}

// release clears the site's running flag
func (m *Manager) release(siteID int64) {
	m.mu.Lock()
	delete(m.active, siteID)
	m.mu.Unlock()
}

// collect gathers the core version, available core update, and plugins and
// themes with updates available into status
func (m *Manager) collect(ctx context.Context, site *models.Site, status *models.WPUpdateStatus) error {
	container := podman.ContainerName(site.Name, "php")
	user := strconv.Itoa(sftp.UIDForSite(site.ID))

	if err := m.ensureWPCLI(ctx, container); err != nil {
		return err
	}

	// core checks skip plugins and themes — they need neither, and it keeps a
	// broken plugin from failing the check and the bootstrap cost down
	out, err := m.wp(ctx, container, user, "core", "version", "--skip-plugins", "--skip-themes")
	if err != nil {
		return err
	}
	status.CoreVersion = strings.TrimSpace(string(out))

	out, err = m.wp(ctx, container, user, "core", "check-update", "--format=json", "--skip-plugins", "--skip-themes")
	if err != nil {
		return err
	}
	var core []struct {
		Version string `json:"version"`
	}
	if line := jsonLine(out); line != nil {
		if err := json.Unmarshal(line, &core); err != nil {
			return fmt.Errorf("parse core check-update: %w", err)
		}
	}
	if len(core) > 0 {
		status.CoreUpdate = core[0].Version
	}

	// plugin and theme lists load plugins so premium updaters can hook in
	fields := "--fields=name,title,version,update_version"
	out, err = m.wp(ctx, container, user, "plugin", "list", "--update=available", "--format=json", fields)
	if err != nil {
		return err
	}
	if line := jsonLine(out); line != nil {
		if err := json.Unmarshal(line, &status.Plugins); err != nil {
			return fmt.Errorf("parse plugin list: %w", err)
		}
	}

	out, err = m.wp(ctx, container, user, "theme", "list", "--update=available", "--format=json", fields)
	if err != nil {
		return err
	}
	if line := jsonLine(out); line != nil {
		if err := json.Unmarshal(line, &status.Themes); err != nil {
			return fmt.Errorf("parse theme list: %w", err)
		}
	}

	logger.Debug("wpupdate: site %s core %s→%q, %d plugins, %d themes",
		site.Name, status.CoreVersion, status.CoreUpdate, len(status.Plugins), len(status.Themes))
	return nil
}

// wp runs a wp-cli command as argv inside the container and returns stdout
func (m *Manager) wp(ctx context.Context, container, user string, args ...string) ([]byte, error) {
	argv := append([]string{wpcliPath, "--path=/var/www/html", "--no-color", "--allow-root"}, args...)
	res, err := m.client.ExecCapture(ctx, container, user, argv)
	if err != nil {
		return nil, fmt.Errorf("wp %s: %w", strings.Join(args[:2], " "), err)
	}
	if res.ExitCode != 0 {
		return nil, fmt.Errorf("wp %s exited %d: %s", strings.Join(args[:2], " "), res.ExitCode, strings.TrimSpace(string(res.Stderr)))
	}
	return res.Stdout, nil
}

// ensureWPCLI installs wp-cli into the container if it is not already present
func (m *Manager) ensureWPCLI(ctx context.Context, container string) error {
	res, err := m.client.ExecCapture(ctx, container, "", []string{"test", "-f", wpcliPath})
	if err == nil && res.ExitCode == 0 {
		return nil
	}

	logger.Debug("wpupdate: installing wp-cli in container %s", container)
	res, err = m.client.ExecCapture(ctx, container, "", []string{"sh", "-c",
		"wget -q https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar" +
			" -O /tmp/wp.phar && chmod +x /tmp/wp.phar && mv /tmp/wp.phar " + wpcliPath,
	})
	if err != nil {
		return fmt.Errorf("install wp-cli: %w", err)
	}
	if res.ExitCode != 0 {
		return fmt.Errorf("install wp-cli exited %d: %s", res.ExitCode, strings.TrimSpace(string(res.Stderr)))
	}
	return nil
}

// jsonLine returns the last line of wp-cli output that holds a JSON array, or
// nil when there is none — check-update prints a plain success message rather
// than an empty array when core is current
func jsonLine(out []byte) []byte {
	lines := bytes.Split(bytes.TrimSpace(out), []byte("\n"))
	for i := len(lines) - 1; i >= 0; i-- {
		line := bytes.TrimSpace(lines[i])
		if bytes.HasPrefix(line, []byte("[")) {
			return line
		}
	}
	return nil
}
