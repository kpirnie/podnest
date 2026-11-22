// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package db

import (
	"context"
	"database/sql"
)

// SiteNeedsRecovery reports whether a fresh-host restoration is incomplete for
// the site. Installations without a recovery ledger have no pending sites.
func SiteNeedsRecovery(ctx context.Context, database *sql.DB, siteID int64) (bool, error) {
	var exists bool
	if err := database.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM sqlite_schema
		WHERE type='table' AND name='kppn_dr_restore')`).Scan(&exists); err != nil || !exists {
		return false, err
	}
	var needed bool
	err := database.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM kppn_dr_restore
		WHERE site_id=? AND state<>'restored')`, siteID).Scan(&needed)
	return needed, err
}
