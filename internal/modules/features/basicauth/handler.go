package basicauth

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"golang.org/x/crypto/bcrypt"

	"podnest/internal/apiutil"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
)

// -- request types -----------------------------------------------------------

// configRequest is the request body for updating basic auth settings.
type configRequest struct {
	Enabled bool   `json:"enabled"`
	Realm   string `json:"realm"`
}

// userRequest is the request body for adding or updating a credential.
type userRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// -- response types ----------------------------------------------------------

// userResponse omits the password hash from API responses.
type userResponse struct {
	ID       int64  `json:"id"`
	Username string `json:"username"`
}

// -- handlers ----------------------------------------------------------------

// apiGetConfig returns the basic auth configuration for a site.
func (m Module) apiGetConfig(w http.ResponseWriter, _ *http.Request, site *models.Site) {
	cfg, err := db.GetBasicAuthConfig(m.DB, site.ID)
	if err != nil {
		logger.Error("apiGetConfig: siteID=%d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	logger.Debug("apiGetConfig: siteID=%d retrieved", site.ID)
	apiutil.JSON(w, http.StatusOK, cfg)
}

// apiSaveConfig persists basic auth settings and refreshes the proxy cache.
func (m Module) apiSaveConfig(w http.ResponseWriter, r *http.Request, site *models.Site) {
	var req configRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("apiSaveConfig: siteID=%d decode: %v", site.ID, err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}
	realm := req.Realm
	if realm == "" {
		realm = "Restricted"
	}
	if err := db.SaveBasicAuthConfig(m.DB, db.BasicAuthConfig{
		SiteID:  site.ID,
		Enabled: req.Enabled,
		Realm:   realm,
	}); err != nil {
		logger.Error("apiSaveConfig: siteID=%d save: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	go m.WarmCaches()
	logger.Debug("apiSaveConfig: siteID=%d saved, cache refresh triggered", site.ID)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// apiGetUsers returns all credential usernames for a site (hashes omitted).
func (m Module) apiGetUsers(w http.ResponseWriter, _ *http.Request, site *models.Site) {
	users, err := db.GetBasicAuthUsers(m.DB, site.ID)
	if err != nil {
		logger.Error("apiGetUsers: siteID=%d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	resp := make([]userResponse, 0, len(users))
	for _, u := range users {
		resp = append(resp, userResponse{ID: u.ID, Username: u.Username})
	}
	logger.Debug("apiGetUsers: siteID=%d returned %d entries", site.ID, len(resp))
	apiutil.JSON(w, http.StatusOK, resp)
}

// apiUpsertUser adds or updates a credential for a site.
func (m Module) apiUpsertUser(w http.ResponseWriter, r *http.Request, site *models.Site) {
	var req userRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("apiUpsertUser: siteID=%d decode: %v", site.ID, err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}
	if req.Username == "" || req.Password == "" {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "username and password are required")
		return
	}

	// hash with bcrypt — cost 12 is a reasonable balance of security and latency
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		logger.Error("apiUpsertUser: siteID=%d bcrypt: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if err := db.UpsertBasicAuthUser(m.DB, site.ID, req.Username, string(hash)); err != nil {
		logger.Error("apiUpsertUser: siteID=%d save: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	go m.WarmCaches()
	logger.Debug("apiUpsertUser: siteID=%d username=%q saved, cache refresh triggered", site.ID, req.Username)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// apiDeleteUser removes a single credential from a site.
func (m Module) apiDeleteUser(w http.ResponseWriter, r *http.Request, site *models.Site) {
	uidStr := r.PathValue("uid")
	uid, err := strconv.ParseInt(uidStr, 10, 64)
	if err != nil {
		apiutil.ErrorMsg(w, http.StatusBadRequest, fmt.Sprintf("invalid user id: %s", uidStr))
		return
	}
	if err := db.DeleteBasicAuthUser(m.DB, site.ID, uid); err != nil {
		logger.Error("apiDeleteUser: siteID=%d uid=%d: %v", site.ID, uid, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	go m.WarmCaches()
	logger.Debug("apiDeleteUser: siteID=%d uid=%d removed, cache refresh triggered", site.ID, uid)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
