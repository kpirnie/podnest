package db

import (
	"database/sql"
	"time"

	"podnest/internal/logger"
)

// BasicAuthConfig holds the per-site basic auth configuration
type BasicAuthConfig struct {
	SiteID  int64
	Enabled bool
	Realm   string
}

// BasicAuthUser holds a single credential entry for a site
type BasicAuthUser struct {
	ID           int64
	SiteID       int64
	Username     string
	PasswordHash string
	Created      time.Time
	Updated      *time.Time
}

// GetBasicAuthConfig returns the basic auth configuration for a site.
// Returns a default disabled config if no row exists yet.
func GetBasicAuthConfig(database *sql.DB, siteID int64) (*BasicAuthConfig, error) {
	cfg := &BasicAuthConfig{SiteID: siteID, Enabled: false, Realm: "Restricted"}
	err := database.QueryRow(
		`SELECT enabled, realm FROM kppn_basic_auth WHERE site_id = ?`, siteID,
	).Scan(&cfg.Enabled, &cfg.Realm)
	if err == sql.ErrNoRows {
		logger.Debug("GetBasicAuthConfig: no config for siteID=%d, returning default", siteID)
		return cfg, nil
	}
	if err != nil {
		logger.Error("GetBasicAuthConfig: siteID=%d: %v", siteID, err)
		return nil, err
	}
	logger.Debug("GetBasicAuthConfig: siteID=%d enabled=%v", siteID, cfg.Enabled)
	return cfg, nil
}

// SaveBasicAuthConfig upserts the basic auth configuration for a site.
func SaveBasicAuthConfig(database *sql.DB, cfg BasicAuthConfig) error {
	_, err := database.Exec(`
		INSERT INTO kppn_basic_auth (site_id, enabled, realm, updated)
		VALUES (?, ?, ?, ?)
		ON CONFLICT(site_id) DO UPDATE SET
			enabled = excluded.enabled,
			realm   = excluded.realm,
			updated = excluded.updated`,
		cfg.SiteID, cfg.Enabled, cfg.Realm, time.Now().UTC(),
	)
	if err != nil {
		logger.Error("SaveBasicAuthConfig: siteID=%d: %v", cfg.SiteID, err)
		return err
	}
	logger.Debug("SaveBasicAuthConfig: siteID=%d saved", cfg.SiteID)
	return nil
}

// GetBasicAuthUsers returns all credential entries for a site.
func GetBasicAuthUsers(database *sql.DB, siteID int64) ([]*BasicAuthUser, error) {
	rows, err := database.Query(`
		SELECT id, site_id, username, password_hash, created, updated
		FROM kppn_basic_auth_users WHERE site_id = ?
		ORDER BY username ASC`, siteID)
	if err != nil {
		logger.Error("GetBasicAuthUsers: siteID=%d: %v", siteID, err)
		return nil, err
	}
	defer rows.Close()

	var users []*BasicAuthUser
	for rows.Next() {
		u := &BasicAuthUser{}
		if err := rows.Scan(&u.ID, &u.SiteID, &u.Username, &u.PasswordHash, &u.Created, &u.Updated); err != nil {
			logger.Error("GetBasicAuthUsers: scan siteID=%d: %v", siteID, err)
			return nil, err
		}
		users = append(users, u)
	}
	logger.Debug("GetBasicAuthUsers: siteID=%d returned %d users", siteID, len(users))
	return users, rows.Err()
}

// GetAllBasicAuthData returns all enabled basic auth configs with their users.
// Used to warm the proxy cache on startup.
func GetAllBasicAuthData(database *sql.DB) (map[int64]*BasicAuthConfig, map[int64][]*BasicAuthUser, error) {
	cfgRows, err := database.Query(`SELECT site_id, enabled, realm FROM kppn_basic_auth WHERE enabled = 1`)
	if err != nil {
		logger.Error("GetAllBasicAuthData: config query: %v", err)
		return nil, nil, err
	}
	defer cfgRows.Close()

	cfgs := make(map[int64]*BasicAuthConfig)
	for cfgRows.Next() {
		c := &BasicAuthConfig{}
		if err := cfgRows.Scan(&c.SiteID, &c.Enabled, &c.Realm); err != nil {
			logger.Error("GetAllBasicAuthData: config scan: %v", err)
			return nil, nil, err
		}
		cfgs[c.SiteID] = c
	}
	if err := cfgRows.Err(); err != nil {
		return nil, nil, err
	}

	userRows, err := database.Query(`
		SELECT u.id, u.site_id, u.username, u.password_hash, u.created, u.updated
		FROM kppn_basic_auth_users u
		INNER JOIN kppn_basic_auth b ON b.site_id = u.site_id AND b.enabled = 1`)
	if err != nil {
		logger.Error("GetAllBasicAuthData: user query: %v", err)
		return nil, nil, err
	}
	defer userRows.Close()

	users := make(map[int64][]*BasicAuthUser)
	for userRows.Next() {
		u := &BasicAuthUser{}
		if err := userRows.Scan(&u.ID, &u.SiteID, &u.Username, &u.PasswordHash, &u.Created, &u.Updated); err != nil {
			logger.Error("GetAllBasicAuthData: user scan: %v", err)
			return nil, nil, err
		}
		users[u.SiteID] = append(users[u.SiteID], u)
	}
	logger.Debug("GetAllBasicAuthData: loaded %d sites with basic auth enabled", len(cfgs))
	return cfgs, users, userRows.Err()
}

// UpsertBasicAuthUser inserts or updates a credential entry for a site.
func UpsertBasicAuthUser(database *sql.DB, siteID int64, username, passwordHash string) error {
	_, err := database.Exec(`
		INSERT INTO kppn_basic_auth_users (site_id, username, password_hash, updated)
		VALUES (?, ?, ?, ?)
		ON CONFLICT(site_id, username) DO UPDATE SET
			password_hash = excluded.password_hash,
			updated       = excluded.updated`,
		siteID, username, passwordHash, time.Now().UTC(),
	)
	if err != nil {
		logger.Error("UpsertBasicAuthUser: siteID=%d username=%q: %v", siteID, username, err)
		return err
	}
	logger.Debug("UpsertBasicAuthUser: siteID=%d username=%q saved", siteID, username)
	return nil
}

// DeleteBasicAuthUser removes a single credential entry by ID, scoped to the site.
func DeleteBasicAuthUser(database *sql.DB, siteID, userID int64) error {
	_, err := database.Exec(
		`DELETE FROM kppn_basic_auth_users WHERE id = ? AND site_id = ?`, userID, siteID,
	)
	if err != nil {
		logger.Error("DeleteBasicAuthUser: siteID=%d userID=%d: %v", siteID, userID, err)
		return err
	}
	logger.Debug("DeleteBasicAuthUser: siteID=%d userID=%d removed", siteID, userID)
	return nil
}

// DeleteBasicAuthBySite removes all basic auth data for a site — called on site deletion.
func DeleteBasicAuthBySite(database *sql.DB, siteID int64) error {
	if _, err := database.Exec(`DELETE FROM kppn_basic_auth_users WHERE site_id = ?`, siteID); err != nil {
		logger.Error("DeleteBasicAuthBySite: users siteID=%d: %v", siteID, err)
		return err
	}
	if _, err := database.Exec(`DELETE FROM kppn_basic_auth WHERE site_id = ?`, siteID); err != nil {
		logger.Error("DeleteBasicAuthBySite: config siteID=%d: %v", siteID, err)
		return err
	}
	logger.Debug("DeleteBasicAuthBySite: siteID=%d removed", siteID)
	return nil
}
