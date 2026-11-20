// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package smtp

import (
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"net"
	"net/mail"
	"net/netip"
	gosmtp "net/smtp"
	"strconv"
	"strings"
	"time"
)

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
