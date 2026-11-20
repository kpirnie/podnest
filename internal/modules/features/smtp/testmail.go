// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package smtp

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/mail"
	"net/netip"
	gosmtp "net/smtp"
	"strconv"
	"strings"
	"sync"
	"time"

	"podnest/internal/apiutil"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
)

const (
	smtpTestSiteInterval   = time.Minute
	smtpTestServerInterval = 2 * time.Second
)

// smtpTestLimits shares cooldowns across requests and sites.
var smtpTestLimits = struct {
	sync.Mutex
	nextServer time.Time
	nextSite   map[int64]time.Time
}{
	nextSite: make(map[int64]time.Time),
}

// reserveSMTPTest returns the remaining cooldown or reserves a send attempt.
func reserveSMTPTest(siteID int64) time.Duration {
	smtpTestLimits.Lock()
	defer smtpTestLimits.Unlock()

	now := time.Now()
	retryAfter := max(smtpTestLimits.nextServer.Sub(now), smtpTestLimits.nextSite[siteID].Sub(now))
	if retryAfter > 0 {
		return retryAfter
	}

	// Discard expired entries so the map tracks only outstanding cooldowns.
	for id, next := range smtpTestLimits.nextSite {
		if !next.After(now) {
			delete(smtpTestLimits.nextSite, id)
		}
	}
	smtpTestLimits.nextServer = now.Add(smtpTestServerInterval)
	smtpTestLimits.nextSite[siteID] = now.Add(smtpTestSiteInterval)
	return 0
}

// apiTestSMTP sends one fixed test message to a validated recipient.
func (m Module) apiTestSMTP(w http.ResponseWriter, r *http.Request, site *models.Site) {
	var req struct {
		Recipient string `json:"recipient"`
	}

	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid SMTP test request")
		return
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid SMTP test request")
		return
	}

	recipient := strings.TrimSpace(req.Recipient)
	address, err := mail.ParseAddress(recipient)
	if err != nil || address.Address != recipient || len(recipient) > 254 ||
		strings.ContainsAny(req.Recipient, "\x00\r\n") {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "a single recipient email address is required")
		return
	}

	if retryAfter := reserveSMTPTest(site.ID); retryAfter > 0 {
		seconds := int((retryAfter + time.Second - 1) / time.Second)
		w.Header().Set("Retry-After", strconv.Itoa(seconds))
		apiutil.ErrorMsg(w, http.StatusTooManyRequests, "please wait before sending another SMTP test")
		return
	}

	// Read the settings and password together while SMTP writes are excluded.
	smtpSettingsMu.Lock()
	settings, err := db.GetSMTPRuntimeConfig(m.DB, site.ID)
	smtpSettingsMu.Unlock()
	if err != nil {
		logger.Error("apiTestSMTP: siteID=%d: failed to load runtime settings", site.ID)
		apiutil.ErrorMsg(w, http.StatusInternalServerError, "unable to load SMTP configuration")
		return
	}
	if settings["enabled"] != "true" {
		apiutil.ErrorMsg(w, http.StatusConflict, "enable SMTP before sending a test")
		return
	}

	if err := sendTestSMTP(r.Context(), settings, recipient); err != nil {
		// The sender returns fixed errors that omit server replies and credentials.
		logger.Warn("apiTestSMTP: siteID=%d: %v", site.ID, err)
		apiutil.ErrorMsg(w, http.StatusBadGateway, err.Error())
		return
	}

	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "accepted"})
}

// testSMTPBlockedNetworks holds special-purpose ranges beyond the standard IP checks.
var testSMTPBlockedNetworks = []netip.Prefix{
	netip.MustParsePrefix("0.0.0.0/8"),
	netip.MustParsePrefix("100.64.0.0/10"),
	netip.MustParsePrefix("192.0.0.0/24"),
	netip.MustParsePrefix("192.0.2.0/24"),
	netip.MustParsePrefix("192.88.99.0/24"),
	netip.MustParsePrefix("198.18.0.0/15"),
	netip.MustParsePrefix("198.51.100.0/24"),
	netip.MustParsePrefix("203.0.113.0/24"),
	netip.MustParsePrefix("240.0.0.0/4"),
	netip.MustParsePrefix("2001::/23"),
	netip.MustParsePrefix("2001:db8::/32"),
	netip.MustParsePrefix("2002::/16"),
	netip.MustParsePrefix("3fff::/20"),
}

var testSMTPPublicIPv6 = netip.MustParsePrefix("2000::/3")

// isPublicSMTPAddress limits test connections to public unicast addresses.
func isPublicSMTPAddress(addr netip.Addr) bool {
	addr = addr.Unmap()
	if addr.Zone() != "" || !addr.IsGlobalUnicast() || addr.IsPrivate() {
		return false
	}
	if addr.Is6() && !testSMTPPublicIPv6.Contains(addr) {
		return false
	}
	for _, network := range testSMTPBlockedNetworks {
		if network.Contains(addr) {
			return false
		}
	}
	return true
}

