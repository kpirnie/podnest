// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package notifications

import (
	"crypto/tls"
	"fmt"
	"net"
	"net/smtp"
	"strings"

	"podnest/internal/logger"
)

// SMTPConfig holds the SMTP connection and auth settings.
type SMTPConfig struct {
	Host     string
	Port     string
	Username string
	Password string
	From     string
	TLS      bool // true = implicit TLS (port 465); false = STARTTLS (port 587)
}

// SendEmail delivers a plain-text email via the configured SMTP server.
func SendEmail(cfg SMTPConfig, to, subject, body string) error {
	addr := net.JoinHostPort(cfg.Host, cfg.Port)
	auth := smtp.PlainAuth("", cfg.Username, cfg.Password, cfg.Host)

	msg := buildMessage(cfg.From, to, subject, body)

	var err error
	if cfg.TLS {
		err = sendTLS(addr, cfg.Host, auth, cfg.From, to, msg)
	} else {
		err = sendSTARTTLS(addr, auth, cfg.From, to, msg)
	}
	if err != nil {
		logger.Error("SendEmail: failed to send to %s: %v", to, err)
		return err
	}

	logger.Debug("SendEmail: delivered to %s via %s", to, addr)
	return nil
}

// sendTLS connects with implicit TLS (port 465).
func sendTLS(addr, host string, auth smtp.Auth, from, to string, msg []byte) error {
	tlsCfg := &tls.Config{ServerName: host}
	conn, err := tls.Dial("tcp", addr, tlsCfg)
	if err != nil {
		return fmt.Errorf("TLS dial: %w", err)
	}
	defer conn.Close()

	c, err := smtp.NewClient(conn, host)
	if err != nil {
		return fmt.Errorf("SMTP client: %w", err)
	}
	defer c.Quit()

	if err := c.Auth(auth); err != nil {
		return fmt.Errorf("SMTP auth: %w", err)
	}
	if err := c.Mail(from); err != nil {
		return fmt.Errorf("SMTP MAIL FROM: %w", err)
	}
	if err := c.Rcpt(to); err != nil {
		return fmt.Errorf("SMTP RCPT TO: %w", err)
	}

	wc, err := c.Data()
	if err != nil {
		return fmt.Errorf("SMTP DATA: %w", err)
	}
	defer wc.Close()

	_, err = wc.Write(msg)
	return err
}

// sendSTARTTLS connects in plain-text then upgrades via STARTTLS (port 587).
func sendSTARTTLS(addr string, auth smtp.Auth, from, to string, msg []byte) error {
	return smtp.SendMail(addr, auth, from, []string{to}, msg)
}

// buildMessage formats a minimal RFC 2822 email message.
func buildMessage(from, to, subject, body string) []byte {
	var sb strings.Builder
	sb.WriteString("From: " + from + "\r\n")
	sb.WriteString("To: " + to + "\r\n")
	sb.WriteString("Subject: " + subject + "\r\n")
	sb.WriteString("MIME-Version: 1.0\r\n")
	sb.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	sb.WriteString("\r\n")
	sb.WriteString(body)
	return []byte(sb.String())
}
