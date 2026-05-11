package server

import (
	"net/http"
	"strings"
)

// cspPolicy defines the Content-Security-Policy for the panel.
// 'unsafe-inline' is required for both script-src and style-src:
//   - script-src: inline document.write() used in the footer year
//   - style-src:  UIKit manipulates inline styles dynamically at runtime
const cspPolicy = "" +
	"default-src 'none'; " +
	"script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; " +
	"style-src 'self' https://cdn.jsdelivr.net https://fonts.googleapis.com 'unsafe-inline'; " +
	"font-src 'self' https://fonts.gstatic.com; " +
	"img-src 'self' https://cdn.kcp.im data: blob:; " +
	"connect-src 'self' ws: wss:; " +
	"frame-src 'none'; " +
	"object-src 'none'; " +
	"base-uri 'self'; " +
	"form-action 'self'"

// securityHeaders adds security-related HTTP response headers to all panel responses.
// CSP is intentionally skipped for /pma/ paths — phpMyAdmin loads its own external
// assets and a strict policy would break its interface.
func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		// prevent the panel from being embedded in a frame on another origin
		w.Header().Set("X-Frame-Options", "SAMEORIGIN")

		// prevent MIME type sniffing
		w.Header().Set("X-Content-Type-Options", "nosniff")

		// limit referrer information sent to external sites
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		// restrict browser features not used by the panel
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), usb=()")

		// skip CSP for the PMA proxy — phpMyAdmin loads its own external assets
		if !strings.HasPrefix(r.URL.Path, "/pma/") {
			w.Header().Set("Content-Security-Policy", cspPolicy)
		}

		next.ServeHTTP(w, r)
	})
}
