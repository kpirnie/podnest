// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package security

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"podnest/internal/apiutil"
	"podnest/internal/db"
	"podnest/internal/logger"
)

// autoBanSettingsRequest is the body for saving the global auto-ban settings
type autoBanSettingsRequest struct {
	Threshold      int `json:"threshold"`
	WindowSecs     int `json:"window_secs"`
	CooldownSecs   int `json:"cooldown_secs"`
	BanSecs        int `json:"ban_secs"`
	PermStrikes    int `json:"perm_strikes"`
	PermWindowSecs int `json:"perm_window_secs"`
	EscalateSites  int `json:"escalate_sites"`
}

// autoBanSiteRequest is the body for saving a site's auto-ban override; a
// null value inherits the global setting
type autoBanSiteRequest struct {
	Enabled        bool `json:"enabled"`
	Threshold      *int `json:"threshold"`
	WindowSecs     *int `json:"window_secs"`
	CooldownSecs   *int `json:"cooldown_secs"`
	BanSecs        *int `json:"ban_secs"`
	PermStrikes    *int `json:"perm_strikes"`
	PermWindowSecs *int `json:"perm_window_secs"`
}

// autoBanField pairs a setting with its bounds for validation
type autoBanField struct {
	name   string
	v      *int
	lo, hi int
}

// validateAutoBanFields bounds every set field — a typo must not disable
// enforcement (a threshold of 0) or ban an IP for years. Nil fields inherit
// and are skipped.
func validateAutoBanFields(fields []autoBanField) error {
	for _, f := range fields {
		if f.v == nil {
			continue
		}
		if *f.v < f.lo || *f.v > f.hi {
			return fmt.Errorf("%s must be between %d and %d", f.name, f.lo, f.hi)
		}
	}
	return nil
}

// autoBanSiteFields lists the per-site fields with their bounds
func autoBanSiteFields(threshold, window, cooldown, ban, strikes, strikeWindow *int) []autoBanField {
	return []autoBanField{
		{"threshold", threshold, 1, 10000},
		{"window_secs", window, 1, 86400},
		{"cooldown_secs", cooldown, 1, 604800},
		{"ban_secs", ban, 60, 31536000},
		{"perm_strikes", strikes, 1, 1000},
		{"perm_window_secs", strikeWindow, 60, 2592000},
	}
}

// autoBanScope maps a nullable site ID to the proxy's scope ID, where 0 is global
func autoBanScope(siteID *int64) int64 {
	if siteID == nil {
		return 0
	}
	return *siteID
}

// -- global ------------------------------------------------------------------

func (h *Handler) apiGetGlobalAutoBanSettings(w http.ResponseWriter, r *http.Request) {
	s, err := db.GetAutoBanSettings(h.DB)
	if err != nil {
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	apiutil.JSON(w, http.StatusOK, s)
}

func (h *Handler) apiSaveGlobalAutoBanSettings(w http.ResponseWriter, r *http.Request) {
	var req autoBanSettingsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	fields := autoBanSiteFields(&req.Threshold, &req.WindowSecs, &req.CooldownSecs, &req.BanSecs, &req.PermStrikes, &req.PermWindowSecs)
	fields = append(fields, autoBanField{"escalate_sites", &req.EscalateSites, 2, 1000})
	if err := validateAutoBanFields(fields); err != nil {
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	if err := db.SaveAutoBanSettings(h.DB, db.AutoBanSettings(req)); err != nil {
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	if err := h.refreshSecurityCache(); err != nil {
		logger.Error("apiSaveGlobalAutoBanSettings: cache refresh failed: %v", err)
	}
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) apiGetGlobalAutoBans(w http.ResponseWriter, r *http.Request) {
	h.listAutoBans(w, nil)
}

func (h *Handler) apiGlobalAutoBanPermanent(w http.ResponseWriter, r *http.Request) {
	h.permanentAutoBan(w, r, nil)
}

func (h *Handler) apiGlobalAutoBanAllow(w http.ResponseWriter, r *http.Request) {
	h.allowAutoBan(w, r, nil)
}

func (h *Handler) apiGlobalAutoBanRemove(w http.ResponseWriter, r *http.Request) {
	h.removeAutoBan(w, r, nil)
}

// -- per-site ----------------------------------------------------------------

func (h *Handler) apiGetSiteAutoBanSettings(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}

	o, err := db.GetAutoBanSiteOverride(h.DB, site.ID)
	if err != nil {
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	global, err := db.GetAutoBanSettings(h.DB)
	if err != nil {
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// the global values ride along so the form can show what a blank field inherits
	apiutil.JSON(w, http.StatusOK, map[string]any{"override": o, "global": global})
}

func (h *Handler) apiSaveSiteAutoBanSettings(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}

	var req autoBanSiteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}
	if err := validateAutoBanFields(autoBanSiteFields(req.Threshold, req.WindowSecs, req.CooldownSecs, req.BanSecs, req.PermStrikes, req.PermWindowSecs)); err != nil {
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	o := db.AutoBanSiteOverride{
		SiteID:         site.ID,
		Enabled:        req.Enabled,
		Threshold:      req.Threshold,
		WindowSecs:     req.WindowSecs,
		CooldownSecs:   req.CooldownSecs,
		BanSecs:        req.BanSecs,
		PermStrikes:    req.PermStrikes,
		PermWindowSecs: req.PermWindowSecs,
	}
	if err := db.SaveAutoBanSiteOverride(h.DB, o); err != nil {
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	if err := h.refreshSecurityCache(); err != nil {
		logger.Error("apiSaveSiteAutoBanSettings: cache refresh failed: %v", err)
	}
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) apiGetSiteAutoBans(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}
	h.listAutoBans(w, &site.ID)
}

func (h *Handler) apiSiteAutoBanPermanent(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}
	h.permanentAutoBan(w, r, &site.ID)
}

// apiSiteAutoBanAllow is mounted admin-only — bypass is global, so a site
// owner allowing an IP here would grant it a bypass on every site
func (h *Handler) apiSiteAutoBanAllow(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}
	h.allowAutoBan(w, r, &site.ID)
}

func (h *Handler) apiSiteAutoBanRemove(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}
	h.removeAutoBan(w, r, &site.ID)
}

