package db

import (
	"database/sql"
	"time"

	"podnest/internal/logger"
	"podnest/internal/models"
)

// scanCron maps a result row into a SiteCron struct
func scanCron(c *models.SiteCron) []any {
	return []any{
		&c.ID, &c.SiteID, &c.Label, &c.Command, &c.Schedule,
		&c.Enabled, &c.LastRun, &c.LastOutput, &c.LastError,
		&c.Created, &c.Updated,
	}
}

// CreateCron inserts a new cron job and returns its assigned ID
func CreateCron(db *sql.DB, c *models.SiteCron) (int64, error) {
	res, err := db.Exec(`
		INSERT INTO kppn_site_crons (site_id, label, command, schedule, enabled)
		VALUES (?, ?, ?, ?, ?)`,
		c.SiteID, c.Label, c.Command, c.Schedule, c.Enabled,
	)
	if err != nil {
		logger.Error("CreateCron: site %d: %v", c.SiteID, err)
		return 0, err
	}

	id, err := res.LastInsertId()
	if err != nil {
		logger.Error("CreateCron: LastInsertId: %v", err)
		return 0, err
	}

	logger.Debug("CreateCron: created cron %d for site %d", id, c.SiteID)
	return id, nil
}

// GetCron returns a single cron job by ID, or nil if not found
func GetCron(db *sql.DB, id int64) (*models.SiteCron, error) {
	c := &models.SiteCron{}
	err := db.QueryRow(`
		SELECT id, site_id, label, command, schedule, enabled,
		       last_run, last_output, last_error, created, updated
		FROM kppn_site_crons WHERE id = ?`, id,
	).Scan(scanCron(c)...)
	if err == sql.ErrNoRows {
		logger.Debug("GetCron: no cron with id %d", id)
		return nil, nil
	}
	if err != nil {
		logger.Error("GetCron: %v", err)
		return nil, err
	}

	logger.Debug("GetCron: found cron %d", id)
	return c, nil
}

// ListCrons returns all cron jobs for a site
func ListCrons(db *sql.DB, siteID int64) ([]*models.SiteCron, error) {
	rows, err := db.Query(`
		SELECT id, site_id, label, command, schedule, enabled,
		       last_run, last_output, last_error, created, updated
		FROM kppn_site_crons WHERE site_id = ?
		ORDER BY id ASC`, siteID,
	)
	if err != nil {
		logger.Error("ListCrons: site %d: %v", siteID, err)
		return nil, err
	}
	defer rows.Close()

	var crons []*models.SiteCron
	for rows.Next() {
		c := &models.SiteCron{}
		if err := rows.Scan(scanCron(c)...); err != nil {
			logger.Error("ListCrons: scan: %v", err)
			return nil, err
		}
		crons = append(crons, c)
	}

	logger.Debug("ListCrons: found %d crons for site %d", len(crons), siteID)
	return crons, rows.Err()
}

// ListEnabledCrons returns all enabled cron jobs across all sites
func ListEnabledCrons(db *sql.DB) ([]*models.SiteCron, error) {
	rows, err := db.Query(`
		SELECT id, site_id, label, command, schedule, enabled,
		       last_run, last_output, last_error, created, updated
		FROM kppn_site_crons WHERE enabled = 1
		ORDER BY id ASC`,
	)
	if err != nil {
		logger.Error("ListEnabledCrons: %v", err)
		return nil, err
	}
	defer rows.Close()

	var crons []*models.SiteCron
	for rows.Next() {
		c := &models.SiteCron{}
		if err := rows.Scan(scanCron(c)...); err != nil {
			logger.Error("ListEnabledCrons: scan: %v", err)
			return nil, err
		}
		crons = append(crons, c)
	}

	logger.Debug("ListEnabledCrons: found %d enabled crons", len(crons))
	return crons, rows.Err()
}

// UpdateCron updates the label, command, schedule, and enabled state of a cron job
func UpdateCron(db *sql.DB, c *models.SiteCron) error {
	_, err := db.Exec(`
		UPDATE kppn_site_crons
		SET label = ?, command = ?, schedule = ?, enabled = ?, updated = ?
		WHERE id = ?`,
		c.Label, c.Command, c.Schedule, c.Enabled, time.Now().UTC(), c.ID,
	)
	if err != nil {
		logger.Error("UpdateCron: id %d: %v", c.ID, err)
		return err
	}

	logger.Debug("UpdateCron: updated cron %d", c.ID)
	return nil
}

// DeleteCron removes a cron job by ID
func DeleteCron(db *sql.DB, id int64) error {
	_, err := db.Exec(`DELETE FROM kppn_site_crons WHERE id = ?`, id)
	if err != nil {
		logger.Error("DeleteCron: id %d: %v", id, err)
		return err
	}

	logger.Debug("DeleteCron: deleted cron %d", id)
	return nil
}

// SetCronResult records the outcome of a cron job execution
func SetCronResult(db *sql.DB, id int64, output, errMsg string) error {
	now := time.Now().UTC()
	_, err := db.Exec(`
		UPDATE kppn_site_crons
		SET last_run = ?, last_output = ?, last_error = ?, updated = ?
		WHERE id = ?`,
		now, output, errMsg, now, id,
	)
	if err != nil {
		logger.Error("SetCronResult: id %d: %v", id, err)
	}
	return err
}

// SetCronEnabled toggles the enabled state of a cron job
func SetCronEnabled(db *sql.DB, id int64, enabled bool) error {
	_, err := db.Exec(`
		UPDATE kppn_site_crons SET enabled = ?, updated = ? WHERE id = ?`,
		enabled, time.Now().UTC(), id,
	)
	if err != nil {
		logger.Error("SetCronEnabled: id %d: %v", id, err)
	}
	return err
}
