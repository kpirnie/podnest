// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package sites

import (
	"context"
	"encoding/json"
	"fmt"

	"podnest/internal/config"
	"podnest/internal/db"
	"podnest/internal/fileutil"
	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/modules/types/dotnet"
	"podnest/internal/modules/types/node"
	"podnest/internal/modules/types/php"
	"podnest/internal/modules/types/python"
	"podnest/internal/modules/types/wordpress"
	"podnest/internal/podman"
	"podnest/internal/sftp"
)

// RefreshPHPSMTP applies the saved SMTP settings to an existing PHP runtime.
func (h *Handler) RefreshPHPSMTP(ctx context.Context, site *models.Site) error {

	if site.SiteType != models.SiteTypePHP && site.SiteType != models.SiteTypeWordPress {
		return nil
	}

	if _, err := h.Podman.InspectPod(ctx, podman.PodName(site.Name)); err != nil {
		return fmt.Errorf("inspect site pod for SMTP refresh: %w", err)
	}

	siteDir, err := fileutil.SiteDir(h.sitesBase(), site.Name)
	if err != nil {
		return err
	}
	hostSiteDir, err := fileutil.SiteDir(h.hostSitesBase(), site.Name)
	if err != nil {
		return err
	}

	cfg := modules.PodConfig{
		Site:     site,
		SiteUID:  sftp.UIDForSite(site.ID),
		SiteDir:  hostSiteDir,
		LocalDir: siteDir,
	}

	// Reuse the existing service credentials when replacing PHP-FPM.
	for _, entry := range []struct {
		key   string
		value *string
	}{
		{key: "DB_USER", value: &cfg.DBUser},
		{key: "DB_PASS", value: &cfg.DBPass},
		{key: "REDIS_PASS", value: &cfg.RedisPass},
	} {
		value, err := fileutil.ReadEnvValue(h.sitesBase(), site.Name, entry.key)
		if err != nil {
			return fmt.Errorf("read %s for PHP runtime refresh: %w", entry.key, err)
		}
		*entry.value = value
	}

	phpSettings, err := db.GetConfigsBySiteAndType(h.DB, site.ID, models.ConfigPHP)
	if err != nil {
		return fmt.Errorf("load PHP settings for SMTP refresh: %w", err)
	}
	cfg.LoadPHPSMTP, err = h.preparePHPSMTP(site, siteDir, cfg.SiteUID, phpSettings)
	if err != nil {
		return err
	}

	client := &modules.PodmanClientAdapter{Client: h.PodmanClient}
	start := site.SiteStatus != models.StatusStopped
	if site.SiteType == models.SiteTypeWordPress {
		return wordpress.CreateRuntime(ctx, client, cfg, start)
	}

	return php.CreateRuntime(ctx, client, cfg, start)
}

// RefreshAppSMTP applies the saved SMTP settings to an existing application runtime.
func (h *Handler) RefreshAppSMTP(ctx context.Context, site *models.Site) error {

	var createRuntime func(context.Context, modules.PodmanClient, modules.PodConfig, bool) error
	switch site.SiteType {
	case models.SiteTypeNode:
		createRuntime = node.CreateRuntime
	case models.SiteTypeDotNet:
		createRuntime = dotnet.CreateRuntime
	case models.SiteTypePython:
		createRuntime = python.CreateRuntime
	default:
		return nil
	}

	if _, err := h.Podman.InspectPod(ctx, podman.PodName(site.Name)); err != nil {
		return fmt.Errorf("inspect site pod for SMTP refresh: %w", err)
	}

	hostSiteDir, err := fileutil.SiteDir(h.hostSitesBase(), site.Name)
	if err != nil {
		return err
	}

	siteUID := sftp.UIDForSite(site.ID)
	loadSMTP, err := h.prepareAppSMTP(site, siteUID)
	if err != nil {
		return err
	}

	client := &modules.PodmanClientAdapter{Client: h.PodmanClient}
	cfg := modules.PodConfig{
		Site:        site,
		SiteUID:     siteUID,
		SiteDir:     hostSiteDir,
		LoadAppSMTP: loadSMTP,
	}
	return createRuntime(ctx, client, cfg, site.SiteStatus != models.StatusStopped)
}

// prepareAppSMTP returns a loader when SMTP is enabled for an application site.
func (h *Handler) prepareAppSMTP(site *models.Site, siteUID int) (func(context.Context, string) error, error) {

	settings, err := db.GetSMTPRuntimeConfig(h.DB, site.ID)
	if err != nil {
		return nil, fmt.Errorf("load application SMTP configuration: %w", err)
	}
	if settings["enabled"] != "true" {
		return nil, nil
	}
	if settings["password"] == "" {
		return nil, fmt.Errorf("application SMTP password is required")
	}

	return func(ctx context.Context, container string) error {
		return h.PodmanClient.LoadAppSMTP(ctx, container, siteUID, settings)
	}, nil
}

// preparePHPSMTP writes the PHP override and returns the loader for enabled SMTP.
func (h *Handler) preparePHPSMTP(site *models.Site, siteDir string, siteUID int, phpSettings map[string]string) (func(context.Context, string) error, error) {

	smtpSettings, err := db.GetSMTPRuntimeConfig(h.DB, site.ID)
	if err != nil {
		return nil, fmt.Errorf("load PHP SMTP configuration: %w", err)
	}

	smtpEnabled := smtpSettings["enabled"] == "true"
	var load func(context.Context, string) error
	if smtpEnabled {
		// Validate before writing PHP settings or replacing the running container.
		if _, err := config.RenderMSMTPConfig(smtpSettings); err != nil {
			return nil, fmt.Errorf("validate PHP SMTP configuration: %w", err)
		}

		load = func(ctx context.Context, container string) error {
			return h.PodmanClient.LoadPHPSMTP(ctx, container, siteUID, smtpSettings)
		}
	}

	phpBlob, err := json.Marshal(phpSettings)
	if err != nil {
		return nil, fmt.Errorf("marshal PHP configuration: %w", err)
	}
	phpIni, err := config.RenderPHPIniWithSMTP(string(phpBlob), smtpEnabled)
	if err != nil {
		return nil, fmt.Errorf("render PHP configuration: %w", err)
	}
	if err := fileutil.WriteFile(siteDir, "php-fpm/php.ini", phpIni, 0644); err != nil {
		return nil, fmt.Errorf("write PHP configuration: %w", err)
	}

	return load, nil
}
