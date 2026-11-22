// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package smtp

import (
	"fmt"
	"maps"
	"net/http"
	"strings"

	"podnest/internal/apiutil"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
)

const smtpMigrationScope = "site-smtp"

func (m Module) exportSMTP(w http.ResponseWriter, r *http.Request, site *models.Site) {
	smtpSettingsMu.Lock()
	defer smtpSettingsMu.Unlock()

	values, ok := m.snapshotSMTP(w, site)
	if !ok {
		return
	}
	if _, exists := values["password"]; exists {
		password, err := db.GetSMTPPassword(m.DB, site.ID)
		if err != nil {
			apiutil.ErrorMsg(w, http.StatusInternalServerError, "unable to open stored SMTP credentials")
			return
		}
		values["password"] = password
	}
	apiutil.ExportMigration(w, r, fmt.Sprintf("%s-smtp.pnm", site.Name), smtpMigrationScope, values)
}

func (m Module) importSMTP(w http.ResponseWriter, r *http.Request, site *models.Site) {
	values, err := apiutil.ImportMigration(w, r, smtpMigrationScope)
	if err != nil {
		apiutil.ErrorMsg(w, http.StatusBadRequest, err.Error())
		return
	}
	password := values["password"]
	delete(values, "password")

	smtpSettingsMu.Lock()
	defer smtpSettingsMu.Unlock()

	previous, ok := m.snapshotSMTP(w, site)
	if !ok {
		return
	}
	merged := maps.Clone(previous)
	for key, value := range values {
		switch key {
		case "enabled", "host", "port", "encryption", "username", "from_email", "from_name":
			merged[key] = value
		default:
			apiutil.ErrorMsg(w, http.StatusBadRequest, "unknown SMTP migration setting")
			return
		}
	}
	if password == "*****" || password == "••••••••" {
		password = ""
	}
	if len(password) > 4096 || ((site.SiteType == models.SiteTypePHP || site.SiteType == models.SiteTypeWordPress) &&
		strings.ContainsAny(password, "\x00\r\n")) {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid SMTP password")
		return
	}
	if len(values) > 0 && !validateSMTPSettings(w, merged) {
		return
	}
	if merged["enabled"] == "true" && (strings.TrimSpace(merged["host"]) == "" ||
		strings.TrimSpace(merged["from_email"]) == "" || strings.TrimSpace(merged["username"]) == "" ||
		merged["port"] == "" || merged["encryption"] == "" || (password == "" && merged["password"] == "")) {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "enabled SMTP requires complete settings and credentials")
		return
	}

	if err := db.ReplaceSMTPMigration(m.DB, site.ID, merged, password); err != nil {
		logger.Error("SMTP migration: failed to persist site %d", site.ID)
		apiutil.ErrorMsg(w, http.StatusInternalServerError, "unable to save SMTP migration")
		return
	}
	if m.applySMTPRuntime(w, r, site, previous, previous["enabled"] == "true" || merged["enabled"] == "true") {
		apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}
