// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"time"

	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"

	"golang.org/x/crypto/bcrypt"
)

// setup the session cookie name and duration
const (
	SessionCookieName     = "podnest_session"
	SessionDuration       = 8 * time.Hour
	PassChars             = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@%^*-_+=!.~"
	PassMin               = 32
	PassMax               = 64
	sessionExtendInterval = 5 * time.Minute
)

// Common authentication errors
var (
	ErrInvalidCredentials = errors.New("invalid username or password")
	ErrUnauthorized       = errors.New("unauthorized")
	ErrForbidden          = errors.New("forbidden")
)

// loginDummyHash is compared against when a panel username is unknown, so
// unknown-user and known-user-wrong-password logins take the same time
var loginDummyHash, _ = bcrypt.GenerateFromPassword([]byte("podnest-login-timing-equalizer"), bcrypt.DefaultCost)

// LoginResult is returned by Login to indicate the outcome of a login attempt.
type LoginResult struct {
	SessionID    string
	TOTPRequired bool
	UserID       int64
	TOTPKey      []byte
}

// isSecure reports whether the request arrived over a secure connection,
// either directly via TLS or via a TLS-terminating proxy.
func isSecure(r *http.Request) bool {
	return r.TLS != nil || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
}

// GeneratePassword returns a cryptographically random SFTP password
func GeneratePassword() (string, error) {
	max := big.NewInt(int64(len(PassChars)))
	lenRange, err := rand.Int(rand.Reader, big.NewInt(int64(PassMax-PassMin+1)))
	if err != nil {
		return "", err
	}
	length := int(lenRange.Int64()) + PassMin
	b := make([]byte, length)
	for i := range b {
		n, err := rand.Int(rand.Reader, max)
		if err != nil {
			return "", err
		}
		b[i] = PassChars[n.Int64()]
	}
	return string(b), nil
}

// Login verifies credentials. When TOTP is not enabled it creates and returns
// a full session. When TOTP is enabled it returns TOTPRequired=true so the
// caller can issue a short-lived pending token and redirect to the TOTP step.
func Login(database *sql.DB, uname, password string) (*LoginResult, error) {

	// Retrieve the user by username
	user, err := db.GetUserByUsername(database, uname)
	if err != nil {
		logger.Error("failed to retrieve user: %v", err)
		return nil, err
	}

	// If user is nil, it means the username does not exist
	if user == nil {
		// Compare against the dummy hash so the response time matches a real-user wrong password
		h := sha256.Sum256([]byte(password))
		_ = bcrypt.CompareHashAndPassword(loginDummyHash, []byte(fmt.Sprintf("%x", h)))
		logger.Error("failed to retrieve user: %v", ErrInvalidCredentials)
		return nil, ErrInvalidCredentials
	}

	// Hash the provided password using SHA-256 before comparing with the stored bcrypt hash
	h := sha256.Sum256([]byte(password))
	hashed := fmt.Sprintf("%x", h)

	// Use bcrypt to compare the hashed password with the stored hash
	if err := bcrypt.CompareHashAndPassword([]byte(user.PWord), []byte(hashed)); err != nil {
		logger.Error("password comparison failed: %v", err)
		return nil, ErrInvalidCredentials
	}

	// Derive the TOTP encryption key from the password while it is still in hand
	salt := user.TOTPSalt
	if salt == "" {
		if s, sErr := GenerateTOTPSalt(); sErr == nil && db.SetTOTPSalt(database, user.ID, s) == nil {
			salt = s
		}
	}
	var totpKey []byte
	if salt != "" {
		totpKey = DeriveTOTPKey(password, salt)
	}

	// If TOTP is enabled, signal the caller to handle the second step
	if user.TOTPEnabled {
		logger.Debug("TOTP required for user: %s", uname)
		return &LoginResult{TOTPRequired: true, UserID: user.ID, TOTPKey: totpKey}, nil
	}

	// Generate a new session ID
	sessionID, err := models.GenerateSessionID()
	if err != nil {
		logger.Error("failed to generate session ID: %v", err)
		return nil, err
	}

	// Generate a CSRF token for the session
	csrfToken, err := models.GenerateSessionID()
	if err != nil {
		logger.Error("failed to generate CSRF token: %v", err)
		return nil, err
	}

	// Create a new session object
	session := &models.Session{
		ID:        sessionID,
		UID:       user.ID,
		ExpiresAt: time.Now().UTC().Add(SessionDuration),
		CSRFToken: csrfToken,
	}

	// Store the session in the database
	if err := db.CreateSession(database, session); err != nil {
		logger.Error("failed to create session: %v", err)
		return nil, err
	}

	logger.Debug("User logged in: %s", uname)

	// Keep the derived key in memory for the session so enrollment can encrypt immediately
	StashTOTPKey(sessionID, totpKey, SessionDuration)

	// Return the session ID to be set in the cookie
	return &LoginResult{SessionID: sessionID}, nil
}

