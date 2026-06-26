// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package basicauth

import (
	"database/sql"

	"podnest/internal/logger"
)

// deleteBasicAuthBySite removes all basic auth data for a site.
// Thin wrapper so module.go does not import db directly.
func deleteBasicAuthBySite(database *sql.DB, siteID int64) error {
	if _, err := database.Exec(`DELETE FROM kppn_basic_auth_users WHERE site_id = ?`, siteID); err != nil {
		logger.Error("deleteBasicAuthBySite: users siteID=%d: %v", siteID, err)
		return err
	}
	if _, err := database.Exec(`DELETE FROM kppn_basic_auth WHERE site_id = ?`, siteID); err != nil {
		logger.Error("deleteBasicAuthBySite: config siteID=%d: %v", siteID, err)
		return err
	}
	logger.Debug("deleteBasicAuthBySite: siteID=%d cleaned up", siteID)
	return nil
}
