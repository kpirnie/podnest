// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package backups

import (
	"database/sql"

	"podnest/internal/logger"
)

// deleteBackupData removes all backup records and the repo entry for a site.
func deleteBackupData(database *sql.DB, siteID int64) error {
	if _, err := database.Exec(`DELETE FROM kppn_backups WHERE site_id = ?`, siteID); err != nil {
		logger.Error("deleteBackupData: backups siteID=%d %v", siteID, err)
		return err
	}
	if _, err := database.Exec(`DELETE FROM kppn_backup_repos WHERE site_id = ?`, siteID); err != nil {
		logger.Error("deleteBackupData: repo siteID=%d %v", siteID, err)
		return err
	}
	logger.Debug("deleteBackupData: siteID=%d cleaned up", siteID)
	return nil
}
