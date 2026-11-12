// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package server

import (
	"encoding/json"
	"io/fs"
	"net/http"
	"strings"
	"sync"

	"podnest/internal/auth"
	"podnest/internal/logger"
	"podnest/internal/version"
	"podnest/web"
)

// apiSpec returns the embedded OpenAPI spec with info.version set to the
// running build version. It is built once on first use.
var apiSpec = sync.OnceValues(patchedAPISpec)

// patchedAPISpec reads the embedded OpenAPI spec and swaps info.version for
// the build version, so the reference always matches the running release
func patchedAPISpec() ([]byte, error) {
	raw, err := fs.ReadFile(web.APIDocs, "openapi.json")
	if err != nil {
		return nil, err
	}

	var doc map[string]json.RawMessage
	if err := json.Unmarshal(raw, &doc); err != nil {
		return nil, err
	}

	var info map[string]json.RawMessage
	if err := json.Unmarshal(doc["info"], &info); err != nil {
		return nil, err
	}

	v, err := json.Marshal(strings.TrimPrefix(version.AppVersion, "v"))
	if err != nil {
		return nil, err
	}
	info["version"] = v

	if doc["info"], err = json.Marshal(info); err != nil {
		return nil, err
	}
	return json.Marshal(doc)
}

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

		// the spec is served with info.version set to the running build version
		if r.URL.Path == "/api-docs/openapi.json" {
			spec, err := apiSpec()
			if err == nil {
				w.Header().Set("Content-Type", "application/json")
				w.Write(spec)
				return
			}
			logger.Error("registerAPIDocs: spec version patch failed, serving embedded file: %v", err)
		}

		// everything else (api-docs.js, openapi.json) comes from the embedded tree
		files.ServeHTTP(w, r)
	})

	// gate behind session + admin role, matching the /admin route
	gated := auth.RequireAuth(s.cfg.DB, auth.RequireAdmin(handler))
	mux.Handle("/api-docs", gated)
	mux.Handle("/api-docs/", gated)
}
