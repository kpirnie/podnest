// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package ssl

import (
	"crypto/tls"
	"crypto/x509"
	"net"
	"net/http"
	"time"

	"podnest/internal/apiutil"
	"podnest/internal/logger"
)

const (
	statusNone       = "none"
	statusSelfSigned = "self-signed"
	statusValid      = "valid"
)

// Handler handles SSL status API routes.
type Handler struct{}

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
