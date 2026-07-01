// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package server

import (
	"encoding/json"
	"io/fs"
	"net/http"
	"strings"

	"podnest/web"
)

// handleManifest serves the PWA manifest with name/short_name derived from the
// request host, so multiple PodNest installs (one per server) appear as
// distinctly-labeled home-screen apps instead of identical "PodNest" icons.
// the embedded manifest.json is used as the base so icons/colors/theme stay the
// single source of truth — only the identity fields are overridden here.
func (s *Server) handleManifest(w http.ResponseWriter, r *http.Request) {

	// resolve the host the user actually reached us on — prefer the proxy's
	// forwarded host, fall back to the request host, then strip any port.
	// this is cosmetic labeling only, so a spoofed header carries no risk
	host := r.Header.Get("X-Forwarded-Host")
	if host == "" {
		host = r.Host
	}
	if i := strings.IndexByte(host, ':'); i != -1 {
		host = host[:i]
	}

	// load the embedded base manifest so its icons/colors remain editable in
	// one place — we decode into a generic map to touch only the identity fields
	base, err := fs.ReadFile(web.Static, "manifest.json")
	if err != nil {
		http.Error(w, "manifest unavailable", http.StatusInternalServerError)
		return
	}
	var m map[string]any
	if err := json.Unmarshal(base, &m); err != nil {
		http.Error(w, "manifest parse error", http.StatusInternalServerError)
		return
	}

	// override the install identity with the host — name is the full label,
	// short_name is what shows under the home-screen icon (swap to the first
	// DNS label if the full host is too long there), and id keeps installs
	// distinct even if two instances ever share an origin under different paths
	m["name"] = "PodNest (" + host + ")"
	m["short_name"] = host
	m["id"] = "/?host=" + host

	// emit with the correct manifest content type
	w.Header().Set("Content-Type", "application/manifest+json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(m)
}
