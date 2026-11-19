// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package db

import (
	"database/sql"
	"fmt"

	"podnest/internal/models"
)

// SetSMTPPassword encrypts and stores a site's SMTP password.
func SetSMTPPassword(database *sql.DB, siteID int64, password string) error {

	// Encrypt before storing; never persist plaintext credentials.
	sealed, err := sealSMTPPassword(siteID, password)
	if err != nil {
		return fmt.Errorf("encrypt SMTP password: %w", err)
	}

	return SetConfig(database, siteID, models.ConfigSMTP, "password", sealed)
}

// GetSMTPPassword retrieves and decrypts a site's SMTP password.
// This function must only be called by trusted internal code.
func GetSMTPPassword(database *sql.DB, siteID int64) (string, error) {

	// Retrieve the encrypted password.
	stored, exists, err := GetConfigValue(database, siteID, models.ConfigSMTP, "password")
	if err != nil {
		return "", err
	}

	if !exists {
		return "", nil
	}

	// Decrypt only for authorized internal operations.
	return openSMTPPassword(siteID, stored)
}

// DeleteSMTPPassword removes a site's stored SMTP password.
func DeleteSMTPPassword(database *sql.DB, siteID int64) error {

	return DeleteConfig(database, siteID, models.ConfigSMTP, "password")
}

// GetSMTPSettings returns a site's SMTP settings without exposing its password.
func GetSMTPSettings(database *sql.DB, siteID int64) (map[string]string, error) {

	// Retrieve the site's stored SMTP configuration.
	settings, err := GetConfigsBySiteAndType(database, siteID, models.ConfigSMTP)
	if err != nil {
		return nil, err
	}

	// Report whether credentials exist without returning the encrypted value.
	_, exists := settings["password"]
	delete(settings, "password")

	settings["password_set"] = "false"
	if exists {
		settings["password_set"] = "true"
	}

	return settings, nil
}
