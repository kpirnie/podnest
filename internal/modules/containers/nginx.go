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

// CreateNginx creates and starts the nginx container for a site pod. Shared
// across all type modules so nginx env, mount, or hardening changes are a
// one-place edit. static is reserved for static-site divergence; the container
// produced is currently identical for both.
func CreateNginx(ctx context.Context, client modules.PodmanClient, cfg modules.PodConfig, podName string) error {
	if err := client.CreateContainer(ctx, modules.ContainerConfig{
		Name:    modules.ContainerName(cfg.Site.Name, "nginx"),
		Image:   models.ImgNginx,
		PodName: podName,
		Env:     map[string]string{"UMASK": "0000"},
		Mounts: []modules.Mount{
			{Type: "tmpfs", Destination: "/var/log/nginx"},
			// writable scratch backed by tmpfs so the rootfs can be read-only:
			// /run holds nginx.pid, /var/cache/nginx holds client-body/proxy/fastcgi
			// temp files, /tmp is general scratch — all wiped on restart
			{Type: "tmpfs", Destination: "/run", Options: []string{"rw", "nosuid", "nodev", "mode=0755", "size=16m"}},
			{Type: "tmpfs", Destination: "/var/cache/nginx", Options: []string{"rw", "nosuid", "nodev", "mode=0755", "size=128m"}},
			{Type: "tmpfs", Destination: "/tmp", Options: []string{"rw", "nosuid", "nodev", "mode=1777", "size=64m"}},
			{Type: "bind", Source: cfg.SiteDir + "/html", Destination: "/var/www/html", Options: []string{"ro", "z"}},
			{Type: "bind", Source: cfg.SiteDir + "/nginx/nginx.conf", Destination: "/etc/nginx/nginx.conf", Options: []string{"ro", "z"}},
			{Type: "bind", Source: cfg.SiteDir + "/nginx/conf.d", Destination: "/etc/nginx/conf.d", Options: []string{"ro", "z"}},
		},
		ReadOnly:    true,
		CapDrop:     []string{"ALL"},
		CapAdd:      []string{"NET_BIND_SERVICE", "CHOWN", "SETUID", "SETGID"},
		SecOpts:     []string{"no-new-privileges:true"},
		Healthcheck: modules.HC(modules.HCRoleNginx),
	}); err != nil {
		return fmt.Errorf("create nginx: %w", err)
	}
	if err := client.StartContainer(ctx, modules.ContainerName(cfg.Site.Name, "nginx")); err != nil {
		return fmt.Errorf("start nginx: %w", err)
	}
	return nil
}
