// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package server

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"regexp"
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

// auditMaxBodyBytes is the maximum request body size captured for the details field.
const auditMaxBodyBytes = 1 << 20 // 1 MB

// numericSegment matches path segments that are purely numeric (e.g. /sites/42/configs)
var numericSegment = regexp.MustCompile(`/\d+`)

// auditBodySkipSuffixes are route suffixes whose bodies are multipart uploads.
// Buffering a megabyte of binary payload only to mask it into uselessness costs
// throughput and gains nothing, so the body is left untouched for these.
var auditBodySkipSuffixes = []string{
	"/files/upload",
	"/backups/import/upload",
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

		// cap the captured body for the audit record, but restore the full
		// stream to the handler — the unread remainder is chained on after the
		// captured prefix so large uploads are not silently truncated
		var bodyBytes []byte
		if r.Body != nil && !skipAuditBody(r.URL.Path) {
			limited := io.LimitReader(r.Body, auditMaxBodyBytes)
			bodyBytes, _ = io.ReadAll(limited)
			r.Body = io.NopCloser(io.MultiReader(bytes.NewReader(bodyBytes), r.Body))
		}

		// wrap the ResponseWriter to capture the status code after the handler runs
		sw := &auditStatusWriter{ResponseWriter: w, status: http.StatusOK}

		// call the next handler (auth + actual handler) with the wrapped writer
		next.ServeHTTP(sw, r)

		// retrieve any before/after state snapshots attached to the context by the handler
		priorState, newState := audit.StateFromContext(r.Context())

		// derive the normalised action string: METHOD /path/{id}/sub
		action := r.Method + " " + normalizePath(r.URL.Path)

		// parse target type and id from the path segments
		targetType, targetID := parseTarget(r.URL.Path)

		// build the details blob: masked body + query string
		details := buildDetails(bodyBytes, r.URL.RawQuery)

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
			Details:    details,
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

// normalizePath replaces purely numeric path segments with {id} for grouping.
// e.g. /sites/42/configs → /sites/{id}/configs
func normalizePath(path string) string {
	return numericSegment.ReplaceAllString(path, "/{id}")
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

// buildDetails marshals the request body and query string into a single JSON blob.
// Masking is applied by audit.Record before the entry hits the channel.
func buildDetails(body []byte, rawQuery string) string {
	m := make(map[string]interface{})
	if len(body) > 0 {
		var parsed interface{}
		if err := json.Unmarshal(body, &parsed); err == nil {
			m["body"] = parsed
		} else {
			m["body"] = string(body)
		}
	}
	if rawQuery != "" {
		m["query"] = rawQuery
	}
	if len(m) == 0 {
		return ""
	}
	b, _ := json.Marshal(m)
	return string(b)
}

// auditClientIP resolves the real client IP via the proxy's trusted-proxy logic
// so audit-log attribution cannot be spoofed through X-Forwarded-For.
func (s *Server) auditClientIP(r *http.Request) string {
	return s.proxy.ClientIP(r)
}

// skipAuditBody reports whether the request body should be left uncaptured.
func skipAuditBody(path string) bool {
	for _, s := range auditBodySkipSuffixes {
		if strings.HasSuffix(path, s) {
			return true
		}
	}
	return false
}
