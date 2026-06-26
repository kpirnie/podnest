// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package notifications

// SMTPConfigFromMap builds an SMTPConfig from the raw string map returned by db.GetSMTPConfig.
func SMTPConfigFromMap(m map[string]string) SMTPConfig {
	return SMTPConfig{
		Host:     m["smtp_host"],
		Port:     m["smtp_port"],
		Username: m["smtp_username"],
		Password: m["smtp_password"],
		From:     m["smtp_from"],
		TLS:      m["smtp_tls"] == "true" || m["smtp_tls"] == "1",
	}
}

// SNSConfigFromMap builds an SNSConfig from the raw string map returned by db.GetSNSConfig.
func SNSConfigFromMap(m map[string]string) SNSConfig {
	return SNSConfig{
		AccessKey: m["aws_access_key"],
		SecretKey: m["aws_secret_key"],
		Region:    m["aws_region"],
		SenderID:  m["aws_sns_sender_id"],
	}
}

// SMTPConfigValid reports whether the SMTP config has the minimum required fields set.
func SMTPConfigValid(cfg SMTPConfig) bool {
	return cfg.Host != "" && cfg.Port != "" && cfg.From != ""
}

// SNSConfigValid reports whether the SNS config has the minimum required fields set.
func SNSConfigValid(cfg SNSConfig) bool {
	return cfg.AccessKey != "" && cfg.SecretKey != "" && cfg.Region != ""
}
