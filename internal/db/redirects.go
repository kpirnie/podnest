package db

import (
	"database/sql"

	"podnest/internal/logger"
)

// Redirect represents a single source→target HTTP redirect rule for a site
type Redirect struct {
	ID       int64  `json:"ID"`
	SiteID   int64  `json:"SiteID"`
	Source   string `json:"Source"`
	Target   string `json:"Target"`
	Code     int    `json:"Code"`
	Position int    `json:"Position"`
}

// GetRedirectsBySite returns all redirects for a given site ordered by position
func GetRedirectsBySite(db *sql.DB, siteID int64) ([]Redirect, error) {
	rows, err := db.Query(`
		SELECT id, site_id, source, target, code, position
		FROM kppn_redirects WHERE site_id = ? ORDER BY position ASC`, siteID,
	)
	if err != nil {
		logger.Error("GetRedirectsBySite: failed to query site %d: %v", siteID, err)
		return nil, err
	}
	defer rows.Close()

	var redirects []Redirect
	for rows.Next() {
		var rd Redirect
		if err := rows.Scan(&rd.ID, &rd.SiteID, &rd.Source, &rd.Target, &rd.Code, &rd.Position); err != nil {
			logger.Error("GetRedirectsBySite: failed to scan row: %v", err)
			return nil, err
		}
		redirects = append(redirects, rd)
	}

	logger.Debug("GetRedirectsBySite: loaded %d redirects for site %d", len(redirects), siteID)
	return redirects, rows.Err()
}

// GetAllRedirects returns every redirect across all sites; used to warm the proxy cache
func GetAllRedirects(db *sql.DB) ([]Redirect, error) {
	rows, err := db.Query(`
		SELECT id, site_id, source, target, code, position
		FROM kppn_redirects ORDER BY site_id, position ASC`,
	)
	if err != nil {
		logger.Error("GetAllRedirects: failed to query: %v", err)
		return nil, err
	}
	defer rows.Close()

	var redirects []Redirect
	for rows.Next() {
		var rd Redirect
		if err := rows.Scan(&rd.ID, &rd.SiteID, &rd.Source, &rd.Target, &rd.Code, &rd.Position); err != nil {
			logger.Error("GetAllRedirects: failed to scan row: %v", err)
			return nil, err
		}
		redirects = append(redirects, rd)
	}

	logger.Debug("GetAllRedirects: loaded %d total redirects", len(redirects))
	return redirects, rows.Err()
}

// ReplaceRedirects atomically replaces all redirects for a site within a single transaction
func ReplaceRedirects(db *sql.DB, siteID int64, redirects []Redirect) error {
	tx, err := db.Begin()
	if err != nil {
		logger.Error("ReplaceRedirects: failed to begin transaction: %v", err)
		return err
	}

	// delete all existing redirects for this site
	if _, err := tx.Exec(`DELETE FROM kppn_redirects WHERE site_id = ?`, siteID); err != nil {
		tx.Rollback()
		logger.Error("ReplaceRedirects: failed to delete existing redirects for site %d: %v", siteID, err)
		return err
	}

	// insert each new redirect with its assigned position
	stmt, err := tx.Prepare(`
		INSERT INTO kppn_redirects (site_id, source, target, code, position)
		VALUES (?, ?, ?, ?, ?)`)
	if err != nil {
		tx.Rollback()
		logger.Error("ReplaceRedirects: failed to prepare insert: %v", err)
		return err
	}
	defer stmt.Close()

	for i, rd := range redirects {
		if _, err := stmt.Exec(siteID, rd.Source, rd.Target, rd.Code, i); err != nil {
			tx.Rollback()
			logger.Error("ReplaceRedirects: failed to insert redirect: %v", err)
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		logger.Error("ReplaceRedirects: failed to commit: %v", err)
		return err
	}

	logger.Debug("ReplaceRedirects: replaced %d redirects for site %d", len(redirects), siteID)
	return nil
}
