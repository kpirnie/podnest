// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package settings

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"net"
	"net/http"
	"strconv"
	"strings"

	"podnest/internal/apiutil"
	"podnest/internal/audit"
	"podnest/internal/auth"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
)

// SettingsProxy is the subset of proxy.Proxy consumed by this handler.
type SettingsProxy interface {
	SetAdminDomain(domain string)
	ObtainCert(domain string)
	WarmCaches(justTrustedProxies bool) error
}

// BackupRescheduler is the subset of backup.Manager consumed by this handler.
type BackupRescheduler interface {
	Reschedule(expr string)
}

// WarningProvider is the subset of the server resource state consumed by this handler.
type WarningProvider interface {
	GetWarning() *models.ResourceWarning
}

// Handler handles settings and trusted proxy management API routes.
type Handler struct {
	DB      *sql.DB
	Proxy   SettingsProxy
	Backup  BackupRescheduler
	Warning WarningProvider
}

// settingGroups maps each settings-page card to the keys it exports and imports.
var settingGroups = map[string][]string{
	"general": {
		"admin_domain",
		"resource_ram_reserve_gb", "resource_poll_interval",
		"resource_throttle_pct", "resource_webhook_url", "shutdown_job_timeout",
	},
	"backups": {
		"backup_retain_days", "backup_schedule",
		"s3_endpoint", "s3_bucket", "s3_region", "s3_access_key", "s3_secret_key",
	},
	"notifications": {
		"smtp_host", "smtp_port", "smtp_username", "smtp_password", "smtp_from", "smtp_tls",
		"aws_access_key", "aws_secret_key", "aws_region", "aws_sns_sender_id",
	},
	"malware": {
		"malware_retain_days", "malware_memory_mb", "malware_cpus",
	},
}

// malwareSettingBounds holds each malware setting's allowed range; the caps exist
// to protect the host, so a typo must not be able to lift or zero them
var malwareSettingBounds = map[string][2]float64{
	"malware_retain_days": {1, 3650},
	"malware_memory_mb":   {512, 65536},
	"malware_cpus":        {0.1, 64},
}

// RegisterRoutes mounts settings and trusted proxy routes onto api.
func (h *Handler) RegisterRoutes(api *http.ServeMux) {
	admin := func(fn http.HandlerFunc) http.Handler {
		return auth.RequireAPIAdmin(http.HandlerFunc(fn))
	}

	api.Handle("GET /settings", admin(h.apiGetSettings))
	api.Handle("PUT /settings", admin(h.apiUpdateSettings))
	api.Handle("POST /settings/export", admin(h.apiExportSettings))
	api.Handle("POST /settings/import", admin(h.apiImportSettings))
	api.Handle("GET /settings/backup", admin(h.apiGetBackupSettings))
	api.Handle("PUT /settings/backup", admin(h.apiUpdateBackupSettings))
	api.Handle("GET /settings/trusted-proxies", admin(h.apiGetTrustedProxies))
	api.Handle("PUT /settings/trusted-proxies", admin(h.apiUpdateTrustedProxies))
	api.Handle("GET /settings/trusted-proxies/export", admin(h.apiExportTrustedProxies))
	api.Handle("POST /settings/trusted-proxies/import", admin(h.apiImportTrustedProxies))
	api.Handle("GET /settings/notifications", admin(h.apiGetNotificationSettings))
	api.Handle("PUT /settings/notifications", admin(h.apiUpdateNotificationSettings))
	api.Handle("GET /settings/resource-warning", admin(h.apiGetResourceWarning))
	api.Handle("GET /settings/resources", admin(h.apiGetResourceSettings))
	api.Handle("PUT /settings/resources", admin(h.apiUpdateResourceSettings))
	api.Handle("GET /settings/malware", admin(h.apiGetMalwareSettings))
	api.Handle("PUT /settings/malware", admin(h.apiUpdateMalwareSettings))
}