// -- shared implementations --------------------------------------------------

// listAutoBans returns the active bans for a scope
func (h *Handler) listAutoBans(w http.ResponseWriter, siteID *int64) {
	bans, err := db.GetAutoBans(h.DB, siteID)
	if err != nil {
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if bans == nil {
		bans = []*db.AutoBan{}
	}
	apiutil.JSON(w, http.StatusOK, bans)
}

// loadAutoBan resolves the ban named in the path within its scope, writing
// the error response itself when the ban is missing or the ID is malformed
func (h *Handler) loadAutoBan(w http.ResponseWriter, r *http.Request, siteID *int64) (*db.AutoBan, bool) {
	id, err := strconv.ParseInt(r.PathValue("banID"), 10, 64)
	if err != nil {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid ban id")
		return nil, false
	}

	ban, err := db.GetAutoBan(h.DB, siteID, id)
	if errors.Is(err, sql.ErrNoRows) {
		apiutil.ErrorMsg(w, http.StatusNotFound, "ban not found")
		return nil, false
	}
	if err != nil {
		apiutil.Error(w, http.StatusInternalServerError, err)
		return nil, false
	}
	return ban, true
}

// permanentAutoBan makes a ban within a scope permanent
func (h *Handler) permanentAutoBan(w http.ResponseWriter, r *http.Request, siteID *int64) {
	ban, ok := h.loadAutoBan(w, r, siteID)
	if !ok {
		return
	}

	if err := db.SetAutoBanPermanent(h.DB, siteID, ban.ID); err != nil {
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	h.Proxy.AutoBanSetPermanent(autoBanScope(siteID), ban.IP)

	logger.Debug("permanentAutoBan: %s made permanent for siteID=%v", ban.IP, siteID)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// removeAutoBan lifts a ban within a scope, clearing its strike history
func (h *Handler) removeAutoBan(w http.ResponseWriter, r *http.Request, siteID *int64) {
	ban, ok := h.loadAutoBan(w, r, siteID)
	if !ok {
		return
	}

	if err := db.DeleteAutoBan(h.DB, siteID, ban.ID); err != nil {
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	h.Proxy.AutoBanRemove(autoBanScope(siteID), ban.IP)

	logger.Debug("removeAutoBan: %s removed for siteID=%v", ban.IP, siteID)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// allowAutoBan adds a banned IP to the security bypass list and lifts the ban
func (h *Handler) allowAutoBan(w http.ResponseWriter, r *http.Request, siteID *int64) {
	ban, ok := h.loadAutoBan(w, r, siteID)
	if !ok {
		return
	}

	if err := db.AddBypassRule(h.DB, ban.IP, "allowed from auto-ban"); err != nil {
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	allRules, _ := db.GetAllBypassRules(h.DB)
	h.Proxy.WarmBypassCache(allRules)

	if err := db.DeleteAutoBan(h.DB, siteID, ban.ID); err != nil {
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	h.Proxy.AutoBanRemove(autoBanScope(siteID), ban.IP)

	logger.Debug("allowAutoBan: %s moved to bypass from siteID=%v", ban.IP, siteID)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
