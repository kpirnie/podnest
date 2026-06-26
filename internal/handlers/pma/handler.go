// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package pma

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strconv"
	"strings"
	"time"

	"podnest/internal/apiutil"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/modules"
)

const (
	pmaTokenTTL   = 10 * time.Minute
	pmaCookieName = "kp_pma"
	pmaCookieTTL  = 2 * time.Hour
)

// Handler handles phpMyAdmin token issuance and proxy routes.
type Handler struct {
	DB          *sql.DB
	HostGateway string
	Resolve     modules.SiteResolver
}

// RegisterAPIRoutes mounts the token issuance route onto the authenticated api sub-mux.
func (h *Handler) RegisterAPIRoutes(api *http.ServeMux) {
	api.HandleFunc("POST /sites/{id}/pma-token", h.apiIssuePMAToken)
}

// RegisterMuxRoutes mounts the PMA proxy onto the top-level mux.
func (h *Handler) RegisterMuxRoutes(mux *http.ServeMux) {
	mux.Handle("/pma/", http.HandlerFunc(h.handlePMA))
}

func (h *Handler) apiIssuePMAToken(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		logger.Error("failed to resolve site: %v", r)
		return
	}

	if site.PMAPort == 0 {
		logger.Error("phpMyAdmin is not available for site %d (type %d)", site.ID, site.SiteType)
		apiutil.ErrorMsg(w, http.StatusBadRequest, "phpMyAdmin is not available for this site type")
		return
	}

	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		logger.Error("failed to generate PMA token for site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	token := hex.EncodeToString(b)

	if err := db.CreatePMAToken(h.DB, token, site.ID, pmaTokenTTL); err != nil {
		logger.Error("failed to persist PMA token for site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("issued PMA token for site %d (port %d)", site.ID, site.PMAPort)
	apiutil.JSON(w, http.StatusOK, map[string]string{
		"url": fmt.Sprintf("/pma/%d?tok=%s", site.ID, token),
	})
}

func (h *Handler) handlePMA(w http.ResponseWriter, r *http.Request) {
	logger.Debug("PMA request: path=%s query=%s", r.URL.Path, r.URL.RawQuery)

	parts := strings.SplitN(strings.TrimPrefix(r.URL.Path, "/pma/"), "/", 2)
	if len(parts) == 0 || parts[0] == "" {
		logger.Error("invalid path: %v", parts)
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}

	id, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		logger.Error("invalid site id in PMA path: %s", parts[0])
		http.Error(w, "invalid site id", http.StatusBadRequest)
		return
	}
	idStr := parts[0]

	if tok := r.URL.Query().Get("tok"); tok != "" {
		siteID, err := db.ConsumePMAToken(h.DB, tok)
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
			Secure:   isSecureReq(r),
			SameSite: http.SameSiteStrictMode,
			MaxAge:   int(pmaCookieTTL.Seconds()),
		})
		logger.Debug("PMA token consumed for site %d, redirecting", id)
		http.Redirect(w, r, "/pma/"+idStr+"/", http.StatusSeeOther)
		return
	}

	cookie, err := r.Cookie(pmaCookieName + "_" + idStr)
	if err != nil || cookie.Value == "" {
		logger.Error("missing or empty PMA session cookie for site %d", id)
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	site, err := db.GetSiteByID(h.DB, id)
	if err != nil || site == nil || site.PMAPort == 0 {
		logger.Error("site %d not found or has no PMA port: %v", id, err)
		http.Error(w, "site not found", http.StatusNotFound)
		return
	}

	logger.Debug("PMA proxy target: %s:%d", h.HostGateway, site.PMAPort)

	upstreamPath := "/"
	if len(parts) == 2 && parts[1] != "" {
		upstreamPath = "/" + parts[1]
	}

	target, _ := url.Parse(fmt.Sprintf("http://%s:%d", h.HostGateway, site.PMAPort))
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
		ModifyResponse: func(resp *http.Response) error {
			if loc := resp.Header.Get("Location"); loc != "" {
				loc = strings.TrimPrefix(loc, fmt.Sprintf("http://%s:%d", h.HostGateway, site.PMAPort))
				if strings.HasPrefix(loc, "/") && !strings.HasPrefix(loc, "/pma/") {
					loc = fmt.Sprintf("/pma/%d%s", id, loc)
					resp.Header.Set("Location", loc)
					logger.Debug("PMA proxy rewrote Location header: %s", loc)
				}
			}

			if setCookies := resp.Header["Set-Cookie"]; len(setCookies) > 0 {
				resp.Header.Del("Set-Cookie")
				scopedPath := fmt.Sprintf("/pma/%d/", id)
				for _, sc := range setCookies {
					lower := strings.ToLower(sc)
					if idx := strings.Index(lower, "path="); idx >= 0 {
						end := strings.Index(sc[idx:], ";")
						if end < 0 {
							sc = sc[:idx] + "Path=" + scopedPath
						} else {
							sc = sc[:idx] + "Path=" + scopedPath + sc[idx+end:]
						}
					} else {
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

// isSecureReq reports whether the request arrived over TLS directly or via proxy.
func isSecureReq(r *http.Request) bool {
	return r.TLS != nil || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
}
