package server

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
)

// -- request types -----------------------------------------------------------

// securityRulesRequest is the shared request body for both IP and UA rule saves.
// Each list is a newline-separated string from the UI textarea.
type securityRulesRequest struct {
	Whitelist string `json:"whitelist"`
	Blacklist string `json:"blacklist"`
}

// -- global IP rules ---------------------------------------------------------

// apiGetGlobalIPRules returns the current global IP whitelist and blacklist.
func (s *Server) apiGetGlobalIPRules(w http.ResponseWriter, r *http.Request) {
	s.getIPRules(w, r, nil)
}

// apiSaveGlobalIPRules replaces the global IP whitelist and blacklist atomically.
func (s *Server) apiSaveGlobalIPRules(w http.ResponseWriter, r *http.Request) {
	s.saveIPRules(w, r, nil)
}

// -- per-site IP rules -------------------------------------------------------

// apiGetSiteIPRules returns the IP whitelist and blacklist for a specific site.
func (s *Server) apiGetSiteIPRules(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}
	s.getIPRules(w, r, &site.ID)
}

// apiSaveSiteIPRules replaces the IP whitelist and blacklist for a specific site atomically.
func (s *Server) apiSaveSiteIPRules(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}
	s.saveIPRules(w, r, &site.ID)
}

// -- global UA rules ---------------------------------------------------------

// apiGetGlobalUARules returns the current global UA whitelist and blacklist.
func (s *Server) apiGetGlobalUARules(w http.ResponseWriter, r *http.Request) {
	s.getUARules(w, r, nil)
}

// apiSaveGlobalUARules replaces the global UA whitelist and blacklist atomically.
func (s *Server) apiSaveGlobalUARules(w http.ResponseWriter, r *http.Request) {
	s.saveUARules(w, r, nil)
}

// -- per-site UA rules -------------------------------------------------------

// apiGetSiteUARules returns the UA whitelist and blacklist for a specific site.
func (s *Server) apiGetSiteUARules(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}
	s.getUARules(w, r, &site.ID)
}

// apiSaveSiteUARules replaces the UA whitelist and blacklist for a specific site atomically.
func (s *Server) apiSaveSiteUARules(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}
	s.saveUARules(w, r, &site.ID)
}

// -- trusted proxies ---------------------------------------------------------

