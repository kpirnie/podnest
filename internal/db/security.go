// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package db

import (
	"database/sql"

	"podnest/internal/logger"
	"podnest/internal/models"
)

// IPRule represents a single IP/CIDR allow or block entry
type IPRule struct {
	ID       int64
	SiteID   *int64
	ListType int
	CIDR     string
}

// UARrule represents a single user-agent substring allow or block entry
type UARule struct {
	ID       int64
	SiteID   *int64
	ListType int
	Pattern  string
}

// BypassRule represents a single IP/CIDR that bypasses all security checks.
type BypassRule struct {
	ID   int64
	CIDR string
	Note string
}

// CountryRule represents a single ISO 3166-1 alpha-2 country code allow or
// block entry. ListType follows the IP/UA rule convention: 0 = blacklist,
// 1 = whitelist.
type CountryRule struct {
	ID       int64
	SiteID   *int64
	ListType int
	Code     string
}

// ASNRule represents a single autonomous system number allow or block
// entry. ListType follows the IP/UA rule convention: 0 = blacklist,
// 1 = whitelist.
type ASNRule struct {
	ID       int64
	SiteID   *int64
	ListType int
	ASN      uint32
}

// GetIPRules returns all IP rules optionally scoped to a site.
// Pass nil for siteID to retrieve global rules only.
func GetIPRules(db *sql.DB, siteID *int64) ([]*IPRule, error) {

	// build the query depending on whether we want global or per-site rules
	var (
		rows *sql.Rows
		err  error
	)
	if siteID == nil {
		rows, err = db.Query(`
			SELECT id, site_id, list_type, cidr
			FROM kppn_ip_rules WHERE site_id IS NULL
			ORDER BY list_type ASC, id ASC`)
	} else {
		rows, err = db.Query(`
			SELECT id, site_id, list_type, cidr
			FROM kppn_ip_rules WHERE site_id = ?
			ORDER BY list_type ASC, id ASC`, *siteID)
	}
	if err != nil {
		logger.Error("GetIPRules: query failed: %v", err)
		return nil, err
	}
	defer rows.Close()

	// scan each row into an IPRule struct
	var rules []*IPRule
	for rows.Next() {
		r := &IPRule{}
		if err := rows.Scan(&r.ID, &r.SiteID, &r.ListType, &r.CIDR); err != nil {
			logger.Error("GetIPRules: scan failed: %v", err)
			return nil, err
		}
		rules = append(rules, r)
	}

	logger.Debug("GetIPRules: retrieved %d rules", len(rules))
	return rules, rows.Err()
}

// GetAllIPRules returns every IP rule across all sites and global scope.
// Used to warm the proxy rule cache on startup.
func GetAllIPRules(db *sql.DB) ([]*IPRule, error) {
	rows, err := db.Query(`
		SELECT id, site_id, list_type, cidr
		FROM kppn_ip_rules ORDER BY list_type ASC, id ASC`)
	if err != nil {
		logger.Error("GetAllIPRules: query failed: %v", err)
		return nil, err
	}
	defer rows.Close()

	var rules []*IPRule
	for rows.Next() {
		r := &IPRule{}
		if err := rows.Scan(&r.ID, &r.SiteID, &r.ListType, &r.CIDR); err != nil {
			logger.Error("GetAllIPRules: scan failed: %v", err)
			return nil, err
		}
		rules = append(rules, r)
	}

	logger.Debug("GetAllIPRules: retrieved %d rules", len(rules))
	return rules, rows.Err()
}

