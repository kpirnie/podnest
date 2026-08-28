// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package auditlog

import (
	"database/sql"
	"net/http"
	"strconv"
	"time"

	"podnest/internal/apiutil"
	"podnest/internal/auth"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
)

// Handler serves the audit log API endpoints.
type Handler struct {
	DB *sql.DB
}

// RegisterRoutes mounts audit log routes onto api.
func (h *Handler) RegisterRoutes(api *http.ServeMux) {
	admin := func(fn http.HandlerFunc) http.Handler {
		return auth.RequireAPIAdmin(fn)
	}
	api.Handle("GET /audit", admin(h.apiQueryAuditLog))
}

// apiQueryAuditLog returns a paginated, filtered page of audit log entries.
func (h *Handler) apiQueryAuditLog(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	f := db.AuditFilter{
		Username:   q.Get("username"),
		Action:     q.Get("action"),
		TargetType: q.Get("target_type"),
		TargetID:   q.Get("target_id"),
	}

	// optional date range
	if s := q.Get("date_from"); s != "" {
		if t, err := time.Parse("2006-01-02", s); err == nil {
			f.DateFrom = &t
		}
	}
	if s := q.Get("date_to"); s != "" {
		if t, err := time.Parse("2006-01-02", s); err == nil {
			// include the full day
			end := t.Add(24*time.Hour - time.Second)
			f.DateTo = &end
		}
	}

	// optional auth filter: "1" = authed only, "0" = unauthed only
	if s := q.Get("auth"); s == "1" || s == "0" {
		v := s == "1"
		f.AuthOnly = &v
	}

	// pagination
	if s := q.Get("page"); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 {
			f.Page = n
		}
	}
	if s := q.Get("page_size"); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 && n <= 200 {
			f.PageSize = n
		}
	}

	entries, total, err := db.QueryAuditLog(h.DB, f)
	if err != nil {
		logger.Error("apiQueryAuditLog: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// normalise nil slice to empty array for JSON
	if entries == nil {
		entries = []models.AuditEntry{}
	}

	apiutil.JSON(w, http.StatusOK, map[string]interface{}{
		"entries": entries,
		"total":   total,
	})
}
