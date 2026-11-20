// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package smtp

import (
	"net/http"

	"podnest/internal/apiutil"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
)

// apiGetSMTP returns a site's SMTP settings without exposing credentials.
func (m Module) apiGetSMTP(w http.ResponseWriter, _ *http.Request, site *models.Site) {

	// Retrieve the site's password-safe SMTP configuration.
	settings, err := db.GetSMTPSettings(m.DB, site.ID)
	if err != nil {
		logger.Error("apiGetSMTP: siteID=%d: %v", site.ID, err)
		apiutil.ErrorMsg(w, http.StatusInternalServerError, "failed to retrieve SMTP settings")
		return
	}

	logger.Debug("apiGetSMTP: siteID=%d retrieved", site.ID)
	apiutil.JSON(w, http.StatusOK, settings)
}
