package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"time"

	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"

	"golang.org/x/crypto/bcrypt"
)

// setup the session cookie name and duration, and define common auth errors
const (
	SessionCookieName = "podnest_session"
	SessionDuration   = 8 * time.Hour
	PassChars         = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@%^*-_+=!.~"
	PassMin           = 32
	PassMax           = 64
)

// Common authentication errors
var (
	ErrInvalidCredentials = errors.New("invalid username or password")
	ErrUnauthorized       = errors.New("unauthorized")
	ErrForbidden          = errors.New("forbidden")
)

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

// LoginResult is returned by Login to indicate the outcome of a login attempt.
type LoginResult struct {
	// SessionID is non-empty when the user is fully authenticated (no TOTP required).
	SessionID string
	// TOTPRequired is true when the password was correct but TOTP must be verified.
	TOTPRequired bool
	// UserID is the authenticated user's ID; set when TOTPRequired is true.
	UserID int64
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

	// If TOTP is enabled, signal the caller to handle the second step
	if user.TOTPEnabled {
		logger.Info("TOTP required for user: %s", uname)
		return &LoginResult{TOTPRequired: true, UserID: user.ID}, nil
	}

	// Generate a new session ID
	sessionID, err := models.GenerateSessionID()
	if err != nil {
		logger.Error("failed to generate session ID: %v", err)
		return nil, err
	}

	// setup the session record
	session := &models.Session{
		ID:        sessionID,
		UID:       user.ID,
		ExpiresAt: time.Now().UTC().Add(SessionDuration),
	}

	// Store the session in the database
	if err := db.CreateSession(database, session); err != nil {
		logger.Error("failed to create session: %v", err)
		return nil, err
	}

	logger.Info("User logged in: %s", uname)

	// Return the session ID to be set in the cookie
	return &LoginResult{SessionID: sessionID}, nil
}

// CreateSession builds a full session for a user (used after TOTP verification).
func CreateSession(database *sql.DB, userID int64) (string, error) {
	sessionID, err := models.GenerateSessionID()
	if err != nil {
		return "", err
	}
	session := &models.Session{
		ID:        sessionID,
		UID:       userID,
		ExpiresAt: time.Now().UTC().Add(SessionDuration),
	}
	if err := db.CreateSession(database, session); err != nil {
		return "", err
	}
	return sessionID, nil
}

// SetTOTPPendingCookie writes the short-lived TOTP pending cookie.
func SetTOTPPendingCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     TOTPPendingCookieName,
		Value:    token,
		Path:     "/login",
		HttpOnly: true,
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

	logger.Info("User logged out: %s", sessionID)

	// Delete the session from the database
	return db.DeleteSession(database, sessionID)
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
		logger.Error("failed to retrieve session: %v", session)
		return nil, errors.New("session not found")
	}

	// Check if the session is expired
	if err := db.ExtendSession(database, sessionID, SessionDuration); err != nil {
		logger.Error("failed to extend session: %v", err)
		return nil, err
	}

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
func SetSessionCookie(w http.ResponseWriter, sessionID string) {

	// Set the session cookie with appropriate flags
	http.SetCookie(w, &http.Cookie{
		Name:     SessionCookieName,
		Value:    sessionID,
		Path:     "/",
		HttpOnly: true,
		Secure:   false, // Set to true in production with HTTPS
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

	logger.Info("Purging expired sessions")
	return db.DeleteExpiredSessions(database)
}
