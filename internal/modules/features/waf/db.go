package waf

import (
	"database/sql"

	"podnest/internal/logger"
)

// deleteSiteWAFData removes all WAF overrides and plugin selections for a site.
func deleteSiteWAFData(db *sql.DB, siteID int64) error {
	if _, err := db.Exec(`DELETE FROM kppn_waf_site_overrides WHERE site_id = ?`, siteID); err != nil {
		logger.Error("deleteSiteWAFData: overrides siteID=%d %v", siteID, err)
		return err
	}
	if _, err := db.Exec(`DELETE FROM kppn_waf_site_plugins WHERE site_id = ?`, siteID); err != nil {
		logger.Error("deleteSiteWAFData: plugins siteID=%d %v", siteID, err)
		return err
	}
	logger.Debug("deleteSiteWAFData: siteID=%d cleaned up", siteID)
	return nil
}
