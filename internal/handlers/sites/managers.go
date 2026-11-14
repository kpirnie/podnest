// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package sites

import (
	"encoding/json"
	"fmt"
	"net/http"

	"podnest/internal/apiutil"
	"podnest/internal/audit"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
)

// apiGetSiteManagers returns the site owner and the IDs of the managers assigned to the site.
func (h *Handler) apiGetSiteManagers(w http.ResponseWriter, r *http.Request) {

	// resolve the site from the request path
	site, ok := h.ResolveSite(w, r)
	if !ok {
		return
	}

	// load the assigned manager IDs
	uids, err := db.GetSiteManagerIDs(h.DB, site.ID)
	if err != nil {
		logger.Error("failed to retrieve managers for site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// return the owner alongside the assigned managers so the UI can render both
	apiutil.JSON(w, http.StatusOK, map[string]any{"owner_id": site.UID, "uids": uids})
}

// apiSetSiteManagers replaces the set of managers assigned to the site.
func (h *Handler) apiSetSiteManagers(w http.ResponseWriter, r *http.Request) {

	// resolve the site from the request path
	site, ok := h.ResolveSite(w, r)
	if !ok {
		return
	}

	// define a struct to capture the expected JSON payload
	var req struct {
		UIDs []int64 `json:"uids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("invalid managers payload for site %d: %v", site.ID, err)
		apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid request")
		return
	}

	// drop the owner and duplicates, then require every remaining ID to be an active manager
	seen := map[int64]bool{site.UID: true}
	uids := make([]int64, 0, len(req.UIDs))
	for _, uid := range req.UIDs {
		if seen[uid] {
			continue
		}
		seen[uid] = true

		user, err := db.GetUserByID(h.DB, uid)
		if err != nil {
			logger.Error("failed to retrieve user %d for site %d managers: %v", uid, site.ID, err)
			apiutil.Error(w, http.StatusInternalServerError, err)
			return
		}
		if user == nil {
			logger.Error("user %d not found for site %d managers", uid, site.ID)
			apiutil.ErrorMsg(w, http.StatusBadRequest, fmt.Sprintf("unknown user %d", uid))
			return
		}
		if user.Role != models.RoleManager {
			logger.Error("user %d is not a manager, refusing assignment to site %d", uid, site.ID)
			apiutil.ErrorMsg(w, http.StatusBadRequest, fmt.Sprintf("user %d is not a manager", uid))
			return
		}
		if user.Blocked {
			logger.Error("user %d is blocked, refusing assignment to site %d", uid, site.ID)
			apiutil.ErrorMsg(w, http.StatusBadRequest, fmt.Sprintf("user %d is blocked", uid))
			return
		}
		uids = append(uids, uid)
	}

	// capture the current assignments for the audit trail, then replace the set
	prior := db.SnapshotSiteManagers(h.DB, site.ID)
	if err := db.SetSiteManagers(h.DB, site.ID, uids); err != nil {
		logger.Error("failed to set managers for site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	*r = *r.WithContext(audit.WithStateContext(r.Context(), prior, db.SnapshotSiteManagers(h.DB, site.ID)))

	// assignments feed the upstream guard, so drop it to pick up the change
	h.Proxy.InvalidateUpstreamGuard()

	logger.Debug("set %d managers for site %d", len(uids), site.ID)
	apiutil.JSON(w, http.StatusOK, map[string]any{"owner_id": site.UID, "uids": uids})
}