// dialTestSMTP validates every DNS answer and connects to a checked address directly.
func dialTestSMTP(ctx context.Context, host, port string) (net.Conn, error) {
	lookupHost := host
	if _, err := netip.ParseAddr(host); err != nil {
		lookupHost += "."
	}

	addresses, err := net.DefaultResolver.LookupNetIP(ctx, "ip", lookupHost)
	if err != nil || len(addresses) == 0 {
		return nil, fmt.Errorf("unable to resolve SMTP host")
	}
	for _, addr := range addresses {
		if !isPublicSMTPAddress(addr) {
			return nil, fmt.Errorf("SMTP host must resolve to public addresses")
		}
	}

	dialer := net.Dialer{Timeout: 3 * time.Second}
	for _, addr := range addresses {
		conn, err := dialer.DialContext(ctx, "tcp", net.JoinHostPort(addr.Unmap().String(), port))
		if err == nil {
			return conn, nil
		}
	}
	return nil, fmt.Errorf("unable to connect to SMTP host")
}

// sendTestSMTP delivers a fixed test message using the site's SMTP credentials.
func sendTestSMTP(ctx context.Context, settings map[string]string, recipient string) error {
	host := strings.TrimSuffix(strings.TrimSpace(settings["host"]), ".")
	port, err := strconv.Atoi(settings["port"])
	encryption := settings["encryption"]
	if settings["enabled"] != "true" || host == "" ||
		err != nil || port < 1 || port > 65535 ||
		(encryption != "tls" && encryption != "starttls") ||
		settings["username"] == "" || settings["password"] == "" {
		return fmt.Errorf("invalid SMTP configuration")
	}

	from := settings["from_email"]
	fromName := settings["from_name"]
	for _, address := range []string{from, recipient} {
		parsed, err := mail.ParseAddress(address)
		if err != nil || parsed.Address != address || strings.ContainsAny(address, "\x00\r\n") {
			return fmt.Errorf("invalid SMTP address")
		}
	}
	if strings.ContainsAny(fromName, "\x00\r\n") {
		return fmt.Errorf("invalid SMTP sender name")
	}

	ctx, cancel := context.WithTimeout(ctx, 12*time.Second)
	defer cancel()

	conn, err := dialTestSMTP(ctx, host, strconv.Itoa(port))
	if err != nil {
		return err
	}
	defer conn.Close()

	stop := context.AfterFunc(ctx, func() { _ = conn.Close() })
	defer stop()

	deadline, _ := ctx.Deadline()
	if err := conn.SetDeadline(deadline); err != nil {
		return fmt.Errorf("unable to set SMTP connection deadline")
	}

	tlsConfig := &tls.Config{ServerName: host, MinVersion: tls.VersionTLS12}
	var transport net.Conn = conn
	if encryption == "tls" {
		secureConn := tls.Client(conn, tlsConfig)
		if err := secureConn.HandshakeContext(ctx); err != nil {
			return fmt.Errorf("SMTP TLS handshake failed")
		}
		transport = secureConn
	}

	client, err := gosmtp.NewClient(transport, host)
	if err != nil {
		return fmt.Errorf("SMTP greeting failed")
	}
	defer client.Close()

	if encryption == "starttls" {
		if err := client.StartTLS(tlsConfig); err != nil {
			return fmt.Errorf("SMTP STARTTLS failed")
		}
	}
	if err := client.Auth(gosmtp.PlainAuth("", settings["username"], settings["password"], host)); err != nil {
		return fmt.Errorf("SMTP authentication failed")
	}
	if err := client.Mail(from); err != nil {
		return fmt.Errorf("SMTP sender was rejected")
	}
	if err := client.Rcpt(recipient); err != nil {
		return fmt.Errorf("SMTP recipient was rejected")
	}

	body, err := client.Data()
	if err != nil {
		return fmt.Errorf("SMTP message was rejected")
	}

	sender := (&mail.Address{Name: fromName, Address: from}).String()
	to := (&mail.Address{Address: recipient}).String()
	message := fmt.Sprintf("From: %s\r\nTo: %s\r\nDate: %s\r\nSubject: PodNest SMTP test\r\n"+
		"MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n"+
		"This test message was sent using your site's SMTP settings.\r\n", sender, to, time.Now().UTC().Format(time.RFC1123Z))

	if _, err := io.WriteString(body, message); err != nil {
		return fmt.Errorf("unable to write SMTP message")
	}
	if err := body.Close(); err != nil {
		return fmt.Errorf("SMTP server did not accept the test message")
	}

	return nil
}
