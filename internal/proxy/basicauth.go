// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package proxy

import (
	"net/http"
	"time"

	"podnest/internal/auth"
	"podnest/internal/db"
	"podnest/internal/logger"

	"golang.org/x/crypto/bcrypt"
)

// dummyBcryptHash is compared against when a basic-auth username is unknown, so
// an unknown user costs the same time as a known user with a wrong password —
// removing the username-enumeration timing oracle. Cost (12) must match the
// basic-auth module's hashing cost so the comparison time is equivalent.
var dummyBcryptHash, _ = bcrypt.GenerateFromPassword([]byte("podnest-basic-auth-timing-equalizer"), 12)

// basicAuthEntry holds the cached config and pre-hashed credentials for a site.
type basicAuthEntry struct {
	realm string
	users map[string]string // username → bcrypt hash
}

// WarmBasicAuthCache loads all enabled basic auth configs and credentials
// from the database and atomically replaces the in-memory cache.
// Called on startup and after any basic auth change.
func (p *Proxy) warmBasicAuthCache() {
	cfgs, users, err := db.GetAllBasicAuthData(p.database)
	if err != nil {
		logger.Error("proxy: WarmBasicAuthCache: %v", err)
		return
	}

	// clear existing entries before repopulating
	p.basicAuthCache.Range(func(k, _ any) bool {
		p.basicAuthCache.Delete(k)
		return true
	})

	for siteID, cfg := range cfgs {
		entry := &basicAuthEntry{
			realm: cfg.Realm,
			users: make(map[string]string, len(users[siteID])),
		}
		for _, u := range users[siteID] {
			entry.users[u.Username] = u.PasswordHash
		}
		p.basicAuthCache.Store(siteID, entry)
	}
	logger.Debug("proxy: basic auth cache warmed — %d sites", len(cfgs))
}

// enforceBasicAuth applies per-site basic auth when configured — checked before
// IP/UA/WAF so 401 is returned cleanly. Returns true when the request was
// denied and the response has already been written.
func (p *Proxy) enforceBasicAuth(w http.ResponseWriter, r *http.Request, siteID int64, start time.Time, clientIPStr, siteName string) bool {
	v, ok := p.basicAuthCache.Load(siteID)
	if !ok {
		return false
	}

	entry := v.(*basicAuthEntry)
	user, pass, hasAuth := r.BasicAuth()
	if !hasAuth {
		w.Header().Set("WWW-Authenticate", `Basic realm="`+entry.realm+`"`)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		dur := time.Since(start)
		p.writeAccessLog(r, http.StatusUnauthorized, 0, start, dur, clientIPStr, siteID, siteName)
		return true
	}

	// locked-out IPs are rejected before bcrypt runs — the compare is the
	// expensive half, and it is what makes an unthrottled 401 path a CPU
	// exhaustion target against the whole proxy rather than just this site
	if !auth.LoginAllowed(clientIPStr) {
		http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
		dur := time.Since(start)
		p.writeAccessLog(r, http.StatusTooManyRequests, 0, start, dur, clientIPStr, siteID, siteName)
		return true
	}

	hash, known := entry.users[user]
	if !known {
		// compare against a fixed dummy hash so an unknown user takes the
		// same time as a wrong password for a known user (no timing oracle)
		hash = string(dummyBcryptHash)
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(pass)) != nil || !known {
		auth.RecordFailedLogin(clientIPStr)
		w.Header().Set("WWW-Authenticate", `Basic realm="`+entry.realm+`"`)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		dur := time.Since(start)
		p.writeAccessLog(r, http.StatusUnauthorized, 0, start, dur, clientIPStr, siteID, siteName)
		return true
	}

	auth.RecordSuccessfulLogin(clientIPStr)
	return false
}
