package server

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strconv"
	"strings"
	"time"

	"podnest/internal/db"
	"podnest/internal/logger"
)

// setup our constants
const (
	// pmaTokenTTL is how long a one-time token remains valid before expiry
	pmaTokenTTL = 10 * time.Minute

	// pmaCookieName is the session cookie set after a token is consumed
	pmaCookieName = "kp_pma"

	// pmaCookieTTL is how long the PMA session cookie remains valid
	pmaCookieTTL = 2 * time.Hour
)

// apiIssuePMAToken generates a short-lived one-time token for PMA access
// and returns the URL the client should open in a new tab
func (s *Server) apiIssuePMAToken(w http.ResponseWriter, r *http.Request) {

	// resolve the site from the request path
	site, ok := s.resolveSite(w, r)
	if !ok {
		logger.Error("failed to resolve site: %v", r)
		return
	}

	// ensure phpMyAdmin is available for this site type
	if site.PMAPort == 0 {
		logger.Error("phpMyAdmin is not available for site %d (type %d)", site.ID, site.SiteType)
		apiErrorMsg(w, http.StatusBadRequest, "phpMyAdmin is not available for this site type")
		return
	}

	// generate a cryptographically random one-time token
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		logger.Error("failed to generate PMA token for site %d: %v", site.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	token := hex.EncodeToString(b)

	// store the token in the database with a TTL
	if err := db.CreatePMAToken(s.cfg.DB, token, site.ID, pmaTokenTTL); err != nil {
		logger.Error("failed to persist PMA token for site %d: %v", site.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("issued PMA token for site %d (port %d)", site.ID, site.PMAPort)
	apiJSON(w, http.StatusOK, map[string]string{
		"url": fmt.Sprintf("/pma/%d?tok=%s", site.ID, token),
	})
}

// handlePMA is the unified entry point for all PMA requests.
// If a one-time token is present it is consumed and a session cookie is set.
// All subsequent requests are validated by session cookie then proxied.
func (s *Server) handlePMA(w http.ResponseWriter, r *http.Request) {

	logger.Debug("PMA request: path=%s query=%s", r.URL.Path, r.URL.RawQuery)

	// parse /pma/{id}[/...] from the request path
	parts := strings.SplitN(strings.TrimPrefix(r.URL.Path, "/pma/"), "/", 2)
	if len(parts) == 0 || parts[0] == "" {
		logger.Error("invalid path: %v", parts)
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}

	// parse and validate the site ID from the path
	id, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		logger.Error("invalid site id in PMA path: %s", parts[0])
		http.Error(w, "invalid site id", http.StatusBadRequest)
		return
	}
	idStr := parts[0]

	// token exchange: consume the one-time token and set a session cookie
	if tok := r.URL.Query().Get("tok"); tok != "" {
		siteID, err := db.ConsumePMAToken(s.cfg.DB, tok)
		if err != nil {
			logger.Error("failed to consume PMA token for site %d: %v", id, err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		if siteID == 0 || siteID != id {
			logger.Error("invalid or expired PMA token for site %d (resolved site %d)", id, siteID)
			http.Error(w, "invalid or expired token", http.StatusUnauthorized)
			return
		}
		http.SetCookie(w, &http.Cookie{
			Name:     pmaCookieName + "_" + idStr,
			Value:    tok,
			Path:     "/pma/" + idStr,
			HttpOnly: true,
			Secure:   false,
			SameSite: http.SameSiteStrictMode,
			MaxAge:   int(pmaCookieTTL.Seconds()),
		})
		logger.Debug("PMA token consumed for site %d, redirecting", id)
		http.Redirect(w, r, "/pma/"+idStr+"/", http.StatusSeeOther)
		return
	}

	// validate the session cookie before proxying
	cookie, err := r.Cookie(pmaCookieName + "_" + idStr)
	if err != nil || cookie.Value == "" {
		logger.Error("missing or empty PMA session cookie for site %d", id)
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// load the site record and verify it has a PMA port
	site, err := db.GetSiteByID(s.cfg.DB, id)
	if err != nil || site == nil || site.PMAPort == 0 {
		logger.Error("site %d not found or has no PMA port: %v", id, err)
		http.Error(w, "site not found", http.StatusNotFound)
		return
	}

	logger.Debug("PMA proxy target: %s:%d", s.cfg.HostGateway, site.PMAPort)

	// build the upstream path from the remainder of the request path
	upstreamPath := "/"
	if len(parts) == 2 && parts[1] != "" {
		upstreamPath = "/" + parts[1]
	}

	// reverse proxy the request to the PMA container on the host gateway
	target, _ := url.Parse(fmt.Sprintf("http://%s:%d", s.cfg.HostGateway, site.PMAPort))
	proxy := &httputil.ReverseProxy{
		Director: func(req *http.Request) {
			req.URL.Scheme = target.Scheme
			req.URL.Host = target.Host
			req.URL.Path = upstreamPath
			req.URL.RawQuery = r.URL.RawQuery
			req.Host = target.Host
			req.Header.Set("X-Forwarded-Host", r.Header.Get("Host"))
			logger.Debug("PMA proxy director: upstream=%s?%s", upstreamPath, r.URL.RawQuery)
		},
		// rewrite Location headers in PMA responses so internal redirects stay
		ModifyResponse: func(resp *http.Response) error {

			// rewrite Location header so PMA redirects stay inside the proxy path
			if loc := resp.Header.Get("Location"); loc != "" {
				loc = strings.TrimPrefix(loc, fmt.Sprintf("http://%s:%d", s.cfg.HostGateway, site.PMAPort))
				if strings.HasPrefix(loc, "/") && !strings.HasPrefix(loc, "/pma/") {
					loc = fmt.Sprintf("/pma/%d%s", id, loc)
					resp.Header.Set("Location", loc)
					logger.Debug("PMA proxy rewrote Location header: %s", loc)
				}
			}

			// rewrite cookies
			if setCookies := resp.Header["Set-Cookie"]; len(setCookies) > 0 {
				resp.Header.Del("Set-Cookie")
				scopedPath := fmt.Sprintf("/pma/%d/", id)
				for _, sc := range setCookies {
					lower := strings.ToLower(sc)
					if idx := strings.Index(lower, "path="); idx >= 0 {
						// replace the existing Path= value in-place
						end := strings.Index(sc[idx:], ";")
						if end < 0 {
							sc = sc[:idx] + "Path=" + scopedPath
						} else {
							sc = sc[:idx] + "Path=" + scopedPath + sc[idx+end:]
						}
					} else {
						// no Path attribute present — append one
						sc = sc + "; Path=" + scopedPath
					}
					resp.Header.Add("Set-Cookie", sc)
					logger.Debug("PMA proxy scoped cookie to path /pma/%d/", id)
				}
			}

			return nil
		},
	}
	proxy.ServeHTTP(w, r)
}
