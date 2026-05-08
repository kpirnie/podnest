package server

import (
	"encoding/json"
	"net/http"
	"strconv"

	"podnest/internal/auth"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
)

// -- TOTP management ---------------------------------------------------------

// apiTOTPSetup generates a new TOTP secret for a user and returns the provisioning URI.
// The secret is stored but not yet active (totp_enabled stays 0) until confirmed.
func (s *Server) apiTOTPSetup(w http.ResponseWriter, r *http.Request) {
	caller := auth.UserFromContext(r.Context())
	target, ok := s.resolveUser(w, r)
	if !ok {
		return
	}

	// only the user themselves or an admin may set up TOTP
	if caller.ID != target.ID && caller.Role != models.RoleAdmin {
		apiErrorMsg(w, http.StatusForbidden, "forbidden")
		return
	}

	secret, err := auth.GenerateTOTPSecret()
	if err != nil {
		logger.Error("apiTOTPSetup: failed to generate secret for user %d: %v", target.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	if err := db.SetTOTPSecret(s.cfg.DB, target.ID, secret); err != nil {
		logger.Error("apiTOTPSetup: failed to store secret for user %d: %v", target.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	uri := auth.TOTPProvisioningURI(secret, target.UName, "PodNest")
	logger.Debug("TOTP setup initiated for user %d", target.ID)
	apiJSON(w, http.StatusOK, map[string]string{
		"secret": secret,
		"uri":    uri,
	})
}

// apiTOTPConfirm verifies a TOTP code and activates TOTP for the user.
func (s *Server) apiTOTPConfirm(w http.ResponseWriter, r *http.Request) {
	caller := auth.UserFromContext(r.Context())
	target, ok := s.resolveUser(w, r)
	if !ok {
		return
	}

	if caller.ID != target.ID && caller.Role != models.RoleAdmin {
		apiErrorMsg(w, http.StatusForbidden, "forbidden")
		return
	}

	var req struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Code == "" {
		apiErrorMsg(w, http.StatusBadRequest, "code is required")
		return
	}

	// re-fetch to get the latest secret
	fresh, err := db.GetUserByID(s.cfg.DB, target.ID)
	if err != nil || fresh == nil || fresh.TOTPSecret == "" {
		apiErrorMsg(w, http.StatusBadRequest, "no TOTP secret found — run setup first")
		return
	}

	if !auth.VerifyTOTP(fresh.TOTPSecret, req.Code) {
		apiErrorMsg(w, http.StatusUnprocessableEntity, "invalid TOTP code")
		return
	}

	if err := db.EnableTOTP(s.cfg.DB, target.ID); err != nil {
		logger.Error("apiTOTPConfirm: failed to enable TOTP for user %d: %v", target.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	backupCodes, err := auth.GenerateBackupCodes(8)
	if err != nil {
		logger.Error("apiTOTPConfirm: failed to generate backup codes for user %d: %v", target.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	if err := db.StoreBackupCodes(s.cfg.DB, target.ID, backupCodes); err != nil {
		logger.Error("apiTOTPConfirm: failed to store backup codes for user %d: %v", target.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	logger.Info("TOTP enabled for user %d", target.ID)
	apiJSON(w, http.StatusOK, map[string]any{
		"enabled":      true,
		"backup_codes": backupCodes,
	})
}

// apiTOTPDisable clears the TOTP secret and disables TOTP for the user.
// Admins may disable TOTP for any user; regular users may only disable their own.
func (s *Server) apiTOTPDisable(w http.ResponseWriter, r *http.Request) {
	caller := auth.UserFromContext(r.Context())
	target, ok := s.resolveUser(w, r)
	if !ok {
		return
	}

	if caller.ID != target.ID && caller.Role != models.RoleAdmin {
		apiErrorMsg(w, http.StatusForbidden, "forbidden")
		return
	}

	if err := db.DisableTOTP(s.cfg.DB, target.ID); err != nil {
		logger.Error("apiTOTPDisable: failed for user %d: %v", target.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	_ = db.DeleteBackupCodes(s.cfg.DB, target.ID)

	logger.Info("TOTP disabled for user %d by caller %d", target.ID, caller.ID)
	w.WriteHeader(http.StatusNoContent)
}

// apiListUsers returns all users with password hashes stripped — admin only
func (s *Server) apiListUsers(w http.ResponseWriter, r *http.Request) {

	// retrieve all users from the database
	users, err := db.GetAllUsers(s.cfg.DB)
	if err != nil {
		logger.Error("failed to retrieve users: %v", err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// build a safe output slice that omits password hashes and TOTP secrets before sending
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

	// map each user to the safe struct, formatting the created timestamp as a string
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
	apiJSON(w, http.StatusOK, out)
}

// apiGetUser returns a single user's safe fields by ID — admin only
func (s *Server) apiGetUser(w http.ResponseWriter, r *http.Request) {

	// resolve the user from the path and return their safe fields as JSON
	user, ok := s.resolveUser(w, r)
	if !ok {
		logger.Error("failed to resolve user: %v", r)
		return
	}

	logger.Debug("retrieved user %d: %s", user.ID, user.UName)
	apiJSON(w, http.StatusOK, map[string]any{
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

// apiCreateUser creates a new user account — admin only
func (s *Server) apiCreateUser(w http.ResponseWriter, r *http.Request) {

	// decode the request body into the create user request struct
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
		apiError(w, http.StatusBadRequest, err)
		return
	}

	// validate required fields are present
	if req.UName == "" || req.Password == "" || req.Email == "" {
		logger.Error("missing required fields for user creation: uname=%s email=%s", req.UName, req.Email)
		apiErrorMsg(w, http.StatusBadRequest, "uname, password, and email are required")
		return
	}

	// default any invalid role value to manager
	if req.Role != models.RoleManager && req.Role != models.RoleAdmin {
		logger.Debug("invalid role %d for new user '%s', defaulting to manager", req.Role, req.UName)
		req.Role = models.RoleManager
	}

	// check that the username is not already taken
	existing, err := db.GetUserByUsername(s.cfg.DB, req.UName)
	if err != nil {
		logger.Error("failed to check username uniqueness for '%s': %v", req.UName, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	if existing != nil {
		logger.Error("username '%s' is already taken", req.UName)
		apiErrorMsg(w, http.StatusConflict, "username already exists")
		return
	}

	// hash the password before storing it
	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		logger.Error("failed to hash password for user '%s': %v", req.UName, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// generate a unique user hash for the new account
	uhash, err := models.GenerateUHash()
	if err != nil {
		logger.Error("failed to generate user hash for '%s': %v", req.UName, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// build the user struct and insert it into the database
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
	if err := db.CreateUser(s.cfg.DB, user); err != nil {
		logger.Error("failed to create user '%s': %v", req.UName, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// strip the password hash before returning the created user record
	logger.Debug("created user %d: %s", user.ID, user.UName)
	user.PWord = ""
	apiJSON(w, http.StatusCreated, user)
}

// apiUpdateUser updates mutable fields on an existing user — admin only
func (s *Server) apiUpdateUser(w http.ResponseWriter, r *http.Request) {

	// resolve the target user from the path
	target, ok := s.resolveUser(w, r)
	if !ok {
		logger.Error("failed to resolve user: %v", r)
		return
	}

	// retrieve the calling user from the request context for role-change authorization
	caller := auth.UserFromContext(r.Context())

	// decode the request body into the update fields struct
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
		apiError(w, http.StatusBadRequest, err)
		return
	}

	// only admins can change usernames
	if caller.Role == models.RoleAdmin && req.UName != "" && req.UName != target.UName {
		existing, err := db.GetUserByUsername(s.cfg.DB, req.UName)
		if err != nil {
			logger.Error("failed to check username uniqueness for '%s': %v", req.UName, err)
			apiError(w, http.StatusInternalServerError, err)
			return
		}
		if existing != nil {
			logger.Error("username '%s' is already taken", req.UName)
			apiErrorMsg(w, http.StatusConflict, "username already exists")
			return
		}
		logger.Debug("admin %d changing username of user %d to '%s'", caller.ID, target.ID, req.UName)
		target.UName = req.UName
	}

	// apply non-empty field updates to the target user
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

	// only admins can change roles; validate the incoming role value before applying
	if caller.Role == models.RoleAdmin && req.Role != 0 {
		if req.Role == models.RoleManager || req.Role == models.RoleAdmin {
			logger.Debug("admin %d updating role of user %d to %d", caller.ID, target.ID, req.Role)
			target.Role = req.Role
		}
	}

	// persist the updated user fields to the database
	if err := db.UpdateUser(s.cfg.DB, target); err != nil {
		logger.Error("failed to update user %d: %v", target.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// if a new password was supplied, hash and store it, then invalidate all existing sessions
	if req.Password != "" {
		hash, err := auth.HashPassword(req.Password)
		if err != nil {
			logger.Error("failed to hash new password for user %d: %v", target.ID, err)
			apiError(w, http.StatusInternalServerError, err)
			return
		}
		if err := db.UpdatePassword(s.cfg.DB, target.ID, hash); err != nil {
			logger.Error("failed to update password for user %d: %v", target.ID, err)
			apiError(w, http.StatusInternalServerError, err)
			return
		}

		// invalidate all existing sessions for this user
		logger.Debug("invalidating all sessions for user %d after password change", target.ID)
		_ = db.DeleteUserSessions(s.cfg.DB, target.ID)
	}

	// strip the password hash before returning the updated user record
	logger.Debug("updated user %d: %s", target.ID, target.UName)
	target.PWord = ""
	apiJSON(w, http.StatusOK, target)
}

// apiDeleteUser removes a user account — admin only; blocked if the user owns any sites
func (s *Server) apiDeleteUser(w http.ResponseWriter, r *http.Request) {

	// resolve the target user from the path
	target, ok := s.resolveUser(w, r)
	if !ok {
		logger.Error("failed to resolve user: %v", r)
		return
	}

	// retrieve the calling user to prevent self-deletion
	caller := auth.UserFromContext(r.Context())

	// block admins from deleting their own account
	if target.ID == caller.ID {
		logger.Error("user %d attempted to delete their own account", caller.ID)
		apiErrorMsg(w, http.StatusBadRequest, "cannot delete your own account")
		return
	}

	// delete the user — will fail if they own any sites due to ON DELETE RESTRICT
	if err := db.DeleteUser(s.cfg.DB, target.ID); err != nil {
		logger.Error("failed to delete user %d: %v", target.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("deleted user %d: %s", target.ID, target.UName)
	w.WriteHeader(http.StatusNoContent)
}

// -- internal ----------------------------------------------------------------

// resolveUser extracts the user ID from the path and loads the record, returning 400/404 on failure
func (s *Server) resolveUser(w http.ResponseWriter, r *http.Request) (*models.User, bool) {

	// parse and validate the user ID from the path
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		logger.Error("invalid user id in path: %s", idStr)
		apiErrorMsg(w, http.StatusBadRequest, "invalid user id")
		return nil, false
	}

	// look up the user record by primary key
	user, err := db.GetUserByID(s.cfg.DB, id)
	if err != nil {
		logger.Error("failed to retrieve user %d: %v", id, err)
		apiError(w, http.StatusInternalServerError, err)
		return nil, false
	}

	// return 404 if the user does not exist
	if user == nil {
		logger.Error("user %d not found", id)
		apiErrorMsg(w, http.StatusNotFound, "user not found")
		return nil, false
	}

	logger.Debug("resolved user %d: %s", user.ID, user.UName)
	return user, true
}
