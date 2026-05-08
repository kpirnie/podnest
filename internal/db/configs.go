package db

import (
	"database/sql"
	"time"

	"podnest/internal/logger"
	"podnest/internal/models"
)

// CreateConfig inserts a new config record for a site
func CreateConfig(db *sql.DB, c *models.Config) error {

	// Set created and updated timestamps
	res, err := db.Exec(`
		INSERT INTO kppn_configs (siteid, type, config)
		VALUES (?, ?, ?)`,
		c.SiteID, c.Type, c.Config,
	)
	if err != nil {
		logger.Error("failed to create config: %v", err)
		return err
	}

	// Get the auto-generated ID of the new record
	c.ID, _ = res.LastInsertId()
	logger.Debug("config created with ID: %d", c.ID)

	// return nil if successful
	return nil
}

// GetConfigBySiteAndType retrieves a single config by site ID and type
func GetConfigBySiteAndType(db *sql.DB, siteID int64, configType int) (*models.Config, error) {

	// setup a new Config struct to hold the result
	c := &models.Config{}

	// Query the database for the config record matching the site ID and type
	err := db.QueryRow(`
		SELECT id, siteid, type, config, created, updated
		FROM kppn_configs WHERE siteid = ? AND type = ?`, siteID, configType,
	).Scan(&c.ID, &c.SiteID, &c.Type, &c.Config, &c.Created, &c.Updated)
	if err == sql.ErrNoRows {
		logger.Error("no config found for site ID %d and type %d", siteID, configType)
		return nil, nil
	}

	// return the config and any error that occurred during the query
	logger.Debug("config found for site ID %d and type %d", siteID, configType)
	return c, err
}

// GetConfigsBySite returns all config records for a site
func GetConfigsBySite(db *sql.DB, siteID int64) ([]*models.Config, error) {

	// Query the database for all config records matching the site ID
	rows, err := db.Query(`
		SELECT id, siteid, type, config, created, updated
		FROM kppn_configs WHERE siteid = ? ORDER BY type ASC`, siteID,
	)
	if err != nil {
		logger.Error("failed to get configs for site ID %d: %v", siteID, err)
		return nil, err
	}
	defer rows.Close()

	// setup a slice to hold the results
	var configs []*models.Config

	// Iterate over the query results and populate the slice
	for rows.Next() {

		// setup a new Config struct for each row
		c := &models.Config{}
		if err := rows.Scan(
			&c.ID, &c.SiteID, &c.Type, &c.Config, &c.Created, &c.Updated,
		); err != nil {
			logger.Error("failed to scan config row for site ID %d: %v", siteID, err)
			return nil, err
		}
		configs = append(configs, c)
	}

	// return the slice of configs and any error that occurred during iteration
	logger.Debug("found %d configs for site ID %d", len(configs), siteID)
	return configs, rows.Err()
}

// UpdateConfig replaces the JSON blob for an existing config record
func UpdateConfig(db *sql.DB, c *models.Config) error {

	// Set the updated timestamp to now
	now := time.Now().UTC()

	// Update the config record in the database with the new JSON blob and updated timestamp
	_, err := db.Exec(`
		UPDATE kppn_configs SET config=?, updated=? WHERE id=?`,
		c.Config, now, c.ID,
	)

	// return any error that occurred during the update
	logger.Debug("config updated with ID: %d", c.ID)
	return err
}

// UpsertConfig inserts or replaces a config record for a site+type combination
func UpsertConfig(db *sql.DB, c *models.Config) error {

	// Set the updated timestamp to now
	now := time.Now().UTC()

	// Use an upsert query to insert or update the config record based on the site ID and type
	_, err := db.Exec(`
		INSERT INTO kppn_configs (siteid, type, config, created, updated)
		VALUES (?, ?, ?, ?, ?)
		ON CONFLICT (siteid, type) DO UPDATE SET config=excluded.config, updated=excluded.updated`,
		c.SiteID, c.Type, c.Config, now, now,
	)
	if err != nil {
		logger.Error("failed to upsert config for site ID %d and type %d: %v", c.SiteID, c.Type, err)
		return err
	}

	// return nil if successful
	logger.Debug("config upserted for site ID %d and type %d", c.SiteID, c.Type)
	return nil
}

// DeleteConfig removes a config record by ID
func DeleteConfig(db *sql.DB, id int64) error {

	// Delete the config record from the database by ID
	_, err := db.Exec(`DELETE FROM kppn_configs WHERE id=?`, id)
	logger.Debug("config deleted with ID: %d", id)
	return err
}

// DeleteConfigsBySite removes all config records for a site
func DeleteConfigsBySite(db *sql.DB, siteID int64) error {

	// Delete all config records from the database for the given site ID
	_, err := db.Exec(`DELETE FROM kppn_configs WHERE siteid=?`, siteID)
	logger.Debug("configs deleted for site ID %d", siteID)
	return err
}
