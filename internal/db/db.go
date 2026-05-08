package db

import (
	"crypto/sha256"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"podnest/internal/logger"
	"podnest/internal/models"

	_ "github.com/mattn/go-sqlite3"
	"golang.org/x/crypto/bcrypt"
)

// Open opens the SQLite database, creating the file and parent dirs if needed
func Open(path string) (*sql.DB, error) {

	// Ensure the parent directory exists
	if err := os.MkdirAll(filepath.Dir(path), 0750); err != nil {
		logger.Error("failed to create db directory: %v", err)
		return nil, err
	}

	// Open the database with appropriate flags for concurrency and integrity
	db, err := sql.Open("sqlite3", path+"?_journal_mode=WAL&_busy_timeout=5000&_foreign_keys=on")
	if err != nil {
		logger.Error("failed to open sqlite: %v", err)
		return nil, err
	}

	// Limit connections to 1 to avoid locking issues with SQLite in a multi-threaded environment
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)

	// Verify the connection is valid
	if err := db.Ping(); err != nil {
		logger.Error("failed to ping sqlite: %v", err)
		return nil, err
	}

	logger.Debug("sqlite connection established")
	// return the database connection
	return db, nil
}

// Migrate runs the DDL to create all tables and applies any column migrations
func Migrate(db *sql.DB) error {

	// execute the schema to create tables if they don't exist
	if _, err := db.Exec(schema); err != nil {
		logger.Error("failed to execute schema: %v", err)
		return err
	}

	// apply column migrations to add new columns without breaking existing data
	logger.Debug("database schema ensured")
	return migrateColumns(db)
}

// migrateColumns adds new columns and removes obsolete ones without breaking existing data
func migrateColumns(db *sql.DB) error {

	migrations := []string{
		// legacy columns kept for existing installs
		`ALTER TABLE kppn_sites ADD COLUMN site_type INTEGER NOT NULL DEFAULT 1`,
		`ALTER TABLE kppn_sites ADD COLUMN runtime_version INTEGER`,
		`ALTER TABLE kppn_sites ADD COLUMN start_command TEXT`,
		`ALTER TABLE kppn_sites ADD COLUMN pma_port  INTEGER`,
		// TOTP support
		`ALTER TABLE kppn_users ADD COLUMN totp_secret TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE kppn_users ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0`,
	}

	for _, m := range migrations {
		if _, err := db.Exec(m); err != nil {
			if !strings.Contains(err.Error(), "duplicate column") &&
				!strings.Contains(err.Error(), "no such column") {
				logger.Error("failed to execute migration: %v", err)
				return err
			}
			logger.Debug("migration skipped (already applied): %v", err)
		}
	}

	logger.Debug("column migrations applied")
	return nil
}

