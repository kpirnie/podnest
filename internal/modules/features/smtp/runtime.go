// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package smtp

import (
	"context"
	"errors"
	"net/http"
	"time"

	"podnest/internal/apiutil"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
)

// snapshotSMTP reads the stored settings, preserving the encrypted password for rollback.
func (m Module) snapshotSMTP(w http.ResponseWriter, site *models.Site) (map[string]string, bool) {
	settings, err := db.GetConfigsBySiteAndType(m.DB, site.ID, models.ConfigSMTP)
	if err != nil {
		logger.Error("snapshotSMTP: siteID=%d: %v", site.ID, err)
		apiutil.ErrorMsg(w, http.StatusInternalServerError, "unable to read stored SMTP configuration")
		return nil, false
	}
	return settings, true
}

// applyPHPSMTP refreshes the PHP runtime and restores the prior configuration on failure.
func (m Module) applyPHPSMTP(w http.ResponseWriter, r *http.Request, site *models.Site, previous map[string]string, refresh bool) bool {
	if !refresh || (site.SiteType != models.SiteTypePHP && site.SiteType != models.SiteTypeWordPress) {
		return true
	}

	// Once the database is updated, finish the apply or recovery even if the client disconnects.
	refreshRuntime := func() error {
		if m.RefreshPHPSMTP == nil {
			return errors.New("PHP SMTP refresh is unavailable")
		}
		ctx, cancel := context.WithTimeout(context.WithoutCancel(r.Context()), 45*time.Second)
		defer cancel()
		return m.RefreshPHPSMTP(ctx, site)
	}

	if err := refreshRuntime(); err != nil {
		logger.Error("applyPHPSMTP: siteID=%d: %v", site.ID, err)
	} else {
		return true
	}

	if err := db.SetConfigs(m.DB, site.ID, models.ConfigSMTP, previous); err != nil {
		logger.Error("applyPHPSMTP: siteID=%d: configuration rollback failed: %v", site.ID, err)
		apiutil.ErrorMsg(w, http.StatusInternalServerError, "SMTP apply failed and the previous settings could not be restored")
		return false
	}

	if err := refreshRuntime(); err != nil {
		logger.Error("applyPHPSMTP: siteID=%d: runtime recovery failed: %v", site.ID, err)
		apiutil.ErrorMsg(w, http.StatusInternalServerError, "previous SMTP settings restored, but PHP runtime recovery failed")
		return false
	}

	apiutil.ErrorMsg(w, http.StatusInternalServerError, "SMTP apply failed and the previous configuration was restored")
	return false
}
