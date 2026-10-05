// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package db

import (
	"database/sql"
	"time"

	"podnest/internal/logger"
)

// AutoBanSettings holds the global auto-ban configuration. Qualifying 4xx/5xx
// hits are counted per IP; crossing Threshold within WindowSecs puts the IP in
// a 429 cooldown, crossing it again during the cooldown converts it to a ban.
type AutoBanSettings struct {
	Threshold      int // qualifying hits within WindowSecs that trip the limit
	WindowSecs     int // span the hits are counted over
	CooldownSecs   int // how long the 429 cooldown lasts
	BanSecs        int // how long a ban lasts
	PermStrikes    int // bans within PermWindowSecs that make the ban permanent
	PermWindowSecs int // span the strikes are counted over
	EscalateSites  int // distinct sites an IP must be banned on before it is banned globally
}

// AutoBanSiteOverride holds a site's auto-ban settings. A nil value inherits
// the global setting; Enabled false switches auto-ban off for the site.
type AutoBanSiteOverride struct {
	SiteID         int64
	Enabled        bool
	Threshold      *int
	WindowSecs     *int
	CooldownSecs   *int
	BanSecs        *int
	PermStrikes    *int
	PermWindowSecs *int
}

// AutoBan is a single auto-ban entry. SiteID is nil for a global ban and
// Expires is nil for a permanent one.
type AutoBan struct {
	ID           int64
	SiteID       *int64
	IP           string
	Hits         int
	Strikes      int
	StrikesSince time.Time
	Expires      *time.Time
	Created      time.Time
}

// DefaultAutoBanSettings returns the settings used until the global row is saved
func DefaultAutoBanSettings() AutoBanSettings {
	return AutoBanSettings{
		Threshold:      25,
		WindowSecs:     60,
		CooldownSecs:   1800,
		BanSecs:        3600,
		PermStrikes:    10,
		PermWindowSecs: 86400,
		EscalateSites:  2,
	}
}

// GetAutoBanSettings returns the global auto-ban settings, or the defaults if not yet persisted
func GetAutoBanSettings(db *sql.DB) (AutoBanSettings, error) {
	var s AutoBanSettings

	err := db.QueryRow(`
		SELECT threshold, window_secs, cooldown_secs, ban_secs, perm_strikes, perm_window_secs, escalate_sites
		FROM kppn_autoban_settings WHERE id = 1`,
	).Scan(&s.Threshold, &s.WindowSecs, &s.CooldownSecs, &s.BanSecs, &s.PermStrikes, &s.PermWindowSecs, &s.EscalateSites)
	if err == sql.ErrNoRows {
		return DefaultAutoBanSettings(), nil
	}
	if err != nil {
		logger.Error("GetAutoBanSettings: %v", err)
		return s, err
	}

	logger.Debug("GetAutoBanSettings: loaded (threshold=%d window=%ds)", s.Threshold, s.WindowSecs)
	return s, nil
}

// SaveAutoBanSettings upserts the global auto-ban configuration
func SaveAutoBanSettings(db *sql.DB, s AutoBanSettings) error {
	_, err := db.Exec(`
		INSERT INTO kppn_autoban_settings (id, threshold, window_secs, cooldown_secs, ban_secs, perm_strikes, perm_window_secs, escalate_sites, updated)
		VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (id) DO UPDATE SET
			threshold        = excluded.threshold,
			window_secs      = excluded.window_secs,
			cooldown_secs    = excluded.cooldown_secs,
			ban_secs         = excluded.ban_secs,
			perm_strikes     = excluded.perm_strikes,
			perm_window_secs = excluded.perm_window_secs,
			escalate_sites   = excluded.escalate_sites,
			updated          = excluded.updated`,
		s.Threshold, s.WindowSecs, s.CooldownSecs, s.BanSecs, s.PermStrikes, s.PermWindowSecs, s.EscalateSites, time.Now().UTC(),
	)
	if err != nil {
		logger.Error("SaveAutoBanSettings: %v", err)
		return err
	}

	logger.Debug("SaveAutoBanSettings: saved (threshold=%d window=%ds)", s.Threshold, s.WindowSecs)
	return nil
}

// scanAutoBanSiteOverride scans one override row into o, mapping NULL columns to nil
func scanAutoBanSiteOverride(scan func(...any) error, o *AutoBanSiteOverride) error {
	var enabled int
	var threshold, window, cooldown, ban, strikes, strikeWindow sql.NullInt64

	if err := scan(&o.SiteID, &enabled, &threshold, &window, &cooldown, &ban, &strikes, &strikeWindow); err != nil {
		return err
	}

	o.Enabled = enabled == 1
	o.Threshold = nullIntPtr(threshold)
	o.WindowSecs = nullIntPtr(window)
	o.CooldownSecs = nullIntPtr(cooldown)
	o.BanSecs = nullIntPtr(ban)
	o.PermStrikes = nullIntPtr(strikes)
	o.PermWindowSecs = nullIntPtr(strikeWindow)
	return nil
}

