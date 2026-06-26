// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package auth

import (
	"context"
	"crypto/subtle"
	"database/sql"
	"net/http"

	"podnest/internal/logger"
	"podnest/internal/models"
)

// contextKey is a type for context keys used in this package
type contextKey string

// ctxUser is the context key for the authenticated user
const ctxUser contextKey = "user"
const ctxCSRF contextKey = "csrf"

// RequireAuth rejects unauthenticated requests with a redirect to /login
func RequireAuth(database *sql.DB, next http.Handler) http.Handler {

	// This middleware checks for a valid session cookie.
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		// If no session cookie is found, redirect to the login page.
		sessionID := SessionFromRequest(r)
		if sessionID == "" {
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}

		// If a session cookie is found, look up the user in the database.
		session, user, err := SessionAndUser(database, sessionID)
		if err != nil || user == nil {
			logger.Error("the session cookie is invalid: %v", err)
			ClearSessionCookie(w)
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}

		logger.Debug("authenticated user: %v", user.UName)

		// validate CSRF token on all state-changing requests
		if r.Method != http.MethodGet && r.Method != http.MethodHead && r.Method != http.MethodOptions {
			if subtle.ConstantTimeCompare([]byte(r.Header.Get("X-CSRF-Token")), []byte(session.CSRFToken)) != 1 {
				logger.Error("CSRF validation failed for user %v", user.UName)
				apiForbidden(w)
				return
			}
		}

		// Add the authenticated user and CSRF token to the request context and call the next handler.
		next.ServeHTTP(w, r.WithContext(
			context.WithValue(
				context.WithValue(r.Context(), ctxUser, user),
				ctxCSRF, session.CSRFToken,
			),
		))
	})
}

// CSRFTokenFromContext retrieves the CSRF token from the request context.
func CSRFTokenFromContext(ctx context.Context) string {
	t, _ := ctx.Value(ctxCSRF).(string)
	return t
}

// RequireAdmin rejects non-admin users with 403
func RequireAdmin(next http.Handler) http.Handler {

	// This middleware checks if the authenticated user has the admin role.
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		// If the user is not an admin, return a 403 Forbidden response.
		user := UserFromContext(r.Context())
		if user == nil || user.Role != models.RoleAdmin {
			logger.Error("user is not an admin: %v", user)
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}

		logger.Debug("admin user: %v", user)

		// If the user is an admin, call the next handler.
		next.ServeHTTP(w, r)
	})
}

// RequireAPIAuth rejects unauthenticated API requests with 401 JSON
func RequireAPIAuth(database *sql.DB, next http.Handler) http.Handler {

	// This middleware checks for a valid session cookie and returns JSON errors instead of redirects.
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		// If no session cookie is found, return a 401 Unauthorized JSON response.
		sessionID := SessionFromRequest(r)
		if sessionID == "" {
			logger.Error("no session cookie found")
			apiUnauthorized(w)
			return
		}

		// If a session cookie is found, look up the user in the database.
		session, user, err := SessionAndUser(database, sessionID)
		if err != nil || user == nil {
			logger.Error("the session cookie is invalid: %v", err)
			apiUnauthorized(w)
			return
		}

		logger.Debug("authenticated user: %v", user.UName)

		// validate CSRF token on state-changing requests
		if r.Method != http.MethodGet && r.Method != http.MethodHead && r.Method != http.MethodOptions {
			if subtle.ConstantTimeCompare([]byte(r.Header.Get("X-CSRF-Token")), []byte(session.CSRFToken)) != 1 {
				logger.Error("CSRF validation failed for API request by user %v", user.UName)
				apiForbidden(w)
				return
			}
		}

		// Add the authenticated user to the request context and call the next handler.
		next.ServeHTTP(w, r.WithContext(
			context.WithValue(r.Context(), ctxUser, user),
		))
	})
}

// RequireAPIAdmin rejects non-admin API requests with 403 JSON
func RequireAPIAdmin(next http.Handler) http.Handler {

	// This middleware checks if the authenticated user has the admin role and returns JSON errors instead of redirects.
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		// If the user is not an admin, return a 403 Forbidden JSON response.
		user := UserFromContext(r.Context())
		if user == nil || user.Role != models.RoleAdmin {
			logger.Error("user is not an admin: %v", user)
			apiForbidden(w)
			return
		}

		logger.Debug("admin user: %v", user)

		// If the user is an admin, call the next handler.
		next.ServeHTTP(w, r)
	})
}

// UserFromContext retrieves the authenticated user from the request context
func UserFromContext(ctx context.Context) *models.User {

	// This function retrieves the authenticated user from the request context.
	u, _ := ctx.Value(ctxUser).(*models.User)
	return u
}

// setup the API unauthorized response
func apiUnauthorized(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	w.Write([]byte(`{"error":"unauthorized"}`))
}

// setup the API forbidden response
func apiForbidden(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusForbidden)
	w.Write([]byte(`{"error":"forbidden"}`))
}
