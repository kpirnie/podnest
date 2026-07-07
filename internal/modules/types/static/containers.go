// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package static

import (
	"context"

	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/modules/containers"
)

// images returns the container images required for a static site pod.
func images(_ *models.Site) []string {
	return []string{models.ImgNginx}
}

// create provisions nginx and optionally varnish for a static site pod.
func create(ctx context.Context, client modules.PodmanClient, cfg modules.PodConfig) error {
	podName := modules.PodName(cfg.Site.Name)

	// pull the images and create pod
	if err := modules.PullImagesAndCreatePod(ctx, client, cfg, podName, images(cfg.Site)); err != nil {
		return err
	}

	// Create and start the nginx container
	if err := containers.CreateNginx(ctx, client, cfg, podName); err != nil {
		return err
	}

	// try to create varnish container
	if err := containers.CreateVarnish(ctx, client, cfg, podName); err != nil {
		return err
	}

	return nil
}
