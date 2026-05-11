package server

import (
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
	"podnest/internal/sftp"
)

// get the configs for a site, grouped by type, and return them as a JSON object of the form {type: {key: value}}
func (s *Server) apiGetConfigs(w http.ResponseWriter, r *http.Request) {

	// grab the site and all configs for that site from the DB
	site, ok := s.resolveSite(w, r)
	if !ok {
		logger.Error("failed to resolve site for config fetch: %v", r)
		return
	}

	// grab the configs for the site ID
	configs, err := db.GetConfigsBySite(s.cfg.DB, site.ID)
	if err != nil {
		logger.Error("failed to fetch configs for site %d: %v", site.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// setup a map of config type to KV map, and unmarshal each config blob into the appropriate place in the map
	out := make(map[int]map[string]string)

	// iterate over the configs, unmarshal the blob into a KV map, and add it to the output map under the appropriate type
	for _, c := range configs {
		var m map[string]string
		if err := json.Unmarshal([]byte(c.Config), &m); err != nil {
			logger.Error("failed to unmarshal config for site %d, type %d: %v", site.ID, c.Type, err)
			apiError(w, http.StatusInternalServerError, err)
			return
		}

		// add the config map to the output under the appropriate type
		logger.Debug("fetched config for site %d, type %d: %v", site.ID, c.Type, m)
		out[c.Type] = m
	}

	// log the final output map and write it to the response
	logger.Debug("fetched configs for site %d: %v", site.ID, out)
	apiJSON(w, http.StatusOK, out)
}

// update a config by merging the incoming KV map over the existing config blob, writing the merged result back to the DB, and re-rendering the appropriate config file(s) to disk
func (s *Server) apiUpdateConfig(w http.ResponseWriter, r *http.Request) {

	// grab the site all configs for that site from the DB
	site, ok := s.resolveSite(w, r)
	if !ok {
		logger.Error("failed to resolve site for config update: %v", r)
		return
	}

	// resolve the config type from the path
	configType, err := resolveConfigType(w, r)
	if err != nil {
		logger.Error("failed to resolve config type for config update: %v", r)
		return
	}

	// setup the incoming KV map and decode the request body into it — this will be merged over the existing config blob
	var incoming map[string]string
	if err := json.NewDecoder(r.Body).Decode(&incoming); err != nil {
		logger.Error("failed to decode request body for config update: %v", err)
		apiError(w, http.StatusBadRequest, err)
		return
	}

	// fetch the existing config blob from the DB, unmarshal it into a KV map, merge the incoming map over it, marshal the merged result back to a blob, and write it back to the DB
	existing, err := db.GetConfigBySiteAndType(s.cfg.DB, site.ID, configType)
	if err != nil {
		logger.Error("failed to fetch existing config for site %d, type %d: %v", site.ID, configType, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// setup a base map to hold the existing config values, unmarshal the existing blob into it if it exists, and merge the incoming values over it (deleting any keys where the incoming value is an empty string)
	base := make(map[string]string)
	if existing != nil {
		if err := json.Unmarshal([]byte(existing.Config), &base); err != nil {
			logger.Error("failed to unmarshal existing config for site %d, type %d: %v", site.ID, configType, err)
			apiError(w, http.StatusInternalServerError, err)
			return
		}
	}

	// merge the incoming values over the existing values, deleting any keys where the incoming value is an empty string
	for k, v := range incoming {
		if v == "" {
			delete(base, k)
		} else {
			base[k] = v
		}
	}

	// marshal the merged config back to a blob and write it back to the DB
	blob, err := json.Marshal(base)
	if err != nil {
		logger.Error("failed to marshal merged config for site %d, type %d: %v", site.ID, configType, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// setup the config model
	cfg := &models.Config{
		SiteID: site.ID,
		Type:   configType,
		Config: string(blob),
	}

	// upsert the config back to the DB
	if err := db.UpsertConfig(s.cfg.DB, cfg); err != nil {
		logger.Error("failed to upsert merged config for site %d, type %d: %v", site.ID, configType, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// rewrite the appropriate config file(s) to disk based on the merged config blob
	if err := s.rewriteConfigFile(site, configType, string(blob)); err != nil {
		logger.Error("failed to rewrite config file for site %d, type %d: %v", site.ID, configType, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// setup a response map of the merged config values and write it to the response
	var out map[string]string

	// unmarshal the merged config blob into the response map and write it to the response
	if err := json.Unmarshal(blob, &out); err != nil {
		logger.Error("failed to unmarshal merged config for site %d, type %d: %v", site.ID, configType, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// we made it this far, reply back with the json
	logger.Debug("updated config for site: %d", site.ID)
	apiJSON(w, http.StatusOK, out)
}

// reset a config by writing the default config blob to the DB and re-rendering the appropriate config file(s) to disk
func (s *Server) apiResetConfig(w http.ResponseWriter, r *http.Request) {

	// grab the site all configs for that site from the DB
	site, ok := s.resolveSite(w, r)
	if !ok {
		logger.Error("failed to resolve site for config reset: %v", r)
		return
	}

	// resolve the config type from the path
	configType, err := resolveConfigType(w, r)
	if err != nil {
		logger.Error("failed to resolve config type for config reset: %v", r)
		return
	}

	// get the default config blob for the config type, write it to the DB, and rewrite the appropriate config file(s) to disk
	blob, err := config.MarshalDefaults(configType)
	if err != nil {
		logger.Error("failed to marshal default config for site %d, type %d: %v", site.ID, configType, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// setup the config model
	cfg := &models.Config{
		SiteID: site.ID,
		Type:   configType,
		Config: blob,
	}

	// upsert the config back to the DB
	if err := db.UpsertConfig(s.cfg.DB, cfg); err != nil {
		logger.Error("failed to upsert default config for site %d, type %d: %v", site.ID, configType, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// rewrite the appropriate config file(s) to disk based on the default config blob
	if err := s.rewriteConfigFile(site, configType, blob); err != nil {
		logger.Error("failed to rewrite config file for site %d, type %d: %v", site.ID, configType, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// setup a response map of the merged config values and write it to the response
	var out map[string]string

	// unmarshal the default config blob into the response map and write it to the response
	if err := json.Unmarshal([]byte(blob), &out); err != nil {
		logger.Error("failed to unmarshal default config for site %d, type %d: %v", site.ID, configType, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// we made it this far, reply back with the json
	logger.Debug("reset site config for site id: %d", site.ID)
	apiJSON(w, http.StatusOK, out)
}

// rewriteConfigFile renders and writes the appropriate config file(s) to disk
func (s *Server) rewriteConfigFile(site *models.Site, configType int, blob string) error {

	// setup the site directory path based on the site name
	siteDir := s.sitesBase() + "/" + site.Name

	// switch on the config type and render/write the appropriate config file(s) to disk based on the merged config blob
	switch configType {
	case models.ConfigNginx:
		// load the varnish config to determine the correct nginx listen port
		varnishCfg, _ := db.GetConfigBySiteAndType(s.cfg.DB, site.ID, models.ConfigVarnish)
		vEnabled := false
		if varnishCfg != nil {
			vEnabled = config.VarnishEnabled(varnishCfg.Config)
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
		return writeFile(siteDir+"/nginx/conf.d/site.conf", site_, 0644)

	case models.ConfigPHP:

		// render the php-fpm and php.ini config files based on the merged config blob and write them to disk
		fpm, err := config.RenderPHPFPM(blob, sftp.UIDForSite(site.ID))
		if err != nil {
			logger.Error("failed to render php-fpm config for site %d: %v", site.ID, err)
			return err
		}

		// write the php-fpm config file to disk
		if err := writeFile(siteDir+"/php-fpm/www.conf", fpm, 0644); err != nil {
			logger.Error("failed to write php-fpm config for site %d: %v", site.ID, err)
			return err
		}

		// render the php.ini config file based on the merged config blob and write it to disk
		ini, err := config.RenderPHPIni(blob)
		if err != nil {
			logger.Error("failed to render php.ini config for site %d: %v", site.ID, err)
			return err
		}

		// write the php.ini config file to disk
		return writeFile(siteDir+"/php-fpm/php.ini", ini, 0644)

	case models.ConfigMariaDB:

		// render the mariadb config file based on the merged config blob and write it to disk
		my, err := config.RenderMariaDB(blob)
		if err != nil {
			logger.Error("failed to render mariadb config for site %d: %v", site.ID, err)
			return err
		}

		// write the mariadb config file to disk
		return writeFile(siteDir+"/db/my.cnf", my, 0640)

	case models.ConfigRedis:

		// redis needs the password — read it from the .env file
		redisPass, err := readEnvValue(siteDir+"/.env", "REDIS_PASS")
		if err != nil {
			logger.Error("failed to read REDIS_PASS from .env for site %d: %v", site.ID, err)
			return err
		}

		// render the redis config file based on the merged config blob and write it to disk
		redisCfg, err := config.RenderRedis(blob, redisPass)
		if err != nil {
			logger.Error("failed to render redis config for site %d: %v", site.ID, err)
			return err
		}

		// write the redis config file to disk
		return writeFile(siteDir+"/redis/redis.conf", redisCfg, 0640)

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
		nginxCfg, err := db.GetConfigBySiteAndType(s.cfg.DB, site.ID, models.ConfigNginx)
		if err != nil || nginxCfg == nil {
			logger.Error("failed to fetch nginx config during varnish rewrite for site %d: %v", site.ID, err)
			return err
		}
		vEnabled := config.VarnishEnabled(blob)
		main, err := config.RenderNginxMain(nginxCfg.Config)
		if err != nil {
			logger.Error("failed to render nginx main during varnish rewrite for site %d: %v", site.ID, err)
			return err
		}
		if err := writeFile(siteDir+"/nginx/nginx.conf", main, 0644); err != nil {
			logger.Error("failed to write nginx main during varnish rewrite for site %d: %v", site.ID, err)
			return err
		}
		site_, err := config.RenderNginxSite(nginxCfg.Config, site.SiteType, vEnabled)
		if err != nil {
			logger.Error("failed to render nginx site block during varnish rewrite for site %d: %v", site.ID, err)
			return err
		}
		return writeFile(siteDir+"/nginx/conf.d/site.conf", site_, 0644)
	}

	// if we somehow got here, the config type is invalid — log an error and return nil since there's no file to write
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

	// if we got here, the type is valid — return it
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

	// fetch the config blob from the DB
	existing, err := db.GetConfigBySiteAndType(s.cfg.DB, site.ID, configType)
	if err != nil {
		logger.Error("apiExportConfig: failed to fetch config for site %d type %d: %v", site.ID, configType, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// unmarshal the blob into a KV map
	var cfg map[string]string
	if existing != nil {
		if err := json.Unmarshal([]byte(existing.Config), &cfg); err != nil {
			logger.Error("apiExportConfig: failed to unmarshal config: %v", err)
			apiError(w, http.StatusInternalServerError, err)
			return
		}
	}

	// stream as a CSV attachment
	filename := fmt.Sprintf("%s-config-%d.csv", site.Name, configType)
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))

	cw := csv.NewWriter(w)
	_ = cw.Write([]string{"key", "value"})
	for k, v := range cfg {
		_ = cw.Write([]string{k, v})
	}
	cw.Flush()

	logger.Debug("apiExportConfig: exported config for site %d type %d", site.ID, configType)
}

// apiImportConfig reads a CSV file upload and merges it over the existing config for a site+type
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

	// fetch the existing config blob and unmarshal it as the merge base
	base := make(map[string]string)
	existing, err := db.GetConfigBySiteAndType(s.cfg.DB, site.ID, configType)
	if err != nil {
		logger.Error("apiImportConfig: failed to fetch existing config: %v", err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	if existing != nil {
		if err := json.Unmarshal([]byte(existing.Config), &base); err != nil {
			logger.Error("apiImportConfig: failed to unmarshal existing config: %v", err)
			apiError(w, http.StatusInternalServerError, err)
			return
		}
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

	// marshal the merged result back to a blob
	blob, err := json.Marshal(base)
	if err != nil {
		logger.Error("apiImportConfig: failed to marshal merged config: %v", err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// upsert the merged config to the DB
	cfg := &models.Config{
		SiteID: site.ID,
		Type:   configType,
		Config: string(blob),
	}
	if err := db.UpsertConfig(s.cfg.DB, cfg); err != nil {
		logger.Error("apiImportConfig: failed to upsert config for site %d type %d: %v", site.ID, configType, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// rewrite the config file on disk
	if err := s.rewriteConfigFile(site, configType, string(blob)); err != nil {
		logger.Error("apiImportConfig: failed to rewrite config file for site %d type %d: %v", site.ID, configType, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// return the merged config as confirmation
	var out map[string]string
	if err := json.Unmarshal(blob, &out); err != nil {
		logger.Error("apiImportConfig: failed to unmarshal response: %v", err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("apiImportConfig: imported config for site %d type %d", site.ID, configType)
	apiJSON(w, http.StatusOK, out)
}
