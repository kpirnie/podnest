// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package server

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"strings"
)

// cspNonceKey is the context key under which the per-request CSP script nonce
// is stored by securityHeaders for templates to emit on inline <script> tags.
type cspNonceKeyType struct{}

var cspNonceKey cspNonceKeyType

// cspNonce returns the per-request CSP nonce, or "" if none was set.
func cspNonce(r *http.Request) string {
	if v, ok := r.Context().Value(cspNonceKey).(string); ok {
		return v
	}
	return ""
}

// buildCSP returns the Content-Security-Policy carrying a per-request script
// nonce instead of 'unsafe-inline' — only scripts tagged with this nonce run,
// so panel XSS cannot inject executable inline script. style-src keeps
// 'unsafe-inline' because UIKit and the templates rely on inline style
// attributes, which nonces do not cover.
func buildCSP(nonce string) string {
	return "" +
		"default-src 'none'; " +
		"script-src 'self' https://cdn.jsdelivr.net 'nonce-" + nonce + "'; " +
		"style-src 'self' https://cdn.jsdelivr.net https://fonts.googleapis.com 'unsafe-inline'; " +
		"font-src 'self' https://fonts.gstatic.com; " +
		"img-src 'self' data: blob:; " +
		"connect-src 'self' ws: wss: https://cdn.jsdelivr.net; " +
		"manifest-src 'self'; " +
		"frame-src 'none'; " +
		"object-src 'none'; " +
		"base-uri 'self'; " +
		"form-action 'self'"
}

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

		// only set HSTS when the connection is secure — avoids breaking plain HTTP dev environments
		if r.TLS != nil || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https") {
			w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}

		// restrict browser features not used by the panel
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), usb=()")

		// generate a per-request script nonce so inline panel scripts run without
		// 'unsafe-inline'; stored in context for the template to emit on its tags
		var nb [16]byte
		_, _ = rand.Read(nb[:])
		nonce := base64.StdEncoding.EncodeToString(nb[:])
		r = r.WithContext(context.WithValue(r.Context(), cspNonceKey, nonce))

		// skip CSP for the PMA proxy — phpMyAdmin loads its own external assets
		if !strings.HasPrefix(r.URL.Path, "/pma/") {
			w.Header().Set("Content-Security-Policy", buildCSP(nonce))
		}

		// set some headers for me
		w.Header().Set("X-Powered-By", "PodNest")
		w.Header().Set("X-Developed-By", "Kevin Pirnie <iam@kevinpirnie.com>")
		w.Header().Set("X-Shameless-Link", "https://kevinpirnie.com/")

		// serve the request to the next handler
		next.ServeHTTP(w, r)

	})
}