// SeedDefaultAdmin creates a default admin account if none exists
func SeedDefaultAdmin(database *sql.DB) error {

	// Check if the default admin user already exists to avoid duplicate entries
	exists, err := AdminExists(database)
	if err != nil {
		logger.Error("failed to check for existing admin: %v", err)
		return err
	}
	if exists {
		logger.Debug("default admin already exists")
		return nil
	}

	// Generate a bcrypt hash of the default password "podnest1234@" for secure storage
	h := sha256.Sum256([]byte("podnest1234@"))
	prehashed := fmt.Sprintf("%x", h)
	hash, err := bcrypt.GenerateFromPassword([]byte(prehashed), bcrypt.DefaultCost)
	if err != nil {
		logger.Error("failed to generate password hash: %v", err)
		return err
	}

	// Generate a unique user hash (uhash) for the admin user
	uhash, err := models.GenerateUHash()
	if err != nil {
		logger.Error("failed to generate user hash: %v", err)
		return err
	}

	// Insert the default admin user into the database with the hashed password and generated uhash
	_, err = database.Exec(`
		INSERT INTO kppn_users (uname, pword, uhash, fname, lname, email, phone, role)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		"admin", string(hash), uhash, "Admin", "User", "admin@localhost", "", models.RoleAdmin,
	)
	if err != nil {
		logger.Error("failed to create default admin: %v", err)
		return err
	}

	// Log that the default admin user was created successfully with the default credentials
	logger.Debug("default admin user created with username 'admin' and password 'podnest1234@'")
	return err
}

// setup the database schema
const schema = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS kppn_users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    uname    TEXT    NOT NULL UNIQUE,
    pword    TEXT    NOT NULL,
    uhash    TEXT    NOT NULL,
    fname    TEXT    NOT NULL,
    lname    TEXT    NOT NULL,
    email    TEXT    NOT NULL,
    phone    TEXT    NOT NULL,
    role     INTEGER NOT NULL DEFAULT 50,
    created  DATETIME NOT NULL DEFAULT (datetime('now')),
    updated  DATETIME
);

CREATE INDEX IF NOT EXISTS idx_users_uhash ON kppn_users (uhash);

CREATE TABLE IF NOT EXISTS kppn_sessions (
    id         TEXT    PRIMARY KEY,
    uid        INTEGER NOT NULL REFERENCES kppn_users(id) ON DELETE CASCADE,
    expires_at DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_uid ON kppn_sessions (uid);

CREATE TABLE IF NOT EXISTS kppn_sites (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    uid             INTEGER NOT NULL REFERENCES kppn_users(id) ON DELETE RESTRICT,
    name            TEXT    NOT NULL,
    port            INTEGER NOT NULL UNIQUE,
    php_version     INTEGER NOT NULL DEFAULT 3,
    site_status     INTEGER NOT NULL DEFAULT 2,
    site_type       INTEGER NOT NULL DEFAULT 1,
    runtime_version INTEGER,
    start_command   TEXT,
    pma_port        INTEGER,
    created         DATETIME NOT NULL DEFAULT (datetime('now')),
    updated         DATETIME
);

CREATE INDEX IF NOT EXISTS idx_sites_uid  ON kppn_sites (uid);
CREATE INDEX IF NOT EXISTS idx_sites_name ON kppn_sites (name);

CREATE TABLE IF NOT EXISTS kppn_domains (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    siteid  INTEGER NOT NULL REFERENCES kppn_sites(id) ON DELETE CASCADE,
    domain  TEXT    NOT NULL UNIQUE,
    created DATETIME NOT NULL DEFAULT (datetime('now')),
    updated DATETIME
);

CREATE INDEX IF NOT EXISTS idx_domains_siteid ON kppn_domains (siteid);

CREATE TABLE IF NOT EXISTS kppn_configs (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    siteid  INTEGER NOT NULL REFERENCES kppn_sites(id) ON DELETE CASCADE,
    type    INTEGER NOT NULL,
    config  TEXT    NOT NULL DEFAULT '{}',
    created DATETIME NOT NULL DEFAULT (datetime('now')),
    updated DATETIME,
    UNIQUE (siteid, type)
);

CREATE INDEX IF NOT EXISTS idx_configs_siteid ON kppn_configs (siteid);

CREATE TABLE IF NOT EXISTS kppn_pma_tokens (
    token      TEXT    PRIMARY KEY,
    site_id    INTEGER NOT NULL REFERENCES kppn_sites(id) ON DELETE CASCADE,
    expires_at DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pma_tokens_site ON kppn_pma_tokens (site_id);

CREATE TABLE IF NOT EXISTS kppn_sftp_creds (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id   INTEGER NOT NULL UNIQUE REFERENCES kppn_sites(id) ON DELETE CASCADE,
    username  TEXT    NOT NULL UNIQUE,
    password  TEXT    NOT NULL,
    uid       INTEGER NOT NULL UNIQUE,
    created   DATETIME NOT NULL DEFAULT (datetime('now')),
    updated   DATETIME
);

CREATE INDEX IF NOT EXISTS idx_sftp_creds_site ON kppn_sftp_creds (site_id);

CREATE TABLE IF NOT EXISTS kppn_settings (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    key     TEXT    NOT NULL UNIQUE,
    value   TEXT    NOT NULL DEFAULT '',
    updated DATETIME
);

CREATE INDEX IF NOT EXISTS idx_settings_key ON kppn_settings (key);

CREATE TABLE IF NOT EXISTS kppn_ip_rules (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id   INTEGER REFERENCES kppn_sites(id) ON DELETE CASCADE,
    list_type INTEGER NOT NULL CHECK(list_type IN (0,1)),
    cidr      TEXT    NOT NULL,
    created   DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ip_rules_site ON kppn_ip_rules (site_id);
CREATE INDEX IF NOT EXISTS idx_ip_rules_type ON kppn_ip_rules (list_type);

CREATE TABLE IF NOT EXISTS kppn_ua_rules (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id   INTEGER REFERENCES kppn_sites(id) ON DELETE CASCADE,
    list_type INTEGER NOT NULL CHECK(list_type IN (0,1)),
    pattern   TEXT    NOT NULL,
    created   DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ua_rules_site ON kppn_ua_rules (site_id);
CREATE INDEX IF NOT EXISTS idx_ua_rules_type ON kppn_ua_rules (list_type);

CREATE TABLE IF NOT EXISTS kppn_totp_pending (
    token      TEXT    PRIMARY KEY,
    uid        INTEGER NOT NULL REFERENCES kppn_users(id) ON DELETE CASCADE,
    expires_at DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_totp_pending_uid ON kppn_totp_pending (uid);

CREATE TABLE IF NOT EXISTS kppn_totp_backup_codes (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    uid       INTEGER NOT NULL REFERENCES kppn_users(id) ON DELETE CASCADE,
    code_hash TEXT    NOT NULL,
    used      INTEGER NOT NULL DEFAULT 0,
    created   DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_totp_backup_uid ON kppn_totp_backup_codes (uid);
`
