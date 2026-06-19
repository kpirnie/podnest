package db

import (
	"crypto/sha256"
	"database/sql"
	"encoding/json"
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

	// migrate configs first — must run before schema DDL which references site_id
	if err := MigrateConfigs(db); err != nil {
		return err
	}

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
		// Notifiy support
		`ALTER TABLE kppn_users ADD COLUMN notify_email INTEGER NOT NULL DEFAULT 0`,
		`ALTER TABLE kppn_users ADD COLUMN notify_sms INTEGER NOT NULL DEFAULT 0`,
		// Backup support
		`ALTER TABLE kppn_settings ADD COLUMN key TEXT`, // no-op guard; settings added via upsert
		`ALTER TABLE kppn_backup_repos ADD COLUMN local_enabled INTEGER NOT NULL DEFAULT 1`,
		`ALTER TABLE kppn_backup_repos ADD COLUMN s3_enabled INTEGER NOT NULL DEFAULT 0`,
		// backup failure tracking
		`ALTER TABLE kppn_backup_repos ADD COLUMN last_error TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE kppn_backup_repos ADD COLUMN last_error_at DATETIME`,
		`ALTER TABLE kppn_sites ADD COLUMN parent_id INTEGER NOT NULL DEFAULT 0`,
		`ALTER TABLE kppn_sessions ADD COLUMN csrf_token TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE kppn_backups ADD COLUMN domains TEXT NOT NULL DEFAULT ''`,
		// reverse proxy support
		`ALTER TABLE kppn_rp_routes ADD COLUMN pass_host INTEGER NOT NULL DEFAULT 0`,
		// redirect module
		`CREATE TABLE IF NOT EXISTS kppn_redirects (id INTEGER PRIMARY KEY AUTOINCREMENT, site_id INTEGER NOT NULL REFERENCES kppn_sites(id) ON DELETE CASCADE, source TEXT NOT NULL, target TEXT NOT NULL, code INTEGER NOT NULL DEFAULT 301, position INTEGER NOT NULL DEFAULT 0, created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated DATETIME)`,
		`CREATE INDEX IF NOT EXISTS idx_redirects_site ON kppn_redirects (site_id)`,
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

// MigrateConfigs detects the old single-blob kppn_configs schema and migrates
// all existing rows to the new EAV structure (one row per key/value pair)
func MigrateConfigs(db *sql.DB) error {

	// check whether the old 'config' column still exists
	infoRows, err := db.Query(`PRAGMA table_info(kppn_configs)`)
	if err != nil {
		logger.Error("MigrateConfigs: failed to read table_info: %v", err)
		return err
	}

	hasOldSchema := false
	for infoRows.Next() {
		var cid, notNull, pk int
		var name, colType string
		var dfltVal interface{}
		if err := infoRows.Scan(&cid, &name, &colType, &notNull, &dfltVal, &pk); err != nil {
			infoRows.Close()
			logger.Error("MigrateConfigs: failed to scan table_info: %v", err)
			return err
		}
		if name == "config" {
			hasOldSchema = true
		}
	}
	infoRows.Close()
	if err := infoRows.Err(); err != nil {
		return err
	}
	if !hasOldSchema {
		logger.Debug("MigrateConfigs: EAV schema already in place, skipping")
		return nil
	}

	logger.Debug("MigrateConfigs: old blob schema detected — migrating to EAV")

	// read all existing blob rows before opening the transaction
	type oldRow struct {
		siteid int64
		typ    int
		config string
	}
	blobRows, err := db.Query(`SELECT siteid, type, config FROM kppn_configs`)
	if err != nil {
		logger.Error("MigrateConfigs: failed to read existing configs: %v", err)
		return err
	}
	var old []oldRow
	for blobRows.Next() {
		var r oldRow
		if err := blobRows.Scan(&r.siteid, &r.typ, &r.config); err != nil {
			blobRows.Close()
			logger.Error("MigrateConfigs: failed to scan config row: %v", err)
			return err
		}
		old = append(old, r)
	}
	blobRows.Close()
	if err := blobRows.Err(); err != nil {
		return err
	}

	// rebuild the table as EAV inside a transaction
	tx, err := db.Begin()
	if err != nil {
		logger.Error("MigrateConfigs: failed to begin transaction: %v", err)
		return err
	}

	// create the replacement table alongside the old one
	if _, err := tx.Exec(`
		CREATE TABLE kppn_configs_new (
		    id      INTEGER PRIMARY KEY AUTOINCREMENT,
		    site_id INTEGER NOT NULL REFERENCES kppn_sites(id) ON DELETE CASCADE,
		    type    INTEGER NOT NULL,
		    key     TEXT    NOT NULL,
		    value   TEXT    NOT NULL DEFAULT '',
		    created DATETIME NOT NULL DEFAULT (datetime('now')),
		    updated DATETIME,
		    UNIQUE (site_id, type, key)
		)`); err != nil {
		tx.Rollback()
		logger.Error("MigrateConfigs: failed to create new table: %v", err)
		return err
	}

	// prepare the insert for KV rows
	stmt, err := tx.Prepare(`
		INSERT INTO kppn_configs_new (site_id, type, key, value)
		VALUES (?, ?, ?, ?)`)
	if err != nil {
		tx.Rollback()
		logger.Error("MigrateConfigs: failed to prepare insert: %v", err)
		return err
	}

	// unmarshal each blob and insert one row per key
	for _, r := range old {
		var kv map[string]string
		if err := json.Unmarshal([]byte(r.config), &kv); err != nil {
			logger.Warn("MigrateConfigs: skipping unparseable blob for site %d type %d: %v", r.siteid, r.typ, err)
			continue
		}
		for k, v := range kv {
			if _, err := stmt.Exec(r.siteid, r.typ, k, v); err != nil {
				stmt.Close()
				tx.Rollback()
				logger.Error("MigrateConfigs: failed to insert KV row: %v", err)
				return err
			}
		}
	}
	stmt.Close()

	// swap old table for the new one
	if _, err := tx.Exec(`DROP TABLE kppn_configs`); err != nil {
		tx.Rollback()
		logger.Error("MigrateConfigs: failed to drop old table: %v", err)
		return err
	}
	if _, err := tx.Exec(`ALTER TABLE kppn_configs_new RENAME TO kppn_configs`); err != nil {
		tx.Rollback()
		logger.Error("MigrateConfigs: failed to rename new table: %v", err)
		return err
	}

	if err := tx.Commit(); err != nil {
		logger.Error("MigrateConfigs: failed to commit migration: %v", err)
		return err
	}

	// index after commit — DDL outside a transaction is fine for SQLite
	if _, err := db.Exec(`CREATE INDEX IF NOT EXISTS idx_configs_site_type ON kppn_configs (site_id, type)`); err != nil {
		logger.Error("MigrateConfigs: failed to create index: %v", err)
		return err
	}

	logger.Debug("MigrateConfigs: complete — %d blob rows migrated", len(old))
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
    site_id INTEGER NOT NULL REFERENCES kppn_sites(id) ON DELETE CASCADE,
    type    INTEGER NOT NULL,
    key     TEXT    NOT NULL,
    value   TEXT    NOT NULL DEFAULT '',
    created DATETIME NOT NULL DEFAULT (datetime('now')),
    updated DATETIME,
    UNIQUE (site_id, type, key)
);

CREATE INDEX IF NOT EXISTS idx_configs_site_type ON kppn_configs (site_id, type);

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

CREATE TABLE IF NOT EXISTS kppn_security_bypass (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    cidr    TEXT    NOT NULL,
    note    TEXT    NOT NULL DEFAULT '',
    created DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_security_bypass_cidr ON kppn_security_bypass (cidr);

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

CREATE TABLE IF NOT EXISTS kppn_backup_repos (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id       INTEGER NOT NULL UNIQUE REFERENCES kppn_sites(id) ON DELETE CASCADE,
    repo_password TEXT    NOT NULL,
	local_path    TEXT    NOT NULL DEFAULT '',
    local_enabled INTEGER NOT NULL DEFAULT 1,
    s3_enabled    INTEGER NOT NULL DEFAULT 0,
	created       DATETIME NOT NULL DEFAULT (datetime('now')),
    updated       DATETIME
);

CREATE INDEX IF NOT EXISTS idx_backup_repos_site ON kppn_backup_repos (site_id);

CREATE TABLE IF NOT EXISTS kppn_backups (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id     INTEGER NOT NULL REFERENCES kppn_sites(id) ON DELETE CASCADE,
    snapshot_id TEXT    NOT NULL,
    label       TEXT    NOT NULL DEFAULT '',
    backup_type INTEGER NOT NULL DEFAULT 1,
    size_bytes  INTEGER NOT NULL DEFAULT 0,
    created     DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_backups_site    ON kppn_backups (site_id);
CREATE INDEX IF NOT EXISTS idx_backups_created ON kppn_backups (created);

CREATE TABLE IF NOT EXISTS kppn_waf_settings (
    id             INTEGER PRIMARY KEY CHECK(id = 1),
    enabled        INTEGER NOT NULL DEFAULT 0,
    mode           INTEGER NOT NULL DEFAULT 0,
    paranoia_level INTEGER NOT NULL DEFAULT 1,
    audit_log      INTEGER NOT NULL DEFAULT 0,
    exclusions     TEXT    NOT NULL DEFAULT '',
    updated        DATETIME
);

CREATE TABLE IF NOT EXISTS kppn_waf_site_overrides (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id    INTEGER NOT NULL UNIQUE REFERENCES kppn_sites(id) ON DELETE CASCADE,
    override   INTEGER NOT NULL DEFAULT 0,
    exclusions TEXT    NOT NULL DEFAULT '',
    updated    DATETIME
);

CREATE INDEX IF NOT EXISTS idx_waf_site_overrides_site ON kppn_waf_site_overrides (site_id);

CREATE INDEX IF NOT EXISTS idx_waf_site_overrides_site ON kppn_waf_site_overrides (site_id);

CREATE TABLE IF NOT EXISTS kppn_waf_site_plugins (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL REFERENCES kppn_sites(id) ON DELETE CASCADE,
    plugin  TEXT    NOT NULL,
    created DATETIME NOT NULL DEFAULT (datetime('now')),
    UNIQUE (site_id, plugin)
);

CREATE INDEX IF NOT EXISTS idx_waf_site_plugins_site ON kppn_waf_site_plugins (site_id);

CREATE TABLE IF NOT EXISTS kppn_rp_routes (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id  INTEGER NOT NULL REFERENCES kppn_sites(id) ON DELETE CASCADE,
    domain   TEXT    NOT NULL,
    upstream TEXT    NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rp_routes_site ON kppn_rp_routes (site_id);

CREATE TABLE IF NOT EXISTS kppn_site_crons (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id     INTEGER NOT NULL REFERENCES kppn_sites(id) ON DELETE CASCADE,
    label       TEXT    NOT NULL DEFAULT '',
    command     TEXT    NOT NULL,
    schedule    TEXT    NOT NULL,
    enabled     INTEGER NOT NULL DEFAULT 1,
    last_run    DATETIME,
    last_output TEXT    NOT NULL DEFAULT '',
    last_error  TEXT    NOT NULL DEFAULT '',
    created     DATETIME NOT NULL DEFAULT (datetime('now')),
    updated     DATETIME
);

CREATE INDEX IF NOT EXISTS idx_site_crons_site    ON kppn_site_crons (site_id);
CREATE INDEX IF NOT EXISTS idx_site_crons_enabled ON kppn_site_crons (enabled);

CREATE TABLE IF NOT EXISTS kppn_redirects (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id    INTEGER NOT NULL REFERENCES kppn_sites(id) ON DELETE CASCADE,
    source     TEXT    NOT NULL,
    target     TEXT    NOT NULL,
    code       INTEGER NOT NULL DEFAULT 301,
    position   INTEGER NOT NULL DEFAULT 0,
    created    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated    DATETIME
);

CREATE INDEX IF NOT EXISTS idx_redirects_site ON kppn_redirects (site_id);

CREATE TABLE IF NOT EXISTS kppn_audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ts          DATETIME NOT NULL DEFAULT (datetime('now')),
    uid         INTEGER,
    username    TEXT     NOT NULL DEFAULT '',
    ip          TEXT     NOT NULL DEFAULT '',
    ua          TEXT     NOT NULL DEFAULT '',
    method      TEXT     NOT NULL DEFAULT '',
    action      TEXT     NOT NULL DEFAULT '',
    target_type TEXT     NOT NULL DEFAULT '',
    target_id   TEXT     NOT NULL DEFAULT '',
    status      INTEGER  NOT NULL DEFAULT 0,
    details     TEXT     NOT NULL DEFAULT '',
    prior_state TEXT     NOT NULL DEFAULT '',
    new_state   TEXT     NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_audit_log_ts     ON kppn_audit_log (ts);
CREATE INDEX IF NOT EXISTS idx_audit_log_uid    ON kppn_audit_log (uid);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON kppn_audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON kppn_audit_log (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_status ON kppn_audit_log (status);

CREATE TABLE IF NOT EXISTS kppn_basic_auth (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id  INTEGER NOT NULL UNIQUE REFERENCES kppn_sites(id) ON DELETE CASCADE,
    enabled  INTEGER NOT NULL DEFAULT 0,
    realm    TEXT    NOT NULL DEFAULT 'Restricted',
    created  DATETIME NOT NULL DEFAULT (datetime('now')),
    updated  DATETIME
);

CREATE INDEX IF NOT EXISTS idx_basic_auth_site ON kppn_basic_auth (site_id);

CREATE TABLE IF NOT EXISTS kppn_basic_auth_users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id       INTEGER NOT NULL REFERENCES kppn_sites(id) ON DELETE CASCADE,
    username      TEXT    NOT NULL,
    password_hash TEXT    NOT NULL,
    created       DATETIME NOT NULL DEFAULT (datetime('now')),
    updated       DATETIME,
    UNIQUE (site_id, username)
);

CREATE INDEX IF NOT EXISTS idx_basic_auth_users_site ON kppn_basic_auth_users (site_id);
`
