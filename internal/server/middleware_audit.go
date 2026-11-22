// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package server

import (
	"net/http"
	"strconv"
	"strings"

	"podnest/internal/audit"
	"podnest/internal/auth"
	"podnest/internal/models"
)

// auditStatusWriter wraps http.ResponseWriter to capture the written status code.
// Only substituted for non-GET/HEAD requests — GET WebSocket/streaming routes are never touched.
type auditStatusWriter struct {
	http.ResponseWriter
	status int
}

// auditMiddleware is the outermost wrapper for /api/ — it records every non-GET/HEAD
// request (including unauthenticated ones) to the audit log.
// It sits outside auth.RequireAPIAuth so unauthed probes are captured too.
func (s *Server) auditMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		// only instrument state-changing methods — skip GET, HEAD, OPTIONS
		if r.Method == http.MethodGet ||
			r.Method == http.MethodHead ||
			r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}

		// best-effort identity resolution — reuses the pair attached by the
		// panel security layer; nil if invalid/absent
		var uid *int64
		username := ""
		_, user := auth.SessionFromContext(r.Context())
		if user == nil {
			if sessionID := auth.SessionFromRequest(r); sessionID != "" {
				user, _ = auth.SessionUser(s.cfg.DB, sessionID)
			}
		}
		if user != nil {
			uid = &user.ID
			username = user.UName
		}

		// wrap the ResponseWriter to capture the status code after the handler runs
		sw := &auditStatusWriter{ResponseWriter: w, status: http.StatusOK}

		// call the next handler (auth + actual handler) with the wrapped writer
		next.ServeHTTP(sw, r)

		// retrieve any before/after state snapshots attached to the context by the handler
		priorState, newState := audit.StateFromContext(r.Context())

		// The matched pattern contains route names and placeholders only.
		action := r.Pattern
		_, route, matched := strings.Cut(action, " ")
		if !matched {
			route = "/api"
			action = r.Method + " " + route
		}
		targetType, _ := parseTarget(route)
		_, targetID := parseTarget(r.URL.Path)

		audit.Record(models.AuditEntry{
			UID:        uid,
			Username:   username,
			IP:         s.auditClientIP(r),
			UA:         r.Header.Get("User-Agent"),
			Method:     r.Method,
			Action:     action,
			TargetType: targetType,
			TargetID:   targetID,
			Status:     sw.status,
			PriorState: priorState,
			NewState:   newState,
		})
	})
}

// WriteHeader captures the status code before forwarding it
func (sw *auditStatusWriter) WriteHeader(code int) {
	sw.status = code
	sw.ResponseWriter.WriteHeader(code)
}

// Unwrap exposes the underlying ResponseWriter for Hijacker/Flusher delegation
func (sw *auditStatusWriter) Unwrap() http.ResponseWriter {
	return sw.ResponseWriter
}

// parseTarget extracts the resource type and id from the first two meaningful
// path segments. e.g. /sites/42 → ("site", "42"); /users/7/totp → ("user", "7")
func parseTarget(path string) (targetType, targetID string) {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) >= 1 && parts[0] != "" {
		// singularise the first segment (sites→site, users→user, etc.)
		targetType = strings.TrimSuffix(parts[0], "s")
	}
	if len(parts) >= 2 && isNumeric(parts[1]) {
		targetID = parts[1]
	}
	return
}

// isNumeric reports whether s contains only ASCII digits
func isNumeric(s string) bool {
	_, err := strconv.ParseInt(s, 10, 64)
	return err == nil
}

// auditClientIP resolves the real client IP via the proxy's trusted-proxy logic
// so audit-log attribution cannot be spoofed through X-Forwarded-For.
func (s *Server) auditClientIP(r *http.Request) string {
	return s.proxy.ClientIP(r)
}
