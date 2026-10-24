// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package db

import (
	"database/sql"
	"encoding/json"
	"time"

	"podnest/internal/logger"
	"podnest/internal/models"
)

// GetWPUpdateStatus returns the cached update status for a site, or nil if
// the site has never been checked
func GetWPUpdateStatus(db *sql.DB, siteID int64) (*models.WPUpdateStatus, error) {
	s := &models.WPUpdateStatus{SiteID: siteID}
	var plugins, themes string
	err := db.QueryRow(`
		SELECT core_version, core_update, plugins, themes, error, checked
		FROM kppn_wp_updates WHERE site_id = ?`, siteID,
	).Scan(&s.CoreVersion, &s.CoreUpdate, &plugins, &themes, &s.Error, &s.Checked)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		logger.Error("GetWPUpdateStatus: site %d: %v", siteID, err)
		return nil, err
	}

	if err := json.Unmarshal([]byte(plugins), &s.Plugins); err != nil {
		logger.Error("GetWPUpdateStatus: site %d: bad plugins json: %v", siteID, err)
		return nil, err
	}
	if err := json.Unmarshal([]byte(themes), &s.Themes); err != nil {
		logger.Error("GetWPUpdateStatus: site %d: bad themes json: %v", siteID, err)
		return nil, err
	}

	return s, nil
}

// SaveWPUpdateStatus upserts the cached update status for a site and stamps
// the check time
func SaveWPUpdateStatus(db *sql.DB, s *models.WPUpdateStatus) error {
	if s.Plugins == nil {
		s.Plugins = []*models.WPUpdateItem{}
	}
	if s.Themes == nil {
		s.Themes = []*models.WPUpdateItem{}
	}
	plugins, err := json.Marshal(s.Plugins)
	if err != nil {
		logger.Error("SaveWPUpdateStatus: site %d: marshal plugins: %v", s.SiteID, err)
		return err
	}
	themes, err := json.Marshal(s.Themes)
	if err != nil {
		logger.Error("SaveWPUpdateStatus: site %d: marshal themes: %v", s.SiteID, err)
		return err
	}

	now := time.Now().UTC()
	if _, err := db.Exec(`
		INSERT INTO kppn_wp_updates
			(site_id, core_version, core_update, plugins, themes, error, checked)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (site_id) DO UPDATE SET
			core_version = excluded.core_version,
			core_update  = excluded.core_update,
			plugins      = excluded.plugins,
			themes       = excluded.themes,
			error        = excluded.error,
			checked      = excluded.checked`,
		s.SiteID, s.CoreVersion, s.CoreUpdate, string(plugins), string(themes), s.Error, now,
	); err != nil {
		logger.Error("SaveWPUpdateStatus: site %d: %v", s.SiteID, err)
		return err
	}
	s.Checked = &now

	logger.Debug("SaveWPUpdateStatus: saved update status for site %d", s.SiteID)
	return nil
}

// GetWPSSOUser returns the WordPress user ID selected for wp-admin SSO on a
// site; 0 means none selected, so the site falls back to its first administrator
func GetWPSSOUser(db *sql.DB, siteID int64) (int64, error) {
	var uid int64
	err := db.QueryRow(`SELECT wp_user_id FROM kppn_wp_sso WHERE site_id = ?`, siteID).Scan(&uid)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	if err != nil {
		logger.Error("GetWPSSOUser: site %d: %v", siteID, err)
		return 0, err
	}
	return uid, nil
}

// SetWPSSOUser stores the WordPress user ID used for wp-admin SSO on a site;
// 0 clears the selection
func SetWPSSOUser(db *sql.DB, siteID, wpUserID int64) error {
	if _, err := db.Exec(`
		INSERT INTO kppn_wp_sso (site_id, wp_user_id, updated)
		VALUES (?, ?, ?)
		ON CONFLICT (site_id) DO UPDATE SET
			wp_user_id = excluded.wp_user_id,
			updated    = excluded.updated`,
		siteID, wpUserID, time.Now().UTC(),
	); err != nil {
		logger.Error("SetWPSSOUser: site %d: %v", siteID, err)
		return err
	}

	logger.Debug("SetWPSSOUser: site %d set to wp user %d", siteID, wpUserID)
	return nil
}