// CreateSession builds a full session for a user (used after TOTP verification).
func CreateSession(database *sql.DB, userID int64) (string, string, error) {
	sessionID, err := models.GenerateSessionID()
	if err != nil {
		return "", "", err
	}
	csrfToken, err := models.GenerateSessionID()
	if err != nil {
		return "", "", err
	}
	session := &models.Session{
		ID:        sessionID,
		UID:       userID,
		ExpiresAt: time.Now().UTC().Add(SessionDuration),
		CSRFToken: csrfToken,
	}
	if err := db.CreateSession(database, session); err != nil {
		return "", "", err
	}
	return sessionID, csrfToken, nil
}

// SetTOTPPendingCookie writes the short-lived TOTP pending cookie.
func SetTOTPPendingCookie(w http.ResponseWriter, r *http.Request, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     TOTPPendingCookieName,
		Value:    token,
		Path:     "/login",
		HttpOnly: true,
		Secure:   isSecure(r),
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(TOTPPendingDuration.Seconds()),
	})
}

// ClearTOTPPendingCookie expires the TOTP pending cookie.
func ClearTOTPPendingCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     TOTPPendingCookieName,
		Value:    "",
		Path:     "/login",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
}

// TOTPPendingFromRequest extracts the TOTP pending token from the request cookie.
func TOTPPendingFromRequest(r *http.Request) string {
	cookie, err := r.Cookie(TOTPPendingCookieName)
	if err != nil {
		return ""
	}
	return cookie.Value
}

// Logout deletes the session record
func Logout(database *sql.DB, sessionID string) error {

	logger.Debug("User logged out: %s", sessionID)

	// Delete the session from the database
	return db.DeleteSession(database, sessionID)
}

// maybeExtendSession refreshes the sliding expiry only once the session has
// aged past sessionExtendInterval since its last extension.
func maybeExtendSession(database *sql.DB, s *models.Session) {
	if time.Until(s.ExpiresAt) < SessionDuration-sessionExtendInterval {
		if err := db.ExtendSession(database, s.ID, SessionDuration); err != nil {
			logger.Error("failed to extend session: %v", err)
		}
	}
}

// SessionAndUser fetches the session and its user in a single DB read, throttling
// the sliding-expiry write. Returns (nil, nil, nil) when missing or expired.
func SessionAndUser(database *sql.DB, sessionID string) (*models.Session, *models.User, error) {
	session, err := db.GetSession(database, sessionID)
	if err != nil {
		return nil, nil, err
	}
	if session == nil {
		return nil, nil, nil
	}
	maybeExtendSession(database, session)
	user, err := db.GetUserByID(database, session.UID)
	if err != nil {
		return nil, nil, err
	}
	return session, user, nil
}

// SessionUser retrieves the user associated with a session token
// Returns nil if the session does not exist or is expired
func SessionUser(database *sql.DB, sessionID string) (*models.User, error) {

	// Retrieve the session from the database
	session, err := db.GetSession(database, sessionID)
	if err != nil {
		logger.Error("failed to retrieve session: %v", err)
		return nil, err
	}
	if session == nil {
		logger.Debug("session not found: %s", sessionID)
		return nil, errors.New("session not found")
	}

	// Check if the session is expired
	maybeExtendSession(database, session)

	logger.Debug("retrieved session: %v", session)

	// Retrieve the user associated with the session
	return db.GetUserByID(database, session.UID)
}

// SessionFromRequest extracts the session token from the request cookie
func SessionFromRequest(r *http.Request) string {

	// Get the session cookie from the request
	cookie, err := r.Cookie(SessionCookieName)
	if err != nil {
		return ""
	}

	logger.Debug("Retrieved session cookie")

	// return the cookie value (session ID)
	return cookie.Value
}

// SetSessionCookie writes the session cookie to the response
func SetSessionCookie(w http.ResponseWriter, r *http.Request, sessionID string) {
	http.SetCookie(w, &http.Cookie{
		Name:     SessionCookieName,
		Value:    sessionID,
		Path:     "/",
		HttpOnly: true,
		Secure:   isSecure(r),
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(SessionDuration.Seconds()),
	})
	logger.Debug("set the login session cookie")
}

// ClearSessionCookie expires the session cookie
func ClearSessionCookie(w http.ResponseWriter) {

	// Expire the session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     SessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})

	logger.Debug("cleared the login session cookie")
}

// HashPassword returns a bcrypt hash of the given password
func HashPassword(password string) (string, error) {

	// bcrypt limit is 72 bytes — pre-hash to avoid silent truncation
	h := sha256.Sum256([]byte(password))
	hashed := fmt.Sprintf("%x", h)

	// Hash the pre-hashed password with bcrypt
	b, err := bcrypt.GenerateFromPassword([]byte(hashed), bcrypt.DefaultCost)
	if err != nil {
		logger.Error("failed to hash password: %v", err)
		return "", err
	}

	logger.Debug("hashed password successfully")

	// Return the bcrypt hash as a string
	return string(b), err
}

// PurgeExpiredSessions deletes all expired sessions — called by the server reaper
func PurgeExpiredSessions(database *sql.DB) error {

	logger.Debug("Purging expired sessions")
	return db.DeleteExpiredSessions(database)
}
