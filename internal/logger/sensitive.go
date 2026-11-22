// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package logger

import (
	"net/url"
	"regexp"
	"strings"
)

// CredentialName reports whether a named field ordinarily holds authentication material.
func CredentialName(name string) bool {
	name = strings.ToLower(strings.ReplaceAll(strings.ReplaceAll(name, "-", "_"), ".", "_"))
	switch strings.ReplaceAll(name, "_", "") {
	case "apikey", "apisecret", "apitoken", "accesskey", "secretkey", "privatekey", "privkey",
		"authtoken", "sessiontoken", "refreshtoken", "totpsecret", "totpsalt", "backupcodes",
		"recoverycodes", "connectionstring", "proxyauthorization", "setcookie", "requirepass":
		return true
	}
	for _, field := range strings.Split(name, "_") {
		switch field {
		case "password", "passwd", "pwd", "pword", "pass", "passphrase", "secret", "token",
			"credential", "credentials", "authorization", "bearer", "cookie", "session",
			"recovery", "signature", "dsn", "authpass", "webhook":
			return true
		}
	}
	return strings.HasSuffix(name, "_access_key") || strings.HasSuffix(name, "_private_key")
}

// CredentialURL reports whether a URL carries credentials in userinfo or query values.
func CredentialURL(value string) bool {
	u, err := url.Parse(value)
	if err != nil || u.Scheme == "" {
		return false
	}
	if u.User != nil {
		return true
	}
	for name := range u.Query() {
		if CredentialName(name) {
			return true
		}
	}
	return false
}

var credentialAssignment = regexp.MustCompile("(?i)([a-z][a-z0-9_.-]*)[\x22']?\\s*[:=]")

// RedactText drops the remainder of a diagnostic containing a credential field.
// Arbitrary values can include whitespace, quoting, or several header fields.
func RedactText(message string) string {
	for _, match := range credentialAssignment.FindAllStringSubmatchIndex(message, -1) {
		if CredentialName(message[match[2]:match[3]]) {
			return message[:match[1]] + " [redacted]"
		}
	}
	return message
}
