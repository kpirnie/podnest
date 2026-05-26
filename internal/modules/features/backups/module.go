package backups

import (
	"context"
	"database/sql"
	"net/http"

	"podnest/internal/backup"
	"podnest/internal/models"
	"podnest/internal/modules"
)

// Module implements modules.FeatureModule for the backups feature.
type Module struct {
	DB      *sql.DB
	Manager *backup.Manager
}

// FeatureID returns the unique key for this feature.
func (m Module) FeatureID() string { return "backups" }

// AppliesTo reports that backups are available for all site types.
func (m Module) AppliesTo(_ int) bool { return true }

// Tabs returns site-detail tab descriptors for the backups feature.
func (m Module) Tabs(_ *models.Site) []modules.TabDescriptor { return nil }

// RegisterRoutes mounts all backup HTTP handlers onto the provided mux.
func (m Module) RegisterRoutes(mux *http.ServeMux, resolve modules.SiteResolver) {
	mux.HandleFunc("GET /sites/{id}/backup-repo", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiGetBackupRepo(w, r, site)
	})
	mux.HandleFunc("PUT /sites/{id}/backup-repo", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiUpdateBackupRepo(w, r, site)
	})
	mux.HandleFunc("GET /sites/{id}/backups", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiListBackups(w, r, site)
	})
	mux.HandleFunc("POST /sites/{id}/backups", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiCreateBackup(w, r, site)
	})
	mux.HandleFunc("POST /sites/{id}/backups/{bid}/restore", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiRestoreBackup(w, r, site)
	})
	mux.HandleFunc("GET /sites/{id}/backups/restore-status", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiRestoreStatus(w, r, site)
	})
	mux.HandleFunc("DELETE /sites/{id}/backups/{bid}", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiDeleteBackup(w, r, site)
	})
	mux.HandleFunc("GET /sites/{id}/backups/{bid}/download", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiDownloadBackup(w, r, site)
	})
}

// OnSiteCreate is a no-op; backup repos are created on demand.
func (m Module) OnSiteCreate(_ context.Context, _ *models.Site) error { return nil }

// OnSiteDelete removes all backup records and the repo entry for the deleted site.
func (m Module) OnSiteDelete(_ context.Context, site *models.Site) error {
	return deleteBackupData(m.DB, site.ID)
}
