// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package dotnet

import (
	"context"
	"fmt"
	"strings"

	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/modules/containers"
)

// images returns the container images required for a .NET site pod.
func images(site *models.Site) []string {
	return []string{
		models.ImgNginx,
		models.ImgDB,
		models.ImgRedis,
		models.ImgPMA,
		models.RuntimeImage(site),
	}
}

// create provisions all containers for a .NET site pod.
func create(ctx context.Context, client modules.PodmanClient, cfg modules.PodConfig) error {

	// setup the pod name
	podName := modules.PodName(cfg.Site.Name)

	// create the primary containers for the pod
	if err := containers.CreateThePrimaries(ctx, client, cfg, podName, images(cfg.Site)); err != nil {
		return err
	}

	// .NET app container
	appCfg := modules.ContainerConfig{
		Name:       modules.ContainerName(cfg.Site.Name, "app"),
		Image:      models.RuntimeImage(cfg.Site),
		PodName:    podName,
		User:       fmt.Sprintf("%d:%d", cfg.SiteUID, cfg.SiteUID),
		WorkingDir: "/app",
		Env: map[string]string{
			"ASPNETCORE_URLS": fmt.Sprintf("http://+:%d", models.DotNetInternalPort),
		},
		Mounts: []modules.Mount{
			{Type: "bind", Source: cfg.SiteDir + "/html", Destination: "/app", Options: []string{"rw", "z"}},
			// general scratch backed by tmpfs so the rootfs can be read-only; the app
			// writes its own files under /app (rw bind) and temporary data to /tmp
			{Type: "tmpfs", Destination: "/tmp", Options: []string{"rw", "nosuid", "nodev", "mode=1777", "size=256m"}},
		},
		ReadOnly:    true,
		CapDrop:     []string{"ALL"},
		CapAdd:      []string{"SETUID", "SETGID"},
		SecOpts:     []string{"no-new-privileges:true"},
		Healthcheck: modules.HC(modules.HCRoleAppDotNet),
	}
	if cfg.Site.StartCommand != "" {
		appCfg.Command = strings.Fields(cfg.Site.StartCommand)
	}
	if err := client.CreateContainer(ctx, appCfg); err != nil {
		return fmt.Errorf("create app: %w", err)
	}
	if err := client.StartContainer(ctx, modules.ContainerName(cfg.Site.Name, "app")); err != nil {
		return fmt.Errorf("start app: %w", err)
	}

	return nil
}
