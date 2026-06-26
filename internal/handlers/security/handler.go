// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package security

import (
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"podnest/internal/apiutil"
	"podnest/internal/audit"
	"podnest/internal/auth"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/modules"
)

// SecurityProxy is the subset of proxy.Proxy consumed by this handler.
type SecurityProxy interface {
	WarmCaches(justTrustedProxies bool) error
	WarmBypassCache(rules []*db.BypassRule)
}

// Handler handles IP and UA security rule management API routes.
type Handler struct {
	DB      *sql.DB
	Proxy   SecurityProxy
	Resolve modules.SiteResolver
}

// RegisterRoutes mounts security rule management routes onto api.
func (h *Handler) RegisterRoutes(api *http.ServeMux) {
	admin := func(fn http.HandlerFunc) http.Handler {
		return auth.RequireAPIAdmin(http.HandlerFunc(fn))
	}

	// bypass rules
	api.Handle("GET /security/bypass", admin(h.apiGetBypassRules))
	api.Handle("PUT /security/bypass", admin(h.apiSaveBypassRules))

	// global IP rules — admin only
	api.Handle("GET /security/ip", admin(h.apiGetGlobalIPRules))
	api.Handle("PUT /security/ip", admin(h.apiSaveGlobalIPRules))
	api.Handle("GET /security/ip/export", admin(h.apiExportGlobalIPRules))
	api.Handle("POST /security/ip/import", admin(h.apiImportGlobalIPRules))

	// global UA rules — admin only
	api.Handle("GET /security/ua", admin(h.apiGetGlobalUARules))
	api.Handle("PUT /security/ua", admin(h.apiSaveGlobalUARules))
	api.Handle("GET /security/ua/export", admin(h.apiExportGlobalUARules))
	api.Handle("POST /security/ua/import", admin(h.apiImportGlobalUARules))

	// per-site IP rules
	api.HandleFunc("GET /sites/{id}/security/ip", h.apiGetSiteIPRules)
	api.HandleFunc("PUT /sites/{id}/security/ip", h.apiSaveSiteIPRules)
	api.HandleFunc("GET /sites/{id}/security/ip/export", h.apiExportSiteIPRules)
	api.HandleFunc("POST /sites/{id}/security/ip/import", h.apiImportSiteIPRules)

	// per-site UA rules
	api.HandleFunc("GET /sites/{id}/security/ua", h.apiGetSiteUARules)
	api.HandleFunc("PUT /sites/{id}/security/ua", h.apiSaveSiteUARules)
	api.HandleFunc("GET /sites/{id}/security/ua/export", h.apiExportSiteUARules)
	api.HandleFunc("POST /sites/{id}/security/ua/import", h.apiImportSiteUARules)
}

// -- global ------------------------------------------------------------------

func (h *Handler) apiGetGlobalIPRules(w http.ResponseWriter, r *http.Request) {
	h.getIPRules(w, nil)
}

func (h *Handler) apiSaveGlobalIPRules(w http.ResponseWriter, r *http.Request) {
	h.saveIPRules(w, r, nil)
}

func (h *Handler) apiExportGlobalIPRules(w http.ResponseWriter, r *http.Request) {
	h.exportIPRules(w, nil, "podnest-global-ip-rules.csv")
}

func (h *Handler) apiImportGlobalIPRules(w http.ResponseWriter, r *http.Request) {
	h.importIPRules(w, r, nil)
}

func (h *Handler) apiGetGlobalUARules(w http.ResponseWriter, r *http.Request) {
	h.getUARules(w, nil)
}

func (h *Handler) apiSaveGlobalUARules(w http.ResponseWriter, r *http.Request) {
	h.saveUARules(w, r, nil)
}

func (h *Handler) apiExportGlobalUARules(w http.ResponseWriter, r *http.Request) {
	h.exportUARules(w, nil, "podnest-global-ua-rules.csv")
}

func (h *Handler) apiImportGlobalUARules(w http.ResponseWriter, r *http.Request) {
	h.importUARules(w, r, nil)
}

// -- per-site ----------------------------------------------------------------

func (h *Handler) apiGetSiteIPRules(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}
	h.getIPRules(w, &site.ID)
}

func (h *Handler) apiSaveSiteIPRules(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}
	h.saveIPRules(w, r, &site.ID)
}

func (h *Handler) apiExportSiteIPRules(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}
	h.exportIPRules(w, &site.ID, fmt.Sprintf("%s-ip-rules.csv", site.Name))
}

func (h *Handler) apiImportSiteIPRules(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}
	h.importIPRules(w, r, &site.ID)
}

func (h *Handler) apiGetSiteUARules(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}
	h.getUARules(w, &site.ID)
}

func (h *Handler) apiSaveSiteUARules(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}
	h.saveUARules(w, r, &site.ID)
}

func (h *Handler) apiExportSiteUARules(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}
	h.exportUARules(w, &site.ID, fmt.Sprintf("%s-ua-rules.csv", site.Name))
}

func (h *Handler) apiImportSiteUARules(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}
	h.importUARules(w, r, &site.ID)
}

