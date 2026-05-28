package stats

import (
	"context"
	"database/sql"
	"net/http"

	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/podman"
)

// Module implements modules.FeatureModule for the stats feature.
type Module struct {
	DB      *sql.DB
	AppPath string
	Podman  *podman.Client
}

// FeatureID returns the unique key for this feature.
func (m Module) FeatureID() string { return "stats" }

// AppliesTo reports that stats are available for all site types.
func (m Module) AppliesTo(_ int) bool { return true }

// Tabs returns no tab descriptors — the Stats tab is wired directly in the JS.
func (m Module) Tabs(_ *models.Site) []modules.TabDescriptor { return nil }

// RegisterRoutes mounts all stats HTTP handlers onto the provided mux.
func (m Module) RegisterRoutes(mux *http.ServeMux, resolve modules.SiteResolver) {
	h := &Handler{
		DB:      m.DB,
		AppPath: m.AppPath,
		Podman:  m.Podman,
		Resolve: resolve,
	}

	// per-site routes
	mux.HandleFunc("GET /sites/{id}/stats/traffic", h.apiSiteTraffic)
	mux.HandleFunc("GET /sites/{id}/stats/pod", h.apiSitePodStats)
	mux.HandleFunc("GET /sites/{id}/stats/disk", h.apiSiteDisk)

	// global dashboard routes
	mux.HandleFunc("GET /stats/traffic", h.apiGlobalTraffic)
	mux.HandleFunc("GET /stats/pod", h.apiGlobalPod)
}

// OnSiteCreate is a no-op; stats are computed on demand.
func (m Module) OnSiteCreate(_ context.Context, _ *models.Site) error { return nil }

// OnSiteDelete evicts any cached traffic stats for the deleted site.
func (m Module) OnSiteDelete(_ context.Context, site *models.Site) error {
	globalCache.mu.Lock()
	defer globalCache.mu.Unlock()
	delete(globalCache.entries, site.ID)
	return nil
}
