// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package static

import (
	"context"
	"fmt"

	"podnest/internal/models"
	"podnest/internal/modules"
)

const secNoNewPriv = "no-new-privileges:true"

// images returns the container images required for a static site pod.
func images(_ *models.Site) []string {
	return []string{models.ImgNginx}
}

// create provisions nginx and optionally varnish for a static site pod.
func create(ctx context.Context, client modules.PodmanClient, cfg modules.PodConfig) error {
	podName := modules.PodName(cfg.Site.Name)
	vEnabled := cfg.Configs[models.ConfigVarnish]["enabled"] == "true"

	if err := client.PullImage(ctx, models.ImgNginx); err != nil {
		return fmt.Errorf("pull nginx: %w", err)
	}
	if vEnabled {
		if err := client.PullImage(ctx, models.ImgVarnish); err != nil {
			return fmt.Errorf("pull varnish: %w", err)
		}
	}

	if _, err := client.CreatePod(ctx, podName, cfg.Site); err != nil {
		return fmt.Errorf("create pod %s: %w", podName, err)
	}

	// nginx
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
		SecOpts:     []string{secNoNewPriv},
		Healthcheck: modules.HC(modules.HCRoleNginx),
	}); err != nil {
		return fmt.Errorf("create nginx: %w", err)
	}
	if err := client.StartContainer(ctx, modules.ContainerName(cfg.Site.Name, "nginx")); err != nil {
		return fmt.Errorf("start nginx: %w", err)
	}

	// varnish
	if vEnabled {
		memSize := cfg.Configs[models.ConfigVarnish]["memory_size"]
		if memSize == "" {
			memSize = "256m"
		}
		if err := client.CreateContainer(ctx, modules.ContainerConfig{
			Name:    modules.ContainerName(cfg.Site.Name, "varnish"),
			Image:   models.ImgVarnish,
			PodName: podName,
			Env: map[string]string{
				"VARNISH_SIZE":      memSize,
				"VARNISH_HTTP_PORT": "80",
			},
			Mounts: []modules.Mount{
				{Type: "bind", Source: cfg.SiteDir + "/varnish/default.vcl", Destination: "/etc/varnish/default.vcl", Options: []string{"ro", "z"}},
			},
			CapDrop:     []string{"ALL"},
			CapAdd:      []string{"NET_BIND_SERVICE", "CHOWN", "DAC_OVERRIDE", "SETUID", "SETGID", "IPC_LOCK"},
			SecOpts:     []string{secNoNewPriv},
			Healthcheck: modules.HC(modules.HCRoleVarnish),
		}); err != nil {
			return fmt.Errorf("create varnish: %w", err)
		}
		if err := client.StartContainer(ctx, modules.ContainerName(cfg.Site.Name, "varnish")); err != nil {
			return fmt.Errorf("start varnish: %w", err)
		}
	}

	return nil
}
