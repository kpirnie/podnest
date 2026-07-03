// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package db

import (
	"database/sql"
	"time"

	"podnest/internal/logger"
	"podnest/internal/models"
)

// AdminExists checks whether any admin-role user exists in the database
func AdminExists(db *sql.DB) (bool, error) {

	// hold the count of admin users
	var count int

	// query the database for the count of users with the admin role
	err := db.QueryRow(`SELECT COUNT(*) FROM kppn_users WHERE role = ?`, models.RoleAdmin).Scan(&count)
	if err != nil {
		logger.Error("AdminExists: failed to check for admin existence: %v", err)
		return false, err
	}

	// return true if at least one admin user exists, otherwise false
	return count > 0, err
}

// CreateUser inserts a new user record
func CreateUser(db *sql.DB, u *models.User) error {

	// execute the insert statement and capture the result
	res, err := db.Exec(`
		INSERT INTO kppn_users (uname, pword, uhash, fname, lname, email, phone, role, notify_email, notify_sms)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		u.UName, u.PWord, u.UHash, u.FName, u.LName, u.Email, u.Phone, u.Role, u.NotifyEmail, u.NotifySMS,
	)
	if err != nil {
		logger.Error("CreateUser: failed to create user: %v", err)
		return err
	}

	// retrieve the auto-generated ID of the new user and assign it to the user struct
	u.ID, _ = res.LastInsertId()
	logger.Debug("Created user %d: %s", u.ID, u.UName)
	return nil
}

// GetUserByUsername retrieves a user by username
func GetUserByUsername(db *sql.DB, uname string) (*models.User, error) {

	// setup a user struct to hold the retrieved data
	u := &models.User{}

	// query the database for a user matching the provided username and scan the result into the user struct
	err := db.QueryRow(`
		SELECT id, uname, pword, uhash, fname, lname, email, phone, role, totp_secret, totp_salt, totp_enabled, notify_email, notify_sms, created, updated
		FROM kppn_users WHERE uname = ?`, uname,
	).Scan(
		&u.ID, &u.UName, &u.PWord, &u.UHash, &u.FName, &u.LName,
		&u.Email, &u.Phone, &u.Role, &u.TOTPSecret, &u.TOTPSalt, &u.TOTPEnabled,
		&u.NotifyEmail, &u.NotifySMS, &u.Created, &u.Updated,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		logger.Error("GetUserByUsername: failed to retrieve user '%s': %v", uname, err)
		return nil, err
	}

	logger.Debug("Retrieved user %d: %s", u.ID, u.UName)
	return u, err
}

// GetUserByID retrieves a user by primary key
func GetUserByID(db *sql.DB, id int64) (*models.User, error) {

	// setup a user struct to hold the retrieved data
	u := &models.User{}

	// query the database for a user matching the provided ID and scan the result into the user struct
	err := db.QueryRow(`
		SELECT id, uname, pword, uhash, fname, lname, email, phone, role, totp_secret, totp_salt, totp_enabled, notify_email, notify_sms, created, updated
		FROM kppn_users WHERE id = ?`, id,
	).Scan(
		&u.ID, &u.UName, &u.PWord, &u.UHash, &u.FName, &u.LName,
		&u.Email, &u.Phone, &u.Role, &u.TOTPSecret, &u.TOTPSalt, &u.TOTPEnabled,
		&u.NotifyEmail, &u.NotifySMS, &u.Created, &u.Updated,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		logger.Error("GetUserByID: failed to retrieve user %d: %v", id, err)
		return nil, err
	}

	logger.Debug("Retrieved user %d: %s", u.ID, u.UName)
	return u, err
}

// GetAllUsers returns all users — admin only
func GetAllUsers(db *sql.DB) ([]*models.User, error) {

	// query the database for all users ordered by creation time and capture the result set
	rows, err := db.Query(`
		SELECT id, uname, uhash, fname, lname, email, phone, role, totp_enabled, notify_email, notify_sms, created, updated
		FROM kppn_users ORDER BY created ASC`,
	)
	if err != nil {
		logger.Error("GetAllUsers: failed to retrieve users: %v", err)
		return nil, err
	}
	defer rows.Close()

	var users []*models.User

	for rows.Next() {
		u := &models.User{}
		if err := rows.Scan(
			&u.ID, &u.UName, &u.UHash, &u.FName, &u.LName,
			&u.Email, &u.Phone, &u.Role, &u.TOTPEnabled,
			&u.NotifyEmail, &u.NotifySMS, &u.Created, &u.Updated,
		); err != nil {
			logger.Error("GetAllUsers: failed to scan user row: %v", err)
			return nil, err
		}

		logger.Debug("Retrieved user %d: %s", u.ID, u.UName)
		users = append(users, u)
	}

	logger.Debug("Retrieved %d users", len(users))
	return users, rows.Err()
}

// UpdateUser updates mutable user fields
func UpdateUser(db *sql.DB, u *models.User) error {

	// capture the current time to set as the updated timestamp
	now := time.Now().UTC()

	// execute the update statement to modify the user's mutable fields and return any error that occurs
	_, err := db.Exec(`
		UPDATE kppn_users
		SET uname=?, fname=?, lname=?, email=?, phone=?, role=?, notify_email=?, notify_sms=?, updated=?
		WHERE id=?`,
		u.UName, u.FName, u.LName, u.Email, u.Phone, u.Role, u.NotifyEmail, u.NotifySMS, now, u.ID,
	)
	if err != nil {
		logger.Error("UpdateUser: failed to update user %d: %v", u.ID, err)
		return err
	}

	logger.Debug("Updated user %d: %s", u.ID, u.UName)
	return err
}

// UpdatePassword updates a user's password hash
func UpdatePassword(db *sql.DB, id int64, hash string) error {

	// capture the current time to set as the updated timestamp
	now := time.Now().UTC()

	// execute the update statement to modify the user's password hash and return any error that occurs
	_, err := db.Exec(`UPDATE kppn_users SET pword=?, updated=? WHERE id=?`, hash, now, id)
	if err != nil {
		logger.Error("UpdatePassword: failed to update password for user %d: %v", id, err)
		return err
	}

	// log the successful update of the user's password and return nil error
	logger.Debug("Updated password for user %d", id)
	return err
}

// DeleteUser removes a user — will fail if they own sites (ON DELETE RESTRICT)
func DeleteUser(db *sql.DB, id int64) error {

	// execute the delete statement to remove the user with the specified ID and return any error that occurs
	_, err := db.Exec(`DELETE FROM kppn_users WHERE id=?`, id)
	if err != nil {
		logger.Error("DeleteUser: failed to delete user %d: %v", id, err)
		return err
	}

	// log the successful deletion of the user and return nil error
	logger.Debug("Deleted user %d", id)
	return err
}

// SetTOTPSecret stores a pending TOTP secret (not yet enabled) for the user.
func SetTOTPSecret(db *sql.DB, id int64, secret string) error {
	_, err := db.Exec(`UPDATE kppn_users SET totp_secret=?, totp_enabled=0, updated=datetime('now') WHERE id=?`, secret, id)
	if err != nil {
		logger.Error("SetTOTPSecret: failed for user %d: %v", id, err)
	}
	return err
}

// SetTOTPSalt stores the per-user salt used for TOTP secret key derivation.
func SetTOTPSalt(db *sql.DB, id int64, salt string) error {
	_, err := db.Exec(`UPDATE kppn_users SET totp_salt=?, updated=datetime('now') WHERE id=?`, salt, id)
	if err != nil {
		logger.Error("SetTOTPSalt: failed for user %d: %v", id, err)
	}
	return err
}

// UpdateTOTPSecret replaces the stored TOTP secret without touching the enabled flag.
func UpdateTOTPSecret(db *sql.DB, id int64, secret string) error {
	_, err := db.Exec(`UPDATE kppn_users SET totp_secret=?, updated=datetime('now') WHERE id=?`, secret, id)
	if err != nil {
		logger.Error("UpdateTOTPSecret: failed for user %d: %v", id, err)
	}
	return err
}

// EnableTOTP activates TOTP for the user (secret must already be stored).
func EnableTOTP(db *sql.DB, id int64) error {
	_, err := db.Exec(`UPDATE kppn_users SET totp_enabled=1, updated=datetime('now') WHERE id=?`, id)
	if err != nil {
		logger.Error("EnableTOTP: failed for user %d: %v", id, err)
	}
	return err
}

// DisableTOTP clears the TOTP secret and disables TOTP for the user.
func DisableTOTP(db *sql.DB, id int64) error {
	_, err := db.Exec(`UPDATE kppn_users SET totp_secret='', totp_enabled=0, updated=datetime('now') WHERE id=?`, id)
	if err != nil {
		logger.Error("DisableTOTP: failed for user %d: %v", id, err)
	}
	return err
}