func (h *Handler) apiGetBypassRules(w http.ResponseWriter, r *http.Request) {
	rules, err := db.GetAllBypassRules(h.DB)
	if err != nil {
		logger.Error("apiGetBypassRules: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	var lines []string
	for _, r := range rules {
		if r.Note != "" {
			lines = append(lines, r.CIDR+" # "+r.Note)
		} else {
			lines = append(lines, r.CIDR)
		}
	}

	apiutil.JSON(w, http.StatusOK, map[string]string{
		"bypass": strings.Join(lines, "\n"),
	})
}

func (h *Handler) apiSaveBypassRules(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Bypass string `json:"bypass"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	var rules []db.BypassRule
	for _, line := range strings.Split(req.Bypass, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		// support inline notes: "1.2.3.4/32 # WP Umbrella"
		cidr, note, _ := strings.Cut(line, "#")
		rules = append(rules, db.BypassRule{
			CIDR: strings.TrimSpace(cidr),
			Note: strings.TrimSpace(note),
		})
	}

	prior := db.SnapshotBypassRules(h.DB)

	if err := db.ReplaceBypassRules(h.DB, rules); err != nil {
		logger.Error("apiSaveBypassRules: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	allRules, _ := db.GetAllBypassRules(h.DB)
	h.Proxy.WarmBypassCache(allRules)

	logger.Debug("apiSaveBypassRules: saved %d rules", len(rules))
	*r = *r.WithContext(audit.WithStateContext(r.Context(), prior, db.SnapshotBypassRules(h.DB)))
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// -- shared implementations --------------------------------------------------

type securityRulesRequest struct {
	Whitelist string `json:"whitelist"`
	Blacklist string `json:"blacklist"`
}

func (h *Handler) getIPRules(w http.ResponseWriter, siteID *int64) {
	rules, err := db.GetIPRules(h.DB, siteID)
	if err != nil {
		logger.Error("getIPRules: failed to fetch: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	var wl, bl []string
	for _, rule := range rules {
		if rule.ListType == models.RuleWhitelist {
			wl = append(wl, rule.CIDR)
		} else {
			bl = append(bl, rule.CIDR)
		}
	}

	logger.Debug("getIPRules: siteID=%v wl=%d bl=%d", siteID, len(wl), len(bl))
	apiutil.JSON(w, http.StatusOK, map[string]string{
		"whitelist": strings.Join(wl, "\n"),
		"blacklist": strings.Join(bl, "\n"),
	})
}

func (h *Handler) saveIPRules(w http.ResponseWriter, r *http.Request, siteID *int64) {
	var req securityRulesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("saveIPRules: failed to decode body: %v", err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	rules := parseIPRules(req.Whitelist, models.RuleWhitelist)
	rules = append(rules, parseIPRules(req.Blacklist, models.RuleBlacklist)...)

	prior := db.SnapshotIPRules(h.DB, siteID)

	if err := db.ReplaceIPRules(h.DB, siteID, rules); err != nil {
		logger.Error("saveIPRules: replace failed: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	if err := h.refreshSecurityCache(); err != nil {
		logger.Error("saveIPRules: cache refresh failed: %v", err)
	}

	logger.Debug("saveIPRules: siteID=%v saved %d rules", siteID, len(rules))
	*r = *r.WithContext(audit.WithStateContext(r.Context(), prior, db.SnapshotIPRules(h.DB, siteID)))
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) getUARules(w http.ResponseWriter, siteID *int64) {
	rules, err := db.GetUARules(h.DB, siteID)
	if err != nil {
		logger.Error("getUARules: failed to fetch: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	var wl, bl []string
	for _, rule := range rules {
		if rule.ListType == models.RuleWhitelist {
			wl = append(wl, rule.Pattern)
		} else {
			bl = append(bl, rule.Pattern)
		}
	}

	logger.Debug("getUARules: siteID=%v wl=%d bl=%d", siteID, len(wl), len(bl))
	apiutil.JSON(w, http.StatusOK, map[string]string{
		"whitelist": strings.Join(wl, "\n"),
		"blacklist": strings.Join(bl, "\n"),
	})
}

func (h *Handler) saveUARules(w http.ResponseWriter, r *http.Request, siteID *int64) {
	var req securityRulesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("saveUARules: failed to decode body: %v", err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	rules := parseUARules(req.Whitelist, models.RuleWhitelist)
	rules = append(rules, parseUARules(req.Blacklist, models.RuleBlacklist)...)

	prior := db.SnapshotUARules(h.DB, siteID)

	if err := db.ReplaceUARules(h.DB, siteID, rules); err != nil {
		logger.Error("saveUARules: replace failed: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	if err := h.refreshSecurityCache(); err != nil {
		logger.Error("saveUARules: cache refresh failed: %v", err)
	}

	logger.Debug("saveUARules: siteID=%v saved %d rules", siteID, len(rules))
	*r = *r.WithContext(audit.WithStateContext(r.Context(), prior, db.SnapshotUARules(h.DB, siteID)))
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) exportIPRules(w http.ResponseWriter, siteID *int64, filename string) {
	rules, err := db.GetIPRules(h.DB, siteID)
	if err != nil {
		logger.Error("exportIPRules: failed to fetch rules: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	var rows [][]string
	for _, rule := range rules {
		lt := "blacklist"
		if rule.ListType == models.RuleWhitelist {
			lt = "whitelist"
		}
		rows = append(rows, []string{lt, rule.CIDR})
	}

	apiutil.ExportCSV(w, filename, []string{"list_type", "cidr"}, rows)
	logger.Debug("exportIPRules: exported %d rules to %s", len(rules), filename)
}

func (h *Handler) importIPRules(w http.ResponseWriter, r *http.Request, siteID *int64) {
	records, err := importSecurityCSV(r)
	if err != nil {
		logger.Error("importIPRules: %v", err)
		apiutil.ErrorMsg(w, http.StatusBadRequest, err.Error())
		return
	}

	var rules []db.IPRule
	for _, rec := range records {
		lt := models.RuleBlacklist
		if strings.ToLower(rec[0]) == "whitelist" {
			lt = models.RuleWhitelist
		}
		if cidr := strings.TrimSpace(rec[1]); cidr != "" {
			rules = append(rules, db.IPRule{ListType: lt, CIDR: cidr})
		}
	}

	if err := db.ReplaceIPRules(h.DB, siteID, rules); err != nil {
		logger.Error("importIPRules: replace failed: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	if err := h.refreshSecurityCache(); err != nil {
		logger.Error("importIPRules: cache refresh failed: %v", err)
	}

	logger.Debug("importIPRules: siteID=%v imported %d rules", siteID, len(rules))
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) exportUARules(w http.ResponseWriter, siteID *int64, filename string) {
	rules, err := db.GetUARules(h.DB, siteID)
	if err != nil {
		logger.Error("exportUARules: failed to fetch rules: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	var rows [][]string
	for _, rule := range rules {
		lt := "blacklist"
		if rule.ListType == models.RuleWhitelist {
			lt = "whitelist"
		}
		rows = append(rows, []string{lt, rule.Pattern})
	}

	apiutil.ExportCSV(w, filename, []string{"list_type", "pattern"}, rows)
	logger.Debug("exportUARules: exported %d rules to %s", len(rules), filename)
}

func (h *Handler) importUARules(w http.ResponseWriter, r *http.Request, siteID *int64) {
	records, err := importSecurityCSV(r)
	if err != nil {
		logger.Error("importUARules: %v", err)
		apiutil.ErrorMsg(w, http.StatusBadRequest, err.Error())
		return
	}

	var rules []db.UARule
	for _, rec := range records {
		lt := models.RuleBlacklist
		if strings.ToLower(rec[0]) == "whitelist" {
			lt = models.RuleWhitelist
		}
		if pattern := strings.TrimSpace(rec[1]); pattern != "" {
			rules = append(rules, db.UARule{ListType: lt, Pattern: pattern})
		}
	}

	if err := db.ReplaceUARules(h.DB, siteID, rules); err != nil {
		logger.Error("importUARules: replace failed: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	if err := h.refreshSecurityCache(); err != nil {
		logger.Error("importUARules: cache refresh failed: %v", err)
	}

	logger.Debug("importUARules: siteID=%v imported %d rules", siteID, len(rules))
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) refreshSecurityCache() error {
	if err := h.Proxy.WarmCaches(false); err != nil {
		logger.Error("security: failed to rewarm caches after rule update: %v", err)
	}
	return nil
}

// -- helpers -----------------------------------------------------------------

// importSecurityCSV parses a 2-column multipart CSV upload, skipping the header
// if the first column is "list_type".
func importSecurityCSV(r *http.Request) ([][]string, error) {
	if err := r.ParseMultipartForm(1 << 20); err != nil {
		return nil, fmt.Errorf("failed to parse multipart form: %w", err)
	}

	f, _, err := r.FormFile("file")
	if err != nil {
		return nil, fmt.Errorf("file field is required")
	}
	defer f.Close()

	cr := csv.NewReader(io.LimitReader(f, 1<<20))
	cr.FieldsPerRecord = 2
	cr.Comment = '#'

	first, err := cr.Read()
	if err != nil {
		return nil, fmt.Errorf("invalid CSV")
	}

	var records [][]string
	if strings.ToLower(first[0]) != "list_type" {
		records = append(records, first)
	}

	for {
		rec, err := cr.Read()
		if err != nil {
			break
		}
		records = append(records, rec)
	}

	return records, nil
}

func parseIPRules(raw string, listType int) []db.IPRule {
	var out []db.IPRule
	for _, line := range strings.Split(raw, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		out = append(out, db.IPRule{ListType: listType, CIDR: line})
	}
	return out
}

func parseUARules(raw string, listType int) []db.UARule {
	var out []db.UARule
	for _, line := range strings.Split(raw, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		out = append(out, db.UARule{ListType: listType, Pattern: line})
	}
	return out
}
