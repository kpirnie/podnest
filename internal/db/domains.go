package db

import (
	"database/sql"
	"fmt"
	"time"

	"podnest/internal/logger"
	"podnest/internal/models"
)

// DomainEntry holds the routing fields needed by the proxy cache
type DomainEntry struct {
	Port   int
	SiteID int64
}

// CreateDomain inserts a new domain record for a site
func CreateDomain(db *sql.DB, d *models.Domain) error {

	// Ensure the domain is unique before inserting
	exists, err := DomainExists(db, d.Domain)
	if err != nil {
		logger.Error("Error checking domain existence: %v", err)
		return err
	}
	if exists {
		logger.Error("Domain already exists: %s", d.Domain)
		return fmt.Errorf("domain already exists: %s", d.Domain)
	}

	// Insert the new domain record
	res, err := db.Exec(`
		INSERT INTO kppn_domains (siteid, domain)
		VALUES (?, ?)`,
		d.SiteID, d.Domain,
	)
	if err != nil {
		logger.Error("Error inserting domain: %v", err)
		return err
	}

	// Log the successful creation of the domain
	logger.Debug("Created domain '%s' for site ID %d", d.Domain, d.SiteID)
	d.ID, _ = res.LastInsertId()
	return nil
}

// GetDomainsBySite returns all domains associated with a site
func GetDomainsBySite(db *sql.DB, siteID int64) ([]*models.Domain, error) {

	// Query the database for domains associated with the given site ID
	rows, err := db.Query(`
		SELECT id, siteid, domain, created, updated
		FROM kppn_domains WHERE siteid = ? ORDER BY created ASC`, siteID,
	)
	if err != nil {
		logger.Error("Error fetching domains for site %d: %v", siteID, err)
		return nil, err
	}
	defer rows.Close()

	// setup a slice to hold the domain records and iterate through the query results
	var domains []*models.Domain

	// Scan each row into a Domain struct and append it to the slice
	for rows.Next() {

		// Create a new Domain struct to hold the data for the current row
		d := &models.Domain{}
		if err := rows.Scan(
			&d.ID, &d.SiteID, &d.Domain, &d.Created, &d.Updated,
		); err != nil {
			logger.Error("Error scanning domain row: %v", err)
			return nil, err
		}

		// Log the successful retrieval of the domain record
		logger.Debug("Fetched domain '%s' (ID %d) for site ID %d", d.Domain, d.ID, siteID)
		domains = append(domains, d)
	}

	// Log the total number of domains fetched for the site
	logger.Debug("Total domains fetched for site ID %d: %d", siteID, len(domains))
	return domains, rows.Err()
}

// GetDomainByValue retrieves a single domain by its domain string
func GetDomainByValue(db *sql.DB, domain string) (*models.Domain, error) {

	// setup a Domain struct to hold the data for the query result and execute the query
	d := &models.Domain{}

	// Scan the query result into the Domain struct. If no rows are returned, return nil without an error
	err := db.QueryRow(`
		SELECT id, siteid, domain, created, updated
		FROM kppn_domains WHERE domain = ?`, domain,
	).Scan(&d.ID, &d.SiteID, &d.Domain, &d.Created, &d.Updated)
	if err == sql.ErrNoRows {
		logger.Debug("No domain found with value '%s'", domain)
		return nil, nil
	}

	// Log the successful retrieval of the domain record
	logger.Debug("Fetched domain '%s' (ID %d) for site ID %d", d.Domain, d.ID, d.SiteID)
	return d, err
}

// UpdateDomain updates the domain string for an existing record
func UpdateDomain(db *sql.DB, d *models.Domain) error {

	// setup the current time for the updated timestamp and execute the update query
	now := time.Now().UTC()
	_, err := db.Exec(`
		UPDATE kppn_domains SET domain=?, updated=? WHERE id=?`,
		d.Domain, now, d.ID,
	)
	if err != nil {
		logger.Error("Error updating domain ID %d: %v", d.ID, err)
		return err
	}

	// Log the successful update of the domain record
	logger.Debug("Updated domain ID %d to '%s'", d.ID, d.Domain)
	return err
}

