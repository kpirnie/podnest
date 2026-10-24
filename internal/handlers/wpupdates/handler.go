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

	"github.com/gorilla/websocket"
)

// Handler handles per-site WordPress update API routes.
type Handler struct {
	DB       *sql.DB
	AppPath  string
	WPUpdate *wpupdate.Manager
	Resolve  modules.SiteResolver
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 4096,
	// reject cross-origin upgrades — an update run rewrites site code, so only
	// same-origin (or non-browser, empty Origin) clients may start one
	CheckOrigin: apiutil.WSSameOrigin,
}

// wsWriter adapts a WebSocket connection to io.Writer for streamed exec output.
// Write errors are swallowed so a closed browser tab never aborts an update
// part-way through — the run finishes and the recheck still caches the result.
type wsWriter struct {
	conn *websocket.Conn
}

// Write sends p as a single text frame.
func (ww *wsWriter) Write(p []byte) (int, error) {
	_ = ww.conn.WriteMessage(websocket.TextMessage, p)
	return len(p), nil
}

// RegisterRoutes mounts WordPress update routes onto api.
func (h *Handler) RegisterRoutes(api *http.ServeMux) {
	api.HandleFunc("GET /sites/{id}/wpupdates", h.apiGetStatus)
	api.HandleFunc("POST /sites/{id}/wpupdates/check", h.apiCheckNow)
	api.HandleFunc("GET /sites/{id}/wpupdates/run", h.apiRunUpdates)
	api.HandleFunc("GET /sites/{id}/wpsso", h.apiGetSSO)
	api.HandleFunc("PUT /sites/{id}/wpsso", h.apiSetSSO)
	api.HandleFunc("POST /sites/{id}/wpsso/login", h.apiSSOLogin)
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

// apiRunUpdates upgrades to a WebSocket and streams a core/plugins/themes/all
// update run; the final frame is "[done]" or an "[error] ..." line.
func (h *Handler) apiRunUpdates(w http.ResponseWriter, r *http.Request) {
	site, ok := h.resolveWP(w, r)
	if !ok {
		return
	}

	scope := r.URL.Query().Get("scope")
	if !wpupdate.ValidScope(scope) {
		apiutil.ErrorMsg(w, http.StatusBadRequest, wpupdate.ErrBadScope.Error())
		return
	}
	if site.SiteStatus != models.StatusRunning {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "site must be running to apply updates")
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Error("apiRunUpdates: failed to upgrade connection for site %d: %v", site.ID, err)
		return
	}
	defer conn.Close()

	logger.Debug("apiRunUpdates: site %d running %s update", site.ID, scope)

	if err := h.WPUpdate.Update(r.Context(), site, scope, &wsWriter{conn: conn}); err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("\n[error] "+err.Error()))
		return
	}
	conn.WriteMessage(websocket.TextMessage, []byte("\n[done]"))
}
