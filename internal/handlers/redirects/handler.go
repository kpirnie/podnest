// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package redirects

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/url"

	"podnest/internal/apiutil"
	"podnest/internal/audit"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/modules"
)

// Handler handles per-site redirect rule API routes.
type Handler struct {
	DB      *sql.DB
	Proxy   ProxyRedirects
	Resolve modules.SiteResolver
}

// ProxyRedirects is the subset of proxy.Proxy consumed by this handler.
type ProxyRedirects interface {
	WarmRedirectCache(siteID int64, redirects []db.Redirect)
}

// RegisterRoutes mounts redirect management routes onto api.
func (h *Handler) RegisterRoutes(api *http.ServeMux) {
	api.HandleFunc("GET /sites/{id}/redirects", h.apiGetRedirects)
	api.HandleFunc("PUT /sites/{id}/redirects", h.apiUpdateRedirects)
}

// apiGetRedirects returns all redirect rules for a site.
func (h *Handler) apiGetRedirects(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}

	redirects, err := db.GetRedirectsBySite(h.DB, site.ID)
	if err != nil {
		logger.Error("apiGetRedirects: failed to fetch redirects for site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	if redirects == nil {
		redirects = []db.Redirect{}
	}

	logger.Debug("apiGetRedirects: returned %d redirects for site %d", len(redirects), site.ID)
	apiutil.JSON(w, http.StatusOK, redirects)
}

// apiUpdateRedirects replaces all redirect rules for a site.
func (h *Handler) apiUpdateRedirects(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}

	var redirects []db.Redirect
	if err := json.NewDecoder(r.Body).Decode(&redirects); err != nil {
		logger.Error("apiUpdateRedirects: failed to decode request body for site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	for i, rd := range redirects {
		if rd.Source == "" {
			apiutil.ErrorMsg(w, http.StatusBadRequest, "redirect source must not be empty")
			return
		}
		if _, err := url.ParseRequestURI(rd.Target); err != nil || rd.Target == "" {
			logger.Error("apiUpdateRedirects: invalid target '%s' at index %d: %v", rd.Target, i, err)
			apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid redirect target: "+rd.Target)
			return
		}
		if rd.Code != 301 && rd.Code != 302 && rd.Code != 307 && rd.Code != 308 {
			apiutil.ErrorMsg(w, http.StatusBadRequest, "redirect code must be 301, 302, 307, or 308")
			return
		}
	}

	prior := db.SnapshotRedirects(h.DB, site.ID)

	if err := db.ReplaceRedirects(h.DB, site.ID, redirects); err != nil {
		logger.Error("apiUpdateRedirects: failed to replace redirects for site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// push updated rules into the proxy cache immediately
	h.Proxy.WarmRedirectCache(site.ID, redirects)

	logger.Debug("apiUpdateRedirects: updated %d redirects for site %d", len(redirects), site.ID)
	*r = *r.WithContext(audit.WithStateContext(r.Context(), prior, db.SnapshotRedirects(h.DB, site.ID)))
	apiutil.JSON(w, http.StatusOK, redirects)
}
