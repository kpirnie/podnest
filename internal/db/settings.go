package db

import (
	"database/sql"
	"strings"
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

// GetAllSettings returns all key/value pairs from kppn_settings as a map
func GetAllSettings(db *sql.DB) (map[string]string, error) {
	rows, err := db.Query(`SELECT key, value FROM kppn_settings ORDER BY key`)
	if err != nil {
		logger.Error("GetAllSettings: query failed: %v", err)
		return nil, err
	}
	defer rows.Close()

	out := make(map[string]string)
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			logger.Error("GetAllSettings: scan failed: %v", err)
			return nil, err
		}
		out[k] = v
	}

	logger.Debug("GetAllSettings: loaded %d settings", len(out))
	return out, rows.Err()
}

// GetTrustedProxies merges the auto-fetched and admin-defined custom CIDR lists
// into a single deduplicated slice ready for net.IPNet parsing
func GetTrustedProxies(db *sql.DB) ([]string, error) {
	auto, err := GetSetting(db, "trusted_proxies_auto")
	if err != nil {
		return nil, err
	}

	custom, err := GetSetting(db, "trusted_proxies_custom")
	if err != nil {
		return nil, err
	}

	// merge both lists, deduplicating by CIDR string
	seen := make(map[string]struct{})
	var cidrs []string
	for _, src := range []string{auto, custom} {
		for _, line := range strings.Split(src, "\n") {
			line = strings.TrimSpace(line)
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			// strip inline comments
			if idx := strings.Index(line, "#"); idx != -1 {
				line = strings.TrimSpace(line[:idx])
			}
			if line == "" {
				continue
			}
			if _, dup := seen[line]; !dup {
				seen[line] = struct{}{}
				cidrs = append(cidrs, line)
			}
		}
	}

	logger.Debug("GetTrustedProxies: %d merged entries", len(cidrs))
	return cidrs, nil
}

// GetSMTPConfig loads SMTP settings from the database into an SMTPConfig-shaped map.
// Returns the raw string values; the caller converts to the typed struct.
func GetSMTPConfig(db *sql.DB) (map[string]string, error) {
	keys := []string{"smtp_host", "smtp_port", "smtp_username", "smtp_password", "smtp_from", "smtp_tls"}
	out := make(map[string]string, len(keys))
	for _, k := range keys {
		val, err := GetSetting(db, k)
		if err != nil {
			return nil, err
		}
		out[k] = val
	}
	return out, nil
}

// GetSNSConfig loads AWS SNS settings from the database into a raw string map.
func GetSNSConfig(db *sql.DB) (map[string]string, error) {
	keys := []string{"aws_access_key", "aws_secret_key", "aws_region", "aws_sns_sender_id"}
	out := make(map[string]string, len(keys))
	for _, k := range keys {
		val, err := GetSetting(db, k)
		if err != nil {
			return nil, err
		}
		out[k] = val
	}
	return out, nil
}

// GetTrustedProxiesCustom returns only the admin-defined custom CIDR entries
func GetTrustedProxiesCustom(db *sql.DB) (string, error) {
	return GetSetting(db, "trusted_proxies_custom")
}

// SetTrustedProxiesAuto persists the auto-fetched CIDR list from provider endpoints
func SetTrustedProxiesAuto(db *sql.DB, value string) error {
	return SetSetting(db, "trusted_proxies_auto", value)
}

// SetTrustedProxiesCustom persists the admin-defined custom CIDR list
func SetTrustedProxiesCustom(db *sql.DB, value string) error {
	return SetSetting(db, "trusted_proxies_custom", value)
}
