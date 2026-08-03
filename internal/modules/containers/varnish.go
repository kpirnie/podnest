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

// CreateVarnishContainer creates and starts the Varnish container for a site pod.
func CreateVarnish(ctx context.Context, client modules.PodmanClient, cfg modules.PodConfig, podName string) error {

	// if we aren't configured to utilize varnish, tear down any container left
	// over from a previous enable so it cannot hold :80 in the pod netns
	if cfg.Configs[models.ConfigVarnish]["enabled"] != "true" {
		name := modules.ContainerName(cfg.Site.Name, "varnish")
		if exists, _ := client.ContainerExists(ctx, name); exists {
			if err := client.RemoveContainer(ctx, name); err != nil {
				return fmt.Errorf("remove disabled varnish: %w", err)
			}
		}
		return nil
	}

	memSize := cfg.Configs[models.ConfigVarnish]["memory_size"]
	if memSize == "" {
		memSize = "256m"
	}
	if err := client.CreateContainer(ctx, modules.ContainerConfig{
		Name:    modules.ContainerName(cfg.Site.Name, "varnish"),
		Image:   models.ImgVarnish,
		PodName: podName,
		Env:     map[string]string{"VARNISH_SIZE": memSize, "VARNISH_HTTP_PORT": "80"},
		Mounts: []modules.Mount{
			{Type: "bind", Source: cfg.SiteDir + "/varnish/default.vcl", Destination: "/etc/varnish/default.vcl", Options: []string{"ro", "z"}},
		},
		CapDrop:     []string{"ALL"},
		CapAdd:      []string{"NET_BIND_SERVICE", "CHOWN", "DAC_OVERRIDE", "SETUID", "SETGID", "IPC_LOCK"},
		SecOpts:     []string{"no-new-privileges:true"},
		Healthcheck: modules.HC(modules.HCRoleVarnish),
	}); err != nil {
		return fmt.Errorf("create varnish: %w", err)
	}
	if err := client.StartContainer(ctx, modules.ContainerName(cfg.Site.Name, "varnish")); err != nil {
		return fmt.Errorf("start varnish: %w", err)
	}

	return nil
}
