package server

import (
	"encoding/json"
	"net/http"

	"podnest/internal/db"
	"podnest/internal/logger"
)

// -- request types -----------------------------------------------------------

// wafSettingsRequest is the request body for updating global WAF settings
type wafSettingsRequest struct {
	Enabled       bool   `json:"enabled"`
	Mode          int    `json:"mode"`           // db.WAFModeDetect or db.WAFModePrevent
	ParanoiaLevel int    `json:"paranoia_level"` // 1–4
	AuditLog      bool   `json:"audit_log"`
	Exclusions    string `json:"exclusions"` // newline-separated rule IDs or tags
}

// wafSiteOverrideRequest is the request body for updating a per-site WAF override
type wafSiteOverrideRequest struct {
	Override   int    `json:"override"`   // db.WAFOverrideInherit / On / Off
	Exclusions string `json:"exclusions"` // newline-separated rule IDs or tags
}

// -- global WAF settings -----------------------------------------------------

// apiGetWAFSettings returns the current global WAF configuration
func (s *Server) apiGetWAFSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := db.GetWAFSettings(s.cfg.DB)
	if err != nil {
		logger.Error("apiGetWAFSettings: %v", err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("apiGetWAFSettings: retrieved")
	apiJSON(w, http.StatusOK, settings)
}

// apiUpdateWAFSettings persists global WAF settings and recompiles the engine
func (s *Server) apiUpdateWAFSettings(w http.ResponseWriter, r *http.Request) {
	var req wafSettingsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("apiUpdateWAFSettings: decode: %v", err)
		apiError(w, http.StatusBadRequest, err)
		return
	}

	// clamp paranoia level to valid CRS range
	if req.ParanoiaLevel < 1 || req.ParanoiaLevel > 4 {
		req.ParanoiaLevel = 1
	}

	settings := db.WAFSettings{
		Enabled:       req.Enabled,
		Mode:          req.Mode,
		ParanoiaLevel: req.ParanoiaLevel,
		AuditLog:      req.AuditLog,
		Exclusions:    req.Exclusions,
	}

	if err := db.SaveWAFSettings(s.cfg.DB, settings); err != nil {
		logger.Error("apiUpdateWAFSettings: save: %v", err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// recompile the Coraza engine with the new settings — runs in background
	// so the HTTP response is not held while CRS compiles
	go func() {
		if err := s.proxy.WarmWAFCache(); err != nil {
			logger.Error("apiUpdateWAFSettings: WAF cache refresh failed: %v", err)
		}
	}()

	logger.Debug("apiUpdateWAFSettings: saved and cache refresh triggered")
	apiJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// -- per-site WAF overrides --------------------------------------------------

// apiGetWAFSiteOverride returns the WAF override settings for a specific site
func (s *Server) apiGetWAFSiteOverride(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}

	override, err := db.GetWAFSiteOverride(s.cfg.DB, site.ID)
	if err != nil {
		logger.Error("apiGetWAFSiteOverride: siteID=%d %v", site.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("apiGetWAFSiteOverride: siteID=%d retrieved", site.ID)
	apiJSON(w, http.StatusOK, override)
}

// apiUpdateWAFSiteOverride persists the WAF override for a specific site and
// recompiles the engine if site-level exclusions changed
func (s *Server) apiUpdateWAFSiteOverride(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}

	var req wafSiteOverrideRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("apiUpdateWAFSiteOverride: decode: %v", err)
		apiError(w, http.StatusBadRequest, err)
		return
	}

	override := db.WAFSiteOverride{
		SiteID:     site.ID,
		Override:   req.Override,
		Exclusions: req.Exclusions,
	}

	if err := db.SaveWAFSiteOverride(s.cfg.DB, override); err != nil {
		logger.Error("apiUpdateWAFSiteOverride: siteID=%d save: %v", site.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// recompile in background — site-specific engines may need rebuilding
	go func() {
		if err := s.proxy.WarmWAFCache(); err != nil {
			logger.Error("apiUpdateWAFSiteOverride: WAF cache refresh failed: %v", err)
		}
	}()

	logger.Debug("apiUpdateWAFSiteOverride: siteID=%d saved and cache refresh triggered", site.ID)
	apiJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
