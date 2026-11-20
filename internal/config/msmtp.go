// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package config

import (
	"fmt"
	"net/mail"
	"strconv"
	"strings"
)

// RenderMSMTPConfig renders the configuration for an enabled site's SMTP account.
func RenderMSMTPConfig(settings map[string]string) (string, error) {

	if settings["enabled"] != "true" {
		return "", fmt.Errorf("SMTP is disabled")
	}

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

	// msmtp reads a single password line from the container's tmpfs.
	password := settings["password"]
	if len(password) == 0 || len(password) > 4096 || strings.ContainsAny(password, "\x00\r\n") {
		return "", fmt.Errorf("invalid SMTP runtime password")
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

		// Prevent directive injection and enforce msmtp's line limit,
		// including the separator, quotes, and newline.
		if strings.ContainsAny(arg.value, "\x00\r\n") || len(arg.directive)+len(arg.value)+4 > 500 {
			return "", fmt.Errorf("invalid SMTP runtime %s", arg.directive)
		}

		fmt.Fprintf(&config, "%s \"%s\"\n", arg.directive, arg.value)
	}

	return config.String(), nil
}
