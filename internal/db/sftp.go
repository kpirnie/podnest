// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package db

import (
	"database/sql"
	"time"

	"podnest/internal/logger"
	"podnest/internal/models"
)

// CreateSFTPCred inserts a new SFTP credential record for a site
func CreateSFTPCred(db *sql.DB, c *models.SFTPCred) error {
	res, err := db.Exec(`
		INSERT INTO kppn_sftp_creds (site_id, username, password, uid)
		VALUES (?, ?, ?, ?)`,
		c.SiteID, c.Username, c.Password, c.UID,
	)
	if err != nil {
		logger.Error("CreateSFTPCred: %v", err)
		return err
	}
	c.ID, _ = res.LastInsertId()
	logger.Debug("SFTP cred created for site %d", c.SiteID)
	return nil
}

// GetSFTPCredBySite retrieves the SFTP credential for a site
func GetSFTPCredBySite(db *sql.DB, siteID int64) (*models.SFTPCred, error) {
	c := &models.SFTPCred{}
	err := db.QueryRow(`
		SELECT id, site_id, username, password, uid, created, updated
		FROM kppn_sftp_creds WHERE site_id = ?`, siteID,
	).Scan(&c.ID, &c.SiteID, &c.Username, &c.Password, &c.UID, &c.Created, &c.Updated)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		logger.Error("GetSFTPCredBySite: %v", err)
		return nil, err
	}
	return c, nil
}

// UpdateSFTPPassword updates the stored password for an SFTP credential
func UpdateSFTPPassword(db *sql.DB, siteID int64, password string) error {
	now := time.Now().UTC()
	_, err := db.Exec(`
		UPDATE kppn_sftp_creds SET password=?, updated=? WHERE site_id=?`,
		password, now, siteID,
	)
	if err != nil {
		logger.Error("UpdateSFTPPassword: %v", err)
		return err
	}
	logger.Debug("SFTP password updated for site %d", siteID)
	return nil
}

// DeleteSFTPCred removes the SFTP credential for a site
func DeleteSFTPCred(db *sql.DB, siteID int64) error {
	_, err := db.Exec(`DELETE FROM kppn_sftp_creds WHERE site_id=?`, siteID)
	if err != nil {
		logger.Error("DeleteSFTPCred: %v", err)
	}
	logger.Debug("SFTP cred deleted for site %d", siteID)
	return err
}
