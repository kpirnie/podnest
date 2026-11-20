// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package containers

import (
	"context"
	"errors"
	"fmt"
	"time"

	"podnest/internal/modules"
)

// waitForPHPSMTP holds PHP-FPM until the loader publishes the SMTP files.
const waitForPHPSMTP = `
attempts=0
while [ ! -s /etc/podnest/smtp/msmtprc ] || [ ! -s /etc/podnest/smtp/password ]; do
	if [ "$attempts" -ge 30 ]; then
		echo "PHP SMTP configuration was not provisioned" >&2
		exit 1
	fi
	attempts=$((attempts + 1))
	sleep 1
done
exec "$@"
`

// CreatePHPRuntime creates and starts PHP-FPM, provisioning SMTP when requested.
func CreatePHPRuntime(ctx context.Context, client modules.PodmanClient, spec modules.ContainerConfig, loadSMTP func(context.Context, string) error) error {

	if loadSMTP != nil {
		spec.Mounts = append(spec.Mounts, modules.Mount{
			Type:        "tmpfs",
			Source:      "tmpfs",
			Destination: "/etc/podnest/smtp",
			Options:     []string{"rw", "nosuid", "nodev", "noexec", "noswap", "notmpcopyup", "mode=0711", "size=64k"},
		})

		// Keep the image entrypoint and pass it the gated PHP-FPM command.
		spec.Command = []string{"/bin/sh", "-c", waitForPHPSMTP, "podnest-php", "php-fpm"}
	}

	if err := client.CreateContainer(ctx, spec); err != nil {
		return fmt.Errorf("create php: %w", err)
	}
	if err := client.StartContainer(ctx, spec.Name); err != nil {
		return fmt.Errorf("start php: %w", err)
	}

	if loadSMTP != nil {
		loadCtx, cancel := context.WithTimeout(ctx, 20*time.Second)
		defer cancel()

		if err := loadSMTP(loadCtx, spec.Name); err != nil {
			// Remove the waiting container even if the provisioning request expired.
			cleanupCtx, cleanupCancel := context.WithTimeout(context.WithoutCancel(ctx), 10*time.Second)
			defer cleanupCancel()

			loadErr := fmt.Errorf("load PHP SMTP configuration: %w", err)
			if cleanupErr := client.RemoveContainer(cleanupCtx, spec.Name); cleanupErr != nil {
				return errors.Join(loadErr, fmt.Errorf("remove PHP container after SMTP failure: %w", cleanupErr))
			}
			return loadErr
		}
	}

	return nil
}
