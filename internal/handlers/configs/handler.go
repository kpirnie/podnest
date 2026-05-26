package configs

import (
	"context"
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"podnest/internal/apiutil"
	"podnest/internal/config"
	"podnest/internal/db"
	"podnest/internal/fileutil"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/podman"
	"podnest/internal/sftp"
)

// ConfigPodman is the subset of podman.Client consumed by this handler.
type ConfigPodman interface {
	KillContainer(ctx context.Context, name, signal string) error
	RestartContainer(ctx context.Context, name string) error
	ReloadVarnish(ctx context.Context, name string) error
}

// Handler handles site configuration management API routes.
type Handler struct {
	DB      *sql.DB
	AppPath string
	Podman  ConfigPodman
	Resolve modules.SiteResolver
}

// RegisterRoutes mounts config management routes onto api.
func (h *Handler) RegisterRoutes(api *http.ServeMux) {
	api.HandleFunc("GET /sites/{id}/configs", h.apiGetConfigs)
	api.HandleFunc("PUT /sites/{id}/configs/{type}", h.apiUpdateConfig)
	api.HandleFunc("POST /sites/{id}/configs/{type}/reset", h.apiResetConfig)
	api.HandleFunc("GET /sites/{id}/configs/{type}/export", h.apiExportConfig)
	api.HandleFunc("POST /sites/{id}/configs/{type}/import", h.apiImportConfig)
}

func (h *Handler) sitesBase() string {
	return h.AppPath + "/sites"
}

func (h *Handler) apiGetConfigs(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		logger.Error("failed to resolve site for config fetch: %v", r)
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

	logger.Debug("fetched configs for site %d: %d types", site.ID, len(out))
	apiutil.JSON(w, http.StatusOK, out)
}

func (h *Handler) apiUpdateConfig(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		logger.Error("failed to resolve site for config update: %v", r)
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
	apiutil.JSON(w, http.StatusOK, incoming)
}

