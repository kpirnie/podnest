// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package containers

import (
	"context"
	"podnest/internal/modules"
)

// pull and create all the primary containers necessary for this pod
func CreateThePrimaries(ctx context.Context, client modules.PodmanClient, cfg modules.PodConfig, podName string, images []string) error {

	// pull the images and create pod
	if err := modules.PullImagesAndCreatePod(ctx, client, cfg, podName, images); err != nil {
		return err
	}

	// Create and start the MariaDB container
	if err := CreateMariaDB(ctx, client, cfg, podName); err != nil {
		return err
	}

	// Create and start the redis container
	if err := CreateRedis(ctx, client, cfg, podName); err != nil {
		return err
	}

	// Create and start the nginx container
	if err := CreateNginx(ctx, client, cfg, podName); err != nil {
		return err
	}

	// try to create varnish container
	if err := CreateVarnish(ctx, client, cfg, podName); err != nil {
		return err
	}

	// phpMyAdmin — shared helper so PMA env/hardening changes are a one-place edit
	if err := CreatePMA(ctx, client, cfg, podName); err != nil {
		return err
	}

	// default
	return nil

}
