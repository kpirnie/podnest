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

	// partition into whitelist and blacklist, collect CIDRs into strings
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

	// parse whitelist and blacklist entries, skipping blank lines
	rules := parseIPRules(req.Whitelist, models.RuleWhitelist)
	rules = append(rules, parseIPRules(req.Blacklist, models.RuleBlacklist)...)

	if err := db.ReplaceIPRules(s.cfg.DB, siteID, rules); err != nil {
		logger.Error("saveIPRules: replace failed: %v", err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// reload the proxy security cache so changes take effect immediately
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

	// partition into whitelist and blacklist, collect patterns into strings
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

	// parse whitelist and blacklist entries, skipping blank lines
	rules := parseUARules(req.Whitelist, models.RuleWhitelist)
	rules = append(rules, parseUARules(req.Blacklist, models.RuleBlacklist)...)

	if err := db.ReplaceUARules(s.cfg.DB, siteID, rules); err != nil {
		logger.Error("saveUARules: replace failed: %v", err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// reload the proxy security cache so changes take effect immediately
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

	// fetch the rules for the given scope
	rules, err := db.GetIPRules(s.cfg.DB, siteID)
	if err != nil {
		logger.Error("exportIPRules: failed to fetch rules: %v", err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// stream as a CSV attachment
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))

	cw := csv.NewWriter(w)
	_ = cw.Write([]string{"list_type", "cidr"})
	for _, rule := range rules {
		listType := "blacklist"
		if rule.ListType == models.RuleWhitelist {
			listType = "whitelist"
		}
		_ = cw.Write([]string{listType, rule.CIDR})
	}
	cw.Flush()

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

	// parse the multipart form — limit to 1MB
	if err := r.ParseMultipartForm(1 << 20); err != nil {
		logger.Error("importIPRules: failed to parse multipart form: %v", err)
		apiError(w, http.StatusBadRequest, err)
		return
	}

	// pull the uploaded file from the "file" field
	f, _, err := r.FormFile("file")
	if err != nil {
		logger.Error("importIPRules: missing file field: %v", err)
		apiErrorMsg(w, http.StatusBadRequest, "file field is required")
		return
	}
	defer f.Close()

	// parse the CSV rows into an IPRule slice
	cr := csv.NewReader(io.LimitReader(f, 1<<20))
	cr.FieldsPerRecord = 2
	cr.Comment = '#'

	// read and discard the header row if present
	header, err := cr.Read()
	if err != nil {
		logger.Error("importIPRules: failed to read CSV: %v", err)
		apiErrorMsg(w, http.StatusBadRequest, "invalid CSV")
		return
	}

	var rules []db.IPRule

	// process first row as data if it is not a header
	if strings.ToLower(header[0]) != "list_type" {
		lt := models.RuleBlacklist
		if strings.ToLower(header[0]) == "whitelist" {
			lt = models.RuleWhitelist
		}
		rules = append(rules, db.IPRule{ListType: lt, CIDR: strings.TrimSpace(header[1])})
	}

	// process remaining rows
	for {
		rec, err := cr.Read()
		if err != nil {
			break
		}
		lt := models.RuleBlacklist
		if strings.ToLower(rec[0]) == "whitelist" {
			lt = models.RuleWhitelist
		}
		cidr := strings.TrimSpace(rec[1])
		if cidr == "" {
			continue
		}
		rules = append(rules, db.IPRule{ListType: lt, CIDR: cidr})
	}

	// atomically replace the rules for this scope
	if err := db.ReplaceIPRules(s.cfg.DB, siteID, rules); err != nil {
		logger.Error("importIPRules: replace failed: %v", err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// reload the proxy security cache so changes take effect immediately
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

	// fetch the rules for the given scope
	rules, err := db.GetUARules(s.cfg.DB, siteID)
	if err != nil {
		logger.Error("exportUARules: failed to fetch rules: %v", err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// stream as a CSV attachment
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))

	cw := csv.NewWriter(w)
	_ = cw.Write([]string{"list_type", "pattern"})
	for _, rule := range rules {
		listType := "blacklist"
		if rule.ListType == models.RuleWhitelist {
			listType = "whitelist"
		}
		_ = cw.Write([]string{listType, rule.Pattern})
	}
	cw.Flush()

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

	// parse the multipart form — limit to 1MB
	if err := r.ParseMultipartForm(1 << 20); err != nil {
		logger.Error("importUARules: failed to parse multipart form: %v", err)
		apiError(w, http.StatusBadRequest, err)
		return
	}

	// pull the uploaded file from the "file" field
	f, _, err := r.FormFile("file")
	if err != nil {
		logger.Error("importUARules: missing file field: %v", err)
		apiErrorMsg(w, http.StatusBadRequest, "file field is required")
		return
	}
	defer f.Close()

	// parse the CSV rows into a UARule slice
	cr := csv.NewReader(io.LimitReader(f, 1<<20))
	cr.FieldsPerRecord = 2
	cr.Comment = '#'

	// read and discard the header row if present
	header, err := cr.Read()
	if err != nil {
		logger.Error("importUARules: failed to read CSV: %v", err)
		apiErrorMsg(w, http.StatusBadRequest, "invalid CSV")
		return
	}

	var rules []db.UARule

	// process first row as data if it is not a header
	if strings.ToLower(header[0]) != "list_type" {
		lt := models.RuleBlacklist
		if strings.ToLower(header[0]) == "whitelist" {
			lt = models.RuleWhitelist
		}
		pattern := strings.TrimSpace(header[1])
		if pattern != "" {
			rules = append(rules, db.UARule{ListType: lt, Pattern: pattern})
		}
	}

	// process remaining rows
	for {
		rec, err := cr.Read()
		if err != nil {
			break
		}
		lt := models.RuleBlacklist
		if strings.ToLower(rec[0]) == "whitelist" {
			lt = models.RuleWhitelist
		}
		pattern := strings.TrimSpace(rec[1])
		if pattern == "" {
			continue
		}
		rules = append(rules, db.UARule{ListType: lt, Pattern: pattern})
	}

	// atomically replace the rules for this scope
	if err := db.ReplaceUARules(s.cfg.DB, siteID, rules); err != nil {
		logger.Error("importUARules: replace failed: %v", err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// reload the proxy security cache so changes take effect immediately
	if err := s.refreshSecurityCache(); err != nil {
		logger.Error("importUARules: cache refresh failed: %v", err)
	}

	logger.Debug("importUARules: siteID=%v imported %d rules", siteID, len(rules))
	apiJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
