package server

import (
	"encoding/json"
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