// ReplaceIPRules atomically replaces all rules for the given scope
// (global when siteID is nil, per-site otherwise) with the provided slice.
func ReplaceIPRules(db *sql.DB, siteID *int64, rules []IPRule) error {

	// wrap in a transaction so the delete+insert is atomic
	tx, err := db.Begin()
	if err != nil {
		logger.Error("ReplaceIPRules: begin tx failed: %v", err)
		return err
	}
	defer tx.Rollback()

	// delete existing rules for this scope
	if siteID == nil {
		if _, err := tx.Exec(`DELETE FROM kppn_ip_rules WHERE site_id IS NULL`); err != nil {
			logger.Error("ReplaceIPRules: delete global failed: %v", err)
			return err
		}
	} else {
		if _, err := tx.Exec(`DELETE FROM kppn_ip_rules WHERE site_id = ?`, *siteID); err != nil {
			logger.Error("ReplaceIPRules: delete site %d failed: %v", *siteID, err)
			return err
		}
	}

	// insert the new rules
	for _, r := range rules {
		if _, err := tx.Exec(`
			INSERT INTO kppn_ip_rules (site_id, list_type, cidr) VALUES (?, ?, ?)`,
			siteID, r.ListType, r.CIDR,
		); err != nil {
			logger.Error("ReplaceIPRules: insert failed: %v", err)
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		logger.Error("ReplaceIPRules: commit failed: %v", err)
		return err
	}

	logger.Debug("ReplaceIPRules: replaced rules for siteID=%v with %d entries", siteID, len(rules))
	return nil
}

// GetUARules returns all UA rules optionally scoped to a site.
// Pass nil for siteID to retrieve global rules only.
func GetUARules(db *sql.DB, siteID *int64) ([]*UARule, error) {

	// build the query depending on whether we want global or per-site rules
	var (
		rows *sql.Rows
		err  error
	)
	if siteID == nil {
		rows, err = db.Query(`
			SELECT id, site_id, list_type, pattern
			FROM kppn_ua_rules WHERE site_id IS NULL
			ORDER BY list_type ASC, id ASC`)
	} else {
		rows, err = db.Query(`
			SELECT id, site_id, list_type, pattern
			FROM kppn_ua_rules WHERE site_id = ?
			ORDER BY list_type ASC, id ASC`, *siteID)
	}
	if err != nil {
		logger.Error("GetUARules: query failed: %v", err)
		return nil, err
	}
	defer rows.Close()

	// scan each row into a UARule struct
	var rules []*UARule
	for rows.Next() {
		r := &UARule{}
		if err := rows.Scan(&r.ID, &r.SiteID, &r.ListType, &r.Pattern); err != nil {
			logger.Error("GetUARules: scan failed: %v", err)
			return nil, err
		}
		rules = append(rules, r)
	}

	logger.Debug("GetUARules: retrieved %d rules", len(rules))
	return rules, rows.Err()
}

// GetAllUARules returns every UA rule across all sites and global scope.
// Used to warm the proxy rule cache on startup.
func GetAllUARules(db *sql.DB) ([]*UARule, error) {
	rows, err := db.Query(`
		SELECT id, site_id, list_type, pattern
		FROM kppn_ua_rules ORDER BY list_type ASC, id ASC`)
	if err != nil {
		logger.Error("GetAllUARules: query failed: %v", err)
		return nil, err
	}
	defer rows.Close()

	var rules []*UARule
	for rows.Next() {
		r := &UARule{}
		if err := rows.Scan(&r.ID, &r.SiteID, &r.ListType, &r.Pattern); err != nil {
			logger.Error("GetAllUARules: scan failed: %v", err)
			return nil, err
		}
		rules = append(rules, r)
	}

	logger.Debug("GetAllUARules: retrieved %d rules", len(rules))
	return rules, rows.Err()
}

// ReplaceUARules atomically replaces all rules for the given scope
// (global when siteID is nil, per-site otherwise) with the provided slice.
func ReplaceUARules(db *sql.DB, siteID *int64, rules []UARule) error {

	// wrap in a transaction so the delete+insert is atomic
	tx, err := db.Begin()
	if err != nil {
		logger.Error("ReplaceUARules: begin tx failed: %v", err)
		return err
	}
	defer tx.Rollback()

	// delete existing rules for this scope
	if siteID == nil {
		if _, err := tx.Exec(`DELETE FROM kppn_ua_rules WHERE site_id IS NULL`); err != nil {
			logger.Error("ReplaceUARules: delete global failed: %v", err)
			return err
		}
	} else {
		if _, err := tx.Exec(`DELETE FROM kppn_ua_rules WHERE site_id = ?`, *siteID); err != nil {
			logger.Error("ReplaceUARules: delete site %d failed: %v", *siteID, err)
			return err
		}
	}

	// insert the new rules
	for _, r := range rules {
		if _, err := tx.Exec(`
			INSERT INTO kppn_ua_rules (site_id, list_type, pattern) VALUES (?, ?, ?)`,
			siteID, r.ListType, r.Pattern,
		); err != nil {
			logger.Error("ReplaceUARules: insert failed: %v", err)
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		logger.Error("ReplaceUARules: commit failed: %v", err)
		return err
	}

	logger.Debug("ReplaceUARules: replaced rules for siteID=%v with %d entries", siteID, len(rules))
	return nil
}

// DeleteIPRulesBySite removes all IP rules for a site — called on site deletion.
func DeleteIPRulesBySite(db *sql.DB, siteID int64) error {
	_, err := db.Exec(`DELETE FROM kppn_ip_rules WHERE site_id = ?`, siteID)
	if err != nil {
		logger.Error("DeleteIPRulesBySite: failed for site %d: %v", siteID, err)
	}
	logger.Debug("DeleteIPRulesBySite: removed rules for site %d", siteID)
	return err
}

// DeleteUARulesBySite removes all UA rules for a site — called on site deletion.
func DeleteUARulesBySite(db *sql.DB, siteID int64) error {
	_, err := db.Exec(`DELETE FROM kppn_ua_rules WHERE site_id = ?`, siteID)
	if err != nil {
		logger.Error("DeleteUARulesBySite: failed for site %d: %v", siteID, err)
	}
	logger.Debug("DeleteUARulesBySite: removed rules for site %d", siteID)
	return err
}

// IPRulesByType is a convenience helper that partitions a rule slice into
// blacklist and whitelist slices in a single pass.
func IPRulesByType(rules []*IPRule) (blacklist, whitelist []*IPRule) {
	for _, r := range rules {
		if r.ListType == models.RuleBlacklist {
			blacklist = append(blacklist, r)
		} else {
			whitelist = append(whitelist, r)
		}
	}
	return
}

// UARulesByType is a convenience helper that partitions a rule slice into
// blacklist and whitelist slices in a single pass.
func UARulesByType(rules []*UARule) (blacklist, whitelist []*UARule) {
	for _, r := range rules {
		if r.ListType == models.RuleBlacklist {
			blacklist = append(blacklist, r)
		} else {
			whitelist = append(whitelist, r)
		}
	}
	return
}

// GetAllBypassRules returns every bypass rule.
func GetAllBypassRules(db *sql.DB) ([]*BypassRule, error) {
	rows, err := db.Query(`SELECT id, cidr, note FROM kppn_security_bypass ORDER BY id ASC`)
	if err != nil {
		logger.Error("GetAllBypassRules: query failed: %v", err)
		return nil, err
	}
	defer rows.Close()

	var rules []*BypassRule
	for rows.Next() {
		r := &BypassRule{}
		if err := rows.Scan(&r.ID, &r.CIDR, &r.Note); err != nil {
			logger.Error("GetAllBypassRules: scan failed: %v", err)
			return nil, err
		}
		rules = append(rules, r)
	}

	logger.Debug("GetAllBypassRules: retrieved %d rules", len(rules))
	return rules, rows.Err()
}

// ReplaceBypassRules atomically replaces all bypass rules with the provided slice.
func ReplaceBypassRules(db *sql.DB, rules []BypassRule) error {
	tx, err := db.Begin()
	if err != nil {
		logger.Error("ReplaceBypassRules: begin tx failed: %v", err)
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`DELETE FROM kppn_security_bypass`); err != nil {
		logger.Error("ReplaceBypassRules: delete failed: %v", err)
		return err
	}

	for _, r := range rules {
		if _, err := tx.Exec(
			`INSERT INTO kppn_security_bypass (cidr, note) VALUES (?, ?)`,
			r.CIDR, r.Note,
		); err != nil {
			logger.Error("ReplaceBypassRules: insert failed: %v", err)
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		logger.Error("ReplaceBypassRules: commit failed: %v", err)
		return err
	}

	logger.Debug("ReplaceBypassRules: replaced with %d entries", len(rules))
	return nil
}

// AddBypassRule inserts a single bypass entry. Used by the CLI recovery
// path; the web UI continues to use ReplaceBypassRules.
func AddBypassRule(db *sql.DB, cidr, note string) error {
	if _, err := db.Exec(`
		INSERT INTO kppn_security_bypass (cidr, note) VALUES (?, ?)`,
		cidr, note,
	); err != nil {
		logger.Error("AddBypassRule: insert failed: %v", err)
		return err
	}

	logger.Debug("AddBypassRule: added %s", cidr)
	return nil
}

// GetCountryRules returns all country rules optionally scoped to a site.
// Pass nil for siteID to retrieve global rules only.
func GetCountryRules(db *sql.DB, siteID *int64) ([]*CountryRule, error) {

	// build the query depending on whether we want global or per-site rules
	var (
		rows *sql.Rows
		err  error
	)
	if siteID == nil {
		rows, err = db.Query(`
			SELECT id, site_id, list_type, code
			FROM kppn_country_rules WHERE site_id IS NULL
			ORDER BY list_type ASC, id ASC`)
	} else {
		rows, err = db.Query(`
			SELECT id, site_id, list_type, code
			FROM kppn_country_rules WHERE site_id = ?
			ORDER BY list_type ASC, id ASC`, *siteID)
	}
	if err != nil {
		logger.Error("GetCountryRules: query failed: %v", err)
		return nil, err
	}
	defer rows.Close()

	// scan each row into a CountryRule struct
	var rules []*CountryRule
	for rows.Next() {
		r := &CountryRule{}
		if err := rows.Scan(&r.ID, &r.SiteID, &r.ListType, &r.Code); err != nil {
			logger.Error("GetCountryRules: scan failed: %v", err)
			return nil, err
		}
		rules = append(rules, r)
	}

	logger.Debug("GetCountryRules: retrieved %d rules", len(rules))
	return rules, rows.Err()
}

// GetAllCountryRules returns every country rule across all sites and global
// scope. Used to warm the proxy rule cache on startup.
func GetAllCountryRules(db *sql.DB) ([]*CountryRule, error) {
	rows, err := db.Query(`
		SELECT id, site_id, list_type, code
		FROM kppn_country_rules ORDER BY list_type ASC, id ASC`)
	if err != nil {
		logger.Error("GetAllCountryRules: query failed: %v", err)
		return nil, err
	}
	defer rows.Close()

	var rules []*CountryRule
	for rows.Next() {
		r := &CountryRule{}
		if err := rows.Scan(&r.ID, &r.SiteID, &r.ListType, &r.Code); err != nil {
			logger.Error("GetAllCountryRules: scan failed: %v", err)
			return nil, err
		}
		rules = append(rules, r)
	}

	logger.Debug("GetAllCountryRules: retrieved %d rules", len(rules))
	return rules, rows.Err()
}

// ReplaceCountryRules atomically replaces all rules for the given scope
// (global when siteID is nil, per-site otherwise) with the provided slice.
func ReplaceCountryRules(db *sql.DB, siteID *int64, rules []CountryRule) error {

	// wrap in a transaction so the delete+insert is atomic
	tx, err := db.Begin()
	if err != nil {
		logger.Error("ReplaceCountryRules: begin tx failed: %v", err)
		return err
	}
	defer tx.Rollback()

	// delete existing rules for this scope
	if siteID == nil {
		if _, err := tx.Exec(`DELETE FROM kppn_country_rules WHERE site_id IS NULL`); err != nil {
			logger.Error("ReplaceCountryRules: delete global failed: %v", err)
			return err
		}
	} else {
		if _, err := tx.Exec(`DELETE FROM kppn_country_rules WHERE site_id = ?`, *siteID); err != nil {
			logger.Error("ReplaceCountryRules: delete site %d failed: %v", *siteID, err)
			return err
		}
	}

	// insert the new rules
	for _, r := range rules {
		if _, err := tx.Exec(`
			INSERT INTO kppn_country_rules (site_id, list_type, code) VALUES (?, ?, ?)`,
			siteID, r.ListType, r.Code,
		); err != nil {
			logger.Error("ReplaceCountryRules: insert failed: %v", err)
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		logger.Error("ReplaceCountryRules: commit failed: %v", err)
		return err
	}

	logger.Debug("ReplaceCountryRules: replaced rules for siteID=%v with %d entries", siteID, len(rules))
	return nil
}

// DeleteCountryRulesBySite removes all country rules belonging to a site.
// Used during site deletion cleanup.
func DeleteCountryRulesBySite(db *sql.DB, siteID int64) error {
	if _, err := db.Exec(`DELETE FROM kppn_country_rules WHERE site_id = ?`, siteID); err != nil {
		logger.Error("DeleteCountryRulesBySite: delete failed: %v", err)
		return err
	}
	return nil
}

// CountryRulesByType splits a rule slice into blacklist and whitelist groups.
func CountryRulesByType(rules []*CountryRule) (blacklist, whitelist []*CountryRule) {
	for _, r := range rules {
		if r.ListType == 0 {
			blacklist = append(blacklist, r)
		} else {
			whitelist = append(whitelist, r)
		}
	}
	return blacklist, whitelist
}

// GetASNRules returns all ASN rules optionally scoped to a site.
// Pass nil for siteID to retrieve global rules only.
func GetASNRules(db *sql.DB, siteID *int64) ([]*ASNRule, error) {

	// build the query depending on whether we want global or per-site rules
	var (
		rows *sql.Rows
		err  error
	)
	if siteID == nil {
		rows, err = db.Query(`
			SELECT id, site_id, list_type, asn
			FROM kppn_asn_rules WHERE site_id IS NULL
			ORDER BY list_type ASC, id ASC`)
	} else {
		rows, err = db.Query(`
			SELECT id, site_id, list_type, asn
			FROM kppn_asn_rules WHERE site_id = ?
			ORDER BY list_type ASC, id ASC`, *siteID)
	}
	if err != nil {
		logger.Error("GetASNRules: query failed: %v", err)
		return nil, err
	}
	defer rows.Close()

	// scan each row into an ASNRule struct
	var rules []*ASNRule
	for rows.Next() {
		r := &ASNRule{}
		if err := rows.Scan(&r.ID, &r.SiteID, &r.ListType, &r.ASN); err != nil {
			logger.Error("GetASNRules: scan failed: %v", err)
			return nil, err
		}
		rules = append(rules, r)
	}

	logger.Debug("GetASNRules: retrieved %d rules", len(rules))
	return rules, rows.Err()
}

// GetAllASNRules returns every ASN rule across all sites and global
// scope. Used to warm the proxy rule cache on startup.
func GetAllASNRules(db *sql.DB) ([]*ASNRule, error) {
	rows, err := db.Query(`
		SELECT id, site_id, list_type, asn
		FROM kppn_asn_rules ORDER BY list_type ASC, id ASC`)
	if err != nil {
		logger.Error("GetAllASNRules: query failed: %v", err)
		return nil, err
	}
	defer rows.Close()

	var rules []*ASNRule
	for rows.Next() {
		r := &ASNRule{}
		if err := rows.Scan(&r.ID, &r.SiteID, &r.ListType, &r.ASN); err != nil {
			logger.Error("GetAllASNRules: scan failed: %v", err)
			return nil, err
		}
		rules = append(rules, r)
	}

	logger.Debug("GetAllASNRules: retrieved %d rules", len(rules))
	return rules, rows.Err()
}

// ReplaceASNRules atomically replaces all rules for the given scope
// (global when siteID is nil, per-site otherwise) with the provided slice.
func ReplaceASNRules(db *sql.DB, siteID *int64, rules []ASNRule) error {

	// wrap in a transaction so the delete+insert is atomic
	tx, err := db.Begin()
	if err != nil {
		logger.Error("ReplaceASNRules: begin tx failed: %v", err)
		return err
	}
	defer tx.Rollback()

	// delete existing rules for this scope
	if siteID == nil {
		if _, err := tx.Exec(`DELETE FROM kppn_asn_rules WHERE site_id IS NULL`); err != nil {
			logger.Error("ReplaceASNRules: delete global failed: %v", err)
			return err
		}
	} else {
		if _, err := tx.Exec(`DELETE FROM kppn_asn_rules WHERE site_id = ?`, *siteID); err != nil {
			logger.Error("ReplaceASNRules: delete site %d failed: %v", *siteID, err)
			return err
		}
	}

	// insert the new rules
	for _, r := range rules {
		if _, err := tx.Exec(`
			INSERT INTO kppn_asn_rules (site_id, list_type, asn) VALUES (?, ?, ?)`,
			siteID, r.ListType, r.ASN,
		); err != nil {
			logger.Error("ReplaceASNRules: insert failed: %v", err)
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		logger.Error("ReplaceASNRules: commit failed: %v", err)
		return err
	}

	logger.Debug("ReplaceASNRules: replaced rules for siteID=%v with %d entries", siteID, len(rules))
	return nil
}

// ASNRulesByType splits a rule slice into blacklist and whitelist groups.
func ASNRulesByType(rules []*ASNRule) (blacklist, whitelist []*ASNRule) {
	for _, r := range rules {
		if r.ListType == 0 {
			blacklist = append(blacklist, r)
		} else {
			whitelist = append(whitelist, r)
		}
	}
	return blacklist, whitelist
}
