// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package waf

import (
	"context"
	"database/sql"
	"net/http"

	"podnest/internal/auth"
	"podnest/internal/models"
	"podnest/internal/modules"
)

// Module implements modules.FeatureModule for the WAF feature.
type Module struct {
	DB      *sql.DB
	AppPath string
	WarmWAF func() error
}

// FeatureID returns the unique key for this feature.
func (m Module) FeatureID() string { return "waf" }

// AppliesTo reports that WAF is available for all site types.
func (m Module) AppliesTo(_ int) bool { return true }

// Tabs returns site-detail tab descriptors for the WAF feature.
func (m Module) Tabs(_ *models.Site) []modules.TabDescriptor { return nil }

// RegisterRoutes mounts all WAF HTTP handlers onto the provided mux.
func (m Module) RegisterRoutes(mux *http.ServeMux, resolve modules.SiteResolver) {
	// global WAF settings — admin only
	mux.Handle("GET /settings/waf", auth.RequireAPIAdmin(http.HandlerFunc(m.apiGetWAFSettings)))
	mux.Handle("PUT /settings/waf", auth.RequireAPIAdmin(http.HandlerFunc(m.apiUpdateWAFSettings)))
	mux.Handle("GET /settings/waf/export", auth.RequireAPIAdmin(http.HandlerFunc(m.apiExportWAFSettings)))
	mux.Handle("POST /settings/waf/import", auth.RequireAPIAdmin(http.HandlerFunc(m.apiImportWAFSettings)))
	mux.Handle("GET /settings/waf/plugins", auth.RequireAPIAdmin(http.HandlerFunc(m.apiListAvailablePlugins)))

	// per-site WAF overrides and plugins
	mux.HandleFunc("GET /sites/{id}/waf", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiGetWAFSiteOverride(w, r, site)
	})
	mux.HandleFunc("PUT /sites/{id}/waf", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiUpdateWAFSiteOverride(w, r, site)
	})
	mux.HandleFunc("GET /sites/{id}/waf/export", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiExportWAFSiteOverride(w, r, site)
	})
	mux.HandleFunc("POST /sites/{id}/waf/import", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiImportWAFSiteOverride(w, r, site)
	})
	mux.HandleFunc("GET /sites/{id}/waf/plugins", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiGetSitePlugins(w, r, site)
	})
	mux.HandleFunc("PUT /sites/{id}/waf/plugins", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiSetSitePlugins(w, r, site)
	})
}

// OnSiteCreate is a no-op; WAF overrides start empty and are configured by the user.
func (m Module) OnSiteCreate(_ context.Context, _ *models.Site) error { return nil }

// OnSiteDelete removes all WAF overrides and plugin selections for the deleted site.
func (m Module) OnSiteDelete(_ context.Context, site *models.Site) error {
	return deleteSiteWAFData(m.DB, site.ID)
}
