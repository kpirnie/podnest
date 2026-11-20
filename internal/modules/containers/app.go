// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package containers

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"time"

	"podnest/internal/modules"
	"podnest/internal/podman"
)

// waitForAppSMTP holds the application until its SMTP file is ready.
const waitForAppSMTP = `
attempts=0
while [ ! -r /etc/podnest/smtp/settings.json ] || [ ! -s /etc/podnest/smtp/settings.json ]; do
	if [ "$attempts" -ge 30 ]; then
		echo "Application SMTP configuration was not provisioned" >&2
		exit 1
	fi
	attempts=$((attempts + 1))
	sleep 1
done
exec "$@"
`

// CreateAppRuntime creates an app container and provisions SMTP when starting it.
func CreateAppRuntime(ctx context.Context, client modules.PodmanClient, spec modules.ContainerConfig, cfg modules.PodConfig, start bool) error {
	if cfg.LoadAppSMTP != nil {
		if cfg.Site.ID <= 0 || cfg.SiteUID <= 0 {
			return fmt.Errorf("invalid site identity for application SMTP")
		}

		// Recover the original command before wrapping it with the SMTP gate.
		inspector, ok := client.(interface {
			ImageStartup(context.Context, string) ([]string, []string, error)
		})
		if !ok {
			return fmt.Errorf("runtime image inspection is unavailable")
		}
		entrypoint, command, err := inspector.ImageStartup(ctx, spec.Image)
		if err != nil {
			return fmt.Errorf("inspect application image startup: %w", err)
		}
		if spec.Entrypoint != nil {
			entrypoint = spec.Entrypoint
		}
		if len(spec.Command) > 0 {
			command = spec.Command
		}
		argv := append(append([]string(nil), entrypoint...), command...)
		if len(argv) == 0 {
			return fmt.Errorf("application has no startup command")
		}

		if spec.Labels == nil {
			spec.Labels = make(map[string]string)
		}
		spec.Labels[podman.AppSMTPSiteLabel] = strconv.FormatInt(cfg.Site.ID, 10)

		// Root owns the mount. The site group can read provisioned settings.
		spec.Mounts = append(spec.Mounts, modules.Mount{
			Type:        "ramfs",
			Source:      "ramfs",
			Destination: "/etc/podnest/smtp",
			Options:     []string{"rw", "nosuid", "nodev", "noexec", "mode=0711"},
		})
		spec.Entrypoint = []string{"/bin/sh", "-c", waitForAppSMTP, "podnest-app"}
		spec.Command = argv
	}

	if err := client.CreateContainer(ctx, spec); err != nil {
		return fmt.Errorf("create app: %w", err)
	}
	if !start {
		return nil
	}
	if err := client.StartContainer(ctx, spec.Name); err != nil {
		return fmt.Errorf("start app: %w", err)
	}

	if cfg.LoadAppSMTP != nil {
		loadCtx, cancel := context.WithTimeout(ctx, 20*time.Second)
		defer cancel()

		if err := cfg.LoadAppSMTP(loadCtx, spec.Name); err != nil {
			// Clean up the waiting container even if provisioning timed out.
			cleanupCtx, cleanupCancel := context.WithTimeout(context.WithoutCancel(ctx), 10*time.Second)
			defer cleanupCancel()

			loadErr := fmt.Errorf("load application SMTP configuration: %w", err)
			if cleanupErr := client.RemoveContainer(cleanupCtx, spec.Name); cleanupErr != nil {
				return errors.Join(loadErr, fmt.Errorf("remove app container after SMTP failure: %w", cleanupErr))
			}
			return loadErr
		}
	}

	return nil
}
