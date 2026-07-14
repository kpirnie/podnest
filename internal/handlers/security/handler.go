// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package security

import (
	"context"
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

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
	ClientIP(r *http.Request) string
	LookupCountry(ip string) string
	LookupASN(ip string) (uint32, string)
}

// Handler handles IP and UA security rule management API routes.
type Handler struct {
	DB      *sql.DB
	Proxy   SecurityProxy
	Resolve modules.SiteResolver
}

type securityRulesRequest struct {
	Whitelist string `json:"whitelist"`
	Blacklist string `json:"blacklist"`
	Confirm   bool   `json:"confirm"`
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

	// global country rules — admin only
	api.Handle("GET /security/country", admin(h.apiGetGlobalCountryRules))
	api.Handle("PUT /security/country", admin(h.apiSaveGlobalCountryRules))

	// per-site country rules
	api.HandleFunc("GET /sites/{id}/security/country", h.apiGetSiteCountryRules)
	api.HandleFunc("PUT /sites/{id}/security/country", h.apiSaveSiteCountryRules)

	// global ASN rules — admin only
	api.Handle("GET /security/asn", admin(h.apiGetGlobalASNRules))
	api.Handle("PUT /security/asn", admin(h.apiSaveGlobalASNRules))

	// per-site ASN rules
	api.HandleFunc("GET /sites/{id}/security/asn", h.apiGetSiteASNRules)
	api.HandleFunc("PUT /sites/{id}/security/asn", h.apiSaveSiteASNRules)

	// ASN lookup helper — admin only
	api.Handle("GET /security/asn/lookup", admin(h.apiASNLookup))
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

func (h *Handler) apiGetGlobalCountryRules(w http.ResponseWriter, r *http.Request) {
	h.getCountryRules(w, nil)
}

func (h *Handler) apiSaveGlobalCountryRules(w http.ResponseWriter, r *http.Request) {
	h.saveCountryRules(w, r, nil)
}

func (h *Handler) apiGetSiteCountryRules(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}
	h.getCountryRules(w, &site.ID)
}

func (h *Handler) apiSaveSiteCountryRules(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}
	h.saveCountryRules(w, r, &site.ID)
}

