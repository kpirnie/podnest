package server

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"podnest/internal/config"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/podman"
	"podnest/internal/sftp"
)

// apiGetConfigs returns all configs for a site grouped by type as {type: {key: value}}
func (s *Server) apiGetConfigs(w http.ResponseWriter, r *http.Request) {

	// grab the site from the request path
	site, ok := s.resolveSite(w, r)
	if !ok {
		logger.Error("failed to resolve site for config fetch: %v", r)
		return
	}

	// fetch all KV pairs for the site grouped by type
	out, err := db.GetAllConfigsBySite(s.cfg.DB, site.ID)
	if err != nil {
		logger.Error("failed to fetch configs for site %d: %v", site.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// return an empty map rather than null if the site has no configs yet
	if out == nil {
		out = make(map[int]map[string]string)
	}

	logger.Debug("fetched configs for site %d: %d types", site.ID, len(out))
	apiJSON(w, http.StatusOK, out)
}

// apiUpdateConfig replaces all keys for a site+type with the incoming map —
// keys absent from the payload are deleted from the DB
func (s *Server) apiUpdateConfig(w http.ResponseWriter, r *http.Request) {

	// grab the site and config type from the request path
	site, ok := s.resolveSite(w, r)
	if !ok {
		logger.Error("failed to resolve site for config update: %v", r)
		return
	}

	configType, err := resolveConfigType(w, r)
	if err != nil {
		logger.Error("failed to resolve config type for config update: %v", r)
		return
	}

	// decode the incoming KV map — this IS the complete config, no merging
	var incoming map[string]string
	if err := json.NewDecoder(r.Body).Decode(&incoming); err != nil {
		logger.Error("failed to decode request body for config update: %v", err)
		apiError(w, http.StatusBadRequest, err)
		return
	}

	// full replace — keys absent from incoming are deleted from the DB
	if err := db.SetConfigs(s.cfg.DB, site.ID, configType, incoming); err != nil {
		logger.Error("failed to set configs for site %d type %d: %v", site.ID, configType, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// marshal the KV map to JSON for the render functions
	blob, err := json.Marshal(incoming)
	if err != nil {
		logger.Error("failed to marshal config for site %d type %d: %v", site.ID, configType, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// rewrite the config file(s) on disk
	if err := s.rewriteConfigFile(site, configType, string(blob)); err != nil {
		logger.Error("failed to rewrite config file for site %d type %d: %v", site.ID, configType, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("updated config for site %d type %d", site.ID, configType)
	apiJSON(w, http.StatusOK, incoming)
}

// apiResetConfig restores defaults for a site+type and rewrites the config file(s) on disk
func (s *Server) apiResetConfig(w http.ResponseWriter, r *http.Request) {

	// grab the site and config type from the request path
	site, ok := s.resolveSite(w, r)
	if !ok {
		logger.Error("failed to resolve site for config reset: %v", r)
		return
	}

	configType, err := resolveConfigType(w, r)
	if err != nil {
		logger.Error("failed to resolve config type for config reset: %v", r)
		return
	}

	// get the default KV map for this config type
	defaults, err := config.DefaultsForType(configType)
	if err != nil {
		logger.Error("failed to get defaults for site %d type %d: %v", site.ID, configType, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// full replace with defaults
	if err := db.SetConfigs(s.cfg.DB, site.ID, configType, defaults); err != nil {
		logger.Error("failed to set default configs for site %d type %d: %v", site.ID, configType, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// marshal for the render functions
	blob, err := json.Marshal(defaults)
	if err != nil {
		logger.Error("failed to marshal defaults for site %d type %d: %v", site.ID, configType, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// rewrite the config file(s) on disk
	if err := s.rewriteConfigFile(site, configType, string(blob)); err != nil {
		logger.Error("failed to rewrite config file for site %d type %d: %v", site.ID, configType, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("reset site config for site %d type %d", site.ID, configType)
	apiJSON(w, http.StatusOK, defaults)
}

// rewriteConfigFile renders and writes the appropriate config file(s) to disk;
// blob is a JSON-marshaled map[string]string for the given config type
func (s *Server) rewriteConfigFile(site *models.Site, configType int, blob string) error {

	// setup the site directory path based on the site name
	siteDir := s.sitesBase() + "/" + site.Name

	switch configType {
	case models.ConfigNginx:

		// load the varnish KV map to determine the correct nginx listen port
		varnishKV, _ := db.GetConfigsBySiteAndType(s.cfg.DB, site.ID, models.ConfigVarnish)
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
		if err := writeFile(siteDir+"/nginx/nginx.conf", main, 0644); err != nil {
			logger.Error("failed to write nginx main config for site %d: %v", site.ID, err)
			return err
		}
		site_, err := config.RenderNginxSite(blob, site.SiteType, vEnabled)
		if err != nil {
			logger.Error("failed to render nginx site config for site %d: %v", site.ID, err)
			return err
		}
		if err := writeFile(siteDir+"/nginx/conf.d/site.conf", site_, 0644); err != nil {
			logger.Error("failed to write nginx site config for site %d: %v", site.ID, err)
			return err
		}
		// hot-reload nginx — best-effort, pod may be stopped
		if err := s.podman.KillContainer(context.Background(), podman.ContainerName(site.Name, "nginx"), "HUP"); err != nil {
			logger.Warn("nginx reload after config save failed for site %d (pod may be stopped): %v", site.ID, err)
		}
		return nil

	case models.ConfigPHP:

		// render the php-fpm and php.ini config files and write them to disk
		fpm, err := config.RenderPHPFPM(blob, sftp.UIDForSite(site.ID))
		if err != nil {
			logger.Error("failed to render php-fpm config for site %d: %v", site.ID, err)
			return err
		}
		if err := writeFile(siteDir+"/php-fpm/www.conf", fpm, 0644); err != nil {
			logger.Error("failed to write php-fpm config for site %d: %v", site.ID, err)
			return err
		}
		ini, err := config.RenderPHPIni(blob)
		if err != nil {
			logger.Error("failed to render php.ini config for site %d: %v", site.ID, err)
			return err
		}
		if err := writeFile(siteDir+"/php-fpm/php.ini", ini, 0644); err != nil {
			logger.Error("failed to write php.ini config for site %d: %v", site.ID, err)
			return err
		}
		// hot-reload php-fpm via SIGUSR2 — best-effort, pod may be stopped
		if err := s.podman.KillContainer(context.Background(), podman.ContainerName(site.Name, "php"), "USR2"); err != nil {
			logger.Warn("php-fpm reload after config save failed for site %d (pod may be stopped): %v", site.ID, err)
		}
		return nil

	case models.ConfigMariaDB:

		// render the mariadb config file and write it to disk
		my, err := config.RenderMariaDB(blob)
		if err != nil {
			logger.Error("failed to render mariadb config for site %d: %v", site.ID, err)
			return err
		}
		if err := writeFile(siteDir+"/db/my.cnf", my, 0640); err != nil {
			logger.Error("failed to write mariadb config for site %d: %v", site.ID, err)
			return err
		}
		// restart mariadb to apply config changes — best-effort, pod may be stopped
		if err := s.podman.RestartContainer(context.Background(), podman.ContainerName(site.Name, "db")); err != nil {
			logger.Warn("mariadb restart after config save failed for site %d (pod may be stopped): %v", site.ID, err)
		}
		return nil

	case models.ConfigRedis:

		// redis needs the password from the .env file
		redisPass, err := readEnvValue(siteDir+"/.env", "REDIS_PASS")
		if err != nil {
			logger.Error("failed to read REDIS_PASS from .env for site %d: %v", site.ID, err)
			return err
		}
		redisCfg, err := config.RenderRedis(blob, redisPass)
		if err != nil {
			logger.Error("failed to render redis config for site %d: %v", site.ID, err)
			return err
		}
		if err := writeFile(siteDir+"/redis/redis.conf", redisCfg, 0640); err != nil {
			logger.Error("failed to write redis config for site %d: %v", site.ID, err)
			return err
		}
		// restart redis to apply config changes — best-effort, pod may be stopped
		if err := s.podman.RestartContainer(context.Background(), podman.ContainerName(site.Name, "redis")); err != nil {
			logger.Warn("redis restart after config save failed for site %d (pod may be stopped): %v", site.ID, err)
		}
		return nil

	case models.ConfigVarnish:

		// rewrite the VCL file from the updated config blob
		vclContent, err := config.RenderVarnish(blob)
		if err != nil {
			logger.Error("failed to render varnish VCL for site %d: %v", site.ID, err)
			return err
		}
		if err := writeFile(siteDir+"/varnish/default.vcl", vclContent, 0644); err != nil {
			logger.Error("failed to write varnish VCL for site %d: %v", site.ID, err)
			return err
		}

		// rewrite nginx so its listen port reflects the updated varnish enabled state
		nginxKV, err := db.GetConfigsBySiteAndType(s.cfg.DB, site.ID, models.ConfigNginx)
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
		if err := writeFile(siteDir+"/nginx/nginx.conf", main, 0644); err != nil {
			logger.Error("failed to write nginx main during varnish rewrite for site %d: %v", site.ID, err)
			return err
		}
		site_, err := config.RenderNginxSite(string(nginxBlob), site.SiteType, vEnabled)
		if err != nil {
			logger.Error("failed to render nginx site block during varnish rewrite for site %d: %v", site.ID, err)
			return err
		}
		if err := writeFile(siteDir+"/nginx/conf.d/site.conf", site_, 0644); err != nil {
			logger.Error("failed to write nginx site block during varnish rewrite for site %d: %v", site.ID, err)
			return err
		}
		// hot-reload varnish VCL and nginx listen port — best-effort, pod may be stopped
		if err := s.podman.ReloadVarnish(context.Background(), podman.ContainerName(site.Name, "varnish")); err != nil {
			logger.Warn("varnish VCL reload after config save failed for site %d (pod may be stopped): %v", site.ID, err)
		}
		if err := s.podman.KillContainer(context.Background(), podman.ContainerName(site.Name, "nginx"), "HUP"); err != nil {
			logger.Warn("nginx reload after varnish config save failed for site %d (pod may be stopped): %v", site.ID, err)
		}
		return nil
	}

	// if we somehow got here, the config type is invalid
	logger.Error("invalid config type for site %d: %d", site.ID, configType)
	return nil
}

// resolveConfigType parses and validates the {type} path value
func resolveConfigType(w http.ResponseWriter, r *http.Request) (int, error) {

	// parse the type path value as an int
	typeStr := r.PathValue("type")
	t, err := strconv.Atoi(typeStr)

	// validate that the type is 1 (nginx), 2 (php), 3 (mariadb), 4 (redis), 5 (varnish)
	if err != nil || t < 1 || t > 5 {
		logger.Error("invalid config type in path: %s", typeStr)
		apiErrorMsg(w, http.StatusBadRequest, "invalid config type — must be 1 (nginx), 2 (php), 3 (mariadb), 4 (redis), or 5 (varnish)")
		return 0, err
	}

	logger.Debug("resolved config type from path: %d", t)
	return t, nil
}

// apiExportConfig streams a single config type as a CSV download
func (s *Server) apiExportConfig(w http.ResponseWriter, r *http.Request) {

	// grab the site and config type from the path
	site, ok := s.resolveSite(w, r)
	if !ok {
		logger.Error("apiExportConfig: failed to resolve site")
		return
	}

	configType, err := resolveConfigType(w, r)
	if err != nil {
		logger.Error("apiExportConfig: failed to resolve config type")
		return
	}

	// fetch the KV map from the DB
	kv, err := db.GetConfigsBySiteAndType(s.cfg.DB, site.ID, configType)
	if err != nil {
		logger.Error("apiExportConfig: failed to fetch config for site %d type %d: %v", site.ID, configType, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// stream as a CSV attachment
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

// apiImportConfig reads a CSV upload and replaces the existing config for a site+type
func (s *Server) apiImportConfig(w http.ResponseWriter, r *http.Request) {

	// grab the site and config type from the path
	site, ok := s.resolveSite(w, r)
	if !ok {
		logger.Error("apiImportConfig: failed to resolve site")
		return
	}

	configType, err := resolveConfigType(w, r)
	if err != nil {
		logger.Error("apiImportConfig: failed to resolve config type")
		return
	}

	// parse the multipart form — limit to 1MB
	if err := r.ParseMultipartForm(1 << 20); err != nil {
		logger.Error("apiImportConfig: failed to parse multipart form: %v", err)
		apiError(w, http.StatusBadRequest, err)
		return
	}

	// pull the uploaded file from the "file" field
	f, _, err := r.FormFile("file")
	if err != nil {
		logger.Error("apiImportConfig: missing file field: %v", err)
		apiErrorMsg(w, http.StatusBadRequest, "file field is required")
		return
	}
	defer f.Close()

	// fetch the existing KV map as the merge base
	base, err := db.GetConfigsBySiteAndType(s.cfg.DB, site.ID, configType)
	if err != nil {
		logger.Error("apiImportConfig: failed to fetch existing config: %v", err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	if base == nil {
		base = make(map[string]string)
	}

	// parse the CSV and merge rows into the base map
	cr := csv.NewReader(io.LimitReader(f, 1<<20))
	cr.FieldsPerRecord = 2
	cr.Comment = '#'

	// read and discard the header row if present
	header, err := cr.Read()
	if err != nil {
		logger.Error("apiImportConfig: failed to read CSV: %v", err)
		apiErrorMsg(w, http.StatusBadRequest, "invalid CSV")
		return
	}
	if strings.ToLower(header[0]) != "key" {
		// not a header row — treat as data
		if header[1] == "" {
			delete(base, header[0])
		} else {
			base[header[0]] = header[1]
		}
	}

	// process remaining rows
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

	// full replace with the merged result
	if err := db.SetConfigs(s.cfg.DB, site.ID, configType, base); err != nil {
		logger.Error("apiImportConfig: failed to set config for site %d type %d: %v", site.ID, configType, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// marshal for the render functions
	blob, err := json.Marshal(base)
	if err != nil {
		logger.Error("apiImportConfig: failed to marshal config: %v", err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// rewrite the config file on disk
	if err := s.rewriteConfigFile(site, configType, string(blob)); err != nil {
		logger.Error("apiImportConfig: failed to rewrite config file for site %d type %d: %v", site.ID, configType, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("apiImportConfig: imported config for site %d type %d", site.ID, configType)
	apiJSON(w, http.StatusOK, base)
}
