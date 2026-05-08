package db

import (
	"database/sql"
	"time"

	"podnest/internal/logger"
)

// GetSetting retrieves a single setting value by key, returning an empty string if not found
func GetSetting(db *sql.DB, key string) (string, error) {

	// hold the value to be returned
	var value string

	// query the database for the setting matching the given key
	err := db.QueryRow(`
		SELECT value FROM kppn_settings WHERE key = ?`, key,
	).Scan(&value)
	if err == sql.ErrNoRows {
		logger.Debug("setting '%s' not found", key)
		return "", nil
	}
	if err != nil {
		logger.Error("GetSetting: failed to retrieve setting '%s': %v", key, err)
		return "", err
	}

	logger.Debug("retrieved setting '%s'", key)
	return value, nil
}

// SetSetting inserts or updates a setting key/value pair
func SetSetting(db *sql.DB, key, value string) error {

	// upsert the setting record using the key as the conflict target
	_, err := db.Exec(`
		INSERT INTO kppn_settings (key, value, updated)
		VALUES (?, ?, ?)
		ON CONFLICT (key) DO UPDATE SET value=excluded.value, updated=excluded.updated`,
		key, value, time.Now().UTC(),
	)
	if err != nil {
		logger.Error("SetSetting: failed to upsert setting '%s': %v", key, err)
		return err
	}

	logger.Debug("upserted setting '%s'", key)
	return nil
}
