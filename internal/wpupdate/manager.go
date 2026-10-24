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

	// staggerDelay spaces scheduled checks so sites are never hit back to back
	staggerDelay = 10 * time.Second
)

// ErrCheckRunning reports a check refused because the site already has one running
var ErrCheckRunning = errors.New("an update check is already running for this site")

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

	m.mu.Lock()
	if m.active[site.ID] {
		m.mu.Unlock()
		return nil, ErrCheckRunning
	}
	m.active[site.ID] = true
	m.mu.Unlock()
	defer m.release(site.ID)

	cCtx, cancel := context.WithTimeout(ctx, checkTimeout)
	defer cancel()

	status := &models.WPUpdateStatus{SiteID: site.ID}
	if err := m.collect(cCtx, site, status); err != nil {
		logger.Error("wpupdate: check failed for site %s: %v", site.Name, err)
		status.Error = err.Error()
	}

	if err := db.SaveWPUpdateStatus(m.db, status); err != nil {
		return nil, err
	}
	return status, nil
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
