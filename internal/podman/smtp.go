// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package podman

import (
	"context"
	"fmt"
	"io"
	"podnest/internal/config"
	"strconv"
	"strings"
	"time"
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
attempts=0
while ! mkdir "$staging" 2>/dev/null; do
	if [ "$attempts" -ge 10 ]; then
		exit 1
	fi
	attempts=$((attempts + 1))
	sleep 1
done
trap 'rm -rf "$staging"' EXIT

# A repeated start can hit the same running container. Drain stdin before
# returning so the attached exec can finish without a broken pipe.
if [ -s "$dir/msmtprc" ] && [ -s "$dir/password" ]; then
	cat >/dev/null
	exit 0
fi
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

// SetPHPSMTPResolver registers the site credential lookup before Podman operations begin.
func (c *Client) SetPHPSMTPResolver(resolve func(siteID int64, container string) (int, map[string]string, error)) {
	c.phpSMTPResolver = resolve
}

// loadPodPHPSMTP restores SMTP for the PHP runtime in a started pod.
func (c *Client) loadPodPHPSMTP(ctx context.Context, name string) error {
	if c.phpSMTPResolver == nil {
		return nil
	}

	pod, err := c.InspectPod(ctx, name)
	if err != nil {
		return err
	}

	for _, container := range pod.Containers {
		if container.Name == pod.Name+"-php" {
			return c.loadStartedPHPSMTP(ctx, container.ID)
		}
	}

	return nil
}

// loadStartedPHPSMTP restores SMTP when a started container carries a site label.
func (c *Client) loadStartedPHPSMTP(ctx context.Context, container string) error {
	if c.phpSMTPResolver == nil {
		return nil
	}

	loadCtx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()

	var inspect struct {
		ID     string `json:"Id"`
		Name   string `json:"Name"`
		Config struct {
			Labels map[string]string `json:"Labels"`
		} `json:"Config"`
	}
	if err := c.get(loadCtx, "/v4.0.0/libpod/containers/"+container+"/json", &inspect); err != nil {
		return fmt.Errorf("inspect container for PHP SMTP: %w", err)
	}

	label, gated := inspect.Config.Labels[PHPSMTPSiteLabel]
	if !gated {
		return nil
	}
	siteID, err := strconv.ParseInt(label, 10, 64)
	if err != nil || siteID <= 0 || inspect.ID == "" {
		return fmt.Errorf("invalid PHP SMTP container identity")
	}

	uid, settings, err := c.phpSMTPResolver(siteID, strings.TrimPrefix(inspect.Name, "/"))
	if err != nil {
		return fmt.Errorf("resolve PHP SMTP configuration for site %d: %w", siteID, err)
	}

	// Use the inspected ID so a replacement with the same name cannot receive the credentials.
	return c.LoadPHPSMTP(loadCtx, inspect.ID, uid, settings)
}

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
