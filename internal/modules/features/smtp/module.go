// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package smtp

import (
	"context"
	"database/sql"
	"net/http"

	"podnest/internal/db"
	"podnest/internal/models"
	"podnest/internal/modules"
)

// Module implements modules.FeatureModule for per-site SMTP configuration.
type Module struct {
	DB *sql.DB
}

// FeatureID returns the unique key for this feature.
func (m Module) FeatureID() string { return "smtp" }

// AppliesTo reports whether SMTP is supported for the given site type.
func (m Module) AppliesTo(siteType int) bool {
	switch siteType {
	case models.SiteTypeWordPress,
		models.SiteTypePHP,
		models.SiteTypeNode,
		models.SiteTypeDotNet,
		models.SiteTypePython:
		return true
	default:
		return false
	}
}

// Tabs returns no descriptors; SMTP will use the existing JavaScript site-detail UI.
func (m Module) Tabs(_ *models.Site) []modules.TabDescriptor { return nil }

// RegisterRoutes registers the SMTP management API routes.
func (m Module) RegisterRoutes(_ *http.ServeMux, _ modules.SiteResolver) {}

// OnSiteCreate is a no-op; SMTP starts disabled.
func (m Module) OnSiteCreate(_ context.Context, _ *models.Site) error { return nil }

// OnSiteDelete removes SMTP configuration belonging to the deleted site.
func (m Module) OnSiteDelete(_ context.Context, site *models.Site) error {
	return db.DeleteConfigsByType(m.DB, site.ID, models.ConfigSMTP)
}