// DeleteDomain removes a domain record by ID
func DeleteDomain(db *sql.DB, id int64) error {

	// Execute the delete query for the specified domain ID
	_, err := db.Exec(`DELETE FROM kppn_domains WHERE id=?`, id)
	if err != nil {
		logger.Error("Error deleting domain ID %d: %v", id, err)
	}

	// Log the successful deletion of the domain record
	logger.Debug("Deleted domain ID %d", id)
	return err
}

// DeleteDomainsBySite removes all domains for a site
func DeleteDomainsBySite(db *sql.DB, siteID int64) error {

	// Execute the delete query for all domains associated with the specified site ID
	_, err := db.Exec(`DELETE FROM kppn_domains WHERE siteid=?`, siteID)
	if err != nil {
		logger.Error("Error deleting domains for site ID %d: %v", siteID, err)
	}

	// Log the successful deletion of the domain records for the site
	logger.Debug("Deleted all domains for site ID %d", siteID)
	return err
}

// DomainExists returns true if the domain string is already registered
func DomainExists(db *sql.DB, domain string) (bool, error) {

	// Query the database to count how many records exist with the specified domain string
	var count int

	// Scan the count result into the count variable. If an error occurs, log it and return false with the error
	err := db.QueryRow(`
		SELECT COUNT(*) FROM kppn_domains WHERE domain=?`, domain,
	).Scan(&count)
	if err != nil {
		logger.Error("Error checking domain existence for '%s': %v", domain, err)
		return false, fmt.Errorf("failed to check domain existence: %w", err)
	}

	// Log the result of the domain existence check and return true if count is greater than 0
	logger.Debug("Domain '%s' exists: %v", domain, count > 0)
	return count > 0, nil
}

// GetSitePortByDomain returns the host port for the site owning a given domain
func GetSitePortByDomain(database *sql.DB, domain string) (int, error) {
	var port int
	err := database.QueryRow(`
		SELECT s.port FROM kppn_sites s
		JOIN kppn_domains d ON d.siteid = s.id
		WHERE d.domain = ?`, domain,
	).Scan(&port)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	if err != nil {
		logger.Error("GetSitePortByDomain: %v", err)
		return 0, err
	}
	logger.Debug("domain '%s' maps to port %d", domain, port)
	return port, nil
}

// GetAllDomainEntries returns a map of every registered domain → DomainEntry.
// Used to warm the proxy domain cache on startup.
func GetAllDomainEntries(database *sql.DB) (map[string]DomainEntry, error) {
	rows, err := database.Query(`
		SELECT d.domain, s.port, s.id
		FROM kppn_domains d
		JOIN kppn_sites s ON s.id = d.siteid`)
	if err != nil {
		logger.Error("GetAllDomainEntries: failed to query: %v", err)
		return nil, err
	}
	defer rows.Close()

	out := make(map[string]DomainEntry)
	for rows.Next() {
		var domain string
		var e DomainEntry
		if err := rows.Scan(&domain, &e.Port, &e.SiteID); err != nil {
			logger.Error("GetAllDomainEntries: failed to scan row: %v", err)
			return nil, err
		}
		out[domain] = e
	}

	logger.Debug("GetAllDomainEntries: loaded %d domain mappings", len(out))
	return out, rows.Err()
}

// GetDomainByID retrieves a single domain record by primary key
func GetDomainByID(db *sql.DB, id int64) (*models.Domain, error) {
	d := &models.Domain{}
	err := db.QueryRow(`
		SELECT id, siteid, domain, created, updated
		FROM kppn_domains WHERE id = ?`, id,
	).Scan(&d.ID, &d.SiteID, &d.Domain, &d.Created, &d.Updated)
	if err == sql.ErrNoRows {
		logger.Debug("No domain found with ID %d", id)
		return nil, nil
	}
	if err != nil {
		logger.Error("GetDomainByID: failed to retrieve domain %d: %v", id, err)
		return nil, err
	}
	logger.Debug("Fetched domain ID %d: '%s'", id, d.Domain)
	return d, nil
}
