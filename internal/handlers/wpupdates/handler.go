// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package wpupdates

import (
	"database/sql"
	"errors"
	"net/http"

	"podnest/internal/apiutil"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/wpupdate"
)

// Handler handles per-site WordPress update API routes.
type Handler struct {
	DB       *sql.DB
	WPUpdate *wpupdate.Manager
	Resolve  modules.SiteResolver
}

// RegisterRoutes mounts WordPress update routes onto api.
func (h *Handler) RegisterRoutes(api *http.ServeMux) {
	api.HandleFunc("GET /sites/{id}/wpupdates", h.apiGetStatus)
	api.HandleFunc("POST /sites/{id}/wpupdates/check", h.apiCheckNow)
}

// resolveWP resolves the site and rejects non-WordPress sites.
func (h *Handler) resolveWP(w http.ResponseWriter, r *http.Request) (*models.Site, bool) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return nil, false
	}
	if site.SiteType != models.SiteTypeWordPress {
		apiutil.ErrorMsg(w, http.StatusBadRequest, wpupdate.ErrNotWordPress.Error())
		return nil, false
	}
	return site, true
}

// apiGetStatus returns the site's cached update status; status is null until
// the first check has run.
func (h *Handler) apiGetStatus(w http.ResponseWriter, r *http.Request) {
	site, ok := h.resolveWP(w, r)
	if !ok {
		return
	}

	status, err := db.GetWPUpdateStatus(h.DB, site.ID)
	if err != nil {
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	apiutil.JSON(w, http.StatusOK, map[string]any{"status": status})
}

// apiCheckNow runs an update check against the site and returns the fresh status.
func (h *Handler) apiCheckNow(w http.ResponseWriter, r *http.Request) {
	site, ok := h.resolveWP(w, r)
	if !ok {
		return
	}
	if site.SiteStatus != models.StatusRunning {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "site must be running to check for updates")
		return
	}

	status, err := h.WPUpdate.Check(r.Context(), site)
	switch {
	case errors.Is(err, wpupdate.ErrCheckRunning):
		apiutil.ErrorMsg(w, http.StatusConflict, err.Error())
		return
	case err != nil:
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("apiCheckNow: checked updates for site %d", site.ID)
	apiutil.JSON(w, http.StatusOK, map[string]any{"status": status})
}
