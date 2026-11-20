// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package podman

import (
	"context"
	"fmt"
	"io"
	"strconv"
	"strings"

	"podnest/internal/config"
)

// PHPSMTPSiteLabel identifies the site whose PHP runtime uses the SMTP startup gate.
const PHPSMTPSiteLabel = "app.podnest.smtp-site-id"

// provisionPHPSMTP verifies the mount before writing and publishes msmtprc last.
const provisionPHPSMTP = `
set -eu
dir=/etc/podnest/smtp

awk -v target="$dir" '
	$5 == target {
		for (i = 7; i + 3 <= NF; i++) {
			if ($i == "-" && $(i+1) == "tmpfs" &&
				$(i+3) ~ /(^|,)noswap(,|$)/) {
				found = 1
			}
		}
	}
	END { exit !found }
' /proc/self/mountinfo

umask 077
staging="$dir/.provisioning"
mkdir "$staging"
trap 'rm -rf "$staging"' EXIT

test ! -e "$dir/msmtprc"
IFS= read -r password
printf '%s\n' "$password" > "$staging/password"
unset password
cat > "$staging/msmtprc"
test -s "$staging/msmtprc"

chmod 0400 "$staging/password" "$staging/msmtprc"
chown "$1:$1" "$staging/password" "$staging/msmtprc"
mv -f "$staging/password" "$dir/password"
mv -f "$staging/msmtprc" "$dir/msmtprc"
`

// LoadPHPSMTP populates the private SMTP mount for a PHP container during startup.
func (c *Client) LoadPHPSMTP(ctx context.Context, container string, siteUID int, settings map[string]string) error {

	if siteUID <= 0 {
		return fmt.Errorf("invalid site UID for PHP SMTP")
	}

	msmtprc, err := config.RenderMSMTPConfig(settings)
	if err != nil {
		return fmt.Errorf("render PHP SMTP configuration: %w", err)
	}

	// Keep credentials out of exec arguments and container metadata.
	stdin := io.MultiReader(
		strings.NewReader(settings["password"]),
		strings.NewReader("\n"),
		strings.NewReader(msmtprc),
	)
	cmd := []string{"/bin/sh", "-c", provisionPHPSMTP, "podnest-smtp", strconv.Itoa(siteUID)}
	result, err := c.ExecStream(ctx, container, "0:0", cmd, stdin)
	if err != nil {
		return fmt.Errorf("stream PHP SMTP configuration: %w", err)
	}
	if result.ExitCode != 0 {
		return fmt.Errorf("install PHP SMTP configuration in private tmpfs: exit status %d", result.ExitCode)
	}

	return nil
}
