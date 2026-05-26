package crons

import (
	"database/sql"

	"podnest/internal/logger"
)

// deleteCronData removes all cron jobs for a site.
func deleteCronData(database *sql.DB, siteID int64) error {
	if _, err := database.Exec(`DELETE FROM kppn_site_crons WHERE site_id = ?`, siteID); err != nil {
		logger.Error("deleteCronData: siteID=%d %v", siteID, err)
		return err
	}
	logger.Debug("deleteCronData: siteID=%d cleaned up", siteID)
	return nil
}
