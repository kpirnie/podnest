package apiutil

import (
	"net/http"
	"net/url"
)

// WSSameOrigin reports whether a WebSocket upgrade request comes from the same
// host the client reached us on — directly (Host) or through the reverse proxy
// (X-Forwarded-Host). Non-browser clients send no Origin and are allowed.
func WSSameOrigin(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return true
	}
	u, err := url.Parse(origin)
	if err != nil {
		return false
	}
	if u.Host == r.Host {
		return true
	}
	if fh := r.Header.Get("X-Forwarded-Host"); fh != "" && u.Host == fh {
		return true
	}
	return false
}