// apiExportTrustedProxies streams the custom trusted proxy CIDRs as a CSV download
func (s *Server) apiExportTrustedProxies(w http.ResponseWriter, r *http.Request) {
	raw, err := db.GetTrustedProxiesCustom(s.cfg.DB)
	if err != nil {
		logger.Error("apiExportTrustedProxies: %v", err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	var rows [][]string
	for _, line := range strings.Split(raw, "\n") {
		if cidr := strings.TrimSpace(line); cidr != "" {
			// list_type is intentionally empty — trusted proxies have no whitelist/blacklist concept
			rows = append(rows, []string{"", cidr})
		}
	}

	exportCSV(w, "podnest-trusted-proxies.csv", []string{"list_type", "cidr"}, rows)
	logger.Debug("apiExportTrustedProxies: exported %d CIDRs", len(rows))
}

// apiImportTrustedProxies reads a CSV file upload and replaces the custom trusted proxy CIDRs
func (s *Server) apiImportTrustedProxies(w http.ResponseWriter, r *http.Request) {
	records, err := importCSV(r)
	if err != nil {
		logger.Error("apiImportTrustedProxies: %v", err)
		apiErrorMsg(w, http.StatusBadRequest, err.Error())
		return
	}

	// collect CIDRs from the value column, ignoring list_type
	var lines []string
	for _, rec := range records {
		if cidr := strings.TrimSpace(rec[1]); cidr != "" {
			lines = append(lines, cidr)
		}
	}

	if err := db.SetTrustedProxiesCustom(s.cfg.DB, strings.Join(lines, "\n")); err != nil {
		logger.Error("apiImportTrustedProxies: persist: %v", err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// re-warm the proxy trusted proxy cache
	if cidrs, err := db.GetTrustedProxies(s.cfg.DB); err != nil {
		logger.Warn("apiImportTrustedProxies: warm failed: %v", err)
	} else {
		s.proxy.WarmTrustedProxies(cidrs)
	}

	logger.Debug("apiImportTrustedProxies: imported %d CIDRs", len(lines))
	apiJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// -- shared CSV helpers ------------------------------------------------------

// exportCSV writes a CSV file to the response with the given filename, header row, and data rows
func exportCSV(w http.ResponseWriter, filename string, header []string, rows [][]string) {
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	cw := csv.NewWriter(w)
	_ = cw.Write(header)
	for _, row := range rows {
		_ = cw.Write(row)
	}
	cw.Flush()
}

// importCSV parses a multipart file upload and returns all data rows (header skipped).
// Expects exactly two columns: list_type and value.
func importCSV(r *http.Request) ([][]string, error) {
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

	// read and optionally discard the header row
	first, err := cr.Read()
	if err != nil {
		return nil, fmt.Errorf("invalid CSV")
	}

	var records [][]string

	// treat first row as data if it is not a header
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

// -- shared helpers ----------------------------------------------------------

// getIPRules fetches IP rules for the given scope and writes them as a JSON
// object with "whitelist" and "blacklist" newline-separated string fields.
func (s *Server) getIPRules(w http.ResponseWriter, r *http.Request, siteID *int64) {
	rules, err := db.GetIPRules(s.cfg.DB, siteID)
	if err != nil {
		logger.Error("getIPRules: failed to fetch: %v", err)
		apiError(w, http.StatusInternalServerError, err)
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
	apiJSON(w, http.StatusOK, map[string]string{
		"whitelist": strings.Join(wl, "\n"),
		"blacklist": strings.Join(bl, "\n"),
	})
}

// saveIPRules parses the request body, builds an IPRule slice, persists it,
// then refreshes the proxy security cache.
func (s *Server) saveIPRules(w http.ResponseWriter, r *http.Request, siteID *int64) {
	var req securityRulesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("saveIPRules: failed to decode body: %v", err)
		apiError(w, http.StatusBadRequest, err)
		return
	}

	rules := parseIPRules(req.Whitelist, models.RuleWhitelist)
	rules = append(rules, parseIPRules(req.Blacklist, models.RuleBlacklist)...)

	if err := db.ReplaceIPRules(s.cfg.DB, siteID, rules); err != nil {
		logger.Error("saveIPRules: replace failed: %v", err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	if err := s.refreshSecurityCache(); err != nil {
		logger.Error("saveIPRules: cache refresh failed: %v", err)
	}

	logger.Debug("saveIPRules: siteID=%v saved %d rules", siteID, len(rules))
	apiJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// getUARules fetches UA rules for the given scope and writes them as a JSON
// object with "whitelist" and "blacklist" newline-separated string fields.
func (s *Server) getUARules(w http.ResponseWriter, r *http.Request, siteID *int64) {
	rules, err := db.GetUARules(s.cfg.DB, siteID)
	if err != nil {
		logger.Error("getUARules: failed to fetch: %v", err)
		apiError(w, http.StatusInternalServerError, err)
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
	apiJSON(w, http.StatusOK, map[string]string{
		"whitelist": strings.Join(wl, "\n"),
		"blacklist": strings.Join(bl, "\n"),
	})
}

// saveUARules parses the request body, builds a UARule slice, persists it,
// then refreshes the proxy security cache.
func (s *Server) saveUARules(w http.ResponseWriter, r *http.Request, siteID *int64) {
	var req securityRulesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("saveUARules: failed to decode body: %v", err)
		apiError(w, http.StatusBadRequest, err)
		return
	}

	rules := parseUARules(req.Whitelist, models.RuleWhitelist)
	rules = append(rules, parseUARules(req.Blacklist, models.RuleBlacklist)...)

	if err := db.ReplaceUARules(s.cfg.DB, siteID, rules); err != nil {
		logger.Error("saveUARules: replace failed: %v", err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	if err := s.refreshSecurityCache(); err != nil {
		logger.Error("saveUARules: cache refresh failed: %v", err)
	}

	logger.Debug("saveUARules: siteID=%v saved %d rules", siteID, len(rules))
	apiJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// refreshSecurityCache re-fetches all rules from the database and pushes a
// newly compiled cache into the proxy atomically.
func (s *Server) refreshSecurityCache() error {
	ipRules, err := db.GetAllIPRules(s.cfg.DB)
	if err != nil {
		return err
	}
	uaRules, err := db.GetAllUARules(s.cfg.DB)
	if err != nil {
		return err
	}
	s.proxy.WarmSecurityCache(ipRules, uaRules)
	return nil
}

// parseIPRules splits a newline-delimited string into a slice of IPRule values,
// skipping blank lines and lines beginning with #.
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

// parseUARules splits a newline-delimited string into a slice of UARule values,
// skipping blank lines and lines beginning with #.
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

// apiExportGlobalIPRules streams the global IP rules as a CSV download
func (s *Server) apiExportGlobalIPRules(w http.ResponseWriter, r *http.Request) {
	s.exportIPRules(w, r, nil, "podnest-global-ip-rules.csv")
}

// apiExportSiteIPRules streams the per-site IP rules as a CSV download
func (s *Server) apiExportSiteIPRules(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}
	s.exportIPRules(w, r, &site.ID, fmt.Sprintf("%s-ip-rules.csv", site.Name))
}

// exportIPRules is the shared implementation for IP rule CSV export
func (s *Server) exportIPRules(w http.ResponseWriter, r *http.Request, siteID *int64, filename string) {
	rules, err := db.GetIPRules(s.cfg.DB, siteID)
	if err != nil {
		logger.Error("exportIPRules: failed to fetch rules: %v", err)
		apiError(w, http.StatusInternalServerError, err)
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

	exportCSV(w, filename, []string{"list_type", "cidr"}, rows)
	logger.Debug("exportIPRules: exported %d rules to %s", len(rules), filename)
}

// apiImportGlobalIPRules reads a CSV file upload and replaces the global IP rules atomically
func (s *Server) apiImportGlobalIPRules(w http.ResponseWriter, r *http.Request) {
	s.importIPRules(w, r, nil)
}

// apiImportSiteIPRules reads a CSV file upload and replaces the per-site IP rules atomically
func (s *Server) apiImportSiteIPRules(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}
	s.importIPRules(w, r, &site.ID)
}

// importIPRules is the shared implementation for IP rule CSV import
func (s *Server) importIPRules(w http.ResponseWriter, r *http.Request, siteID *int64) {
	records, err := importCSV(r)
	if err != nil {
		logger.Error("importIPRules: %v", err)
		apiErrorMsg(w, http.StatusBadRequest, err.Error())
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

	if err := db.ReplaceIPRules(s.cfg.DB, siteID, rules); err != nil {
		logger.Error("importIPRules: replace failed: %v", err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	if err := s.refreshSecurityCache(); err != nil {
		logger.Error("importIPRules: cache refresh failed: %v", err)
	}

	logger.Debug("importIPRules: siteID=%v imported %d rules", siteID, len(rules))
	apiJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// apiExportGlobalUARules streams the global UA rules as a CSV download
func (s *Server) apiExportGlobalUARules(w http.ResponseWriter, r *http.Request) {
	s.exportUARules(w, r, nil, "podnest-global-ua-rules.csv")
}

// apiExportSiteUARules streams the per-site UA rules as a CSV download
func (s *Server) apiExportSiteUARules(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}
	s.exportUARules(w, r, &site.ID, fmt.Sprintf("%s-ua-rules.csv", site.Name))
}

// exportUARules is the shared implementation for UA rule CSV export
func (s *Server) exportUARules(w http.ResponseWriter, r *http.Request, siteID *int64, filename string) {
	rules, err := db.GetUARules(s.cfg.DB, siteID)
	if err != nil {
		logger.Error("exportUARules: failed to fetch rules: %v", err)
		apiError(w, http.StatusInternalServerError, err)
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

	exportCSV(w, filename, []string{"list_type", "pattern"}, rows)
	logger.Debug("exportUARules: exported %d rules to %s", len(rules), filename)
}

// apiImportGlobalUARules reads a CSV file upload and replaces the global UA rules atomically
func (s *Server) apiImportGlobalUARules(w http.ResponseWriter, r *http.Request) {
	s.importUARules(w, r, nil)
}

// apiImportSiteUARules reads a CSV file upload and replaces the per-site UA rules atomically
func (s *Server) apiImportSiteUARules(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}
	s.importUARules(w, r, &site.ID)
}

// importUARules is the shared implementation for UA rule CSV import
func (s *Server) importUARules(w http.ResponseWriter, r *http.Request, siteID *int64) {
	records, err := importCSV(r)
	if err != nil {
		logger.Error("importUARules: %v", err)
		apiErrorMsg(w, http.StatusBadRequest, err.Error())
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

	if err := db.ReplaceUARules(s.cfg.DB, siteID, rules); err != nil {
		logger.Error("importUARules: replace failed: %v", err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	if err := s.refreshSecurityCache(); err != nil {
		logger.Error("importUARules: cache refresh failed: %v", err)
	}

	logger.Debug("importUARules: siteID=%v imported %d rules", siteID, len(rules))
	apiJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
