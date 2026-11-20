// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package config

import (
	"fmt"
	"net/mail"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// WriteMSMTPConfig creates a private runtime directory for an enabled site's
// SMTP configuration. The caller owns cleanup after the directory is retired.
func WriteMSMTPConfig(appPath string, siteID int64, siteUID int, settings map[string]string) (string, error) {

	if !filepath.IsAbs(appPath) || siteID <= 0 || siteUID <= 0 {
		return "", fmt.Errorf("invalid SMTP runtime location or site identity")
	}

	if settings["enabled"] != "true" {
		return "", fmt.Errorf("SMTP is disabled")
	}

	content, err := renderMSMTPConfig(settings)
	if err != nil {
		return "", err
	}

	password := settings["password"]
	if len(password) == 0 || len(password) > 4096 || strings.ContainsAny(password, "\x00\r\n") {
		return "", fmt.Errorf("invalid SMTP runtime password")
	}

	// Keep the runtime files outside the sites tree mounted by SFTP.
	root := filepath.Join(appPath, "smtp")
	if err := os.MkdirAll(root, 0700); err != nil {
		return "", fmt.Errorf("create SMTP runtime root: %w", err)
	}

	info, err := os.Lstat(root)
	if err != nil {
		return "", fmt.Errorf("inspect SMTP runtime root: %w", err)
	}
	if !info.IsDir() || info.Mode().Perm() != 0700 {
		return "", fmt.Errorf("SMTP runtime root must be a private directory")
	}

	// Prepare both files in a fresh directory so a failed write cannot
	// replace the configuration of a running container.
	dir, err := os.MkdirTemp(root, "site-"+strconv.FormatInt(siteID, 10)+"-")
	if err != nil {
		return "", fmt.Errorf("create site SMTP runtime directory: %w", err)
	}

	complete := false
	defer func() {
		if !complete {
			_ = os.RemoveAll(dir)
		}
	}()

	for _, file := range []struct {
		name    string
		content string
	}{
		{name: "msmtprc", content: content},
		{name: "password", content: password + "\n"},
	} {
		path := filepath.Join(dir, file.name)
		if err := os.WriteFile(path, []byte(file.content), 0600); err != nil {
			return "", fmt.Errorf("write SMTP runtime %s: %w", file.name, err)
		}
		if err := os.Chown(path, siteUID, siteUID); err != nil {
			return "", fmt.Errorf("set SMTP runtime %s owner: %w", file.name, err)
		}
	}

	// The site UID needs traversal after the directory is mounted. On the
	// host, the private parent still blocks access by site users.
	if err := os.Chmod(dir, 0711); err != nil {
		return "", fmt.Errorf("set site SMTP runtime directory permissions: %w", err)
	}

	complete = true
	return dir, nil
}

// renderMSMTPConfig renders a single authenticated SMTP account with required TLS.
func renderMSMTPConfig(settings map[string]string) (string, error) {

	host := settings["host"]
	if host == "" || strings.ContainsAny(host, " \t/\\\"") {
		return "", fmt.Errorf("invalid SMTP runtime host")
	}

	port, err := strconv.Atoi(settings["port"])
	if err != nil || port < 1 || port > 65535 {
		return "", fmt.Errorf("invalid SMTP runtime port")
	}

	startTLS := "on"
	switch settings["encryption"] {
	case "starttls":
	case "tls":
		startTLS = "off"
	default:
		return "", fmt.Errorf("invalid SMTP runtime encryption mode")
	}

	sender := settings["from_email"]
	address, err := mail.ParseAddress(sender)
	if err != nil || address.Address != sender ||
		strings.Contains(sender, "%M") || strings.Contains(sender, "%U") ||
		strings.Contains(sender, "%H") || strings.Contains(sender, "%C") ||
		strings.Contains(sender, "%F") {
		return "", fmt.Errorf("invalid SMTP runtime sender address")
	}

	username := settings["username"]
	if strings.TrimSpace(username) == "" {
		return "", fmt.Errorf("SMTP runtime username is required")
	}

	var config strings.Builder
	fmt.Fprintf(&config, "account default\nport %d\nauth on\ntls on\ntls_starttls %s\n", port, startTLS)
	config.WriteString("tls_certcheck on\ntls_trust_file system\n")
	config.WriteString("allow_from_override off\nset_from_header on\n")
	config.WriteString("passwordeval /bin/cat /etc/podnest/smtp/password < /dev/null\n")

	for _, arg := range []struct {
		directive string
		value     string
	}{
		{directive: "host", value: host},
		{directive: "user", value: username},
		{directive: "from", value: sender},
		{directive: "from_full_name", value: settings["from_name"]},
	} {
		if arg.value == "" {
			continue
		}

		// Reject line breaks and NUL so values cannot add directives or
		// truncate arguments. Include the quotes and newline in the limit.
		if strings.ContainsAny(arg.value, "\x00\r\n") || len(arg.directive)+len(arg.value)+4 > 500 {
			return "", fmt.Errorf("invalid SMTP runtime %s", arg.directive)
		}
		fmt.Fprintf(&config, "%s \"%s\"\n", arg.directive, arg.value)
	}

	return config.String(), nil
}
