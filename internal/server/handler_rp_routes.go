package server

import (
	"encoding/json"
	"net/http"
	"net/url"

	"podnest/internal/db"
	"podnest/internal/logger"
)

// apiGetRPRoutes returns all reverse proxy routes for a site as JSON
func (s *Server) apiGetRPRoutes(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}

	routes, err := db.GetRPRoutesBySite(s.cfg.DB, site.ID)
	if err != nil {
		logger.Error("apiGetRPRoutes: failed to fetch routes for site %d: %v", site.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// return an empty slice rather than null when no routes exist
	if routes == nil {
		routes = []db.RPRoute{}
	}

	logger.Debug("apiGetRPRoutes: returned %d routes for site %d", len(routes), site.ID)
	apiJSON(w, http.StatusOK, routes)
}

// apiUpdateRPRoutes validates and atomically replaces all routes for a site,
// then reloads the proxy domain cache to pick up the changes
func (s *Server) apiUpdateRPRoutes(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}

	var routes []db.RPRoute
	if err := json.NewDecoder(r.Body).Decode(&routes); err != nil {
		logger.Error("apiUpdateRPRoutes: failed to decode request body for site %d: %v", site.ID, err)
		apiError(w, http.StatusBadRequest, err)
		return
	}

	// validate each route has a non-empty domain and a parseable upstream URL
	for i, rt := range routes {
		if rt.Domain == "" {
			apiErrorMsg(w, http.StatusBadRequest, "route domain must not be empty")
			return
		}
		if _, err := url.ParseRequestURI(rt.Upstream); err != nil || rt.Upstream == "" {
			logger.Error("apiUpdateRPRoutes: invalid upstream '%s' at index %d: %v", rt.Upstream, i, err)
			apiErrorMsg(w, http.StatusBadRequest, "invalid upstream URL: "+rt.Upstream)
			return
		}
	}

	if err := db.ReplaceRPRoutes(s.cfg.DB, site.ID, routes); err != nil {
		logger.Error("apiUpdateRPRoutes: failed to replace routes for site %d: %v", site.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// reload the domain cache so the proxy picks up the updated upstream pools
	if err := s.proxy.WarmCache(); err != nil {
		logger.Error("apiUpdateRPRoutes: failed to reload domain cache after route update: %v", err)
	}

	// obtain certs for any domains that don't have one yet
	for _, rt := range routes {
		if rt.Domain != "" {
			s.proxy.ObtainCert(rt.Domain)
		}
	}

	logger.Debug("apiUpdateRPRoutes: updated %d routes for site %d", len(routes), site.ID)
	apiJSON(w, http.StatusOK, routes)
}
