// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package sftp

import (
	"net/http"

	"podnest/internal/apiutil"
	"podnest/internal/auth"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
)

// apiRegenerateSFTPPassword generates a new SFTP password for a site with zero downtime.
func (m Module) apiRegenerateSFTPPassword(w http.ResponseWriter, r *http.Request, site *models.Site) {
	newPassword, err := auth.GeneratePassword()
	if err != nil {
		logger.Error("failed to generate SFTP password for site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	if err := m.Manager.RegeneratePassword(r.Context(), site.Name, newPassword); err != nil {
		logger.Error("failed to regenerate SFTP password for site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	if err := db.UpdateSFTPPassword(m.DB, site.ID, newPassword); err != nil {
		logger.Error("failed to persist new SFTP password for site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("SFTP password regenerated for site %d", site.ID)
	w.Header().Set("Cache-Control", "no-store")
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok", "password": newPassword})
}

// apiRevealSFTPPassword returns the plaintext SFTP password for a site. Split
// out of apiGetSite so the credential is fetched on an explicit user action
// rather than riding along in every site-detail response.
func (m Module) apiRevealSFTPPassword(w http.ResponseWriter, r *http.Request, site *models.Site) {
	cred, err := db.GetSFTPCredBySite(m.DB, site.ID)
	if err != nil {
		logger.Error("failed to fetch SFTP cred for site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if cred == nil {
		apiutil.ErrorMsg(w, http.StatusNotFound, "no sftp credential for site")
		return
	}

	w.Header().Set("Cache-Control", "no-store")
	apiutil.JSON(w, http.StatusOK, map[string]string{"password": cred.Password})
}
