package apiutil

import (
	"net/http"
	"net/url"
	"podnest/internal/auth"
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

	// X-Forwarded-Host is only meaningful from a hop we control; any client can
	// send one, so an untrusted peer must be matched against r.Host alone
	if fh := r.Header.Get("X-Forwarded-Host"); fh != "" && auth.PeerTrusted(r) && u.Host == fh {
		return true
	}
	if u.Host == r.Host {
		return true
	}
	return false
}
