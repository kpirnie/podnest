package db

import (
	"database/sql"
	"fmt"
	"time"

	"podnest/internal/logger"
	"podnest/internal/models"
)

// siteColumns is the canonical SELECT column list for all site queries
const siteColumns = `
	id, uid, name, port, php_version, site_status, site_type, runtime_version,
	start_command, pma_port, created, updated`

// scanSite returns a slice of pointers into s matching siteColumns order
func scanSite(s *models.Site) []any {

	// Note: the order of these must match siteColumns exactly
	// returning a slice of pointers allows us to reuse the same scanSite helper for all site queries
	return []any{
		&s.ID, &s.UID, &s.Name, &s.Port,
		&s.PHPVersion, &s.SiteStatus, &s.SiteType, &s.RuntimeVersion,
		&s.StartCommand, &s.PMAPort,
		&s.Created, &s.Updated,
	}
}

// CreateSite inserts a new site record
func CreateSite(db *sql.DB, s *models.Site) error {

	// create the site record — the ID is needed for domain and config records, so we create the site first and cascade deletes to the related tables
	res, err := db.Exec(`
		INSERT INTO kppn_sites
			(uid, name, port, php_version, site_status, site_type, runtime_version,
			 start_command, pma_port)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		s.UID, s.Name, s.Port, s.PHPVersion, s.SiteStatus, s.SiteType,
		s.RuntimeVersion, s.StartCommand, s.PMAPort,
	)
	if err != nil {
		logger.Error("CreateSite: failed to insert site record: %v", err)
		return err
	}

	// retrieve the auto-generated ID for the new site
	s.ID, _ = res.LastInsertId()
	logger.Debug("Created site with ID %d", s.ID)
	return nil
}

// GetSiteByID retrieves a site by primary key
func GetSiteByID(db *sql.DB, id int64) (*models.Site, error) {

	// setup a new Site struct to hold the retrieved site data
	s := &models.Site{}

	// query the database for the site record matching the given ID, and scan the result into the Site struct
	err := db.QueryRow(
		fmt.Sprintf("SELECT %s FROM kppn_sites WHERE id = ?", siteColumns), id,
	).Scan(scanSite(s)...)
	if err == sql.ErrNoRows {
		logger.Error("Site not found with ID %d", id)
		return nil, nil
	}
	if err != nil {
		logger.Error("GetSiteByID: failed to query site record: %v", err)
		return nil, err
	}

	// log the retrieved site ID for debugging purposes
	logger.Debug("Retrieved site with ID %d", s.ID)
	return s, err
}

// GetSiteByName retrieves a site by name
func GetSiteByName(db *sql.DB, name string) (*models.Site, error) {

	// setup a new Site struct to hold the retrieved site data
	s := &models.Site{}

	// query the database for the site record matching the given name, and scan the result into the Site struct
	err := db.QueryRow(
		fmt.Sprintf("SELECT %s FROM kppn_sites WHERE name = ?", siteColumns), name,
	).Scan(scanSite(s)...)
	if err == sql.ErrNoRows {
		logger.Debug("Site not found with name %s", name)
		return nil, nil
	}
	if err != nil {
		logger.Error("GetSiteByName: failed to query site record: %v", err)
		return nil, err
	}

	// return the retrieved site and log the site name and ID for debugging purposes
	logger.Debug("Retrieved site with name %s (ID %d)", name, s.ID)
	return s, err
}

// GetAllSites returns all sites — admin use
func GetAllSites(db *sql.DB) ([]*models.Site, error) {
	return querySites(db, fmt.Sprintf("SELECT %s FROM kppn_sites ORDER BY created ASC", siteColumns))
}

// GetSitesByUser returns all sites owned by a given user
func GetSitesByUser(db *sql.DB, uid int64) ([]*models.Site, error) {
	return querySites(db,
		fmt.Sprintf("SELECT %s FROM kppn_sites WHERE uid = ? ORDER BY created ASC", siteColumns), uid,
	)
}

// UpdateSite updates all mutable site fields
func UpdateSite(db *sql.DB, s *models.Site) error {

	// grab the current UTC time for the updated timestamp
	now := time.Now().UTC()

	// execute the UPDATE statement to modify the site record with the new values from the Site struct, and set the updated timestamp
	_, err := db.Exec(`
		UPDATE kppn_sites
		SET name=?, port=?, php_version=?, site_status=?, site_type=?,
		    runtime_version=?, start_command=?,
		    pma_port=?, updated=?
		WHERE id=?`,
		s.Name, s.Port, s.PHPVersion, s.SiteStatus, s.SiteType,
		s.RuntimeVersion, s.StartCommand,
		s.PMAPort, now, s.ID,
	)
	if err != nil {
		logger.Error("UpdateSite: failed to update site record with ID %d: %v", s.ID, err)
		return err
	}

	// return any error that occurred during the update operation
	logger.Debug("Updated site with ID %d", s.ID)
	return err
}

// UpdateSiteStatus updates only the site_status column
func UpdateSiteStatus(db *sql.DB, id int64, status int) error {

	// grab the current UTC time for the updated timestamp
	now := time.Now().UTC()

	// execute the UPDATE statement to modify only the site_status column for the specified site ID, and set the updated timestamp
	_, err := db.Exec(`
		UPDATE kppn_sites SET site_status=?, updated=? WHERE id=?`,
		status, now, id,
	)
	if err != nil {
		logger.Error("UpdateSiteStatus: failed to update site_status for site ID %d: %v", id, err)
		return err
	}

	// return any error that occurred during the update operation and log the updated site ID and new status for debugging purposes
	logger.Debug("Updated site_status for site ID %d to %d", id, status)
	return err
}

// DeleteSite removes a site record — cascades to domains and configs
func DeleteSite(db *sql.DB, id int64) error {

	// execute the DELETE statement to remove the site record with the specified ID, which will also cascade deletes to related domain and config records due to foreign key constraints
	_, err := db.Exec(`DELETE FROM kppn_sites WHERE id=?`, id)
	if err != nil {
		logger.Error("DeleteSite: failed to delete site record with ID %d: %v", id, err)
		return err
	}

	// return any error that occurred during the delete operation and log the deleted site ID for debugging purposes
	logger.Debug("Deleted site with ID %d", id)
	return err
}

// SiteOwnedBy returns true if the site belongs to the given user
func SiteOwnedBy(db *sql.DB, siteID, uid int64) (bool, error) {

	// hold the count of matching records to determine ownership
	var count int

	// execute a query to count the number of site records that match the given site ID and user ID, and scan the result into the count variable
	err := db.QueryRow(`
		SELECT COUNT(*) FROM kppn_sites WHERE id=? AND uid=?`, siteID, uid,
	).Scan(&count)
	if err != nil {
		logger.Error("SiteOwnedBy: failed to query site ownership for site ID %d and user ID %d: %v", siteID, uid, err)
		return false, err
	}

	// return true if the count is greater than 0 (indicating ownership), along with any error that occurred during the query, and log the site ID, user ID, and ownership result for debugging purposes
	logger.Debug("SiteOwnedBy: site ID %d is owned by user ID %d: %v", siteID, uid, count > 0)
	return count > 0, err
}

// PortInUse returns true if the given port is already registered on any site column
func PortInUse(db *sql.DB, port int, excludeSiteID int64) (bool, error) {

	// hold the count of matching records to determine if the port is in use
	var count int

	// execute a query to count the number of site records where any of the port columns (port, pma_port) match the given port value, excluding the specified site ID, and scan the result into the count variable
	err := db.QueryRow(`
		SELECT COUNT(*) FROM kppn_sites
		WHERE (port = ? OR pma_port = ?) AND id != ?`,
		port, port, excludeSiteID,
	).Scan(&count)
	if err != nil {
		logger.Error("PortInUse: failed to query port usage for port %d: %v", port, err)
		return false, err
	}

	// return true if the count is greater than 0 (indicating the port is in use), along with any error that occurred during the query, and log the port number and usage result for debugging purposes
	logger.Debug("PortInUse: port %d is in use: %v", port, count > 0)
	return count > 0, err

}

// NextAvailablePort returns the next free port in the 8081-11000 range
// checking both site ports and PMA ports for collisions
func NextAvailablePort(db *sql.DB) (int, error) {
	for port := 8081; port <= 11000; port++ {
		inUse, err := PortInUse(db, port, 0)
		if err != nil {
			logger.Error("NextAvailablePort: failed to check port %d: %v", port, err)
			return 0, err
		}
		if !inUse {
			logger.Debug("NextAvailablePort: found available port %d", port)
			return port, nil
		}
	}
	logger.Error("NextAvailablePort: no available ports in range 8081-11000")
	return 0, fmt.Errorf("no available ports in range 8081-11000")
}

// querySites is a helper function to execute a site query and scan the results into a slice of Site structs
func querySites(db *sql.DB, query string, args ...any) ([]*models.Site, error) {

	// execute the provided query with any arguments and obtain the resulting rows
	rows, err := db.Query(query, args...)
	if err != nil {
		logger.Error("querySites: failed to execute query: %v", err)
		return nil, err
	}
	defer rows.Close()

	// setup a slice to hold the retrieved Site structs, and iterate over the rows to scan each site record into a new Site struct and append it to the slice
	sites := make([]*models.Site, 0)

	// for each row in the result set, create a new Site struct, scan the row data into the struct using the scanSite helper, and append the struct to the sites slice; log any scanning errors that occur
	for rows.Next() {

		// setup a new Site struct to hold the retrieved site data for the current row
		s := &models.Site{}

		// scan the current row into the Site struct using the scanSite helper function, and log any errors that occur during scanning; if successful, append the Site struct to the sites slice
		if err := rows.Scan(scanSite(s)...); err != nil {
			logger.Error("querySites: failed to scan site record: %v", err)
			return nil, err
		}

		// append the successfully scanned Site struct to the sites slice
		logger.Debug("querySites: retrieved site with ID %d", s.ID)
		sites = append(sites, s)
	}

	// return the slice of retrieved Site structs along with any error that occurred during row iteration, and log the total number of sites retrieved for debugging purposes
	logger.Debug("querySites: retrieved %d sites", len(sites))
	return sites, rows.Err()
}
