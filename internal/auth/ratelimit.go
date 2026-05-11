package auth

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"podnest/internal/logger"
)

// loginRateLimit tunables
const (
	rlMaxAttempts  = 5                // failed attempts before lockout
	rlWindow       = 5 * time.Minute  // window in which attempts are counted
	rlLockout      = 15 * time.Minute // how long an IP is locked out
	rlCleanupEvery = 1 * time.Hour    // how often the cleanup goroutine runs
)

// loginAttempt tracks failed login attempts for a single IP
type loginAttempt struct {
	count     int
	firstSeen time.Time
	lockedAt  time.Time
}

// loginLimiter holds the per-IP attempt map and its mutex
var loginLimiter = struct {
	sync.Mutex
	ips map[string]*loginAttempt
}{
	ips: make(map[string]*loginAttempt),
}

// init starts the background cleanup goroutine when the package is loaded
func init() {
	go func() {
		ticker := time.NewTicker(rlCleanupEvery)
		defer ticker.Stop()
		for range ticker.C {
			cleanupLoginLimiter()
		}
	}()
}

// LoginAllowed checks whether the given request IP is permitted to attempt a login.
// Returns false if the IP is currently locked out.
func LoginAllowed(r *http.Request) bool {
	ip := clientIP(r)

	loginLimiter.Lock()
	defer loginLimiter.Unlock()

	a, ok := loginLimiter.ips[ip]
	if !ok {
		return true
	}

	// if locked out, check whether the lockout period has expired
	if !a.lockedAt.IsZero() {
		if time.Since(a.lockedAt) < rlLockout {
			return false
		}
		// lockout expired — reset the record
		delete(loginLimiter.ips, ip)
		return true
	}

	// if the attempt window has expired, reset and allow
	if time.Since(a.firstSeen) > rlWindow {
		delete(loginLimiter.ips, ip)
		return true
	}

	return true
}

// RecordFailedLogin increments the failure count for the request IP and
// applies a lockout once rlMaxAttempts is reached within the window.
func RecordFailedLogin(r *http.Request) {
	ip := clientIP(r)

	loginLimiter.Lock()
	defer loginLimiter.Unlock()

	a, ok := loginLimiter.ips[ip]
	if !ok {
		loginLimiter.ips[ip] = &loginAttempt{
			count:     1,
			firstSeen: time.Now(),
		}
		return
	}

	// reset if the window has expired
	if time.Since(a.firstSeen) > rlWindow {
		loginLimiter.ips[ip] = &loginAttempt{
			count:     1,
			firstSeen: time.Now(),
		}
		return
	}

	a.count++

	if a.count >= rlMaxAttempts {
		a.lockedAt = time.Now()
		logger.Warn("login rate limit: IP %s locked out after %d failed attempts", ip, a.count)
	}
}

// RecordSuccessfulLogin clears any recorded failures for the request IP
func RecordSuccessfulLogin(r *http.Request) {
	ip := clientIP(r)

	loginLimiter.Lock()
	defer loginLimiter.Unlock()

	delete(loginLimiter.ips, ip)
}

// clientIP extracts the real client IP from the request, preferring
// X-Forwarded-For (set by the reverse proxy) over RemoteAddr
func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		// X-Forwarded-For may contain a comma-separated list; the first entry is the client
		if idx := len(xff); idx > 0 {
			if comma := strings.IndexByte(xff, ','); comma != -1 {
				return strings.TrimSpace(xff[:comma])
			}
			return strings.TrimSpace(xff)
		}
	}

	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

// cleanupLoginLimiter removes stale entries from the IP map to prevent unbounded growth
func cleanupLoginLimiter() {
	loginLimiter.Lock()
	defer loginLimiter.Unlock()

	for ip, a := range loginLimiter.ips {
		expired := !a.lockedAt.IsZero() && time.Since(a.lockedAt) >= rlLockout ||
			a.lockedAt.IsZero() && time.Since(a.firstSeen) >= rlWindow

		if expired {
			delete(loginLimiter.ips, ip)
		}
	}

	logger.Debug("loginLimiter cleanup: %d entries remaining", len(loginLimiter.ips))
}
