// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package rproxy

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/url"
	"strings"

	"podnest/internal/apiutil"
	"podnest/internal/audit"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/modules"
)

// ProxyRoutes is the subset of proxy.Proxy consumed by this handler.
type ProxyRoutes interface {
	WarmCaches(justTrustedProxies bool) error
	ObtainCert(domain string)
}

// Handler handles reverse proxy route management API routes.
type Handler struct {
	DB      *sql.DB
	Proxy   ProxyRoutes
	Resolve modules.SiteResolver
}

// RegisterRoutes mounts reverse proxy route management routes onto api.
func (h *Handler) RegisterRoutes(api *http.ServeMux) {
	api.HandleFunc("GET /sites/{id}/rp-routes", h.apiGetRPRoutes)
	api.HandleFunc("PUT /sites/{id}/rp-routes", h.apiUpdateRPRoutes)
}

func (h *Handler) apiGetRPRoutes(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}

	routes, err := db.GetRPRoutesBySite(h.DB, site.ID)
	if err != nil {
		logger.Error("apiGetRPRoutes: failed to fetch routes for site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	if routes == nil {
		routes = []db.RPRoute{}
	}

	logger.Debug("apiGetRPRoutes: returned %d routes for site %d", len(routes), site.ID)
	apiutil.JSON(w, http.StatusOK, routes)
}

func (h *Handler) apiUpdateRPRoutes(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}

	var routes []db.RPRoute
	if err := json.NewDecoder(r.Body).Decode(&routes); err != nil {
		logger.Error("apiUpdateRPRoutes: failed to decode request body for site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	for i := range routes {
		// normalise the match host — trailing whitespace or mixed case silently
		// fails to match the request Host and 404s the route
		routes[i].Domain = strings.ToLower(strings.TrimSpace(routes[i].Domain))
		if routes[i].Domain == "" {
			apiutil.ErrorMsg(w, http.StatusBadRequest, "route domain must not be empty")
			return
		}
		if _, err := url.ParseRequestURI(routes[i].Upstream); err != nil || routes[i].Upstream == "" {
			logger.Error("apiUpdateRPRoutes: invalid upstream '%s' at index %d: %v", routes[i].Upstream, i, err)
			apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid upstream URL: "+routes[i].Upstream)
			return
		}
	}

	prior := db.SnapshotRPRoutes(h.DB, site.ID)

	if err := db.ReplaceRPRoutes(h.DB, site.ID, routes); err != nil {
		logger.Error("apiUpdateRPRoutes: failed to replace routes for site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	if err := h.Proxy.WarmCaches(false); err != nil {
		logger.Error("apiUpdateRPRoutes: failed to reload domain cache after route update: %v", err)
	}

	for _, rt := range routes {
		if rt.Domain != "" {
			h.Proxy.ObtainCert(rt.Domain)
		}
	}

	logger.Debug("apiUpdateRPRoutes: updated %d routes for site %d", len(routes), site.ID)
	*r = *r.WithContext(audit.WithStateContext(r.Context(), prior, db.SnapshotRPRoutes(h.DB, site.ID)))
	apiutil.JSON(w, http.StatusOK, routes)
}
