// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package smtp

import (
	"encoding/json"
	"net/http"
	"net/mail"
	"strconv"
	"strings"

	"podnest/internal/apiutil"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
)

// apiGetSMTP returns a site's SMTP settings without exposing credentials.
func (m Module) apiGetSMTP(w http.ResponseWriter, _ *http.Request, site *models.Site) {

	// Retrieve the site's password-safe SMTP configuration.
	settings, err := db.GetSMTPSettings(m.DB, site.ID)
	if err != nil {
		logger.Error("apiGetSMTP: siteID=%d: %v", site.ID, err)
		apiutil.ErrorMsg(w, http.StatusInternalServerError, "failed to retrieve SMTP settings")
		return
	}

	logger.Debug("apiGetSMTP: siteID=%d retrieved", site.ID)
	apiutil.JSON(w, http.StatusOK, settings)
}

// apiSaveSMTP validates and saves non-sensitive SMTP settings.
func (m Module) apiSaveSMTP(w http.ResponseWriter, r *http.Request, site *models.Site) {

	var settings map[string]string
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid SMTP settings")
		return
	}

	// Validate allowed values before persisting any changes.
	if len(settings) == 0 {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "SMTP settings are required")
		return
	}

	if enabled, ok := settings["enabled"]; ok && enabled != "true" && enabled != "false" {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid SMTP enabled value")
		return
	}

	if host, ok := settings["host"]; ok {
		if strings.ContainsAny(host, "\r\n\t /\\") {
			apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid SMTP host")
			return
		}
	}

	if port, ok := settings["port"]; ok {
		value, err := strconv.Atoi(port)
		if err != nil || value < 1 || value > 65535 {
			apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid SMTP port")
			return
		}
	}

	if encryption, ok := settings["encryption"]; ok {
		if encryption != "starttls" && encryption != "tls" {
			apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid SMTP encryption mode")
			return
		}
	}

	if address, ok := settings["from_email"]; ok && address != "" {
		parsed, err := mail.ParseAddress(address)
		if err != nil || parsed.Address != address {
			apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid SMTP sender email")
			return
		}
	}

	for _, key := range []string{"username", "from_name"} {
		if strings.ContainsAny(settings[key], "\r\n") {
			apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid SMTP setting")
			return
		}
	}

	// Passwords are managed separately and never accepted by this endpoint.
	if err := db.SaveSMTPSettings(m.DB, site.ID, settings); err != nil {
		logger.Error("apiSaveSMTP: siteID=%d: %v", site.ID, err)
		apiutil.ErrorMsg(w, http.StatusBadRequest, "unable to save SMTP settings")
		return
	}

	logger.Debug("apiSaveSMTP: siteID=%d saved", site.ID)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
