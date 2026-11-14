// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package db

import (
	"database/sql"
	"podnest/internal/logger"
)

// GetSiteManagerIDs returns the IDs of the managers assigned to a site, excluding the owner
func GetSiteManagerIDs(db *sql.DB, siteID int64) ([]int64, error) {

	// query the assigned manager IDs for the site
	rows, err := db.Query(`
		SELECT uid FROM kppn_site_managers WHERE site_id = ? ORDER BY uid ASC`, siteID,
	)
	if err != nil {
		logger.Error("GetSiteManagerIDs: failed to query managers for site ID %d: %v", siteID, err)
		return nil, err
	}
	defer rows.Close()

	// scan each manager ID into the result slice
	ids := []int64{}
	for rows.Next() {
		var uid int64
		if err := rows.Scan(&uid); err != nil {
			logger.Error("GetSiteManagerIDs: failed to scan manager for site ID %d: %v", siteID, err)
			return nil, err
		}
		ids = append(ids, uid)
	}

	// return the manager IDs along with any error hit while iterating
	logger.Debug("GetSiteManagerIDs: retrieved %d managers for site ID %d", len(ids), siteID)
	return ids, rows.Err()
}

// GetManagerSiteIDs returns the IDs of the sites a user is assigned to, excluding sites they own
func GetManagerSiteIDs(db *sql.DB, uid int64) ([]int64, error) {

	// query the assigned site IDs for the user
	rows, err := db.Query(`
		SELECT site_id FROM kppn_site_managers WHERE uid = ? ORDER BY site_id ASC`, uid,
	)
	if err != nil {
		logger.Error("GetManagerSiteIDs: failed to query sites for user ID %d: %v", uid, err)
		return nil, err
	}
	defer rows.Close()

	// scan each site ID into the result slice
	ids := []int64{}
	for rows.Next() {
		var siteID int64
		if err := rows.Scan(&siteID); err != nil {
			logger.Error("GetManagerSiteIDs: failed to scan site for user ID %d: %v", uid, err)
			return nil, err
		}
		ids = append(ids, siteID)
	}

	// return the site IDs along with any error hit while iterating
	logger.Debug("GetManagerSiteIDs: retrieved %d sites for user ID %d", len(ids), uid)
	return ids, rows.Err()
}

// SetSiteManagers replaces the full set of managers assigned to a site in a single transaction
func SetSiteManagers(db *sql.DB, siteID int64, uids []int64) error {

	// open a transaction so the replace is atomic and a failure can't leave the site with no managers
	tx, err := db.Begin()
	if err != nil {
		logger.Error("SetSiteManagers: failed to begin transaction for site ID %d: %v", siteID, err)
		return err
	}
	defer tx.Rollback()

	// clear the existing assignments for the site
	if _, err := tx.Exec(`DELETE FROM kppn_site_managers WHERE site_id = ?`, siteID); err != nil {
		logger.Error("SetSiteManagers: failed to clear managers for site ID %d: %v", siteID, err)
		return err
	}

	// insert each of the new assignments
	for _, uid := range uids {
		if _, err := tx.Exec(`
			INSERT INTO kppn_site_managers (site_id, uid) VALUES (?, ?)`, siteID, uid,
		); err != nil {
			logger.Error("SetSiteManagers: failed to assign user ID %d to site ID %d: %v", uid, siteID, err)
			return err
		}
	}

	// commit the transaction and log the new manager count for debugging purposes
	if err := tx.Commit(); err != nil {
		logger.Error("SetSiteManagers: failed to commit managers for site ID %d: %v", siteID, err)
		return err
	}
	logger.Debug("SetSiteManagers: set %d managers for site ID %d", len(uids), siteID)
	return nil
}

// GetAllSiteManagers returns every site's assigned manager IDs keyed by site ID
func GetAllSiteManagers(db *sql.DB) (map[int64][]int64, error) {

	// query every assignment in one pass
	rows, err := db.Query(`SELECT site_id, uid FROM kppn_site_managers`)
	if err != nil {
		logger.Error("GetAllSiteManagers: failed to query site managers: %v", err)
		return nil, err
	}
	defer rows.Close()

	// group the manager IDs by site ID
	out := make(map[int64][]int64)
	for rows.Next() {
		var siteID, uid int64
		if err := rows.Scan(&siteID, &uid); err != nil {
			logger.Error("GetAllSiteManagers: failed to scan site manager: %v", err)
			return nil, err
		}
		out[siteID] = append(out[siteID], uid)
	}

	// return the grouped assignments along with any error hit while iterating
	logger.Debug("GetAllSiteManagers: retrieved managers for %d sites", len(out))
	return out, rows.Err()
}
