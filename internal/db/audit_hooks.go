package db

import (
	"database/sql"
	"encoding/json"

	"podnest/internal/logger"
)

// snapshotJSON marshals v to a JSON string for audit prior_state/new_state fields.
// Returns an empty string on marshal failure — degraded detail, never fatal.
func snapshotJSON(v interface{}) string {
	b, err := json.Marshal(v)
	if err != nil {
		logger.Debug("snapshotJSON: marshal failed: %v", err)
		return ""
	}
	return string(b)
}

// SnapshotSite fetches the current state of a site row as a JSON string.
// Used by callers to capture prior_state before a mutating operation.
func SnapshotSite(database *sql.DB, id int64) string {
	s, err := GetSiteByID(database, id)
	if err != nil || s == nil {
		return ""
	}
	return snapshotJSON(s)
}

// SnapshotConfigs fetches all configs for a site+type as a JSON string.
func SnapshotConfigs(database *sql.DB, siteID int64, configType int) string {
	kv, err := GetConfigsBySiteAndType(database, siteID, configType)
	if err != nil {
		return ""
	}
	return snapshotJSON(kv)
}

// SnapshotIPRules fetches the current IP rules for a scope as a JSON string.
func SnapshotIPRules(database *sql.DB, siteID *int64) string {
	rules, err := GetIPRules(database, siteID)
	if err != nil {
		return ""
	}
	return snapshotJSON(rules)
}

// SnapshotUARules fetches the current UA rules for a scope as a JSON string.
func SnapshotUARules(database *sql.DB, siteID *int64) string {
	rules, err := GetUARules(database, siteID)
	if err != nil {
		return ""
	}
	return snapshotJSON(rules)
}

// SnapshotRedirects fetches the current redirects for a site as a JSON string.
func SnapshotRedirects(database *sql.DB, siteID int64) string {
	redirects, err := GetRedirectsBySite(database, siteID)
	if err != nil {
		return ""
	}
	return snapshotJSON(redirects)
}

// SnapshotRPRoutes fetches the current RP routes for a site as a JSON string.
func SnapshotRPRoutes(database *sql.DB, siteID int64) string {
	routes, err := GetRPRoutesBySite(database, siteID)
	if err != nil {
		return ""
	}
	return snapshotJSON(routes)
}

// SnapshotDomain fetches a single domain record as a JSON string.
func SnapshotDomain(database *sql.DB, id int64) string {
	d, err := GetDomainByID(database, id)
	if err != nil || d == nil {
		return ""
	}
	return snapshotJSON(d)
}

// SnapshotCron fetches a single cron record as a JSON string.
func SnapshotCron(database *sql.DB, id int64) string {
	c, err := GetCron(database, id)
	if err != nil || c == nil {
		return ""
	}
	return snapshotJSON(c)
}

// SnapshotSetting fetches a single setting value as a JSON string.
func SnapshotSetting(database *sql.DB, key string) string {
	v, err := GetSetting(database, key)
	if err != nil {
		return ""
	}
	return snapshotJSON(map[string]string{key: v})
}

// SnapshotAllSettings fetches all settings as a JSON string.
func SnapshotAllSettings(database *sql.DB) string {
	m, err := GetAllSettings(database)
	if err != nil {
		return ""
	}
	return snapshotJSON(m)
}

// SnapshotUser serializes a User struct to JSON for audit prior_state.
func SnapshotAny(u interface{}) string {
	return snapshotJSON(u)
}
