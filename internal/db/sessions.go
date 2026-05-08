package db

import (
	"database/sql"
	"time"

	"podnest/internal/logger"
	"podnest/internal/models"
)

// CreateSession inserts a new session token
func CreateSession(db *sql.DB, s *models.Session) error {

	// create a new session record with the provided ID, user ID, and expiry time
	_, err := db.Exec(`
		INSERT INTO kppn_sessions (id, uid, expires_at)
		VALUES (?, ?, ?)`,
		s.ID, s.UID, s.ExpiresAt.UTC(),
	)
	if err != nil {
		logger.Error("Failed to create session: %v", err)
	}

	// log the creation of the session for debugging purposes
	logger.Debug("Created session for user %d", s.UID)
	return err
}

// GetSession retrieves a session by token, returns nil if not found or expired
func GetSession(db *sql.DB, id string) (*models.Session, error) {

	// setup a new Session struct to hold the retrieved session data
	s := &models.Session{}

	// query the database for a session matching the provided ID that has not yet expired
	err := db.QueryRow(`
		SELECT id, uid, expires_at
		FROM kppn_sessions
		WHERE id = ? AND expires_at > datetime('now')`, id,
	).Scan(&s.ID, &s.UID, &s.ExpiresAt)

	// handle the case where no session was found or it has expired
	if err == sql.ErrNoRows {
		logger.Error("Session not found or expired: %s", id)
		return nil, nil
	}
	if err != nil {
		logger.Error("Failed to retrieve session: %v", err)
		return nil, err
	}

	// log the successful retrieval of the session for debugging purposes
	logger.Debug("Retrieved session for user %d", s.UID)
	return s, err
}

// DeleteSession removes a session by token (logout)
func DeleteSession(db *sql.DB, id string) error {

	// execute a delete statement to remove the session with the specified ID from the database
	_, err := db.Exec(`DELETE FROM kppn_sessions WHERE id = ?`, id)
	if err != nil {
		logger.Error("Failed to delete session: %v", err)
		return err
	}

	// log the successful deletion of the session for debugging purposes
	logger.Debug("Deleted session with ID %s", id)
	return err
}

// DeleteExpiredSessions purges all expired sessions — call periodically
func DeleteExpiredSessions(db *sql.DB) error {

	// execute a delete statement to remove all sessions from the database that have an expiry time less than or equal to the current time
	_, err := db.Exec(`DELETE FROM kppn_sessions WHERE expires_at <= datetime('now')`)
	if err != nil {
		logger.Error("Failed to delete expired sessions: %v", err)
		return err
	}

	// log the successful deletion of expired sessions for debugging purposes
	logger.Debug("Deleted expired sessions")
	return err
}

// DeleteUserSessions removes all sessions for a given user (force logout)
func DeleteUserSessions(db *sql.DB, uid int64) error {

	// execute a delete statement to remove all sessions from the database that are associated with the specified user ID
	_, err := db.Exec(`DELETE FROM kppn_sessions WHERE uid = ?`, uid)
	if err != nil {
		logger.Error("Failed to delete user sessions: %v", err)
		return err
	}

	// log the successful deletion of the user's sessions for debugging purposes
	logger.Debug("Deleted sessions for user %d", uid)
	return err
}

// ExtendSession pushes the expiry forward from now
func ExtendSession(db *sql.DB, id string, duration time.Duration) error {

	// execute an update statement to set the expiry time of the session with the specified ID to the current time plus the provided duration
	_, err := db.Exec(`
		UPDATE kppn_sessions SET expires_at = ? WHERE id = ?`,
		time.Now().UTC().Add(duration), id,
	)
	if err != nil {
		logger.Error("Failed to extend session: %v", err)
		return err
	}

	// log the successful extension of the session for debugging purposes
	logger.Debug("Extended session: ID %s", id)
	return err
}