// nullIntPtr converts a nullable integer column to *int
func nullIntPtr(n sql.NullInt64) *int {
	if !n.Valid {
		return nil
	}
	v := int(n.Int64)
	return &v
}

// GetAutoBanSiteOverride returns the auto-ban override for a site.
// Returns an enabled, inherit-everything override if no row exists.
func GetAutoBanSiteOverride(db *sql.DB, siteID int64) (AutoBanSiteOverride, error) {
	o := AutoBanSiteOverride{SiteID: siteID, Enabled: true}

	err := scanAutoBanSiteOverride(db.QueryRow(`
		SELECT site_id, enabled, threshold, window_secs, cooldown_secs, ban_secs, perm_strikes, perm_window_secs
		FROM kppn_autoban_site_overrides WHERE site_id = ?`, siteID,
	).Scan, &o)
	if err == sql.ErrNoRows {
		return AutoBanSiteOverride{SiteID: siteID, Enabled: true}, nil
	}
	if err != nil {
		logger.Error("GetAutoBanSiteOverride: siteID=%d %v", siteID, err)
		return o, err
	}

	logger.Debug("GetAutoBanSiteOverride: siteID=%d enabled=%v", siteID, o.Enabled)
	return o, nil
}

// SaveAutoBanSiteOverride upserts the auto-ban override for a site
func SaveAutoBanSiteOverride(db *sql.DB, o AutoBanSiteOverride) error {
	enabled := 0
	if o.Enabled {
		enabled = 1
	}

	_, err := db.Exec(`
		INSERT INTO kppn_autoban_site_overrides (site_id, enabled, threshold, window_secs, cooldown_secs, ban_secs, perm_strikes, perm_window_secs, updated)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (site_id) DO UPDATE SET
			enabled          = excluded.enabled,
			threshold        = excluded.threshold,
			window_secs      = excluded.window_secs,
			cooldown_secs    = excluded.cooldown_secs,
			ban_secs         = excluded.ban_secs,
			perm_strikes     = excluded.perm_strikes,
			perm_window_secs = excluded.perm_window_secs,
			updated          = excluded.updated`,
		o.SiteID, enabled, o.Threshold, o.WindowSecs, o.CooldownSecs, o.BanSecs, o.PermStrikes, o.PermWindowSecs, time.Now().UTC(),
	)
	if err != nil {
		logger.Error("SaveAutoBanSiteOverride: siteID=%d %v", o.SiteID, err)
		return err
	}

	logger.Debug("SaveAutoBanSiteOverride: siteID=%d saved (enabled=%v)", o.SiteID, o.Enabled)
	return nil
}

// GetAllAutoBanSiteOverrides returns every per-site auto-ban override — used to warm the proxy cache
func GetAllAutoBanSiteOverrides(db *sql.DB) ([]AutoBanSiteOverride, error) {
	rows, err := db.Query(`
		SELECT site_id, enabled, threshold, window_secs, cooldown_secs, ban_secs, perm_strikes, perm_window_secs
		FROM kppn_autoban_site_overrides`)
	if err != nil {
		logger.Error("GetAllAutoBanSiteOverrides: query failed: %v", err)
		return nil, err
	}
	defer rows.Close()

	var out []AutoBanSiteOverride
	for rows.Next() {
		var o AutoBanSiteOverride
		if err := scanAutoBanSiteOverride(rows.Scan, &o); err != nil {
			logger.Error("GetAllAutoBanSiteOverrides: scan failed: %v", err)
			return nil, err
		}
		out = append(out, o)
	}

	logger.Debug("GetAllAutoBanSiteOverrides: retrieved %d overrides", len(out))
	return out, rows.Err()
}

// scanAutoBans scans auto-ban rows, mapping a NULL expiry to a permanent ban
func scanAutoBans(rows *sql.Rows) ([]*AutoBan, error) {
	var out []*AutoBan
	for rows.Next() {
		b := &AutoBan{}
		var expires sql.NullTime
		if err := rows.Scan(&b.ID, &b.SiteID, &b.IP, &b.Hits, &b.Strikes, &b.StrikesSince, &expires, &b.Created); err != nil {
			return nil, err
		}
		if expires.Valid {
			t := expires.Time
			b.Expires = &t
		}
		out = append(out, b)
	}
	return out, rows.Err()
}

// GetAutoBans returns the active (unexpired or permanent) bans for a scope.
// Pass nil for siteID to retrieve global bans only.
func GetAutoBans(db *sql.DB, siteID *int64) ([]*AutoBan, error) {
	rows, err := db.Query(`
		SELECT id, site_id, ip, hits, strikes, strikes_since, expires, created
		FROM kppn_auto_bans
		WHERE site_id IS ? AND (expires IS NULL OR expires > ?)
		ORDER BY created DESC`, siteID, time.Now().UTC(),
	)
	if err != nil {
		logger.Error("GetAutoBans: query failed: %v", err)
		return nil, err
	}
	defer rows.Close()

	bans, err := scanAutoBans(rows)
	if err != nil {
		logger.Error("GetAutoBans: scan failed: %v", err)
		return nil, err
	}

	logger.Debug("GetAutoBans: retrieved %d bans for siteID=%v", len(bans), siteID)
	return bans, nil
}

