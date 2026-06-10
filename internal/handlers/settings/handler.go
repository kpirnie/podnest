package settings

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
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

// RegisterRoutes mounts settings and trusted proxy routes onto api.
func (h *Handler) RegisterRoutes(api *http.ServeMux) {
	admin := func(fn http.HandlerFunc) http.Handler {
		return auth.RequireAPIAdmin(http.HandlerFunc(fn))
	}

	api.Handle("GET /settings", admin(h.apiGetSettings))
	api.Handle("PUT /settings", admin(h.apiUpdateSettings))
	api.Handle("GET /settings/export", admin(h.apiExportSettings))
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
	all, err := db.GetAllSettings(h.DB)
	if err != nil {
		logger.Error("apiExportSettings: failed to retrieve settings: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	var rows [][]string
	for k, v := range all {
		rows = append(rows, []string{k, v})
	}

	apiutil.ExportCSV(w, "podnest-settings.csv", []string{"key", "value"}, rows)
	logger.Debug("apiExportSettings: exported %d settings", len(rows))
}

func (h *Handler) apiImportSettings(w http.ResponseWriter, r *http.Request) {
	records, err := apiutil.ImportCSV(r)
	if err != nil {
		logger.Error("apiImportSettings: %v", err)
		apiutil.ErrorMsg(w, http.StatusBadRequest, err.Error())
		return
	}

	for _, rec := range records {
		k := strings.TrimSpace(rec[0])
		v := rec[1]
		if k == "" {
			continue
		}
		if err := db.SetSetting(h.DB, k, v); err != nil {
			logger.Error("apiImportSettings: failed to set '%s': %v", k, err)
			apiutil.Error(w, http.StatusInternalServerError, err)
			return
		}
		h.applySettingLive(k, v)
	}

	logger.Debug("apiImportSettings: imported %d settings", len(records))
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