func (h *Handler) apiGetSettings(w http.ResponseWriter, r *http.Request) {
	keys := []string{"admin_domain", "trusted_proxies_custom"}
	out := make(map[string]string, len(keys))
	for _, k := range keys {
		val, err := db.GetSetting(h.DB, k)
		if err != nil {
			logger.Error("apiGetSettings: failed to retrieve setting '%s': %v", k, err)
			apiutil.Error(w, http.StatusInternalServerError, err)
			return
		}
		out[k] = val
	}
	logger.Debug("retrieved settings")
	apiutil.JSON(w, http.StatusOK, out)
}

func (h *Handler) apiUpdateSettings(w http.ResponseWriter, r *http.Request) {
	var incoming map[string]string
	if err := json.NewDecoder(r.Body).Decode(&incoming); err != nil {
		logger.Error("apiUpdateSettings: failed to decode request body: %v", err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	// capture all settings before mutating for the audit trail
	prior := db.SnapshotAllSettings(h.DB)

	allowed := map[string]bool{"admin_domain": true, "trusted_proxies_custom": true}
	for k, v := range incoming {
		if !allowed[k] {
			logger.Warn("apiUpdateSettings: rejected unknown setting key '%s'", k)
			continue
		}
		if err := db.SetSetting(h.DB, k, v); err != nil {
			logger.Error("apiUpdateSettings: failed to persist setting '%s': %v", k, err)
			apiutil.Error(w, http.StatusInternalServerError, err)
			return
		}
		h.applySettingLive(k, v)
	}

	logger.Debug("updated settings")
	*r = *r.WithContext(audit.WithStateContext(r.Context(), prior, db.SnapshotAllSettings(h.DB)))
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) apiExportSettings(w http.ResponseWriter, r *http.Request) {
	group := r.URL.Query().Get("group")
	keys, ok := settingGroups[group]
	if !ok {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "unknown settings group")
		return
	}

	values := make(map[string]string, len(keys))
	for _, k := range keys {
		v, err := db.GetSetting(h.DB, k)
		if err != nil {
			logger.Error("apiExportSettings: failed to retrieve '%s': %v", k, err)
			apiutil.Error(w, http.StatusInternalServerError, err)
			return
		}
		values[k] = v
	}

	apiutil.ExportMigration(w, r, fmt.Sprintf("podnest-settings-%s.pnm", group), "settings:"+group, values)
}

func (h *Handler) apiImportSettings(w http.ResponseWriter, r *http.Request) {
	group := r.URL.Query().Get("group")
	keys, ok := settingGroups[group]
	if !ok {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "unknown settings group")
		return
	}
	allowed := make(map[string]bool, len(keys))
	for _, k := range keys {
		allowed[k] = true
	}

	values, err := apiutil.ImportMigration(w, r, "settings:"+group)
	if err != nil {
		apiutil.ErrorMsg(w, http.StatusBadRequest, err.Error())
		return
	}
	for key, value := range values {
		if !allowed[key] {
			apiutil.ErrorMsg(w, http.StatusBadRequest, "migration package contains an unknown setting")
			return
		}
		if value == "••••••••" || value == "*****" {
			delete(values, key)
		}
	}

	if err := db.SetSettings(h.DB, values); err != nil {
		logger.Error("apiImportSettings: failed to persist settings group %s", group)
		apiutil.ErrorMsg(w, http.StatusInternalServerError, "could not save settings")
		return
	}
	for key, value := range values {
		h.applySettingLive(key, value)
	}

	logger.Debug("apiImportSettings: imported %d %s settings", len(values), group)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) apiGetBackupSettings(w http.ResponseWriter, r *http.Request) {
	keys := []string{
		"backup_retain_days", "backup_schedule",
		"s3_endpoint", "s3_bucket", "s3_region", "s3_access_key", "s3_secret_key",
	}
	out := make(map[string]string, len(keys))
	for _, k := range keys {
		val, err := db.GetSetting(h.DB, k)
		if err != nil {
			logger.Error("apiGetBackupSettings: failed to retrieve '%s': %v", k, err)
			apiutil.Error(w, http.StatusInternalServerError, err)
			return
		}
		out[k] = val
	}
	if out["s3_secret_key"] != "" {
		out["s3_secret_key"] = "••••••••"
	}
	logger.Debug("apiGetBackupSettings: retrieved backup settings")
	apiutil.JSON(w, http.StatusOK, out)
}

