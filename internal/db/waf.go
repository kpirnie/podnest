package db

import (
	"database/sql"
	"time"

	"podnest/internal/logger"
)

// WAFMode constants — detection logs only, prevention blocks matching requests
const (
	WAFModeDetect  = 0
	WAFModePrevent = 1
)

// WAFOverride constants — per-site WAF behaviour relative to the global setting
const (
	WAFOverrideInherit = 0 // use global enabled/disabled state
	WAFOverrideOn      = 1 // force WAF on for this site regardless of global
	WAFOverrideOff     = 2 // force WAF off for this site regardless of global
)

// WAFSettings holds the global WAF configuration
type WAFSettings struct {
	Enabled       bool
	Mode          int // WAFModeDetect or WAFModePrevent
	ParanoiaLevel int // 1–4 (OWASP CRS paranoia level)
	AuditLog      bool
	Exclusions    string // newline-separated rule IDs or tags
}

// WAFSiteOverride holds the per-site WAF override settings
type WAFSiteOverride struct {
	SiteID     int64
	Override   int    // WAFOverrideInherit, WAFOverrideOn, or WAFOverrideOff
	Exclusions string // newline-separated rule IDs or tags
}

// GetWAFSettings returns the global WAF settings, or safe defaults if not yet persisted
func GetWAFSettings(db *sql.DB) (WAFSettings, error) {
	var s WAFSettings
	var enabled, auditLog, mode, pl int

	err := db.QueryRow(`
		SELECT enabled, mode, paranoia_level, audit_log, exclusions
		FROM kppn_waf_settings WHERE id = 1`).Scan(&enabled, &mode, &pl, &auditLog, &s.Exclusions)
	if err == sql.ErrNoRows {
		// safe defaults — WAF disabled, detect mode, paranoia level 1
		return WAFSettings{ParanoiaLevel: 1}, nil
	}
	if err != nil {
		logger.Error("GetWAFSettings: %v", err)
		return s, err
	}

	s.Enabled = enabled == 1
	s.Mode = mode
	s.ParanoiaLevel = pl
	s.AuditLog = auditLog == 1
	logger.Debug("GetWAFSettings: loaded (enabled=%v mode=%d pl=%d)", s.Enabled, s.Mode, s.ParanoiaLevel)
	return s, nil
}

// SaveWAFSettings upserts the global WAF configuration
func SaveWAFSettings(db *sql.DB, s WAFSettings) error {
	enabled, auditLog := 0, 0
	if s.Enabled {
		enabled = 1
	}
	if s.AuditLog {
		auditLog = 1
	}

	_, err := db.Exec(`
		INSERT INTO kppn_waf_settings (id, enabled, mode, paranoia_level, audit_log, exclusions, updated)
		VALUES (1, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (id) DO UPDATE SET
			enabled        = excluded.enabled,
			mode           = excluded.mode,
			paranoia_level = excluded.paranoia_level,
			audit_log      = excluded.audit_log,
			exclusions     = excluded.exclusions,
			updated        = excluded.updated`,
		enabled, s.Mode, s.ParanoiaLevel, auditLog, s.Exclusions, time.Now().UTC(),
	)
	if err != nil {
		logger.Error("SaveWAFSettings: %v", err)
		return err
	}

	logger.Debug("SaveWAFSettings: saved (enabled=%v mode=%d pl=%d)", s.Enabled, s.Mode, s.ParanoiaLevel)
	return nil
}

// GetWAFSiteOverride returns the WAF override for a specific site.
// Returns a default inherit-global override if no row exists.
func GetWAFSiteOverride(db *sql.DB, siteID int64) (WAFSiteOverride, error) {
	o := WAFSiteOverride{SiteID: siteID}

	err := db.QueryRow(`
		SELECT override, exclusions FROM kppn_waf_site_overrides WHERE site_id = ?`, siteID,
	).Scan(&o.Override, &o.Exclusions)
	if err == sql.ErrNoRows {
		return o, nil
	}
	if err != nil {
		logger.Error("GetWAFSiteOverride: siteID=%d %v", siteID, err)
		return o, err
	}

	logger.Debug("GetWAFSiteOverride: siteID=%d override=%d", siteID, o.Override)
	return o, nil
}

