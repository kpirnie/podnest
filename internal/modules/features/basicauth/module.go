// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package basicauth

import (
	"context"
	"database/sql"
	"net/http"

	"podnest/internal/models"
	"podnest/internal/modules"
)

// Module implements modules.FeatureModule for per-site proxy-level basic auth.
type Module struct {
	DB         *sql.DB
	WarmCaches func() error
}

// FeatureID returns the unique key for this feature.
func (m Module) FeatureID() string { return "basicauth" }

// AppliesTo reports that basic auth is available for all site types.
func (m Module) AppliesTo(_ int) bool { return true }

// Tabs returns no tab descriptors — basic auth is a sub-section of site security.
func (m Module) Tabs(_ *models.Site) []modules.TabDescriptor { return nil }

// RegisterRoutes mounts all basic auth HTTP handlers onto the provided mux.
func (m Module) RegisterRoutes(mux *http.ServeMux, resolve modules.SiteResolver) {
	mux.HandleFunc("GET /sites/{id}/basicauth", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiGetConfig(w, r, site)
	})
	mux.HandleFunc("PUT /sites/{id}/basicauth", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiSaveConfig(w, r, site)
	})
	mux.HandleFunc("GET /sites/{id}/basicauth/users", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiGetUsers(w, r, site)
	})
	mux.HandleFunc("PUT /sites/{id}/basicauth/users", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiUpsertUser(w, r, site)
	})
	mux.HandleFunc("DELETE /sites/{id}/basicauth/users/{uid}", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiDeleteUser(w, r, site)
	})
}

// OnSiteCreate is a no-op; basic auth starts disabled and is configured by the user.
func (m Module) OnSiteCreate(_ context.Context, _ *models.Site) error { return nil }

// OnSiteDelete removes all basic auth data for the deleted site.
func (m Module) OnSiteDelete(_ context.Context, site *models.Site) error {
	return deleteBasicAuthBySite(m.DB, site.ID)
}