func (h *Handler) apiUpdateBackupSettings(w http.ResponseWriter, r *http.Request) {
	var incoming map[string]string
	if err := json.NewDecoder(r.Body).Decode(&incoming); err != nil {
		logger.Error("apiUpdateBackupSettings: decode: %v", err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	allowed := map[string]bool{
		"backup_retain_days": true, "backup_schedule": true,
		"s3_endpoint": true, "s3_bucket": true, "s3_region": true,
		"s3_access_key": true, "s3_secret_key": true,
	}
	for k, v := range incoming {
		if !allowed[k] {
			logger.Warn("apiUpdateBackupSettings: rejected unknown key '%s'", k)
			continue
		}
		if k == "s3_secret_key" && v == "••••••••" {
			continue
		}
		if err := db.SetSetting(h.DB, k, v); err != nil {
			logger.Error("apiUpdateBackupSettings: persist '%s': %v", k, err)
			apiutil.Error(w, http.StatusInternalServerError, err)
			return
		}
		h.applySettingLive(k, v)
	}

	logger.Debug("apiUpdateBackupSettings: updated backup settings")
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) apiGetTrustedProxies(w http.ResponseWriter, r *http.Request) {
	val, err := db.GetTrustedProxiesCustom(h.DB)
	if err != nil {
		logger.Error("apiGetTrustedProxies: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	apiutil.JSON(w, http.StatusOK, map[string]string{"trusted_proxies_custom": val})
}

func (h *Handler) apiUpdateTrustedProxies(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Value string `json:"trusted_proxies_custom"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		logger.Error("apiUpdateTrustedProxies: decode: %v", err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	for _, line := range strings.Split(body.Value, "\n") {
		cidr := strings.TrimSpace(line)
		if cidr == "" {
			continue
		}
		if _, _, err := net.ParseCIDR(cidr); err != nil {
			if net.ParseIP(cidr) == nil {
				apiutil.ErrorMsg(w, http.StatusBadRequest, fmt.Sprintf("invalid IP or CIDR: %s", cidr))
				return
			}
		}
	}

	if err := db.SetTrustedProxiesCustom(h.DB, body.Value); err != nil {
		logger.Error("apiUpdateTrustedProxies: persist: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	h.applySettingLive("trusted_proxies_custom", body.Value)
	logger.Debug("apiUpdateTrustedProxies: saved custom proxy CIDRs")
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) apiExportTrustedProxies(w http.ResponseWriter, r *http.Request) {
	val, err := db.GetTrustedProxiesCustom(h.DB)
	if err != nil {
		logger.Error("apiExportTrustedProxies: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	var rows [][]string
	for _, line := range strings.Split(val, "\n") {
		cidr := strings.TrimSpace(line)
		if cidr != "" {
			rows = append(rows, []string{cidr})
		}
	}
	apiutil.ExportCSV(w, "podnest-trusted-proxies.csv", []string{"cidr"}, rows)
	logger.Debug("apiExportTrustedProxies: exported %d CIDRs", len(rows))
}

func (h *Handler) apiImportTrustedProxies(w http.ResponseWriter, r *http.Request) {
	records, err := apiutil.ImportCSV(r)
	if err != nil {
		logger.Error("apiImportTrustedProxies: %v", err)
		apiutil.ErrorMsg(w, http.StatusBadRequest, err.Error())
		return
	}

	var lines []string
	for _, rec := range records {
		cidr := strings.TrimSpace(rec[0])
		if cidr != "" {
			lines = append(lines, cidr)
		}
	}

	val := strings.Join(lines, "\n")
	if err := db.SetTrustedProxiesCustom(h.DB, val); err != nil {
		logger.Error("apiImportTrustedProxies: persist: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	h.applySettingLive("trusted_proxies_custom", val)
	logger.Debug("apiImportTrustedProxies: imported %d CIDRs", len(lines))
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) apiGetResourceWarning(w http.ResponseWriter, r *http.Request) {
	if h.Warning == nil {
		apiutil.JSON(w, http.StatusOK, map[string]any{"active": false})
		return
	}
	warning := h.Warning.GetWarning()
	if warning == nil {
		apiutil.JSON(w, http.StatusOK, map[string]any{"active": false})
		return
	}
	logger.Debug("apiGetResourceWarning: returning active warning for resource %s", warning.Resource)
	apiutil.JSON(w, http.StatusOK, warning)
}

func (h *Handler) apiGetResourceSettings(w http.ResponseWriter, r *http.Request) {
	keys := []string{
		"resource_ram_reserve_gb", "resource_poll_interval",
		"resource_throttle_pct", "resource_webhook_url",
	}
	out := make(map[string]string, len(keys))
	for _, k := range keys {
		val, err := db.GetSetting(h.DB, k)
		if err != nil {
			logger.Error("apiGetResourceSettings: failed to retrieve '%s': %v", k, err)
			apiutil.Error(w, http.StatusInternalServerError, err)
			return
		}
		out[k] = val
	}
	logger.Debug("apiGetResourceSettings: retrieved resource watcher settings")
	apiutil.JSON(w, http.StatusOK, out)
}

func (h *Handler) apiUpdateResourceSettings(w http.ResponseWriter, r *http.Request) {
	var incoming map[string]string
	if err := json.NewDecoder(r.Body).Decode(&incoming); err != nil {
		logger.Error("apiUpdateResourceSettings: decode: %v", err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	allowed := map[string]bool{
		"resource_ram_reserve_gb": true,
		"resource_poll_interval":  true,
		"resource_throttle_pct":   true,
		"resource_webhook_url":    true,
		"shutdown_job_timeout":    true,
	}
	for k, v := range incoming {
		if !allowed[k] {
			logger.Warn("apiUpdateResourceSettings: rejected unknown key '%s'", k)
			continue
		}
		if err := db.SetSetting(h.DB, k, v); err != nil {
			logger.Error("apiUpdateResourceSettings: persist '%s': %v", k, err)
			apiutil.Error(w, http.StatusInternalServerError, err)
			return
		}
	}

	logger.Debug("apiUpdateResourceSettings: updated resource watcher settings")
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) apiGetMalwareSettings(w http.ResponseWriter, r *http.Request) {
	keys := []string{"malware_retain_days", "malware_memory_mb", "malware_cpus"}
	out := make(map[string]string, len(keys))
	for _, k := range keys {
		val, err := db.GetSetting(h.DB, k)
		if err != nil {
			logger.Error("apiGetMalwareSettings: failed to retrieve '%s': %v", k, err)
			apiutil.Error(w, http.StatusInternalServerError, err)
			return
		}
		out[k] = val
	}
	logger.Debug("apiGetMalwareSettings: retrieved malware scan settings")
	apiutil.JSON(w, http.StatusOK, out)
}

func (h *Handler) apiUpdateMalwareSettings(w http.ResponseWriter, r *http.Request) {
	var incoming map[string]string
	if err := json.NewDecoder(r.Body).Decode(&incoming); err != nil {
		logger.Error("apiUpdateMalwareSettings: decode: %v", err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	// validate everything before persisting anything so a bad value saves nothing
	clean := make(map[string]string, len(incoming))
	for k, v := range incoming {
		b, ok := malwareSettingBounds[k]
		if !ok {
			logger.Warn("apiUpdateMalwareSettings: rejected unknown key '%s'", k)
			continue
		}
		v = strings.TrimSpace(v)
		f, err := strconv.ParseFloat(v, 64)
		if err != nil || f < b[0] || f > b[1] {
			apiutil.ErrorMsg(w, http.StatusBadRequest, fmt.Sprintf("%s must be between %g and %g", k, b[0], b[1]))
			return
		}
		if k != "malware_cpus" && f != math.Trunc(f) {
			apiutil.ErrorMsg(w, http.StatusBadRequest, fmt.Sprintf("%s must be a whole number", k))
			return
		}
		clean[k] = v
	}

	for k, v := range clean {
		if err := db.SetSetting(h.DB, k, v); err != nil {
			logger.Error("apiUpdateMalwareSettings: persist '%s': %v", k, err)
			apiutil.Error(w, http.StatusInternalServerError, err)
			return
		}
	}

	logger.Debug("apiUpdateMalwareSettings: updated malware scan settings")
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) applySettingLive(k, v string) {
	switch k {
	case "admin_domain":
		h.Proxy.SetAdminDomain(v)
		if v != "" {
			h.Proxy.ObtainCert(v)
		}
	case "backup_schedule":
		h.Backup.Reschedule(v)
	case "trusted_proxies_custom":
		if err := h.Proxy.WarmCaches(false); err != nil {
			logger.Error("settings: failed to rewarm caches after settings update: %v", err)
		}
	}
}

func (h *Handler) apiGetNotificationSettings(w http.ResponseWriter, r *http.Request) {
	keys := []string{
		"smtp_host", "smtp_port", "smtp_username", "smtp_password", "smtp_from", "smtp_tls",
		"aws_access_key", "aws_secret_key", "aws_region", "aws_sns_sender_id",
	}
	out := make(map[string]string, len(keys))
	for _, k := range keys {
		val, err := db.GetSetting(h.DB, k)
		if err != nil {
			logger.Error("apiGetNotificationSettings: failed to retrieve '%s': %v", k, err)
			apiutil.Error(w, http.StatusInternalServerError, err)
			return
		}
		out[k] = val
	}

	// mask secrets before returning to the client
	if out["smtp_password"] != "" {
		out["smtp_password"] = "••••••••"
	}
	if out["aws_secret_key"] != "" {
		out["aws_secret_key"] = "••••••••"
	}

	logger.Debug("apiGetNotificationSettings: retrieved notification settings")
	apiutil.JSON(w, http.StatusOK, out)
}

func (h *Handler) apiUpdateNotificationSettings(w http.ResponseWriter, r *http.Request) {
	var incoming map[string]string
	if err := json.NewDecoder(r.Body).Decode(&incoming); err != nil {
		logger.Error("apiUpdateNotificationSettings: decode: %v", err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	allowed := map[string]bool{
		"smtp_host": true, "smtp_port": true, "smtp_username": true,
		"smtp_password": true, "smtp_from": true, "smtp_tls": true,
		"aws_access_key": true, "aws_secret_key": true,
		"aws_region": true, "aws_sns_sender_id": true,
	}
	for k, v := range incoming {
		if !allowed[k] {
			logger.Warn("apiUpdateNotificationSettings: rejected unknown key '%s'", k)
			continue
		}
		// skip masked placeholder values — preserve the existing secret in DB
		if (k == "smtp_password" || k == "aws_secret_key") && v == "••••••••" {
			continue
		}
		if err := db.SetSetting(h.DB, k, v); err != nil {
			logger.Error("apiUpdateNotificationSettings: persist '%s': %v", k, err)
			apiutil.Error(w, http.StatusInternalServerError, err)
			return
		}
	}

	logger.Debug("apiUpdateNotificationSettings: updated notification settings")
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
