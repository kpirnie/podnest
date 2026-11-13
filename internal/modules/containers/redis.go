// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package containers

import (
	"context"
	"fmt"
	"podnest/internal/models"
	"podnest/internal/modules"
)

// CreateRedis creates and starts the Valkey container for a site pod.
func CreateRedis(ctx context.Context, client modules.PodmanClient, cfg modules.PodConfig, podName string) error {
	if err := client.CreateContainer(ctx, modules.ContainerConfig{
		Name:    modules.ContainerName(cfg.Site.Name, "redis"),
		Image:   models.ImgRedis,
		PodName: podName,
		Command: []string{"valkey-server", "/usr/local/etc/valkey/valkey.conf"},
		Mounts: []modules.Mount{
			{Type: "bind", Source: cfg.SiteDir + "/redis/redis.conf", Destination: "/usr/local/etc/valkey/valkey.conf", Options: []string{"z"}},
			{Type: "tmpfs", Destination: "/tmp", Options: []string{"rw", "nosuid", "nodev", "mode=1777", "size=64m"}},
			// persistence dir backed by tmpfs so the rootfs can be read-only; it was
			// already ephemeral (no host bind) so behaviour is unchanged. mode=0777
			// because CHOWN is dropped and the image runs as a fixed non-root user
			{Type: "tmpfs", Destination: "/data", Options: []string{"rw", "nosuid", "nodev", "mode=0777", "size=256m"}},
		},
		ReadOnly: true,
		CapDrop:  []string{"ALL"},
		SecOpts:  []string{"no-new-privileges:true"},
	}); err != nil {
		return fmt.Errorf("create redis: %w", err)
	}
	if err := client.StartContainer(ctx, modules.ContainerName(cfg.Site.Name, "redis")); err != nil {
		return fmt.Errorf("start redis: %w", err)
	}
	return nil
}
