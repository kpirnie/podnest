// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package configs

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"podnest/internal/apiutil"
	"podnest/internal/cache"
	"podnest/internal/config"
	"podnest/internal/db"
	"podnest/internal/fileutil"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/podman"
	"podnest/internal/sftp"
	"podnest/internal/wpupdate"
)

// ConfigPodman is the subset of podman.Client consumed by this handler.
type ConfigPodman interface {
	KillContainer(ctx context.Context, name, signal string) error
	RestartContainer(ctx context.Context, name string) error
	ReloadVarnish(ctx context.Context, name string) error
	ContainerExists(ctx context.Context, name string) (bool, error)
	RemoveContainer(ctx context.Context, name string) error
}

// ConfigProxy is the subset of proxy.Proxy consumed by this handler.
type ConfigProxy interface {
	UpdateRespCache(siteID int64, kv map[string]string) error
}

// Handler handles site configuration management API routes.
type Handler struct {
	DB       *sql.DB
	AppPath  string
	Podman   ConfigPodman
	Proxy    ConfigProxy
	Resolve  modules.SiteResolver
	WPUpdate *wpupdate.Manager
}

// RegisterRoutes mounts config management routes onto api.
func (h *Handler) RegisterRoutes(api *http.ServeMux) {
	api.HandleFunc("GET /sites/{id}/configs", h.apiGetConfigs)
	api.HandleFunc("PUT /sites/{id}/configs/{type}", h.apiUpdateConfig)
	api.HandleFunc("POST /sites/{id}/configs/{type}/reset", h.apiResetConfig)
	api.HandleFunc("POST /sites/{id}/configs/{type}/export", h.apiExportConfig)
	api.HandleFunc("POST /sites/{id}/configs/{type}/import", h.apiImportConfig)
}

func (h *Handler) sitesBase() string {
	return h.AppPath + "/sites"
}

func (h *Handler) apiGetConfigs(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		logger.Error("failed to resolve site for config fetch")
		return
	}

	out, err := db.GetAllConfigsBySite(h.DB, site.ID)
	if err != nil {
		logger.Error("failed to fetch configs for site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	if out == nil {
		out = make(map[int]map[string]string)
	}

	for kind, settings := range out {
		out[kind] = publicConfig(settings)
	}

	// SMTP configuration is managed through its dedicated API.
	// Never expose stored SMTP credentials through generic configuration responses.
	delete(out, models.ConfigSMTP)

	logger.Debug("fetched configs for site %d: %d types", site.ID, len(out))
	apiutil.JSON(w, http.StatusOK, out)
}

// publicConfig removes credentials at the HTTP boundary so renderers still
// receive the full configuration.
func publicConfig(values map[string]string) map[string]string {
	out := make(map[string]string, len(values))
	for key, value := range values {
		if !logger.CredentialName(key) && !logger.CredentialURL(value) {
			out[key] = value
		}
	}
	return out
}

func preserveConfigCredentials(incoming, existing map[string]string) {
	for key, value := range existing {
		if logger.CredentialName(key) || logger.CredentialURL(value) {
			if _, ok := incoming[key]; !ok {
				incoming[key] = value
			}
		}
	}
}

func discardConfigPlaceholders(values map[string]string) {
	for key, value := range values {
		if value == "*****" || value == "••••••••" {
			delete(values, key)
		}
	}
}

