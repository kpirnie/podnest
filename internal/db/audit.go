// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package db

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"podnest/internal/logger"
	"podnest/internal/models"
)

// InsertAuditLog writes a single audit row to kppn_audit_log.
// Called only from the async audit recorder — never on the hot request path.
func InsertAuditLog(database *sql.DB, e models.AuditEntry) error {
	_, err := database.Exec(`
		INSERT INTO kppn_audit_log
			(ts, uid, username, ip, ua, method, action, target_type, target_id,
			 status, details, prior_state, new_state)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		e.TS.UTC().Format("2006-01-02 15:04:05"),
		e.UID, e.Username, e.IP, e.UA, e.Method, e.Action,
		e.TargetType, e.TargetID, e.Status, e.Details, e.PriorState, e.NewState,
	)
	if err != nil {
		logger.Error("InsertAuditLog: failed to insert audit row: %v", err)
	}
	return err
}

// AuditFilter holds optional filter criteria for QueryAuditLog.
// Zero values mean "no filter" for that field.
type AuditFilter struct {
	UID        *int64 // filter by user id
	Username   string // filter by username (partial, case-insensitive)
	Action     string // filter by action string (partial)
	TargetType string // filter by target_type (exact)
	TargetID   string // filter by target_id (exact)
	DateFrom   *time.Time
	DateTo     *time.Time
	AuthOnly   *bool // true = only authenticated rows, false = only unauthed, nil = all
	Page       int   // 1-based; 0 treated as 1
	PageSize   int   // default 50 if 0
}

// QueryAuditLog returns a page of audit rows matching the given filter,
// plus the total count of matching rows for pagination.
func QueryAuditLog(database *sql.DB, f AuditFilter) ([]models.AuditEntry, int, error) {

	// normalise pagination defaults
	if f.Page < 1 {
		f.Page = 1
	}
	if f.PageSize < 1 {
		f.PageSize = 50
	}

	// build WHERE clause dynamically from non-zero filter fields
	where, args := buildAuditWhere(f)

	// total count for the current filter
	countSQL := "SELECT COUNT(*) FROM kppn_audit_log" + where
	var total int
	if err := database.QueryRow(countSQL, args...).Scan(&total); err != nil {
		logger.Error("QueryAuditLog: count query failed: %v", err)
		return nil, 0, err
	}

	// paginated rows, newest first
	offset := (f.Page - 1) * f.PageSize
	rowSQL := fmt.Sprintf(`
		SELECT id, ts, uid, username, ip, ua, method, action,
		       target_type, target_id, status, details, prior_state, new_state
		FROM kppn_audit_log%s
		ORDER BY ts DESC, id DESC
		LIMIT %d OFFSET %d`, where, f.PageSize, offset)

	rows, err := database.Query(rowSQL, args...)
	if err != nil {
		logger.Error("QueryAuditLog: row query failed: %v", err)
		return nil, 0, err
	}
	defer rows.Close()

	var entries []models.AuditEntry
	for rows.Next() {
		var e models.AuditEntry
		var uid sql.NullInt64
		var ts string
		if err := rows.Scan(
			&e.ID, &ts, &uid, &e.Username, &e.IP, &e.UA,
			&e.Method, &e.Action, &e.TargetType, &e.TargetID,
			&e.Status, &e.Details, &e.PriorState, &e.NewState,
		); err != nil {
			logger.Error("QueryAuditLog: scan failed: %v", err)
			return nil, 0, err
		}
		if uid.Valid {
			e.UID = &uid.Int64
		}
		if t, err := time.Parse("2006-01-02 15:04:05", ts); err == nil {
			e.TS = t
		} else if t, err := time.Parse(time.RFC3339, ts); err == nil {
			e.TS = t
		}
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		logger.Error("QueryAuditLog: rows iteration error: %v", err)
		return nil, 0, err
	}

	return entries, total, nil
}

// buildAuditWhere constructs the WHERE clause and positional args for audit queries.
func buildAuditWhere(f AuditFilter) (string, []interface{}) {
	var clauses []string
	var args []interface{}

	if f.UID != nil {
		clauses = append(clauses, "uid = ?")
		args = append(args, *f.UID)
	}
	if f.Username != "" {
		clauses = append(clauses, "username LIKE ?")
		args = append(args, "%"+f.Username+"%")
	}
	if f.Action != "" {
		clauses = append(clauses, "action LIKE ?")
		args = append(args, "%"+f.Action+"%")
	}
	if f.TargetType != "" {
		clauses = append(clauses, "target_type = ?")
		args = append(args, f.TargetType)
	}
	if f.TargetID != "" {
		clauses = append(clauses, "target_id = ?")
		args = append(args, f.TargetID)
	}
	if f.DateFrom != nil {
		clauses = append(clauses, "ts >= ?")
		args = append(args, f.DateFrom.UTC().Format("2006-01-02 15:04:05"))
	}
	if f.DateTo != nil {
		clauses = append(clauses, "ts <= ?")
		args = append(args, f.DateTo.UTC().Format("2006-01-02 15:04:05"))
	}
	if f.AuthOnly != nil {
		if *f.AuthOnly {
			clauses = append(clauses, "uid IS NOT NULL")
		} else {
			clauses = append(clauses, "uid IS NULL")
		}
	}

	if len(clauses) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(clauses, " AND "), args
}

// ExportAuditRowsForDate returns all rows whose ts falls within the given UTC calendar day.
// Used by the daily archive job.
func ExportAuditRowsForDate(database *sql.DB, day time.Time) ([]models.AuditEntry, error) {
	start := time.Date(day.Year(), day.Month(), day.Day(), 0, 0, 0, 0, time.UTC)
	end := start.Add(24 * time.Hour)

	rows, err := database.Query(`
		SELECT id, ts, uid, username, ip, ua, method, action,
		       target_type, target_id, status, details, prior_state, new_state
		FROM kppn_audit_log
		WHERE ts >= ? AND ts < ?
		ORDER BY ts ASC, id ASC`,
		start.Format("2006-01-02 15:04:05"),
		end.Format("2006-01-02 15:04:05"),
	)
	if err != nil {
		logger.Error("ExportAuditRowsForDate: query failed: %v", err)
		return nil, err
	}
	defer rows.Close()

	var entries []models.AuditEntry
	for rows.Next() {
		var e models.AuditEntry
		var uid sql.NullInt64
		var ts string
		if err := rows.Scan(
			&e.ID, &ts, &uid, &e.Username, &e.IP, &e.UA,
			&e.Method, &e.Action, &e.TargetType, &e.TargetID,
			&e.Status, &e.Details, &e.PriorState, &e.NewState,
		); err != nil {
			logger.Error("ExportAuditRowsForDate: scan failed: %v", err)
			return nil, err
		}
		if uid.Valid {
			e.UID = &uid.Int64
		}
		if t, err := time.Parse("2006-01-02 15:04:05", ts); err == nil {
			e.TS = t
		} else if t, err := time.Parse(time.RFC3339, ts); err == nil {
			e.TS = t
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

// PruneAuditLog deletes rows older than 30 days. Called by the daily background job.
func PruneAuditLog(database *sql.DB) error {
	cutoff := time.Now().UTC().AddDate(0, 0, -30).Format("2006-01-02 15:04:05")
	res, err := database.Exec(`DELETE FROM kppn_audit_log WHERE ts < ?`, cutoff)
	if err != nil {
		logger.Error("PruneAuditLog: failed: %v", err)
		return err
	}
	n, _ := res.RowsAffected()
	logger.Debug("PruneAuditLog: pruned %d rows older than 30 days", n)
	return nil
}
