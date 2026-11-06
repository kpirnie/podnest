// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package wpupdate

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"podnest/internal/config"
	"podnest/internal/db"
	"podnest/internal/fileutil"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/podman"
	"podnest/internal/sftp"
)

// wooPlugin is the WooCommerce plugin slug
const wooPlugin = "woocommerce"

// Burst returns the nginx general rate-limit burst for a site: the WooCommerce
// value when the plugin is installed and active, the default otherwise. When
// WP-CLI cannot be reached the installed check decides
func (m *Manager) Burst(ctx context.Context, site *models.Site, siteDir string) int {
	if site.SiteType != models.SiteTypeWordPress {
		return config.NginxBurstDefault
	}

	plugin := filepath.Join(siteDir, "html", "wp-content", "plugins", wooPlugin, "woocommerce.php")
	if _, err := os.Stat(plugin); err != nil {
		return config.NginxBurstDefault
	}

	active, err := m.wooActive(ctx, site)
	if err != nil {
		logger.Warn("wpupdate: woocommerce active check failed for site %s, using installed check: %v", site.Name, err)
		return config.NginxBurstWooCommerce
	}
	if active {
		return config.NginxBurstWooCommerce
	}
	return config.NginxBurstDefault
}

// wooActive reports whether WooCommerce is active on the site, network-active,
// or active on any subsite of a multisite
func (m *Manager) wooActive(ctx context.Context, site *models.Site) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, lookupTimeout)
	defer cancel()

	container := podman.ContainerName(site.Name, "php")
	user := strconv.Itoa(sftp.UIDForSite(site.ID))

	if err := m.ensureWPCLI(ctx, container); err != nil {
		return false, err
	}

	active, err := m.wpCheck(ctx, container, user, "plugin", "is-active", wooPlugin)
	if err != nil || active {
		return active, err
	}

	// the network check errors on a single site install, which means there is nothing more to look at
	network, err := m.wpCheck(ctx, container, user, "plugin", "is-active", wooPlugin, "--network")
	if err != nil {
		return false, nil
	}
	if network {
		return true, nil
	}

	out, err := m.wp(ctx, container, user, "site", "list", "--field=url")
	if err != nil {
		return false, nil
	}
	for _, u := range strings.Fields(string(out)) {
		if on, err := m.wpCheck(ctx, container, user, "--url="+u, "plugin", "is-active", wooPlugin); err == nil && on {
			return true, nil
		}
	}
	return false, nil
}

// wpCheck runs a wp-cli command and reports whether it exited zero; a non-zero
// exit that wrote to stderr is an error, a silent one means false
func (m *Manager) wpCheck(ctx context.Context, container, user string, args ...string) (bool, error) {
	argv := append([]string{wpcliPath, "--path=/var/www/html", "--no-color", "--allow-root", "--skip-plugins", "--skip-themes"}, args...)
	res, err := m.client.ExecCapture(ctx, container, user, argv)
	if err != nil {
		return false, err
	}
	if res.ExitCode == 0 {
		return true, nil
	}
	if msg := strings.TrimSpace(string(res.Stderr)); msg != "" {
		return false, errors.New(msg)
	}
	return false, nil
}

// syncBurst re-renders the site's nginx server block and reloads nginx when
// the burst it carries no longer matches the detected WooCommerce state
func (m *Manager) syncBurst(ctx context.Context, site *models.Site) {
	siteDir, err := fileutil.SiteDir(m.appPath+"/sites", site.Name)
	if err != nil {
		return
	}

	burst := m.Burst(ctx, site, siteDir)
	current, err := os.ReadFile(filepath.Join(siteDir, "nginx", "conf.d", "site.conf"))
	if err != nil || strings.Contains(string(current), fmt.Sprintf("zone=general burst=%d nodelay", burst)) {
		return
	}

	nginxKV, err := db.GetConfigsBySiteAndType(m.db, site.ID, models.ConfigNginx)
	if err != nil || len(nginxKV) == 0 {
		return
	}
	nginxBlob, err := json.Marshal(nginxKV)
	if err != nil {
		return
	}

	vEnabled := false
	if varnishKV, _ := db.GetConfigsBySiteAndType(m.db, site.ID, models.ConfigVarnish); len(varnishKV) > 0 {
		vb, _ := json.Marshal(varnishKV)
		vEnabled = config.VarnishEnabled(string(vb))
	}

	siteConf, err := config.RenderNginxSite(string(nginxBlob), site.SiteType, vEnabled, burst)
	if err != nil {
		logger.Error("wpupdate: render nginx site for site %s: %v", site.Name, err)
		return
	}
	if err := fileutil.WriteFile(siteDir, "nginx/conf.d/site.conf", siteConf, 0644); err != nil {
		logger.Error("wpupdate: write site.conf for site %s: %v", site.Name, err)
		return
	}
	if err := m.client.KillContainer(ctx, podman.ContainerName(site.Name, "nginx"), "HUP"); err != nil {
		logger.Warn("wpupdate: nginx reload for site %s failed: %v", site.Name, err)
	}
	logger.Info("wpupdate: nginx burst for site %s is now %d", site.Name, burst)
}
