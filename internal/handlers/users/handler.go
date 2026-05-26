package users

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"podnest/internal/apiutil"
	"podnest/internal/auth"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
)

// Handler handles user and TOTP management API routes.
type Handler struct {
	DB *sql.DB
}

// RegisterRoutes mounts user and TOTP management routes onto api.
func (h *Handler) RegisterRoutes(api *http.ServeMux) {
	api.Handle("GET /users", auth.RequireAPIAdmin(http.HandlerFunc(h.apiListUsers)))
	api.Handle("POST /users", auth.RequireAPIAdmin(http.HandlerFunc(h.apiCreateUser)))
	api.Handle("GET /users/{id}", auth.RequireAPIAdmin(http.HandlerFunc(h.apiGetUser)))
	api.Handle("PUT /users/{id}", auth.RequireAPIAdmin(http.HandlerFunc(h.apiUpdateUser)))
	api.Handle("DELETE /users/{id}", auth.RequireAPIAdmin(http.HandlerFunc(h.apiDeleteUser)))

	api.HandleFunc("POST /users/{id}/totp/setup", h.apiTOTPSetup)
	api.HandleFunc("POST /users/{id}/totp/confirm", h.apiTOTPConfirm)
	api.HandleFunc("DELETE /users/{id}/totp", h.apiTOTPDisable)
}

