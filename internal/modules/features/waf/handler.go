package waf

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"podnest/internal/apiutil"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/proxy"
)

// -- request types -----------------------------------------------------------

// wafSettingsRequest is the request body for updating global WAF settings.
type wafSettingsRequest struct {
	Enabled       bool   `json:"enabled"`
	Mode          int    `json:"mode"`
	ParanoiaLevel int    `json:"paranoia_level"`
	AuditLog      bool   `json:"audit_log"`
	Exclusions    string `json:"exclusions"`
}

// wafSiteOverrideRequest is the request body for updating a per-site WAF override.
type wafSiteOverrideRequest struct {
	Override   int    `json:"override"`
	Exclusions string `json:"exclusions"`
}

// -- global WAF settings -----------------------------------------------------

// apiGetWAFSettings returns the current global WAF configuration.
func (m Module) apiGetWAFSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := db.GetWAFSettings(m.DB)
	if err != nil {
		logger.Error("apiGetWAFSettings: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	logger.Debug("apiGetWAFSettings: retrieved")
	apiutil.JSON(w, http.StatusOK, settings)
}

// apiUpdateWAFSettings persists global WAF settings and recompiles the engine.
func (m Module) apiUpdateWAFSettings(w http.ResponseWriter, r *http.Request) {
	var req wafSettingsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("apiUpdateWAFSettings: decode: %v", err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}
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
	if err := db.SaveWAFSettings(m.DB, settings); err != nil {
		logger.Error("apiUpdateWAFSettings: save: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	go func() {
		if err := m.WarmWAF(); err != nil {
			logger.Error("apiUpdateWAFSettings: WAF cache refresh failed: %v", err)
		}
	}()
	logger.Debug("apiUpdateWAFSettings: saved and cache refresh triggered")
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// -- per-site WAF overrides --------------------------------------------------

// apiGetWAFSiteOverride returns the WAF override settings for a specific site.
func (m Module) apiGetWAFSiteOverride(w http.ResponseWriter, _ *http.Request, site *models.Site) {
	override, err := db.GetWAFSiteOverride(m.DB, site.ID)
	if err != nil {
		logger.Error("apiGetWAFSiteOverride: siteID=%d %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	logger.Debug("apiGetWAFSiteOverride: siteID=%d retrieved", site.ID)
	apiutil.JSON(w, http.StatusOK, override)
}

// apiUpdateWAFSiteOverride persists the WAF override for a specific site.
func (m Module) apiUpdateWAFSiteOverride(w http.ResponseWriter, r *http.Request, site *models.Site) {
	var req wafSiteOverrideRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("apiUpdateWAFSiteOverride: decode: %v", err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}
	override := db.WAFSiteOverride{
		SiteID:     site.ID,
		Override:   req.Override,
		Exclusions: req.Exclusions,
	}
	if err := db.SaveWAFSiteOverride(m.DB, override); err != nil {
		logger.Error("apiUpdateWAFSiteOverride: siteID=%d save: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	go func() {
		if err := m.WarmWAF(); err != nil {
			logger.Error("apiUpdateWAFSiteOverride: WAF cache refresh failed: %v", err)
		}
	}()
	logger.Debug("apiUpdateWAFSiteOverride: siteID=%d saved and cache refresh triggered", site.ID)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// -- per-site WAF plugins ----------------------------------------------------

// apiListAvailablePlugins returns the .conf filenames present in the CRS plugins directory.
func (m Module) apiListAvailablePlugins(w http.ResponseWriter, r *http.Request) {
	crsDir := proxy.CRSDir(m.AppPath)
	plugins, err := proxy.ListAvailablePlugins(crsDir)
	if err != nil {
		logger.Error("apiListAvailablePlugins: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if plugins == nil {
		plugins = []string{}
	}
	logger.Debug("apiListAvailablePlugins: returning %d plugins", len(plugins))
	apiutil.JSON(w, http.StatusOK, plugins)
}

// apiGetSitePlugins returns the enabled plugin filenames for a specific site.
func (m Module) apiGetSitePlugins(w http.ResponseWriter, _ *http.Request, site *models.Site) {
	plugins, err := db.GetSitePlugins(m.DB, site.ID)
	if err != nil {
		logger.Error("apiGetSitePlugins: siteID=%d %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	logger.Debug("apiGetSitePlugins: siteID=%d retrieved %d plugins", site.ID, len(plugins))
	apiutil.JSON(w, http.StatusOK, plugins)
}

// apiSetSitePlugins replaces the plugin selection for a specific site.
func (m Module) apiSetSitePlugins(w http.ResponseWriter, r *http.Request, site *models.Site) {
	var plugins []string
	if err := json.NewDecoder(r.Body).Decode(&plugins); err != nil {
		logger.Error("apiSetSitePlugins: decode: siteID=%d %v", site.ID, err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}
	if err := db.SetSitePlugins(m.DB, site.ID, plugins); err != nil {
		logger.Error("apiSetSitePlugins: save: siteID=%d %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	go func() {
		if err := m.WarmWAF(); err != nil {
			logger.Error("apiSetSitePlugins: WAF cache refresh failed: %v", err)
		}
	}()
	logger.Debug("apiSetSitePlugins: siteID=%d saved and cache refresh triggered", site.ID)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// -- WAF export / import -----------------------------------------------------

// apiExportWAFSettings streams the global WAF configuration as a JSON download.
func (m Module) apiExportWAFSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := db.GetWAFSettings(m.DB)
	if err != nil {
		logger.Error("apiExportWAFSettings: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", `attachment; filename="podnest-waf-settings.json"`)
	_ = json.NewEncoder(w).Encode(settings)
	logger.Debug("apiExportWAFSettings: exported")
}

// apiImportWAFSettings reads a JSON file upload and replaces global WAF settings.
func (m Module) apiImportWAFSettings(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(1 << 20); err != nil {
		logger.Error("apiImportWAFSettings: parse form: %v", err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}
	f, _, err := r.FormFile("file")
	if err != nil {
		logger.Error("apiImportWAFSettings: missing file: %v", err)
		apiutil.ErrorMsg(w, http.StatusBadRequest, "file field is required")
		return
	}
	defer f.Close()

	var settings db.WAFSettings
	if err := json.NewDecoder(io.LimitReader(f, 1<<20)).Decode(&settings); err != nil {
		logger.Error("apiImportWAFSettings: decode: %v", err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}
	if settings.ParanoiaLevel < 1 || settings.ParanoiaLevel > 4 {
		settings.ParanoiaLevel = 1
	}
	if err := db.SaveWAFSettings(m.DB, settings); err != nil {
		logger.Error("apiImportWAFSettings: save: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	go func() {
		if err := m.WarmWAF(); err != nil {
			logger.Error("apiImportWAFSettings: WAF cache refresh failed: %v", err)
		}
	}()
	logger.Debug("apiImportWAFSettings: imported and cache refresh triggered")
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// apiExportWAFSiteOverride streams the per-site WAF override as a JSON download.
func (m Module) apiExportWAFSiteOverride(w http.ResponseWriter, _ *http.Request, site *models.Site) {
	override, err := db.GetWAFSiteOverride(m.DB, site.ID)
	if err != nil {
		logger.Error("apiExportWAFSiteOverride: siteID=%d %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	plugins, err := db.GetSitePlugins(m.DB, site.ID)
	if err != nil {
		logger.Error("apiExportWAFSiteOverride: plugins siteID=%d %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if plugins == nil {
		plugins = []string{}
	}
	payload := struct {
		Override   int      `json:"override"`
		Exclusions string   `json:"exclusions"`
		Plugins    []string `json:"plugins"`
	}{
		Override:   override.Override,
		Exclusions: override.Exclusions,
		Plugins:    plugins,
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s-waf-override.json"`, site.Name))
	_ = json.NewEncoder(w).Encode(payload)
	logger.Debug("apiExportWAFSiteOverride: siteID=%d exported", site.ID)
}

// apiImportWAFSiteOverride reads a JSON file upload and replaces the per-site WAF override and plugins.
func (m Module) apiImportWAFSiteOverride(w http.ResponseWriter, r *http.Request, site *models.Site) {
	if err := r.ParseMultipartForm(1 << 20); err != nil {
		logger.Error("apiImportWAFSiteOverride: parse form: %v", err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}
	f, _, err := r.FormFile("file")
	if err != nil {
		logger.Error("apiImportWAFSiteOverride: missing file: %v", err)
		apiutil.ErrorMsg(w, http.StatusBadRequest, "file field is required")
		return
	}
	defer f.Close()

	var payload struct {
		Override   int      `json:"override"`
		Exclusions string   `json:"exclusions"`
		Plugins    []string `json:"plugins"`
	}
	if err := json.NewDecoder(io.LimitReader(f, 1<<20)).Decode(&payload); err != nil {
		logger.Error("apiImportWAFSiteOverride: decode: siteID=%d %v", site.ID, err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}
	if err := db.SaveWAFSiteOverride(m.DB, db.WAFSiteOverride{
		SiteID:     site.ID,
		Override:   payload.Override,
		Exclusions: payload.Exclusions,
	}); err != nil {
		logger.Error("apiImportWAFSiteOverride: save override: siteID=%d %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if payload.Plugins == nil {
		payload.Plugins = []string{}
	}
	if err := db.SetSitePlugins(m.DB, site.ID, payload.Plugins); err != nil {
		logger.Error("apiImportWAFSiteOverride: save plugins: siteID=%d %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	go func() {
		if err := m.WarmWAF(); err != nil {
			logger.Error("apiImportWAFSiteOverride: WAF cache refresh failed: %v", err)
		}
	}()
	logger.Debug("apiImportWAFSiteOverride: siteID=%d imported and cache refresh triggered", site.ID)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
