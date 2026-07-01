// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package server

import (
	"net/http"

	"podnest/internal/auth"
	"podnest/web"
)

// registerAPIDocs mounts the admin-gated Scalar API reference at /api-docs.
// The page, its bootstrap JS, and the OpenAPI spec are served from the private
// web.APIDocs tree (not the public /static/ mount), behind a valid session and
// the admin role — so the full API surface stays behind closed doors.
func (s *Server) registerAPIDocs(mux *http.ServeMux) {

	// file server over the private apidocs tree, prefix stripped
	files := http.StripPrefix("/api-docs/", http.FileServer(http.FS(web.APIDocs)))

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		// the bare path (with or without trailing slash) serves the reference shell
		if r.URL.Path == "/api-docs" || r.URL.Path == "/api-docs/" {
			http.ServeFileFS(w, r, web.APIDocs, "api-docs.html")
			return
		}

		// everything else (api-docs.js, openapi.json) comes from the embedded tree
		files.ServeHTTP(w, r)
	})

	// gate behind session + admin role, matching the /admin route
	gated := auth.RequireAuth(s.cfg.DB, auth.RequireAdmin(handler))
	mux.Handle("/api-docs", gated)
	mux.Handle("/api-docs/", gated)
}