// getCountryRules returns the whitelist and blacklist country codes for a
// scope as newline-joined strings, matching the IP/UA rule response shape.
func (h *Handler) getCountryRules(w http.ResponseWriter, siteID *int64) {
	rules, err := db.GetCountryRules(h.DB, siteID)
	if err != nil {
		logger.Error("getCountryRules: failed to fetch: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	var wl, bl []string
	for _, rule := range rules {
		if rule.ListType == models.RuleWhitelist {
			wl = append(wl, rule.Code)
		} else {
			bl = append(bl, rule.Code)
		}
	}

	logger.Debug("getCountryRules: siteID=%v wl=%d bl=%d", siteID, len(wl), len(bl))
	apiutil.JSON(w, http.StatusOK, map[string]string{
		"whitelist": strings.Join(wl, "\n"),
		"blacklist": strings.Join(bl, "\n"),
	})
}

// saveCountryRules replaces the country rules for a scope from newline-
// delimited whitelist/blacklist input, then refreshes the proxy rule cache.
func (h *Handler) saveCountryRules(w http.ResponseWriter, r *http.Request, siteID *int64) {
	var req securityRulesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("saveCountryRules: failed to decode body: %v", err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	rules := parseCountryRules(req.Whitelist, models.RuleWhitelist)
	rules = append(rules, parseCountryRules(req.Blacklist, models.RuleBlacklist)...)

	// lockout preflight — global rules also govern the admin domain, so
	// refuse a rule set that would block the very connection saving it
	// unless the client explicitly confirms
	if siteID == nil && !req.Confirm {
		if reason := h.countryLockoutRisk(r, rules); reason != "" {
			logger.Warn("saveCountryRules: lockout risk detected: %s", reason)
			apiutil.JSON(w, http.StatusOK, map[string]string{"status": "confirm", "reason": reason})
			return
		}
	}

	prior := db.SnapshotCountryRules(h.DB, siteID)

	if err := db.ReplaceCountryRules(h.DB, siteID, rules); err != nil {
		logger.Error("saveCountryRules: replace failed: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	if err := h.refreshSecurityCache(); err != nil {
		logger.Error("saveCountryRules: cache refresh failed: %v", err)
	}

	logger.Debug("saveCountryRules: siteID=%v saved %d rules", siteID, len(rules))
	*r = *r.WithContext(audit.WithStateContext(r.Context(), prior, db.SnapshotCountryRules(h.DB, siteID)))
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
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

// stripInlineComment removes a trailing "#"-style comment from a rule line and
// trims the remainder. The marker only counts at the start of the line or when
// preceded by whitespace, so a "#" embedded mid-token is left alone.
func stripInlineComment(line string) string {
	for i := 0; i < len(line); i++ {
		if line[i] == '#' && (i == 0 || line[i-1] == ' ' || line[i-1] == '\t') {
			return strings.TrimSpace(line[:i])
		}
	}
	return line
}

func parseIPRules(raw string, listType int) []db.IPRule {
	var out []db.IPRule
	for _, line := range strings.Split(raw, "\n") {
		line = stripInlineComment(strings.TrimSpace(line))
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
		line = stripInlineComment(strings.TrimSpace(line))
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		out = append(out, db.UARule{ListType: listType, Pattern: line})
	}
	return out
}

// parseCountryRules converts newline-delimited ISO country codes into rule
// structs, skipping blanks and comment lines. Codes are uppercased here so
// the stored form matches what the cache compiler and UI expect.
func parseCountryRules(raw string, listType int) []db.CountryRule {
	var out []db.CountryRule
	for _, line := range strings.Split(raw, "\n") {
		line = strings.ToUpper(stripInlineComment(strings.TrimSpace(line)))
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		out = append(out, db.CountryRule{ListType: listType, Code: line})
	}
	return out
}

func (h *Handler) apiGetGlobalASNRules(w http.ResponseWriter, r *http.Request) {
	h.getASNRules(w, nil)
}

func (h *Handler) apiSaveGlobalASNRules(w http.ResponseWriter, r *http.Request) {
	h.saveASNRules(w, r, nil)
}

func (h *Handler) apiGetSiteASNRules(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}
	h.getASNRules(w, &site.ID)
}

func (h *Handler) apiSaveSiteASNRules(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}
	h.saveASNRules(w, r, &site.ID)
}

// getASNRules returns the whitelist and blacklist ASNs for a scope as
// newline-joined strings, matching the IP/UA/country rule response shape.
func (h *Handler) getASNRules(w http.ResponseWriter, siteID *int64) {
	rules, err := db.GetASNRules(h.DB, siteID)
	if err != nil {
		logger.Error("getASNRules: failed to fetch: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	var wl, bl []string
	for _, rule := range rules {
		if rule.ListType == models.RuleWhitelist {
			wl = append(wl, fmt.Sprintf("AS%d", rule.ASN))
		} else {
			bl = append(bl, fmt.Sprintf("AS%d", rule.ASN))
		}
	}

	logger.Debug("getASNRules: siteID=%v wl=%d bl=%d", siteID, len(wl), len(bl))
	apiutil.JSON(w, http.StatusOK, map[string]string{
		"whitelist": strings.Join(wl, "\n"),
		"blacklist": strings.Join(bl, "\n"),
	})
}

// saveASNRules replaces the ASN rules for a scope from newline-delimited
// whitelist/blacklist input, then refreshes the proxy rule cache.
func (h *Handler) saveASNRules(w http.ResponseWriter, r *http.Request, siteID *int64) {
	var req securityRulesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("saveASNRules: failed to decode body: %v", err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	rules := parseASNRules(req.Whitelist, models.RuleWhitelist)
	rules = append(rules, parseASNRules(req.Blacklist, models.RuleBlacklist)...)

	// lockout preflight — global rules also govern the admin domain, so
	// refuse a rule set that would block the very connection saving it
	// unless the client explicitly confirms
	if siteID == nil && !req.Confirm {
		if reason := h.asnLockoutRisk(r, rules); reason != "" {
			logger.Warn("saveASNRules: lockout risk detected: %s", reason)
			apiutil.JSON(w, http.StatusOK, map[string]string{"status": "confirm", "reason": reason})
			return
		}
	}

	prior := db.SnapshotASNRules(h.DB, siteID)

	if err := db.ReplaceASNRules(h.DB, siteID, rules); err != nil {
		logger.Error("saveASNRules: replace failed: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	if err := h.refreshSecurityCache(); err != nil {
		logger.Error("saveASNRules: cache refresh failed: %v", err)
	}

	logger.Debug("saveASNRules: siteID=%v saved %d rules", siteID, len(rules))
	*r = *r.WithContext(audit.WithStateContext(r.Context(), prior, db.SnapshotASNRules(h.DB, siteID)))
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// parseASNRules converts newline-delimited autonomous system numbers into
// rule structs, skipping blanks and comment lines. Both bare numbers and
// AS-prefixed forms (15169 / AS15169) are accepted; unparseable or zero
// entries are logged and skipped.
func parseASNRules(raw string, listType int) []db.ASNRule {
	var out []db.ASNRule
	for _, line := range strings.Split(raw, "\n") {
		line = strings.ToUpper(stripInlineComment(strings.TrimSpace(line)))
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		line = strings.TrimPrefix(line, "AS")

		asn, err := strconv.ParseUint(line, 10, 32)
		if err != nil || asn == 0 {
			logger.Warn("parseASNRules: skipping invalid ASN '%s'", line)
			continue
		}
		out = append(out, db.ASNRule{ListType: listType, ASN: uint32(asn)})
	}
	return out
}

// asnLockoutRisk simulates the proposed global ASN rules against the
// requesting connection, following the same blacklist-then-whitelist
// precedence as enforcement. Returns a human-readable reason when the
// save would block the requester, or "" when no risk is detected.
func (h *Handler) asnLockoutRisk(r *http.Request, rules []db.ASNRule) string {
	ip := h.Proxy.ClientIP(r)
	if ip == "" {
		return ""
	}

	// unknown ASN is default-allow at enforcement, so no risk
	asn, org := h.Proxy.LookupASN(ip)
	if asn == 0 {
		return ""
	}
	if org == "" {
		org = "unknown org"
	}

	wlSize := 0
	wlHit := false
	for _, rule := range rules {
		if rule.ListType == models.RuleBlacklist && rule.ASN == asn {
			return fmt.Sprintf("the blacklist would block your current connection (AS%d — %s)", asn, org)
		}
		if rule.ListType == models.RuleWhitelist {
			wlSize++
			if rule.ASN == asn {
				wlHit = true
			}
		}
	}
	if wlSize > 0 && !wlHit {
		return fmt.Sprintf("the whitelist would block your current connection (AS%d — %s is not in it)", asn, org)
	}
	return ""
}

// countryLockoutRisk simulates the proposed global country rules against
// the requesting connection, following the same blacklist-then-whitelist
// precedence as enforcement. Returns a human-readable reason when the
// save would block the requester, or "" when no risk is detected.
func (h *Handler) countryLockoutRisk(r *http.Request, rules []db.CountryRule) string {
	ip := h.Proxy.ClientIP(r)
	if ip == "" {
		return ""
	}

	// unknown country is default-allow at enforcement, so no risk
	code := h.Proxy.LookupCountry(ip)
	if code == "" {
		return ""
	}

	wlSize := 0
	wlHit := false
	for _, rule := range rules {
		if rule.ListType == models.RuleBlacklist && rule.Code == code {
			return fmt.Sprintf("the blacklist would block your current connection (%s)", code)
		}
		if rule.ListType == models.RuleWhitelist {
			wlSize++
			if rule.Code == code {
				wlHit = true
			}
		}
	}
	if wlSize > 0 && !wlHit {
		return fmt.Sprintf("the whitelist would block your current connection (%s is not in it)", code)
	}
	return ""
}

// apiASNLookup resolves an IP address or domain name to its ASN, org
// name, and country code using the in-memory databases. Domains are
// resolved via DNS first; the first returned address is used.
func (h *Handler) apiASNLookup(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if q == "" {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "q parameter is required")
		return
	}

	// use the input directly if it parses as an IP, otherwise resolve
	// it as a domain name with a bounded timeout
	ipStr := q
	if net.ParseIP(q) == nil {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		addrs, err := net.DefaultResolver.LookupIPAddr(ctx, q)
		if err != nil || len(addrs) == 0 {
			logger.Debug("apiASNLookup: resolve failed for '%s': %v", q, err)
			apiutil.ErrorMsg(w, http.StatusNotFound, "could not resolve host")
			return
		}
		ipStr = addrs[0].IP.String()
	}

	asn, org := h.Proxy.LookupASN(ipStr)
	country := h.Proxy.LookupCountry(ipStr)

	logger.Debug("apiASNLookup: %s → %s AS%d (%s) %s", q, ipStr, asn, org, country)
	apiutil.JSON(w, http.StatusOK, map[string]any{
		"query":   q,
		"ip":      ipStr,
		"asn":     asn,
		"org":     org,
		"country": country,
	})
}
