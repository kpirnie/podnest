package server

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strings"

	"podnest/internal/db"
	"podnest/internal/logger"
)

// apiGetSettings returns all known settings as a key/value JSON object
func (s *Server) apiGetSettings(w http.ResponseWriter, r *http.Request) {

	// hold the known setting keys we expose through the API
	keys := []string{
		"admin_domain",
		"trusted_proxies_custom",
	}

	// build the output map by fetching each key from the database
	out := make(map[string]string, len(keys))
	for _, k := range keys {
		val, err := db.GetSetting(s.cfg.DB, k)
		if err != nil {
			logger.Error("apiGetSettings: failed to retrieve setting '%s': %v", k, err)
			apiError(w, http.StatusInternalServerError, err)
			return
		}
		out[k] = val
	}

	logger.Debug("retrieved settings")
	apiJSON(w, http.StatusOK, out)
}

// apiUpdateSettings accepts a JSON key/value map and persists each known setting
func (s *Server) apiUpdateSettings(w http.ResponseWriter, r *http.Request) {

	// decode the incoming key/value map from the request body
	var incoming map[string]string
	if err := json.NewDecoder(r.Body).Decode(&incoming); err != nil {
		logger.Error("apiUpdateSettings: failed to decode request body: %v", err)
		apiError(w, http.StatusBadRequest, err)
		return
	}

	// hold the set of keys we allow to be updated through this endpoint
	allowed := map[string]bool{
		"admin_domain":           true,
		"trusted_proxies_custom": true,
	}

	// iterate over the incoming map and persist only the allowed keys
	for k, v := range incoming {
		if !allowed[k] {
			logger.Warn("apiUpdateSettings: rejected unknown setting key '%s'", k)
			continue
		}
		if err := db.SetSetting(s.cfg.DB, k, v); err != nil {
			logger.Error("apiUpdateSettings: failed to persist setting '%s': %v", k, err)
			apiError(w, http.StatusInternalServerError, err)
			return
		}

		// apply live changes for settings that affect running components
		s.applySettingLive(k, v)
	}

	logger.Debug("updated settings")
	apiJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// apiExportSettings streams all settings as a CSV download
func (s *Server) apiExportSettings(w http.ResponseWriter, r *http.Request) {
	all, err := db.GetAllSettings(s.cfg.DB)
	if err != nil {
		logger.Error("apiExportSettings: failed to retrieve settings: %v", err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	var rows [][]string
	for k, v := range all {
		rows = append(rows, []string{k, v})
	}

	exportCSV(w, "podnest-settings.csv", []string{"key", "value"}, rows)
	logger.Debug("apiExportSettings: exported %d settings", len(rows))
}

// apiImportSettings reads a CSV file upload and upserts all settings without key filtering
func (s *Server) apiImportSettings(w http.ResponseWriter, r *http.Request) {
	records, err := importCSV(r)
	if err != nil {
		logger.Error("apiImportSettings: %v", err)
		apiErrorMsg(w, http.StatusBadRequest, err.Error())
		return
	}

	for _, rec := range records {
		k := strings.TrimSpace(rec[0])
		v := rec[1]
		if k == "" {
			continue
		}
		if err := db.SetSetting(s.cfg.DB, k, v); err != nil {
			logger.Error("apiImportSettings: failed to set '%s': %v", k, err)
			apiError(w, http.StatusInternalServerError, err)
			return
		}
		s.applySettingLive(k, v)
	}

	logger.Debug("apiImportSettings: imported %d settings", len(records))
	apiJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// apiGetBackupSettings returns all backup and S3 settings
func (s *Server) apiGetBackupSettings(w http.ResponseWriter, r *http.Request) {

	// hold the known backup/S3 setting keys
	keys := []string{
		"backup_retain_days",
		"backup_schedule",
		"s3_endpoint",
		"s3_bucket",
		"s3_region",
		"s3_access_key",
		"s3_secret_key",
	}

	// build the output map by fetching each key from the database
	out := make(map[string]string, len(keys))
	for _, k := range keys {
		val, err := db.GetSetting(s.cfg.DB, k)
		if err != nil {
			logger.Error("apiGetBackupSettings: failed to retrieve '%s': %v", k, err)
			apiError(w, http.StatusInternalServerError, err)
			return
		}
		out[k] = val
	}

	// never expose the S3 secret key value — return a masked placeholder
	// so the UI knows whether one is set without revealing it
	if out["s3_secret_key"] != "" {
		out["s3_secret_key"] = "••••••••"
	}

	logger.Debug("apiGetBackupSettings: retrieved backup settings")
	apiJSON(w, http.StatusOK, out)
}

// apiUpdateBackupSettings persists backup and S3 settings
func (s *Server) apiUpdateBackupSettings(w http.ResponseWriter, r *http.Request) {

	// decode the incoming key/value map
	var incoming map[string]string
	if err := json.NewDecoder(r.Body).Decode(&incoming); err != nil {
		logger.Error("apiUpdateBackupSettings: decode: %v", err)
		apiError(w, http.StatusBadRequest, err)
		return
	}

	// hold the set of keys we allow to be updated through this endpoint
	allowed := map[string]bool{
		"backup_retain_days": true,
		"backup_schedule":    true,
		"s3_endpoint":        true,
		"s3_bucket":          true,
		"s3_region":          true,
		"s3_access_key":      true,
		"s3_secret_key":      true,
	}

	for k, v := range incoming {
		if !allowed[k] {
			logger.Warn("apiUpdateBackupSettings: rejected unknown key '%s'", k)
			continue
		}

		// if the client sends the masked placeholder back, skip — the stored
		// value is already correct and we don't want to overwrite it
		if k == "s3_secret_key" && v == "••••••••" {
			continue
		}

		if err := db.SetSetting(s.cfg.DB, k, v); err != nil {
			logger.Error("apiUpdateBackupSettings: persist '%s': %v", k, err)
			apiError(w, http.StatusInternalServerError, err)
			return
		}

		// apply live side-effects for settings that affect running components
		s.applySettingLive(k, v)
	}

	logger.Debug("apiUpdateBackupSettings: updated backup settings")
	apiJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// apiGetTrustedProxies returns the current admin-defined custom proxy CIDRs
func (s *Server) apiGetTrustedProxies(w http.ResponseWriter, r *http.Request) {
	val, err := db.GetTrustedProxiesCustom(s.cfg.DB)
	if err != nil {
		logger.Error("apiGetTrustedProxies: %v", err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	apiJSON(w, http.StatusOK, map[string]string{"trusted_proxies_custom": val})
}

// apiUpdateTrustedProxies validates and persists the admin-defined custom proxy CIDRs
func (s *Server) apiUpdateTrustedProxies(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Value string `json:"trusted_proxies_custom"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		logger.Error("apiUpdateTrustedProxies: decode: %v", err)
		apiError(w, http.StatusBadRequest, err)
		return
	}

	// validate each non-empty line is a valid IP or CIDR before saving
	for _, line := range strings.Split(body.Value, "\n") {
		cidr := strings.TrimSpace(line)
		if cidr == "" {
			continue
		}
		if _, _, err := net.ParseCIDR(cidr); err != nil {
			if net.ParseIP(cidr) == nil {
				apiErrorMsg(w, http.StatusBadRequest, fmt.Sprintf("invalid IP or CIDR: %s", cidr))
				return
			}
		}
	}

	if err := db.SetTrustedProxiesCustom(s.cfg.DB, body.Value); err != nil {
		logger.Error("apiUpdateTrustedProxies: persist: %v", err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	s.applySettingLive("trusted_proxies_custom", body.Value)
	logger.Debug("apiUpdateTrustedProxies: saved custom proxy CIDRs")
	apiJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// applySettingLive applies live side-effects for a setting key/value pair
func (s *Server) applySettingLive(k, v string) {
	switch k {
	case "admin_domain":
		s.proxy.SetAdminDomain(v)
		if v != "" {
			s.proxy.ObtainCert(v)
		}
	case "backup_schedule":
		s.backup.Reschedule(v)
	case "trusted_proxies_custom":
		cidrs, err := db.GetTrustedProxies(s.cfg.DB)
		if err != nil {
			logger.Error("applySettingLive: failed to load trusted proxies: %v", err)
			return
		}
		s.proxy.WarmTrustedProxies(cidrs)
	}

}