func (h *Handler) apiResetConfig(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		logger.Error("failed to resolve site for config reset: %v", r)
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
	apiutil.JSON(w, http.StatusOK, defaults)
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

	filename := fmt.Sprintf("%s-config-%d.csv", site.Name, configType)
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))

	cw := csv.NewWriter(w)
	_ = cw.Write([]string{"key", "value"})
	for k, v := range kv {
		_ = cw.Write([]string{k, v})
	}
	cw.Flush()

	logger.Debug("apiExportConfig: exported config for site %d type %d", site.ID, configType)
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

	if err := r.ParseMultipartForm(1 << 20); err != nil {
		logger.Error("apiImportConfig: failed to parse multipart form: %v", err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	f, _, err := r.FormFile("file")
	if err != nil {
		logger.Error("apiImportConfig: missing file field: %v", err)
		apiutil.ErrorMsg(w, http.StatusBadRequest, "file field is required")
		return
	}
	defer f.Close()

	base, err := db.GetConfigsBySiteAndType(h.DB, site.ID, configType)
	if err != nil {
		logger.Error("apiImportConfig: failed to fetch existing config: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if base == nil {
		base = make(map[string]string)
	}

	cr := csv.NewReader(io.LimitReader(f, 1<<20))
	cr.FieldsPerRecord = 2
	cr.Comment = '#'

	header, err := cr.Read()
	if err != nil {
		logger.Error("apiImportConfig: failed to read CSV: %v", err)
		apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid CSV")
		return
	}
	if strings.ToLower(header[0]) != "key" {
		if header[1] == "" {
			delete(base, header[0])
		} else {
			base[header[0]] = header[1]
		}
	}

	for {
		rec, err := cr.Read()
		if err != nil {
			break
		}
		if rec[1] == "" {
			delete(base, rec[0])
		} else {
			base[rec[0]] = rec[1]
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
	apiutil.JSON(w, http.StatusOK, base)
}

func (h *Handler) rewriteConfigFile(site *models.Site, configType int, blob string) error {
	siteDir := h.sitesBase() + "/" + site.Name

	switch configType {
	case models.ConfigNginx:
		varnishKV, _ := db.GetConfigsBySiteAndType(h.DB, site.ID, models.ConfigVarnish)
		vEnabled := false
		if len(varnishKV) > 0 {
			vb, _ := json.Marshal(varnishKV)
			vEnabled = config.VarnishEnabled(string(vb))
		}

		main, err := config.RenderNginxMain(blob)
		if err != nil {
			logger.Error("failed to render nginx main config for site %d: %v", site.ID, err)
			return err
		}
		if err := fileutil.WriteFile(siteDir+"/nginx/nginx.conf", main, 0644); err != nil {
			return err
		}
		site_, err := config.RenderNginxSite(blob, site.SiteType, vEnabled)
		if err != nil {
			logger.Error("failed to render nginx site config for site %d: %v", site.ID, err)
			return err
		}
		if err := fileutil.WriteFile(siteDir+"/nginx/conf.d/site.conf", site_, 0644); err != nil {
			return err
		}
		if err := h.Podman.KillContainer(context.Background(), podman.ContainerName(site.Name, "nginx"), "HUP"); err != nil {
			logger.Warn("nginx reload after config save failed for site %d (pod may be stopped): %v", site.ID, err)
		}
		return nil

	case models.ConfigPHP:
		fpm, err := config.RenderPHPFPM(blob, sftp.UIDForSite(site.ID))
		if err != nil {
			logger.Error("failed to render php-fpm config for site %d: %v", site.ID, err)
			return err
		}
		if err := fileutil.WriteFile(siteDir+"/php-fpm/www.conf", fpm, 0644); err != nil {
			return err
		}
		ini, err := config.RenderPHPIni(blob)
		if err != nil {
			logger.Error("failed to render php.ini config for site %d: %v", site.ID, err)
			return err
		}
		if err := fileutil.WriteFile(siteDir+"/php-fpm/php.ini", ini, 0644); err != nil {
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
		if err := fileutil.WriteFile(siteDir+"/db/my.cnf", my, 0640); err != nil {
			return err
		}
		if err := h.Podman.RestartContainer(context.Background(), podman.ContainerName(site.Name, "db")); err != nil {
			logger.Warn("mariadb restart after config save failed for site %d (pod may be stopped): %v", site.ID, err)
		}
		return nil

	case models.ConfigRedis:
		redisPass, err := fileutil.ReadEnvValue(siteDir+"/.env", "REDIS_PASS")
		if err != nil {
			logger.Error("failed to read REDIS_PASS from .env for site %d: %v", site.ID, err)
			return err
		}
		redisCfg, err := config.RenderRedis(blob, redisPass)
		if err != nil {
			logger.Error("failed to render redis config for site %d: %v", site.ID, err)
			return err
		}
		if err := fileutil.WriteFile(siteDir+"/redis/redis.conf", redisCfg, 0640); err != nil {
			return err
		}
		if err := h.Podman.RestartContainer(context.Background(), podman.ContainerName(site.Name, "redis")); err != nil {
			logger.Warn("redis restart after config save failed for site %d (pod may be stopped): %v", site.ID, err)
		}
		return nil

	case models.ConfigVarnish:
		vclContent, err := config.RenderVarnish(blob)
		if err != nil {
			logger.Error("failed to render varnish VCL for site %d: %v", site.ID, err)
			return err
		}
		if err := fileutil.WriteFile(siteDir+"/varnish/default.vcl", vclContent, 0644); err != nil {
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
		main, err := config.RenderNginxMain(string(nginxBlob))
		if err != nil {
			logger.Error("failed to render nginx main during varnish rewrite for site %d: %v", site.ID, err)
			return err
		}
		if err := fileutil.WriteFile(siteDir+"/nginx/nginx.conf", main, 0644); err != nil {
			return err
		}
		site_, err := config.RenderNginxSite(string(nginxBlob), site.SiteType, vEnabled)
		if err != nil {
			logger.Error("failed to render nginx site block during varnish rewrite for site %d: %v", site.ID, err)
			return err
		}
		if err := fileutil.WriteFile(siteDir+"/nginx/conf.d/site.conf", site_, 0644); err != nil {
			return err
		}
		if err := h.Podman.ReloadVarnish(context.Background(), podman.ContainerName(site.Name, "varnish")); err != nil {
			logger.Warn("varnish VCL reload after config save failed for site %d (pod may be stopped): %v", site.ID, err)
		}
		if err := h.Podman.KillContainer(context.Background(), podman.ContainerName(site.Name, "nginx"), "HUP"); err != nil {
			logger.Warn("nginx reload after varnish config save failed for site %d (pod may be stopped): %v", site.ID, err)
		}
		return nil
	}

	logger.Error("invalid config type for site %d: %d", site.ID, configType)
	return nil
}

func resolveConfigType(w http.ResponseWriter, r *http.Request) (int, error) {
	typeStr := r.PathValue("type")
	t, err := strconv.Atoi(typeStr)
	if err != nil || t < 1 || t > 5 {
		logger.Error("invalid config type in path: %s", typeStr)
		apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid config type — must be 1 (nginx), 2 (php), 3 (mariadb), 4 (redis), or 5 (varnish)")
		return 0, fmt.Errorf("invalid config type: %s", typeStr)
	}
	logger.Debug("resolved config type from path: %d", t)
	return t, nil
}