func (h *Handler) apiUpdateConfig(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		logger.Error("failed to resolve site for config update")
		return
	}

	configType, err := resolveConfigType(w, r)
	if err != nil {
		return
	}

	var incoming map[string]string
	if err := json.NewDecoder(r.Body).Decode(&incoming); err != nil {
		logger.Error("failed to decode request body for config update: %v", err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	if configType == models.ConfigProxyCache {
		if _, err := cache.ParseSettings(incoming); err != nil {
			logger.Error("invalid proxy cache config for site %d: %v", site.ID, err)
			apiutil.ErrorMsg(w, http.StatusBadRequest, err.Error())
			return
		}
	}

	if incoming == nil {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "configuration must be an object")
		return
	}
	discardConfigPlaceholders(incoming)
	existing, err := db.GetConfigsBySiteAndType(h.DB, site.ID, configType)
	if err != nil {
		apiutil.ErrorMsg(w, http.StatusInternalServerError, "could not load configuration")
		return
	}
	preserveConfigCredentials(incoming, existing)

	if err := db.SetConfigs(h.DB, site.ID, configType, incoming); err != nil {
		logger.Error("failed to set configs for site %d type %d: %v", site.ID, configType, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}


	blob, err := json.Marshal(incoming)
	if err != nil {
		logger.Error("failed to marshal config for site %d type %d: %v", site.ID, configType, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	if err := h.rewriteConfigFile(site, configType, string(blob)); err != nil {
		logger.Error("failed to rewrite config file for site %d type %d: %v", site.ID, configType, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("updated config for site %d type %d", site.ID, configType)
	apiutil.JSON(w, http.StatusOK, publicConfig(incoming))
}

func (h *Handler) apiResetConfig(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		logger.Error("failed to resolve site for config reset")
		return
	}

	configType, err := resolveConfigType(w, r)
	if err != nil {
		return
	}

	defaults, err := config.DefaultsForType(configType)
	if err != nil {
		logger.Error("failed to get defaults for site %d type %d: %v", site.ID, configType, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if configType == models.ConfigNginx {
		defaults = config.NginxDefaultsForSiteType(site.SiteType)
	}

	existing, err := db.GetConfigsBySiteAndType(h.DB, site.ID, configType)
	if err != nil {
		apiutil.ErrorMsg(w, http.StatusInternalServerError, "could not load configuration")
		return
	}
	preserveConfigCredentials(defaults, existing)

	if err := db.SetConfigs(h.DB, site.ID, configType, defaults); err != nil {
		logger.Error("failed to set default configs for site %d type %d: %v", site.ID, configType, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	blob, err := json.Marshal(defaults)
	if err != nil {
		logger.Error("failed to marshal defaults for site %d type %d: %v", site.ID, configType, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	if err := h.rewriteConfigFile(site, configType, string(blob)); err != nil {
		logger.Error("failed to rewrite config file for site %d type %d: %v", site.ID, configType, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("reset site config for site %d type %d", site.ID, configType)
	apiutil.JSON(w, http.StatusOK, publicConfig(defaults))
}

func (h *Handler) apiExportConfig(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		logger.Error("apiExportConfig: failed to resolve site")
		return
	}

	configType, err := resolveConfigType(w, r)
	if err != nil {
		return
	}

	kv, err := db.GetConfigsBySiteAndType(h.DB, site.ID, configType)
	if err != nil {
		logger.Error("apiExportConfig: failed to fetch config for site %d type %d: %v", site.ID, configType, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	filename := fmt.Sprintf("%s-config-%d.pnm", site.Name, configType)
	apiutil.ExportMigration(w, r, filename, fmt.Sprintf("config:%d", configType), kv)
}

func (h *Handler) apiImportConfig(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		logger.Error("apiImportConfig: failed to resolve site")
		return
	}

	configType, err := resolveConfigType(w, r)
	if err != nil {
		return
	}

	values, err := apiutil.ImportMigration(w, r, fmt.Sprintf("config:%d", configType))
	if err != nil {
		apiutil.ErrorMsg(w, http.StatusBadRequest, err.Error())
		return
	}
	base, err := db.GetConfigsBySiteAndType(h.DB, site.ID, configType)
	if err != nil {
		logger.Error("apiImportConfig: failed to fetch existing config: %v", err)
		apiutil.ErrorMsg(w, http.StatusInternalServerError, "could not load configuration")
		return
	}
	discardConfigPlaceholders(values)
	for key, value := range values {
		base[key] = value
	}

	if configType == models.ConfigProxyCache {
		if _, err := cache.ParseSettings(base); err != nil {
			logger.Error("apiImportConfig: invalid proxy cache config for site %d: %v", site.ID, err)
			apiutil.ErrorMsg(w, http.StatusBadRequest, err.Error())
			return
		}
	}

	if err := db.SetConfigs(h.DB, site.ID, configType, base); err != nil {
		logger.Error("apiImportConfig: failed to set config for site %d type %d: %v", site.ID, configType, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	blob, err := json.Marshal(base)
	if err != nil {
		logger.Error("apiImportConfig: failed to marshal config: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	if err := h.rewriteConfigFile(site, configType, string(blob)); err != nil {
		logger.Error("apiImportConfig: failed to rewrite config file for site %d type %d: %v", site.ID, configType, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("apiImportConfig: imported config for site %d type %d", site.ID, configType)
	apiutil.JSON(w, http.StatusOK, publicConfig(base))
}

func (h *Handler) rewriteConfigFile(site *models.Site, configType int, blob string) error {
	siteDir, err := fileutil.SiteDir(h.sitesBase(), site.Name)
	if err != nil {
		return err
	}

	switch configType {
	case models.ConfigNginx:
		varnishKV, _ := db.GetConfigsBySiteAndType(h.DB, site.ID, models.ConfigVarnish)
		vEnabled := false
		if len(varnishKV) > 0 {
			vb, _ := json.Marshal(varnishKV)
			vEnabled = config.VarnishEnabled(string(vb))
		}

		main, err := config.RenderNginxMain(blob, site.SiteType)
		if err != nil {
			logger.Error("failed to render nginx main config for site %d: %v", site.ID, err)
			return err
		}
		if err := fileutil.WriteFile(siteDir, "nginx/nginx.conf", main, 0644); err != nil {
			return err
		}
		burst := h.WPUpdate.Burst(context.Background(), site, siteDir)
		site_, err := config.RenderNginxSite(blob, site.SiteType, vEnabled, burst)
		if err != nil {
			logger.Error("failed to render nginx site config for site %d: %v", site.ID, err)
			return err
		}
		if err := fileutil.WriteFile(siteDir, "nginx/conf.d/site.conf", site_, 0644); err != nil {
			return err
		}
		if err := h.Podman.KillContainer(context.Background(), podman.ContainerName(site.Name, "nginx"), "HUP"); err != nil {
			logger.Warn("nginx reload after config save failed for site %d (pod may be stopped): %v", site.ID, err)
		}
		return nil

	case models.ConfigPHP:
		smtpEnabled, _, err := db.GetConfigValue(h.DB, site.ID, models.ConfigSMTP, "enabled")
		if err != nil {
			logger.Error("failed to read SMTP enabled setting for site %d: %v", site.ID, err)
			return err
		}
		fpm, err := config.RenderPHPFPM(blob, sftp.UIDForSite(site.ID))
		if err != nil {
			logger.Error("failed to render php-fpm config for site %d: %v", site.ID, err)
			return err
		}
		if err := fileutil.WriteFile(siteDir, "php-fpm/www.conf", fpm, 0644); err != nil {
			return err
		}
		ini, err := config.RenderPHPIniWithSMTP(blob, smtpEnabled == "true")
		if err != nil {
			logger.Error("failed to render php.ini config for site %d: %v", site.ID, err)
			return err
		}
		if err := fileutil.WriteFile(siteDir, "php-fpm/php.ini", ini, 0644); err != nil {
			return err
		}
		if err := h.Podman.KillContainer(context.Background(), podman.ContainerName(site.Name, "php"), "USR2"); err != nil {
			logger.Warn("php-fpm reload after config save failed for site %d (pod may be stopped): %v", site.ID, err)
		}
		return nil

	case models.ConfigMariaDB:
		my, err := config.RenderMariaDB(blob)
		if err != nil {
			logger.Error("failed to render mariadb config for site %d: %v", site.ID, err)
			return err
		}
		if err := fileutil.WriteFile(siteDir, "db/my.cnf", my, 0640); err != nil {
			return err
		}
		if err := h.Podman.RestartContainer(context.Background(), podman.ContainerName(site.Name, "db")); err != nil {
			logger.Warn("mariadb restart after config save failed for site %d (pod may be stopped): %v", site.ID, err)
		}
		return nil

	case models.ConfigRedis:
		redisPass, err := fileutil.ReadEnvValue(h.sitesBase(), site.Name, "REDIS_PASS")
		if err != nil {
			logger.Error("failed to read REDIS_PASS from .env for site %d: %v", site.ID, err)
			return err
		}
		redisCfg, err := config.RenderRedis(blob, redisPass)
		if err != nil {
			logger.Error("failed to render redis config for site %d: %v", site.ID, err)
			return err
		}
		if err := fileutil.WriteFile(siteDir, "redis/redis.conf", redisCfg, 0640); err != nil {
			return err
		}
		if err := h.Podman.RestartContainer(context.Background(), podman.ContainerName(site.Name, "redis")); err != nil {
			logger.Warn("redis restart after config save failed for site %d (pod may be stopped): %v", site.ID, err)
		}
		return nil

	case models.ConfigProxyCache:
		var kv map[string]string
		if err := json.Unmarshal([]byte(blob), &kv); err != nil {
			logger.Error("failed to unmarshal proxy cache config for site %d: %v", site.ID, err)
			return err
		}
		if err := h.Proxy.UpdateRespCache(site.ID, kv); err != nil {
			logger.Error("failed to apply proxy cache config for site %d: %v", site.ID, err)
			return err
		}
		return nil

	case models.ConfigVarnish:
		vclContent, err := config.RenderVarnish(blob)
		if err != nil {
			logger.Error("failed to render varnish VCL for site %d: %v", site.ID, err)
			return err
		}
		if err := fileutil.WriteFile(siteDir, "varnish/default.vcl", vclContent, 0644); err != nil {
			return err
		}

		nginxKV, err := db.GetConfigsBySiteAndType(h.DB, site.ID, models.ConfigNginx)
		if err != nil || len(nginxKV) == 0 {
			logger.Error("failed to fetch nginx config during varnish rewrite for site %d: %v", site.ID, err)
			return err
		}
		nginxBlob, err := json.Marshal(nginxKV)
		if err != nil {
			logger.Error("failed to marshal nginx config during varnish rewrite for site %d: %v", site.ID, err)
			return err
		}
		vEnabled := config.VarnishEnabled(blob)
		main, err := config.RenderNginxMain(string(nginxBlob), site.SiteType)
		if err != nil {
			logger.Error("failed to render nginx main during varnish rewrite for site %d: %v", site.ID, err)
			return err
		}
		if err := fileutil.WriteFile(siteDir, "nginx/nginx.conf", main, 0644); err != nil {
			return err
		}
		burst := h.WPUpdate.Burst(context.Background(), site, siteDir)
		site_, err := config.RenderNginxSite(string(nginxBlob), site.SiteType, vEnabled, burst)
		if err != nil {
			logger.Error("failed to render nginx site block during varnish rewrite for site %d: %v", site.ID, err)
			return err
		}
		if err := fileutil.WriteFile(siteDir, "nginx/conf.d/site.conf", site_, 0644); err != nil {
			return err
		}
		if vEnabled {
			if err := h.Podman.ReloadVarnish(context.Background(), podman.ContainerName(site.Name, "varnish")); err != nil {
				logger.Warn("varnish VCL reload after config save failed for site %d (pod may be stopped): %v", site.ID, err)
			}
		} else {
			name := podman.ContainerName(site.Name, "varnish")
			if exists, _ := h.Podman.ContainerExists(context.Background(), name); exists {
				if err := h.Podman.RemoveContainer(context.Background(), name); err != nil {
					logger.Error("failed to remove varnish container for site %d after disable: %v", site.ID, err)
					return err
				}
			}
		}
		if err := h.Podman.RestartContainer(context.Background(), podman.ContainerName(site.Name, "nginx")); err != nil {
			logger.Warn("nginx restart after varnish config save failed for site %d (pod may be stopped): %v", site.ID, err)
		}

		return nil
	}

	logger.Error("invalid config type for site %d: %d", site.ID, configType)
	return nil
}

func resolveConfigType(w http.ResponseWriter, r *http.Request) (int, error) {
	typeStr := r.PathValue("type")
	t, err := strconv.Atoi(typeStr)
	if err != nil || t < 1 || t > 6 {
		logger.Error("invalid config type in path: %s", typeStr)
		apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid config type — must be 1 (nginx), 2 (php), 3 (mariadb), 4 (redis), 5 (varnish), or 6 (proxy cache)")
		return 0, fmt.Errorf("invalid config type: %s", typeStr)
	}
	logger.Debug("resolved config type from path: %d", t)
	return t, nil
}
