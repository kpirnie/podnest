package sftp

import (
	"context"
	"database/sql"
	"net/http"

	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/sftp"
)

// Module implements modules.FeatureModule for the SFTP feature.
type Module struct {
	DB      *sql.DB
	Manager *sftp.Manager
}

// FeatureID returns the unique key for this feature.
func (m Module) FeatureID() string { return "sftp" }

// AppliesTo reports that SFTP is available for site types that have SFTP credentials.
func (m Module) AppliesTo(siteType int) bool {
	mod := modules.TypeModule(siteType)
	return mod != nil && mod.HasSFTP()
}

// Tabs returns site-detail tab descriptors for the SFTP feature.
func (m Module) Tabs(_ *models.Site) []modules.TabDescriptor { return nil }

// RegisterRoutes mounts all SFTP HTTP handlers onto the provided mux.
func (m Module) RegisterRoutes(mux *http.ServeMux, resolve modules.SiteResolver) {
	mux.HandleFunc("POST /sites/{id}/sftp-regen", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiRegenerateSFTPPassword(w, r, site)
	})
}

// OnSiteCreate is a no-op; SFTP users are created during site provisioning.
func (m Module) OnSiteCreate(_ context.Context, _ *models.Site) error { return nil }

// OnSiteDelete is a no-op; SFTP user removal is handled by the site deletion flow.
func (m Module) OnSiteDelete(_ context.Context, _ *models.Site) error { return nil }
