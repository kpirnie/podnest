// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package ssl

import (
	"crypto/tls"
	"crypto/x509"
	"database/sql"
	"net"
	"net/http"
	"time"

	"podnest/internal/apiutil"
	"podnest/internal/auth"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
)

const (
	statusNone       = "none"
	statusSelfSigned = "self-signed"
	statusValid      = "valid"
)

// Handler handles SSL status API routes.
type Handler struct {
	DB *sql.DB
}

// RegisterRoutes mounts SSL status routes onto api.
func (h *Handler) RegisterRoutes(api *http.ServeMux) {
	api.HandleFunc("GET /ssl-status", h.apiSSLStatus)
}

func (h *Handler) apiSSLStatus(w http.ResponseWriter, r *http.Request) {
	domain := r.URL.Query().Get("domain")
	if domain == "" {
		logger.Error("apiSSLStatus: missing domain query parameter")
		apiutil.ErrorMsg(w, http.StatusBadRequest, "domain query parameter is required")
		return
	}

	// the check dials arbitrary hosts from inside the network and distinguishes
	// refused from TLS-present, so the target must be a domain this caller owns
	if !h.callerOwnsDomain(r, domain) {
		logger.Error("apiSSLStatus: domain '%s' not permitted for caller", domain)
		apiutil.ErrorMsg(w, http.StatusForbidden, "forbidden")
		return
	}

	status := checkSSL(domain)

	logger.Debug("apiSSLStatus: %s => %s", domain, status)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": status})
}

func checkSSL(domain string) string {
	dialer := &net.Dialer{Timeout: 10 * time.Second}
	conn, err := tls.DialWithDialer(
		dialer,
		"tcp",
		domain+":443",
		&tls.Config{InsecureSkipVerify: true},
	)
	if err != nil {
		logger.Debug("checkSSL: no TLS on %s: %v", domain, err)
		return statusNone
	}
	defer conn.Close()

	certs := conn.ConnectionState().PeerCertificates
	if len(certs) == 0 {
		logger.Debug("checkSSL: no peer certificates for %s", domain)
		return statusNone
	}

	opts := x509.VerifyOptions{
		DNSName:     domain,
		CurrentTime: time.Now(),
	}
	if _, err := certs[0].Verify(opts); err == nil {
		logger.Debug("checkSSL: valid CA cert for %s", domain)
		return statusValid
	}

	logger.Debug("checkSSL: self-signed cert detected for %s", domain)
	return statusSelfSigned
}

// callerOwnsDomain reports whether the authenticated caller may probe domain.
// Admins may probe the configured admin domain and any registered domain;
// everyone else is limited to domains attached to a site they own.
func (h *Handler) callerOwnsDomain(r *http.Request, domain string) bool {

	// resolve the caller from the request context
	user := auth.UserFromContext(r.Context())
	if user == nil {
		return false
	}

	// the admin domain has no kppn_domains row — admins only
	if adminDomain, err := db.GetSetting(h.DB, "admin_domain"); err == nil && adminDomain != "" && adminDomain == domain {
		return user.Role == models.RoleAdmin
	}

	// the domain must be registered, which confines dialing to hosts already proxied
	d, err := db.GetDomainByValue(h.DB, domain)
	if err != nil {
		logger.Error("callerOwnsDomain: lookup '%s': %v", domain, err)
		return false
	}
	if d == nil {
		return false
	}
	if user.Role == models.RoleAdmin {
		return true
	}

	// non-admins are limited to their own sites
	site, err := db.GetSiteByID(h.DB, d.SiteID)
	if err != nil || site == nil {
		return false
	}
	return site.UID == user.ID
}