func (h *Handler) apiListUsers(w http.ResponseWriter, r *http.Request) {
	users, err := db.GetAllUsers(h.DB)
	if err != nil {
		logger.Error("failed to retrieve users: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	type safeUser struct {
		ID          int64  `json:"id"`
		UName       string `json:"uname"`
		UHash       string `json:"uhash"`
		FName       string `json:"fname"`
		LName       string `json:"lname"`
		Email       string `json:"email"`
		Phone       string `json:"phone"`
		Role        int    `json:"role"`
		TOTPEnabled bool   `json:"totp_enabled"`
		Created     string `json:"created"`
	}

	out := make([]safeUser, 0, len(users))
	for _, u := range users {
		out = append(out, safeUser{
			ID:          u.ID,
			UName:       u.UName,
			UHash:       u.UHash,
			FName:       u.FName,
			LName:       u.LName,
			Email:       u.Email,
			Phone:       u.Phone,
			Role:        u.Role,
			TOTPEnabled: u.TOTPEnabled,
			Created:     u.Created.Format("2006-01-02 15:04:05"),
		})
	}

	logger.Debug("retrieved %d users", len(out))
	apiutil.JSON(w, http.StatusOK, out)
}

func (h *Handler) apiGetUser(w http.ResponseWriter, r *http.Request) {
	user, ok := h.resolveUser(w, r)
	if !ok {
		return
	}
	logger.Debug("retrieved user %d: %s", user.ID, user.UName)
	apiutil.JSON(w, http.StatusOK, map[string]any{
		"id":           user.ID,
		"uname":        user.UName,
		"uhash":        user.UHash,
		"fname":        user.FName,
		"lname":        user.LName,
		"email":        user.Email,
		"phone":        user.Phone,
		"role":         user.Role,
		"totp_enabled": user.TOTPEnabled,
		"created":      user.Created.Format("2006-01-02 15:04:05"),
	})
}

func (h *Handler) apiCreateUser(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UName    string `json:"uname"`
		Password string `json:"password"`
		FName    string `json:"fname"`
		LName    string `json:"lname"`
		Email    string `json:"email"`
		Phone    string `json:"phone"`
		Role     int    `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("failed to decode request body for user creation: %v", err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	if req.UName == "" || req.Password == "" || req.Email == "" {
		logger.Error("missing required fields for user creation: uname=%s email=%s", req.UName, req.Email)
		apiutil.ErrorMsg(w, http.StatusBadRequest, "uname, password, and email are required")
		return
	}

	if req.Role != models.RoleManager && req.Role != models.RoleAdmin {
		logger.Debug("invalid role %d for new user '%s', defaulting to manager", req.Role, req.UName)
		req.Role = models.RoleManager
	}

	existing, err := db.GetUserByUsername(h.DB, req.UName)
	if err != nil {
		logger.Error("failed to check username uniqueness for '%s': %v", req.UName, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if existing != nil {
		logger.Error("username '%s' is already taken", req.UName)
		apiutil.ErrorMsg(w, http.StatusConflict, "username already exists")
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		logger.Error("failed to hash password for user '%s': %v", req.UName, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	uhash, err := models.GenerateUHash()
	if err != nil {
		logger.Error("failed to generate user hash for '%s': %v", req.UName, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	user := &models.User{
		UName: req.UName,
		PWord: hash,
		UHash: uhash,
		FName: req.FName,
		LName: req.LName,
		Email: req.Email,
		Phone: req.Phone,
		Role:  req.Role,
	}
	if err := db.CreateUser(h.DB, user); err != nil {
		logger.Error("failed to create user '%s': %v", req.UName, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("created user %d: %s", user.ID, user.UName)
	user.PWord = ""
	apiutil.JSON(w, http.StatusCreated, user)
}

func (h *Handler) apiUpdateUser(w http.ResponseWriter, r *http.Request) {
	target, ok := h.resolveUser(w, r)
	if !ok {
		return
	}
	caller := auth.UserFromContext(r.Context())

	var req struct {
		UName    string `json:"uname"`
		FName    string `json:"fname"`
		LName    string `json:"lname"`
		Email    string `json:"email"`
		Phone    string `json:"phone"`
		Role     int    `json:"role"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("failed to decode request body for user update on user %d: %v", target.ID, err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	if caller.Role == models.RoleAdmin && req.UName != "" && req.UName != target.UName {
		existing, err := db.GetUserByUsername(h.DB, req.UName)
		if err != nil {
			logger.Error("failed to check username uniqueness for '%s': %v", req.UName, err)
			apiutil.Error(w, http.StatusInternalServerError, err)
			return
		}
		if existing != nil {
			logger.Error("username '%s' is already taken", req.UName)
			apiutil.ErrorMsg(w, http.StatusConflict, "username already exists")
			return
		}
		logger.Debug("admin %d changing username of user %d to '%s'", caller.ID, target.ID, req.UName)
		target.UName = req.UName
	}

	if req.FName != "" {
		target.FName = req.FName
	}
	if req.LName != "" {
		target.LName = req.LName
	}
	if req.Email != "" {
		target.Email = req.Email
	}
	if req.Phone != "" {
		target.Phone = req.Phone
	}

	if caller.Role == models.RoleAdmin && req.Role != 0 {
		if req.Role == models.RoleManager || req.Role == models.RoleAdmin {
			logger.Debug("admin %d updating role of user %d to %d", caller.ID, target.ID, req.Role)
			target.Role = req.Role
		}
	}

	if err := db.UpdateUser(h.DB, target); err != nil {
		logger.Error("failed to update user %d: %v", target.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	if req.Password != "" {
		hash, err := auth.HashPassword(req.Password)
		if err != nil {
			logger.Error("failed to hash new password for user %d: %v", target.ID, err)
			apiutil.Error(w, http.StatusInternalServerError, err)
			return
		}
		if err := db.UpdatePassword(h.DB, target.ID, hash); err != nil {
			logger.Error("failed to update password for user %d: %v", target.ID, err)
			apiutil.Error(w, http.StatusInternalServerError, err)
			return
		}
		logger.Debug("invalidating all sessions for user %d after password change", target.ID)
		_ = db.DeleteUserSessions(h.DB, target.ID)
	}

	logger.Debug("updated user %d: %s", target.ID, target.UName)
	target.PWord = ""
	apiutil.JSON(w, http.StatusOK, target)
}

func (h *Handler) apiDeleteUser(w http.ResponseWriter, r *http.Request) {
	target, ok := h.resolveUser(w, r)
	if !ok {
		return
	}
	caller := auth.UserFromContext(r.Context())

	if target.ID == caller.ID {
		logger.Error("user %d attempted to delete their own account", caller.ID)
		apiutil.ErrorMsg(w, http.StatusBadRequest, "cannot delete your own account")
		return
	}

	if err := db.DeleteUser(h.DB, target.ID); err != nil {
		logger.Error("failed to delete user %d: %v", target.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("deleted user %d: %s", target.ID, target.UName)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) apiTOTPSetup(w http.ResponseWriter, r *http.Request) {
	caller := auth.UserFromContext(r.Context())
	target, ok := h.resolveUser(w, r)
	if !ok {
		return
	}

	if caller.ID != target.ID && caller.Role != models.RoleAdmin {
		apiutil.ErrorMsg(w, http.StatusForbidden, "forbidden")
		return
	}

	secret, err := auth.GenerateTOTPSecret()
	if err != nil {
		logger.Error("apiTOTPSetup: failed to generate secret for user %d: %v", target.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	if err := db.SetTOTPSecret(h.DB, target.ID, secret); err != nil {
		logger.Error("apiTOTPSetup: failed to store secret for user %d: %v", target.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	uri := auth.TOTPProvisioningURI(secret, target.UName, "PodNest")
	logger.Debug("TOTP setup initiated for user %d", target.ID)
	apiutil.JSON(w, http.StatusOK, map[string]string{"secret": secret, "uri": uri})
}

func (h *Handler) apiTOTPConfirm(w http.ResponseWriter, r *http.Request) {
	caller := auth.UserFromContext(r.Context())
	target, ok := h.resolveUser(w, r)
	if !ok {
		return
	}

	if caller.ID != target.ID && caller.Role != models.RoleAdmin {
		apiutil.ErrorMsg(w, http.StatusForbidden, "forbidden")
		return
	}

	var req struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Code == "" {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "code is required")
		return
	}

	fresh, err := db.GetUserByID(h.DB, target.ID)
	if err != nil || fresh == nil || fresh.TOTPSecret == "" {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "no TOTP secret found — run setup first")
		return
	}

	if !auth.VerifyTOTP(fresh.TOTPSecret, req.Code) {
		apiutil.ErrorMsg(w, http.StatusUnprocessableEntity, "invalid TOTP code")
		return
	}

	if err := db.EnableTOTP(h.DB, target.ID); err != nil {
		logger.Error("apiTOTPConfirm: failed to enable TOTP for user %d: %v", target.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	backupCodes, err := auth.GenerateBackupCodes(8)
	if err != nil {
		logger.Error("apiTOTPConfirm: failed to generate backup codes for user %d: %v", target.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if err := db.StoreBackupCodes(h.DB, target.ID, backupCodes); err != nil {
		logger.Error("apiTOTPConfirm: failed to store backup codes for user %d: %v", target.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	logger.Info("TOTP enabled for user %d", target.ID)
	apiutil.JSON(w, http.StatusOK, map[string]any{"enabled": true, "backup_codes": backupCodes})
}

func (h *Handler) apiTOTPDisable(w http.ResponseWriter, r *http.Request) {
	caller := auth.UserFromContext(r.Context())
	target, ok := h.resolveUser(w, r)
	if !ok {
		return
	}

	if caller.ID != target.ID && caller.Role != models.RoleAdmin {
		apiutil.ErrorMsg(w, http.StatusForbidden, "forbidden")
		return
	}

	if err := db.DisableTOTP(h.DB, target.ID); err != nil {
		logger.Error("apiTOTPDisable: failed for user %d: %v", target.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	_ = db.DeleteBackupCodes(h.DB, target.ID)

	logger.Info("TOTP disabled for user %d by caller %d", target.ID, caller.ID)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) resolveUser(w http.ResponseWriter, r *http.Request) (*models.User, bool) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		logger.Error("invalid user id in path: %s", idStr)
		apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid user id")
		return nil, false
	}

	user, err := db.GetUserByID(h.DB, id)
	if err != nil {
		logger.Error("failed to retrieve user %d: %v", id, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return nil, false
	}
	if user == nil {
		logger.Error("user %d not found", id)
		apiutil.ErrorMsg(w, http.StatusNotFound, "user not found")
		return nil, false
	}

	logger.Debug("resolved user %d: %s", user.ID, user.UName)
	return user, true
}