// GetAllAutoBans returns every auto-ban row across all scopes, expired ones
// included so strike history survives a restart — used to warm the proxy cache
func GetAllAutoBans(db *sql.DB) ([]*AutoBan, error) {
	rows, err := db.Query(`
		SELECT id, site_id, ip, hits, strikes, strikes_since, expires, created
		FROM kppn_auto_bans`)
	if err != nil {
		logger.Error("GetAllAutoBans: query failed: %v", err)
		return nil, err
	}
	defer rows.Close()

	bans, err := scanAutoBans(rows)
	if err != nil {
		logger.Error("GetAllAutoBans: scan failed: %v", err)
		return nil, err
	}

	logger.Debug("GetAllAutoBans: retrieved %d bans", len(bans))
	return bans, nil
}

// GetAutoBan returns a single ban by ID, constrained to its scope so a site
// owner cannot reach another site's or the global list
func GetAutoBan(db *sql.DB, siteID *int64, id int64) (*AutoBan, error) {
	rows, err := db.Query(`
		SELECT id, site_id, ip, hits, strikes, strikes_since, expires, created
		FROM kppn_auto_bans WHERE id = ? AND site_id IS ?`, id, siteID,
	)
	if err != nil {
		logger.Error("GetAutoBan: query failed: %v", err)
		return nil, err
	}
	defer rows.Close()

	bans, err := scanAutoBans(rows)
	if err != nil {
		logger.Error("GetAutoBan: scan failed: %v", err)
		return nil, err
	}
	if len(bans) == 0 {
		return nil, sql.ErrNoRows
	}
	return bans[0], nil
}

// SaveAutoBan records a ban for its scope and IP, updating the existing row
// when one exists so strike history carries over between bans
func SaveAutoBan(db *sql.DB, b *AutoBan) error {
	tx, err := db.Begin()
	if err != nil {
		logger.Error("SaveAutoBan: begin tx failed: %v", err)
		return err
	}
	defer tx.Rollback()

	res, err := tx.Exec(`
		UPDATE kppn_auto_bans
		SET hits = ?, strikes = ?, strikes_since = ?, expires = ?
		WHERE site_id IS ? AND ip = ?`,
		b.Hits, b.Strikes, b.StrikesSince, b.Expires, b.SiteID, b.IP,
	)
	if err != nil {
		logger.Error("SaveAutoBan: update failed: %v", err)
		return err
	}

	// no existing row for this scope and IP — insert a fresh one
	if n, _ := res.RowsAffected(); n == 0 {
		if _, err := tx.Exec(`
			INSERT INTO kppn_auto_bans (site_id, ip, hits, strikes, strikes_since, expires)
			VALUES (?, ?, ?, ?, ?, ?)`,
			b.SiteID, b.IP, b.Hits, b.Strikes, b.StrikesSince, b.Expires,
		); err != nil {
			logger.Error("SaveAutoBan: insert failed: %v", err)
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		logger.Error("SaveAutoBan: commit failed: %v", err)
		return err
	}

	logger.Debug("SaveAutoBan: saved %s for siteID=%v (strikes=%d)", b.IP, b.SiteID, b.Strikes)
	return nil
}

// SetAutoBanPermanent clears a ban's expiry within its scope, making it permanent
func SetAutoBanPermanent(db *sql.DB, siteID *int64, id int64) error {
	if _, err := db.Exec(`
		UPDATE kppn_auto_bans SET expires = NULL WHERE id = ? AND site_id IS ?`, id, siteID,
	); err != nil {
		logger.Error("SetAutoBanPermanent: id=%d %v", id, err)
		return err
	}

	logger.Debug("SetAutoBanPermanent: id=%d siteID=%v", id, siteID)
	return nil
}

// DeleteAutoBan removes a ban within its scope, clearing its strike history too
func DeleteAutoBan(db *sql.DB, siteID *int64, id int64) error {
	if _, err := db.Exec(`
		DELETE FROM kppn_auto_bans WHERE id = ? AND site_id IS ?`, id, siteID,
	); err != nil {
		logger.Error("DeleteAutoBan: id=%d %v", id, err)
		return err
	}

	logger.Debug("DeleteAutoBan: id=%d siteID=%v", id, siteID)
	return nil
}

// PruneAutoBans removes non-permanent bans that expired before cutoff. The
// caller passes a cutoff past the strike window so strike history is kept.
func PruneAutoBans(db *sql.DB, cutoff time.Time) (int64, error) {
	res, err := db.Exec(`
		DELETE FROM kppn_auto_bans WHERE expires IS NOT NULL AND expires < ?`, cutoff.UTC(),
	)
	if err != nil {
		logger.Error("PruneAutoBans: %v", err)
		return 0, err
	}

	n, _ := res.RowsAffected()
	logger.Debug("PruneAutoBans: removed %d expired bans", n)
	return n, nil
}
