package db

import (
	"database/sql"
	"podnest/internal/logger"
	"time"
)

// CreatePMAToken inserts a new single-use PMA token for a site
func CreatePMAToken(db *sql.DB, token string, siteID int64, ttl time.Duration) error {

	// insert a new token with an expiration time; old tokens will be cleaned up by the reaper
	_, err := db.Exec(`
		INSERT INTO kppn_pma_tokens (token, site_id, expires_at)
		VALUES (?, ?, ?)`,
		token, siteID, time.Now().UTC().Add(ttl),
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
// Returns the site ID if valid, 0 if not found or expired.
func ConsumePMAToken(db *sql.DB, token string) (int64, error) {

	// hold the site id
	var siteID int64

	// query for the token and check expiration; if valid, return the site ID
	err := db.QueryRow(`
		SELECT site_id FROM kppn_pma_tokens
		WHERE token = ? AND expires_at > datetime('now')`, token,
	).Scan(&siteID)

	// if no rows, treat as invalid token (0); if other error, return it
	if err == sql.ErrNoRows {
		logger.Error("PMA token not found or expired: %s", token)
		return 0, nil
	}
	if err != nil {
		logger.Error("Error consuming PMA token: %v", err)
		return 0, err
	}

	// delete the token immediately to prevent reuse; ignore errors since we already have the site ID
	_, _ = db.Exec(`DELETE FROM kppn_pma_tokens WHERE token = ?`, token)

	// return the site ID
	logger.Debug("Consumed PMA token for site ID %d", siteID)
	return siteID, nil
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
