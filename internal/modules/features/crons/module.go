// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package crons

import (
	"context"
	"database/sql"
	"net/http"

	"podnest/internal/cron"
	"podnest/internal/models"
	"podnest/internal/modules"
)

// Module implements modules.FeatureModule for the crons feature.
type Module struct {
	DB      *sql.DB
	Manager *cron.Manager
}

// FeatureID returns the unique key for this feature.
func (m Module) FeatureID() string { return "crons" }

// AppliesTo reports that crons are available for site types with a runtime container.
func (m Module) AppliesTo(siteType int) bool {
	mod := modules.TypeModule(siteType)
	return mod != nil && mod.HasCronSupport()
}

// Tabs returns site-detail tab descriptors for the crons feature.
func (m Module) Tabs(_ *models.Site) []modules.TabDescriptor { return nil }

// RegisterRoutes mounts all cron HTTP handlers onto the provided mux.
func (m Module) RegisterRoutes(mux *http.ServeMux, resolve modules.SiteResolver) {
	mux.HandleFunc("GET /sites/{id}/crons", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiListCrons(w, r, site)
	})
	mux.HandleFunc("POST /sites/{id}/crons", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiCreateCron(w, r, site)
	})
	mux.HandleFunc("PUT /sites/{id}/crons/{cid}", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiUpdateCron(w, r, site)
	})
	mux.HandleFunc("DELETE /sites/{id}/crons/{cid}", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiDeleteCron(w, r, site)
	})
	mux.HandleFunc("PATCH /sites/{id}/crons/{cid}/toggle", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiToggleCron(w, r, site)
	})
	mux.HandleFunc("POST /sites/{id}/crons/{cid}/run", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiRunCronNow(w, r, site)
	})
}

// OnSiteCreate is a no-op; cron jobs are created by users after site setup.
func (m Module) OnSiteCreate(_ context.Context, _ *models.Site) error { return nil }

// OnSiteDelete removes all cron jobs for the deleted site.
func (m Module) OnSiteDelete(_ context.Context, site *models.Site) error {
	return deleteCronData(m.DB, site.ID)
}
