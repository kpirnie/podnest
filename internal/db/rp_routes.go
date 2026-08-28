// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package db

import (
	"database/sql"

	"podnest/internal/logger"
)

// RPRoute represents a single domain→upstream mapping for a reverse proxy site
type RPRoute struct {
	ID       int64  `json:"ID"`
	SiteID   int64  `json:"SiteID"`
	Domain   string `json:"Domain"`
	Upstream string `json:"Upstream"`
	Position int    `json:"Position"`
	PassHost bool   `json:"PassHost"`
}

// GetRPRoutesBySite returns all routes for a given site ordered by position
func GetRPRoutesBySite(db *sql.DB, siteID int64) ([]RPRoute, error) {
	rows, err := db.Query(`
		SELECT id, site_id, domain, upstream, position, pass_host
		FROM kppn_rp_routes WHERE site_id = ? ORDER BY position ASC`, siteID,
	)
	if err != nil {
		logger.Error("GetRPRoutesBySite: failed to query site %d: %v", siteID, err)
		return nil, err
	}
	defer rows.Close()

	var routes []RPRoute
	for rows.Next() {
		var r RPRoute
		if err := rows.Scan(&r.ID, &r.SiteID, &r.Domain, &r.Upstream, &r.Position, &r.PassHost); err != nil {
			logger.Error("GetRPRoutesBySite: failed to scan row: %v", err)
			return nil, err
		}
		routes = append(routes, r)
	}

	logger.Debug("GetRPRoutesBySite: loaded %d routes for site %d", len(routes), siteID)
	return routes, rows.Err()
}

// GetAllRPRoutes returns every route across all sites; used to warm the proxy cache
func GetAllRPRoutes(db *sql.DB) ([]RPRoute, error) {
	rows, err := db.Query(`
		SELECT id, site_id, domain, upstream, position, pass_host
		FROM kppn_rp_routes ORDER BY site_id, position ASC`,
	)
	if err != nil {
		logger.Error("GetAllRPRoutes: failed to query: %v", err)
		return nil, err
	}
	defer rows.Close()

	var routes []RPRoute
	for rows.Next() {
		var r RPRoute
		if err := rows.Scan(&r.ID, &r.SiteID, &r.Domain, &r.Upstream, &r.Position, &r.PassHost); err != nil {
			logger.Error("GetAllRPRoutes: failed to scan row: %v", err)
			return nil, err
		}
		routes = append(routes, r)
	}

	logger.Debug("GetAllRPRoutes: loaded %d total routes", len(routes))
	return routes, rows.Err()
}

// RPRouteDomainTaken reports whether a domain already has RP routes belonging
// to a site other than the one given
func RPRouteDomainTaken(db *sql.DB, domain string, siteID int64) (bool, error) {
	var count int
	err := db.QueryRow(`
		SELECT COUNT(*) FROM kppn_rp_routes WHERE domain = ? AND site_id != ?`, domain, siteID,
	).Scan(&count)
	if err != nil {
		logger.Error("RPRouteDomainTaken: failed to check domain '%s': %v", domain, err)
		return false, err
	}
	logger.Debug("RPRouteDomainTaken: domain '%s' taken by another site: %v", domain, count > 0)
	return count > 0, nil
}

// ReplaceRPRoutes atomically replaces all routes for a site within a single transaction
func ReplaceRPRoutes(db *sql.DB, siteID int64, routes []RPRoute) error {
	tx, err := db.Begin()
	if err != nil {
		logger.Error("ReplaceRPRoutes: failed to begin transaction: %v", err)
		return err
	}

	// delete all existing routes for this site
	if _, err := tx.Exec(`DELETE FROM kppn_rp_routes WHERE site_id = ?`, siteID); err != nil {
		tx.Rollback()
		logger.Error("ReplaceRPRoutes: failed to delete existing routes for site %d: %v", siteID, err)
		return err
	}

	// insert each new route with its assigned position
	stmt, err := tx.Prepare(`
		INSERT INTO kppn_rp_routes (site_id, domain, upstream, position, pass_host)
		VALUES (?, ?, ?, ?, ?)`)
	if err != nil {
		tx.Rollback()
		logger.Error("ReplaceRPRoutes: failed to prepare insert: %v", err)
		return err
	}
	defer stmt.Close()

	for i, r := range routes {
		if _, err := stmt.Exec(siteID, r.Domain, r.Upstream, i, r.PassHost); err != nil {
			tx.Rollback()
			logger.Error("ReplaceRPRoutes: failed to insert route: %v", err)
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		logger.Error("ReplaceRPRoutes: failed to commit: %v", err)
		return err
	}

	logger.Debug("ReplaceRPRoutes: replaced %d routes for site %d", len(routes), siteID)
	return nil
}
