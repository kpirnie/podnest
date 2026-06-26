// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package db

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"podnest/internal/logger"
	"podnest/internal/models"
)

// -- repo --------------------------------------------------------------------

// GetBackupRepo returns the backup repo record for a site, or nil if none exists
func GetBackupRepo(db *sql.DB, siteID int64) (*models.BackupRepo, error) {

	// query for the repo record matching the given site
	r := &models.BackupRepo{}
	err := db.QueryRow(`
		SELECT id, site_id, repo_password, local_path, local_enabled, s3_enabled,
		       last_error, last_error_at, created, updated
		FROM kppn_backup_repos WHERE site_id = ?`, siteID,
	).Scan(
		&r.ID, &r.SiteID, &r.RepoPassword,
		&r.LocalPath, &r.LocalEnabled, &r.S3Enabled,
		&r.LastError, &r.LastErrorAt,
		&r.Created, &r.Updated,
	)
	if err == sql.ErrNoRows {
		logger.Debug("GetBackupRepo: no repo for site %d", siteID)
		return nil, nil
	}
	if err != nil {
		logger.Error("GetBackupRepo: %v", err)
		return nil, err
	}

	logger.Debug("GetBackupRepo: found repo %d for site %d", r.ID, siteID)
	return r, nil
}

// UpsertBackupRepo inserts or updates the backup repo record for a site
func UpsertBackupRepo(db *sql.DB, r *models.BackupRepo) error {

	// upsert on site_id; always refresh updated timestamp
	_, err := db.Exec(`
		INSERT INTO kppn_backup_repos
			(site_id, repo_password, local_path, local_enabled, s3_enabled, updated)
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT (site_id) DO UPDATE SET
			repo_password = excluded.repo_password,
			local_path    = excluded.local_path,
			local_enabled = excluded.local_enabled,
			s3_enabled    = excluded.s3_enabled,
			updated       = excluded.updated`,
		r.SiteID, r.RepoPassword, r.LocalPath, r.LocalEnabled, r.S3Enabled, time.Now().UTC(),
	)
	if err != nil {
		logger.Error("UpsertBackupRepo: site %d: %v", r.SiteID, err)
		return err
	}

	logger.Debug("UpsertBackupRepo: upserted repo for site %d", r.SiteID)
	return nil
}

// SetBackupError records the most recent scheduled backup failure for a site
func SetBackupError(db *sql.DB, siteID int64, errMsg string) error {
	now := time.Now().UTC()
	_, err := db.Exec(`
		UPDATE kppn_backup_repos
		SET last_error = ?, last_error_at = ?, updated = ?
		WHERE site_id = ?`,
		errMsg, now, now, siteID,
	)
	if err != nil {
		logger.Error("SetBackupError: site %d: %v", siteID, err)
	}
	return err
}

// ClearBackupError clears any recorded backup failure for a site after a successful run
func ClearBackupError(db *sql.DB, siteID int64) error {
	now := time.Now().UTC()
	_, err := db.Exec(`
		UPDATE kppn_backup_repos
		SET last_error = '', last_error_at = NULL, updated = ?
		WHERE site_id = ?`,
		now, siteID,
	)
	if err != nil {
		logger.Error("ClearBackupError: site %d: %v", siteID, err)
	}
	return err
}

// -- backups -----------------------------------------------------------------

// CreateBackup inserts a new backup record and returns its assigned ID
func CreateBackup(db *sql.DB, b *models.Backup) (int64, error) {

	domainsJSON, err := json.Marshal(b.Domains)
	if err != nil {
		return 0, fmt.Errorf("CreateBackup: marshal domains: %w", err)
	}

	// insert the backup record; created is set by the DB default
	res, err := db.Exec(`
		INSERT INTO kppn_backups
			(site_id, snapshot_id, label, backup_type, size_bytes, domains)
		VALUES (?, ?, ?, ?, ?, ?)`,
		b.SiteID, b.SnapshotID, b.Label, b.BackupType, b.SizeBytes, string(domainsJSON),
	)
	if err != nil {
		logger.Error("CreateBackup: site %d: %v", b.SiteID, err)
		return 0, err
	}

	id, err := res.LastInsertId()
	if err != nil {
		logger.Error("CreateBackup: LastInsertId: %v", err)
		return 0, err
	}

	logger.Debug("CreateBackup: created backup %d for site %d", id, b.SiteID)
	return id, nil
}

// ListBackups returns all backup records for a site, newest first
func ListBackups(db *sql.DB, siteID int64) ([]*models.Backup, error) {

	// order newest-first so the UI can display most recent at the top
	rows, err := db.Query(`
		SELECT id, site_id, snapshot_id, label, backup_type, size_bytes, created, domains
		FROM kppn_backups WHERE site_id = ?
		ORDER BY created DESC`, siteID,
	)
	if err != nil {
		logger.Error("ListBackups: site %d: %v", siteID, err)
		return nil, err
	}
	defer rows.Close()

	// scan each row into a Backup struct
	var backups []*models.Backup
	for rows.Next() {
		b := &models.Backup{}
		var domainsJSON string
		if err := rows.Scan(
			&b.ID, &b.SiteID, &b.SnapshotID,
			&b.Label, &b.BackupType, &b.SizeBytes, &b.Created, &domainsJSON,
		); err != nil {
			logger.Error("ListBackups: scan: %v", err)
			return nil, err
		}
		if domainsJSON != "" {
			_ = json.Unmarshal([]byte(domainsJSON), &b.Domains)
		}
		backups = append(backups, b)
	}

	logger.Debug("ListBackups: found %d backups for site %d", len(backups), siteID)
	return backups, rows.Err()
}

// GetBackup returns a single backup record by ID
func GetBackup(db *sql.DB, id int64) (*models.Backup, error) {
	var domainsJSON string

	// query for the specific backup record
	b := &models.Backup{}
	err := db.QueryRow(`
		SELECT id, site_id, snapshot_id, label, backup_type, size_bytes, created, domains
		FROM kppn_backups WHERE id = ?`, id,
	).Scan(
		&b.ID, &b.SiteID, &b.SnapshotID,
		&b.Label, &b.BackupType, &b.SizeBytes, &b.Created, &domainsJSON,
	)
	if err == sql.ErrNoRows {
		logger.Debug("GetBackup: no backup with id %d", id)
		return nil, nil
	}
	if err != nil {
		logger.Error("GetBackup: %v", err)
		return nil, err
	}

	// set the Domains field by unmarshaling the stored JSON string
	if domainsJSON != "" {
		_ = json.Unmarshal([]byte(domainsJSON), &b.Domains)
	}

	logger.Debug("GetBackup: found backup %d", id)
	return b, nil
}

// DeleteBackup removes a backup record by ID
func DeleteBackup(db *sql.DB, id int64) error {

	// delete the record; restic snapshot deletion is handled by the backup manager
	_, err := db.Exec(`DELETE FROM kppn_backups WHERE id = ?`, id)
	if err != nil {
		logger.Error("DeleteBackup: id %d: %v", id, err)
		return err
	}

	logger.Debug("DeleteBackup: deleted backup %d", id)
	return nil
}
