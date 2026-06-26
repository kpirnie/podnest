// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package db

import (
	"database/sql"
	"time"

	"podnest/internal/logger"
)

// GetConfigsBySiteAndType returns all key/value pairs for a site+type as a map
func GetConfigsBySiteAndType(db *sql.DB, siteID int64, configType int) (map[string]string, error) {

	// query all KV rows for this site+type
	rows, err := db.Query(`
		SELECT key, value FROM kppn_configs
		WHERE site_id = ? AND type = ? ORDER BY key ASC`, siteID, configType,
	)
	if err != nil {
		logger.Error("GetConfigsBySiteAndType: failed to query site %d type %d: %v", siteID, configType, err)
		return nil, err
	}
	defer rows.Close()

	// populate the map from the result set
	kv := make(map[string]string)
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			logger.Error("GetConfigsBySiteAndType: failed to scan row for site %d type %d: %v", siteID, configType, err)
			return nil, err
		}
		kv[k] = v
	}

	logger.Debug("GetConfigsBySiteAndType: found %d keys for site %d type %d", len(kv), siteID, configType)
	return kv, rows.Err()
}

// GetAllConfigsBySite returns all config types for a site as a map of type → KV map
func GetAllConfigsBySite(db *sql.DB, siteID int64) (map[int]map[string]string, error) {

	// query all KV rows for this site ordered by type then key
	rows, err := db.Query(`
		SELECT type, key, value FROM kppn_configs
		WHERE site_id = ? ORDER BY type ASC, key ASC`, siteID,
	)
	if err != nil {
		logger.Error("GetAllConfigsBySite: failed to query site %d: %v", siteID, err)
		return nil, err
	}
	defer rows.Close()

	// populate the nested map from the result set
	out := make(map[int]map[string]string)
	for rows.Next() {
		var t int
		var k, v string
		if err := rows.Scan(&t, &k, &v); err != nil {
			logger.Error("GetAllConfigsBySite: failed to scan row for site %d: %v", siteID, err)
			return nil, err
		}
		if out[t] == nil {
			out[t] = make(map[string]string)
		}
		out[t][k] = v
	}

	logger.Debug("GetAllConfigsBySite: found %d config types for site %d", len(out), siteID)
	return out, rows.Err()
}

// GetConfigValue returns a single value for a site+type+key; the bool indicates
// whether the key was present
func GetConfigValue(db *sql.DB, siteID int64, configType int, key string) (string, bool, error) {

	// query the single KV row
	var value string
	err := db.QueryRow(`
		SELECT value FROM kppn_configs
		WHERE site_id = ? AND type = ? AND key = ?`, siteID, configType, key,
	).Scan(&value)
	if err == sql.ErrNoRows {
		logger.Debug("GetConfigValue: key %q not found for site %d type %d", key, siteID, configType)
		return "", false, nil
	}
	if err != nil {
		logger.Error("GetConfigValue: failed to query site %d type %d key %q: %v", siteID, configType, key, err)
		return "", false, err
	}

	logger.Debug("GetConfigValue: found key %q for site %d type %d", key, siteID, configType)
	return value, true, nil
}

// SetConfig upserts a single key/value pair for a site+type
func SetConfig(db *sql.DB, siteID int64, configType int, key, value string) error {

	// upsert the single KV row
	now := time.Now().UTC()
	_, err := db.Exec(`
		INSERT INTO kppn_configs (site_id, type, key, value, created, updated)
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT (site_id, type, key) DO UPDATE SET value=excluded.value, updated=excluded.updated`,
		siteID, configType, key, value, now, now,
	)
	if err != nil {
		logger.Error("SetConfig: failed to upsert site %d type %d key %q: %v", siteID, configType, key, err)
		return err
	}

	logger.Debug("SetConfig: upserted key %q for site %d type %d", key, siteID, configType)
	return nil
}

// SetConfigs replaces all key/value pairs for a site+type in a single transaction;
// keys present in the DB but absent from kvs are deleted
func SetConfigs(db *sql.DB, siteID int64, configType int, kvs map[string]string) error {

	// wrap delete + insert in a transaction so the replace is atomic
	tx, err := db.Begin()
	if err != nil {
		logger.Error("SetConfigs: failed to begin transaction for site %d type %d: %v", siteID, configType, err)
		return err
	}

	// delete all existing KV rows for this site+type
	if _, err := tx.Exec(`DELETE FROM kppn_configs WHERE site_id = ? AND type = ?`, siteID, configType); err != nil {
		tx.Rollback()
		logger.Error("SetConfigs: failed to delete existing rows for site %d type %d: %v", siteID, configType, err)
		return err
	}

	// insert one row per key in the incoming map
	now := time.Now().UTC()
	stmt, err := tx.Prepare(`
		INSERT INTO kppn_configs (site_id, type, key, value, created, updated)
		VALUES (?, ?, ?, ?, ?, ?)`)
	if err != nil {
		tx.Rollback()
		logger.Error("SetConfigs: failed to prepare insert for site %d type %d: %v", siteID, configType, err)
		return err
	}
	defer stmt.Close()

	for k, v := range kvs {
		if _, err := stmt.Exec(siteID, configType, k, v, now, now); err != nil {
			tx.Rollback()
			logger.Error("SetConfigs: failed to insert key %q for site %d type %d: %v", k, siteID, configType, err)
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		logger.Error("SetConfigs: failed to commit for site %d type %d: %v", siteID, configType, err)
		return err
	}

	logger.Debug("SetConfigs: replaced %d keys for site %d type %d", len(kvs), siteID, configType)
	return nil
}

// DeleteConfig removes a single key for a site+type
func DeleteConfig(db *sql.DB, siteID int64, configType int, key string) error {

	// delete the single KV row
	_, err := db.Exec(`DELETE FROM kppn_configs WHERE site_id = ? AND type = ? AND key = ?`, siteID, configType, key)
	if err != nil {
		logger.Error("DeleteConfig: failed to delete key %q for site %d type %d: %v", key, siteID, configType, err)
		return err
	}

	logger.Debug("DeleteConfig: deleted key %q for site %d type %d", key, siteID, configType)
	return nil
}

// DeleteConfigsByType removes all keys for a site+type
func DeleteConfigsByType(db *sql.DB, siteID int64, configType int) error {

	// delete all KV rows for this site+type
	_, err := db.Exec(`DELETE FROM kppn_configs WHERE site_id = ? AND type = ?`, siteID, configType)
	if err != nil {
		logger.Error("DeleteConfigsByType: failed to delete configs for site %d type %d: %v", siteID, configType, err)
		return err
	}

	logger.Debug("DeleteConfigsByType: deleted all keys for site %d type %d", siteID, configType)
	return nil
}

// DeleteConfigsBySite removes all config rows for a site across all types
func DeleteConfigsBySite(db *sql.DB, siteID int64) error {

	// delete all KV rows for this site
	_, err := db.Exec(`DELETE FROM kppn_configs WHERE site_id = ?`, siteID)
	if err != nil {
		logger.Error("DeleteConfigsBySite: failed to delete configs for site %d: %v", siteID, err)
		return err
	}

	logger.Debug("DeleteConfigsBySite: deleted all configs for site %d", siteID)
	return nil
}
