// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package static

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"podnest/internal/config"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/modules"
)

// scaffoldDir creates the filesystem structure and writes config files for a static site.
func scaffoldDir(dir string, cfg modules.ScaffoldConfig) error {
	dirs := []string{
		dir + "/html",
		dir + "/nginx/conf.d",
		dir + "/nginx/logs",
		dir + "/varnish",
	}
	for _, d := range dirs {
		if err := os.MkdirAll(d, 0755); err != nil {
			return fmt.Errorf("create dir %s: %w", d, err)
		}
	}
	if err := os.MkdirAll(filepath.Join(dir, "backups"), 0755); err != nil {
		return fmt.Errorf("create backups dir: %w", err)
	}

	if err := os.Chown(dir, 0, 0); err != nil {
		logger.Warn("could not chown site dir to root: %v", err)
	}
	if err := os.Chmod(dir, 0755); err != nil {
		logger.Warn("could not chmod site dir: %v", err)
	}
	if err := os.Chown(dir+"/html", cfg.SiteUID, cfg.SiteUID); err != nil {
		logger.Warn("could not chown html: %v", err)
	}
	if err := os.Chmod(dir+"/html", 02775); err != nil {
		logger.Warn("could not chmod html: %v", err)
	}
	if err := os.Chown(dir+"/nginx", cfg.SiteUID, cfg.SiteUID); err != nil {
		logger.Warn("could not chown nginx dir: %v", err)
	}
	if err := os.Chown(dir+"/nginx/logs", 101, 101); err != nil {
		logger.Warn("could not chown nginx/logs: %v", err)
	}
	if err := os.Chmod(dir+"/nginx/logs", 0750); err != nil {
		logger.Warn("could not chmod nginx/logs: %v", err)
	}

	marshalCfg := func(kv map[string]string) string {
		if kv == nil {
			return "{}"
		}
		b, _ := json.Marshal(kv)
		return string(b)
	}

	vEnabled := config.VarnishEnabled(marshalCfg(cfg.Configs[models.ConfigVarnish]))

	nginxMain, err := config.RenderNginxMain(marshalCfg(cfg.Configs[models.ConfigNginx]))
	if err != nil {
		return fmt.Errorf("render nginx main: %w", err)
	}
	if err := os.WriteFile(dir+"/nginx/nginx.conf", []byte(nginxMain), 0644); err != nil {
		return fmt.Errorf("write nginx.conf: %w", err)
	}

	nginxSite, err := config.RenderNginxSite(marshalCfg(cfg.Configs[models.ConfigNginx]), models.SiteTypeStatic, vEnabled)
	if err != nil {
		return fmt.Errorf("render nginx site: %w", err)
	}
	if err := os.WriteFile(dir+"/nginx/conf.d/site.conf", []byte(nginxSite), 0644); err != nil {
		return fmt.Errorf("write site.conf: %w", err)
	}

	vcl, err := config.RenderVarnish(marshalCfg(cfg.Configs[models.ConfigVarnish]))
	if err != nil {
		return fmt.Errorf("render varnish VCL: %w", err)
	}
	if err := os.WriteFile(dir+"/varnish/default.vcl", []byte(vcl), 0644); err != nil {
		return fmt.Errorf("write varnish VCL: %w", err)
	}

	return nil
}
