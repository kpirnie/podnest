// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package db

import (
	"database/sql"
	"podnest/internal/logger"
	"time"
)

// CreatePMAToken inserts a new single-use PMA token for a site
func CreatePMAToken(db *sql.DB, token string, siteID, userID int64, ttl time.Duration) error {

	// insert a new token with an expiration time; old tokens will be cleaned up by the reaper
	_, err := db.Exec(`
		INSERT INTO kppn_pma_tokens (token, site_id, user_id, expires_at)
		VALUES (?, ?, ?, ?)`,
		token, siteID, userID, time.Now().UTC().Add(ttl),
	)
	if err != nil {
		logger.Error("Failed to create PMA token: %v", err)
		return err
	}

	// return success
	logger.Debug("Created PMA token for site ID %d", siteID)
	return err
}

// ConsumePMAToken validates and deletes a token in one shot.
// Returns the site ID and issuing user ID if valid, 0 if not found or expired.
func ConsumePMAToken(db *sql.DB, token string) (int64, int64, error) {

	// hold the site id and user id
	var siteID, userID int64

	// query for the token and check expiration; if valid, return the site and user IDs
	err := db.QueryRow(`
		SELECT site_id, user_id FROM kppn_pma_tokens
		WHERE token = ? AND expires_at > datetime('now')`, token,
	).Scan(&siteID, &userID)

	// if no rows, treat as invalid token (0); if other error, return it
	if err == sql.ErrNoRows {
		logger.Error("PMA token not found or expired: %s", token)
		return 0, 0, nil
	}
	if err != nil {
		logger.Error("Error consuming PMA token: %v", err)
		return 0, 0, err
	}

	// delete the token immediately to prevent reuse; ignore errors since we already have the site ID
	_, _ = db.Exec(`DELETE FROM kppn_pma_tokens WHERE token = ?`, token)

	// return the site and user IDs
	logger.Debug("Consumed PMA token for site ID %d", siteID)
	return siteID, userID, nil
}

// CreatePMASession inserts a server-validated PMA session for a site/user
func CreatePMASession(db *sql.DB, token string, siteID, userID int64, ttl time.Duration) error {

	// insert a new session with an expiration time; old sessions will be cleaned up by the reaper
	_, err := db.Exec(`
		INSERT INTO kppn_pma_sessions (token, site_id, user_id, expires_at)
		VALUES (?, ?, ?, ?)`,
		token, siteID, userID, time.Now().UTC().Add(ttl),
	)
	if err != nil {
		logger.Error("Failed to create PMA session: %v", err)
		return err
	}

	// return success
	logger.Debug("Created PMA session for site ID %d", siteID)
	return err
}

// ValidatePMASession reports whether a session token is valid for the given site
func ValidatePMASession(db *sql.DB, token string, siteID int64) (bool, error) {

	// hold the match count
	var n int

	// query for the session, matching the site and checking expiration
	err := db.QueryRow(`
		SELECT COUNT(1) FROM kppn_pma_sessions
		WHERE token = ? AND site_id = ? AND expires_at > datetime('now')`,
		token, siteID,
	).Scan(&n)
	if err != nil {
		logger.Error("Error validating PMA session: %v", err)
		return false, err
	}

	// return whether a valid session was found
	return n > 0, nil
}

// DeleteExpiredPMASessions purges all expired sessions — called by the server reaper
func DeleteExpiredPMASessions(db *sql.DB) error {

	// delete all sessions that have expired; this is a cleanup operation, so we ignore the result
	_, err := db.Exec(`DELETE FROM kppn_pma_sessions WHERE expires_at <= datetime('now')`)
	if err != nil {
		logger.Error("Failed to delete expired PMA sessions: %v", err)
	}

	// log the cleanup action
	logger.Debug("Deleted expired PMA sessions")
	return err
}

// DeleteExpiredPMATokens purges all expired tokens — called by the server reaper
func DeleteExpiredPMATokens(db *sql.DB) error {

	// delete all tokens that have expired; this is a cleanup operation, so we ignore the result
	_, err := db.Exec(`DELETE FROM kppn_pma_tokens WHERE expires_at <= datetime('now')`)
	if err != nil {
		logger.Error("Failed to delete expired PMA tokens: %v", err)
	}

	// log the cleanup action
	logger.Debug("Deleted expired PMA tokens")
	return err
}
