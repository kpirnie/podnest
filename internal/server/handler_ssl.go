package server

import (
	"crypto/tls"
	"crypto/x509"
	"net"
	"net/http"
	"time"

	"podnest/internal/logger"
)

// sslStatus represents the TLS state of a domain
const (
	sslStatusNone       = "none"
	sslStatusSelfSigned = "self-signed"
	sslStatusValid      = "valid"
)

// checkSSL dials the domain on port 443 and returns the SSL status
func checkSSL(domain string) string {

	// attempt a TLS connection with a short timeout — skip verification so we
	// can inspect self-signed certs rather than just getting a dial error
	dialer := &net.Dialer{Timeout: 10 * time.Second}
	conn, err := tls.DialWithDialer(
		dialer,
		"tcp",
		domain+":443",
		&tls.Config{InsecureSkipVerify: true},
	)
	if err != nil {
		logger.Debug("checkSSL: no TLS on %s: %v", domain, err)
		return sslStatusNone
	}
	defer conn.Close()

	// pull the verified chains from the connection state; if empty fall back
	// to the peer certificates for self-signed detection
	state := conn.ConnectionState()
	certs := state.PeerCertificates
	if len(certs) == 0 {
		logger.Debug("checkSSL: no peer certificates for %s", domain)
		return sslStatusNone
	}

	// attempt a proper verification against the system root pool — if it
	// passes the cert is CA-issued and valid
	opts := x509.VerifyOptions{
		DNSName:     domain,
		CurrentTime: time.Now(),
	}
	if _, err := certs[0].Verify(opts); err == nil {
		logger.Debug("checkSSL: valid CA cert for %s", domain)
		return sslStatusValid
	}

	// verification failed but we did get a cert — treat as self-signed
	logger.Debug("checkSSL: self-signed cert detected for %s", domain)
	return sslStatusSelfSigned
}

// apiSSLStatus checks the TLS status of a domain and returns a JSON response
func (s *Server) apiSSLStatus(w http.ResponseWriter, r *http.Request) {

	// read the domain from the query string
	domain := r.URL.Query().Get("domain")
	if domain == "" {
		logger.Error("apiSSLStatus: missing domain query parameter")
		apiErrorMsg(w, http.StatusBadRequest, "domain query parameter is required")
		return
	}

	// perform the TLS check and return the result
	status := checkSSL(domain)
	logger.Debug("apiSSLStatus: %s => %s", domain, status)
	apiJSON(w, http.StatusOK, map[string]string{"status": status})
}
