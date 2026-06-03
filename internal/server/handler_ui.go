package server

import (
	"net/http"

	"podnest/internal/auth"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/version"
	"podnest/web"
)

// handleUI serves the single-page shell for all UI routes
func (s *Server) handleUI(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())

	data := map[string]any{
		"User":            user,
		"CSRFToken":       auth.CSRFTokenFromContext(r.Context()),
		"AppVersion":      version.AppVersion,
		"UpdateAvailable": false,
		"LatestVersion":   "",
		"ReleaseURL":      version.ReleaseURL,
		"UpdateURL":       version.UpdateURL,
	}

	// check for updates only for admin users
	if user != nil && user.Role == models.RoleAdmin {
		latest, updateAvailable := version.CheckLatest()
		data["UpdateAvailable"] = updateAvailable
		data["LatestVersion"] = latest
	}

	// try to execute and load in the template
	if err := web.Templates.ExecuteTemplate(w, "app.html", data); err != nil {
		logger.Error("failed to execute app.html template: %v", err)
		http.Error(w, "template error", http.StatusInternalServerError)
	}
}

// handleLogin serves GET /login and processes POST /login
func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:

		// redirect authenticated users to the dashboard
		sessionID := auth.SessionFromRequest(r)
		if sessionID != "" {
			user, _ := auth.SessionUser(s.cfg.DB, sessionID)
			if user != nil {
				logger.Debug("already-authenticated user '%s', redirecting to dashboard", user.UName)
				http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
				return
			}
		}

		// render the login page
		var loginData map[string]any
		if msg := r.URL.Query().Get("msg"); msg != "" {
			loginData = map[string]any{"Error": msg}
		}
		if err := web.Templates.ExecuteTemplate(w, "login.html", loginData); err != nil {
			logger.Error("failed to execute login.html template: %v", err)
			http.Error(w, "template error", http.StatusInternalServerError)
		}

	case http.MethodPost:

		// reject the request immediately if this IP is locked out
		if !auth.LoginAllowed(r) {
			http.Error(w, "too many failed attempts, please try again later", http.StatusTooManyRequests)
			return
		}

		// parse the form values from the request body
		if err := r.ParseForm(); err != nil {
			logger.Error("failed to parse login form: %v", err)
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}

		uname := r.FormValue("username")
		password := r.FormValue("password")

		// attempt to log in with the provided credentials
		result, err := auth.Login(s.cfg.DB, uname, password)
		if err != nil {
			logger.Error("login failed for user '%s': %v", uname, err)
			if err := web.Templates.ExecuteTemplate(w, "login.html", map[string]any{
				"Error": "Invalid username or password",
			}); err != nil {
				logger.Error("failed to execute login.html template after failed login: %v", err)
				http.Error(w, "template error", http.StatusInternalServerError)
			}
			// log it for the ratelimiter
			auth.RecordFailedLogin(r)
			return
		}

		// TOTP is required — issue a pending token and redirect to the TOTP step
		if result.TOTPRequired {
			pendingToken, err := models.GenerateSessionID()
			if err != nil {
				logger.Error("failed to generate TOTP pending token: %v", err)
				http.Error(w, "internal error", http.StatusInternalServerError)
				return
			}
			if err := db.CreateTOTPPending(s.cfg.DB, pendingToken, result.UserID, auth.TOTPPendingDuration); err != nil {
				logger.Error("failed to store TOTP pending token: %v", err)
				http.Error(w, "internal error", http.StatusInternalServerError)
				return
			}
			auth.SetTOTPPendingCookie(w, r, pendingToken)
			http.Redirect(w, r, "/login/totp", http.StatusSeeOther)
			return
		}

		// set the session cookie and redirect to the dashboard on success
		logger.Debug("user '%s' logged in successfully", uname)
		auth.RecordSuccessfulLogin(r)
		auth.SetSessionCookie(w, r, result.SessionID)
		http.Redirect(w, r, "/dashboard", http.StatusSeeOther)

	default:
		logger.Error("method not allowed")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleLoginTOTP serves GET /login/totp (form) and POST /login/totp (verify)
func (s *Server) handleLoginTOTP(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		pendingToken := auth.TOTPPendingFromRequest(r)
		if pendingToken == "" {
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}
		pending, err := db.GetTOTPPending(s.cfg.DB, pendingToken)
		if err != nil || pending == nil {
			auth.ClearTOTPPendingCookie(w)
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}
		if err := web.Templates.ExecuteTemplate(w, "totp.html", nil); err != nil {
			logger.Error("failed to execute totp.html template: %v", err)
			http.Error(w, "template error", http.StatusInternalServerError)
		}

	case http.MethodPost:
		pendingToken := auth.TOTPPendingFromRequest(r)
		if pendingToken == "" {
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}

		pending, err := db.GetTOTPPending(s.cfg.DB, pendingToken)
		if err != nil || pending == nil {
			auth.ClearTOTPPendingCookie(w)
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}

		if err := r.ParseForm(); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}
		code := r.FormValue("code")

		// load the user's TOTP secret
		user, err := db.GetUserByID(s.cfg.DB, pending.UID)
		if err != nil || user == nil {
			auth.ClearTOTPPendingCookie(w)
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}

		if !auth.VerifyTOTP(user.TOTPSecret, code) {
			// fall back to backup codes
			used, _ := db.UseBackupCode(s.cfg.DB, user.ID, code)
			if !used {
				logger.Warn("invalid TOTP/backup code for user %d", user.ID)
				if err := web.Templates.ExecuteTemplate(w, "totp.html", map[string]any{
					"Error": "Invalid or expired code — please try again",
				}); err != nil {
					http.Error(w, "template error", http.StatusInternalServerError)
				}
				return
			}
			logger.Debug("user '%s' authenticated with backup code", user.UName)
		}

		// TOTP verified — consume the pending token and create a full session
		_ = db.DeleteTOTPPending(s.cfg.DB, pendingToken)
		auth.ClearTOTPPendingCookie(w)

		sessionID, _, err := auth.CreateSession(s.cfg.DB, user.ID)
		if err != nil {
			logger.Error("failed to create session after TOTP for user %d: %v", user.ID, err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}

		logger.Debug("user '%s' completed TOTP login", user.UName)
		auth.SetSessionCookie(w, r, sessionID)
		http.Redirect(w, r, "/dashboard", http.StatusSeeOther)

	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleLogout clears the session and redirects to login
func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {

	// retrieve and delete the session from the database if one exists
	sessionID := auth.SessionFromRequest(r)
	if sessionID != "" {
		if err := auth.Logout(s.cfg.DB, sessionID); err != nil {
			logger.Error("failed to delete session on logout: %v", err)
		}
		logger.Debug("session %s logged out", sessionID)
	}

	// clear the session cookie and redirect to the login page
	auth.ClearSessionCookie(w)
	http.Redirect(w, r, "/login", http.StatusSeeOther)
}
