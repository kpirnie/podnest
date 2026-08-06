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
		hashToken(token), siteID, userID, time.Now().UTC().Add(ttl),
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

	// delete and return in one statement so a token can only be consumed once,
	// even when two requests arrive with the same token concurrently
	err := db.QueryRow(`
		DELETE FROM kppn_pma_tokens
		WHERE token = ? AND expires_at > datetime('now')
		RETURNING site_id, user_id`, hashToken(token),
	).Scan(&siteID, &userID)

	// if no rows, treat as invalid token (0); if other error, return it
	if err == sql.ErrNoRows {
		logger.Error("PMA token not found or expired")
		return 0, 0, nil
	}
	if err != nil {
		logger.Error("Error consuming PMA token: %v", err)
		return 0, 0, err
	}

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
		hashToken(token), siteID, userID, time.Now().UTC().Add(ttl),
	)
	if err != nil {
		logger.Error("Failed to create PMA session: %v", err)
		return err
	}

	// return success
	logger.Debug("Created PMA session for site ID %d", siteID)
	return err
}

// ValidatePMASession reports whether a session token is valid for the given site,
// returning the ID of the user the session was issued to. The caller must still
// confirm that user exists and may access the site — the 2 hour cookie outlives
// deletion, demotion, and site reassignment on its own.
func ValidatePMASession(db *sql.DB, token string, siteID int64) (int64, bool, error) {

	// hold the issuing user id
	var userID int64

	// query for the session, matching the site and checking expiration
	err := db.QueryRow(`
		SELECT user_id FROM kppn_pma_sessions
		WHERE token = ? AND site_id = ? AND expires_at > datetime('now')`,
		hashToken(token), siteID,
	).Scan(&userID)
	if err == sql.ErrNoRows {
		return 0, false, nil
	}
	if err != nil {
		logger.Error("Error validating PMA session: %v", err)
		return 0, false, err
	}

	// return the issuing user
	return userID, true, nil
}

// DeletePMASessionsByUser removes every PMA session issued to a user — called on
// logout, password change, and user deletion so the PMA cookie dies with the
// app session rather than outliving it.
func DeletePMASessionsByUser(db *sql.DB, uid int64) error {

	// drop the sessions and any unredeemed tokens belonging to the user
	if _, err := db.Exec(`DELETE FROM kppn_pma_sessions WHERE user_id = ?`, uid); err != nil {
		logger.Error("Failed to delete PMA sessions for user %d: %v", uid, err)
		return err
	}
	if _, err := db.Exec(`DELETE FROM kppn_pma_tokens WHERE user_id = ?`, uid); err != nil {
		logger.Error("Failed to delete PMA tokens for user %d: %v", uid, err)
		return err
	}

	// log the cleanup action
	logger.Debug("Deleted PMA sessions and tokens for user %d", uid)
	return nil
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