// SaveWAFSiteOverride upserts the WAF override for a specific site
func SaveWAFSiteOverride(db *sql.DB, o WAFSiteOverride) error {
	_, err := db.Exec(`
		INSERT INTO kppn_waf_site_overrides (site_id, override, exclusions, updated)
		VALUES (?, ?, ?, ?)
		ON CONFLICT (site_id) DO UPDATE SET
			override   = excluded.override,
			exclusions = excluded.exclusions,
			updated    = excluded.updated`,
		o.SiteID, o.Override, o.Exclusions, time.Now().UTC(),
	)
	if err != nil {
		logger.Error("SaveWAFSiteOverride: siteID=%d %v", o.SiteID, err)
		return err
	}

	logger.Debug("SaveWAFSiteOverride: siteID=%d saved (override=%d)", o.SiteID, o.Override)
	return nil
}

// GetAllWAFSiteOverrides returns all per-site WAF overrides — used to warm the proxy WAF cache
func GetAllWAFSiteOverrides(db *sql.DB) ([]WAFSiteOverride, error) {
	rows, err := db.Query(`SELECT site_id, override, exclusions FROM kppn_waf_site_overrides`)
	if err != nil {
		logger.Error("GetAllWAFSiteOverrides: %v", err)
		return nil, err
	}
	defer rows.Close()

	var out []WAFSiteOverride
	for rows.Next() {
		var o WAFSiteOverride
		if err := rows.Scan(&o.SiteID, &o.Override, &o.Exclusions); err != nil {
			logger.Error("GetAllWAFSiteOverrides: scan: %v", err)
			return nil, err
		}
		out = append(out, o)
	}

	logger.Debug("GetAllWAFSiteOverrides: loaded %d overrides", len(out))
	return out, rows.Err()
}

// GetSitePlugins returns the list of enabled plugin filenames for a site
func GetSitePlugins(db *sql.DB, siteID int64) ([]string, error) {
	rows, err := db.Query(`SELECT plugin FROM kppn_waf_site_plugins WHERE site_id = ? ORDER BY plugin`, siteID)
	if err != nil {
		logger.Error("GetSitePlugins: siteID=%d %v", siteID, err)
		return nil, err
	}
	defer rows.Close()

	var out []string
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			logger.Error("GetSitePlugins: scan: siteID=%d %v", siteID, err)
			return nil, err
		}
		out = append(out, p)
	}

	logger.Debug("GetSitePlugins: siteID=%d loaded %d plugins", siteID, len(out))
	return out, rows.Err()
}

// SetSitePlugins replaces the full plugin selection for a site atomically
func SetSitePlugins(db *sql.DB, siteID int64, plugins []string) error {
	tx, err := db.Begin()
	if err != nil {
		logger.Error("SetSitePlugins: begin: siteID=%d %v", siteID, err)
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`DELETE FROM kppn_waf_site_plugins WHERE site_id = ?`, siteID); err != nil {
		logger.Error("SetSitePlugins: delete: siteID=%d %v", siteID, err)
		return err
	}

	for _, p := range plugins {
		if _, err := tx.Exec(
			`INSERT INTO kppn_waf_site_plugins (site_id, plugin) VALUES (?, ?)`, siteID, p,
		); err != nil {
			logger.Error("SetSitePlugins: insert: siteID=%d plugin=%s %v", siteID, p, err)
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		logger.Error("SetSitePlugins: commit: siteID=%d %v", siteID, err)
		return err
	}

	logger.Debug("SetSitePlugins: siteID=%d saved %d plugins", siteID, len(plugins))
	return nil
}

// GetAllSitePlugins returns a map of siteID → plugin filenames for all sites
// that have at least one plugin enabled — used to warm the proxy WAF cache
func GetAllSitePlugins(db *sql.DB) (map[int64][]string, error) {
	rows, err := db.Query(`SELECT site_id, plugin FROM kppn_waf_site_plugins ORDER BY site_id, plugin`)
	if err != nil {
		logger.Error("GetAllSitePlugins: %v", err)
		return nil, err
	}
	defer rows.Close()

	out := make(map[int64][]string)
	for rows.Next() {
		var siteID int64
		var p string
		if err := rows.Scan(&siteID, &p); err != nil {
			logger.Error("GetAllSitePlugins: scan: %v", err)
			return nil, err
		}
		out[siteID] = append(out[siteID], p)
	}

	logger.Debug("GetAllSitePlugins: loaded plugins for %d sites", len(out))
	return out, rows.Err()
}
