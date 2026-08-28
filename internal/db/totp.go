// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package db

import (
	"database/sql"
	"strings"
	"time"

	"podnest/internal/logger"
	"podnest/internal/models"

	"golang.org/x/crypto/bcrypt"
)

// CreateTOTPPending inserts a short-lived pending token for the TOTP login step.
func CreateTOTPPending(db *sql.DB, token string, uid int64, ttl time.Duration) error {
	expires := time.Now().UTC().Add(ttl)
	_, err := db.Exec(`INSERT INTO kppn_totp_pending (token, uid, expires_at) VALUES (?, ?, ?)`,
		hashToken(token), uid, expires)
	if err != nil {
		logger.Error("CreateTOTPPending: failed for uid %d: %v", uid, err)
	}
	return err
}

// GetTOTPPending retrieves a non-expired pending token.
func GetTOTPPending(db *sql.DB, token string) (*models.TOTPPending, error) {
	p := &models.TOTPPending{}
	err := db.QueryRow(`SELECT uid, expires_at FROM kppn_totp_pending WHERE token=? AND expires_at > datetime('now')`,
		hashToken(token)).Scan(&p.UID, &p.ExpiresAt)

	// hand back the raw token, not the stored hash
	p.Token = token
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		logger.Error("GetTOTPPending: %v", err)
		return nil, err
	}
	return p, nil
}

// DeleteTOTPPending removes a pending token after use.
func DeleteTOTPPending(db *sql.DB, token string) error {
	_, err := db.Exec(`DELETE FROM kppn_totp_pending WHERE token=?`, hashToken(token))
	if err != nil {
		logger.Error("DeleteTOTPPending: %v", err)
	}
	return err
}

// DeleteExpiredTOTPPendings purges stale pending records.
func DeleteExpiredTOTPPendings(db *sql.DB) error {
	_, err := db.Exec(`DELETE FROM kppn_totp_pending WHERE expires_at <= datetime('now')`)
	if err != nil {
		logger.Error("DeleteExpiredTOTPPendings: %v", err)
	}
	return err
}

// StoreBackupCodes replaces all backup codes for a user with freshly hashed ones.
func StoreBackupCodes(database *sql.DB, uid int64, codes []string) error {
	tx, err := database.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`DELETE FROM kppn_totp_backup_codes WHERE uid=?`, uid); err != nil {
		return err
	}

	for _, code := range codes {
		hash, err := bcrypt.GenerateFromPassword([]byte(strings.ToUpper(code)), 8)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(`INSERT INTO kppn_totp_backup_codes (uid, code_hash) VALUES (?, ?)`, uid, string(hash)); err != nil {
			return err
		}
	}

	return tx.Commit()
}

// UseBackupCode checks unused backup codes for the user, marks the matching one
// as used, and returns true. Returns false if no code matches.
func UseBackupCode(database *sql.DB, uid int64, code string) (bool, error) {
	rows, err := database.Query(`SELECT id, code_hash FROM kppn_totp_backup_codes WHERE uid=? AND used=0`, uid)
	if err != nil {
		return false, err
	}
	defer rows.Close()

	upper := strings.ToUpper(code)
	for rows.Next() {
		var id int64
		var hash string
		if err := rows.Scan(&id, &hash); err != nil {
			continue
		}
		if bcrypt.CompareHashAndPassword([]byte(hash), []byte(upper)) == nil {
			rows.Close()
			_, err := database.Exec(`UPDATE kppn_totp_backup_codes SET used=1 WHERE id=?`, id)
			return err == nil, err
		}
	}
	if err := rows.Err(); err != nil {
		return false, err
	}
	return false, nil
}

// DeleteBackupCodes removes all backup codes for a user (called on TOTP disable).
func DeleteBackupCodes(database *sql.DB, uid int64) error {
	_, err := database.Exec(`DELETE FROM kppn_totp_backup_codes WHERE uid=?`, uid)
	if err != nil {
		logger.Error("DeleteBackupCodes: uid %d: %v", uid, err)
	}
	return err
}
