// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package modules

import (
	"context"
	"fmt"
	"podnest/internal/models"
)

// PullImagesAndCreatePod pulls the module's images (plus varnish when it is
// enabled for the site) and creates the site pod.
func PullImagesAndCreatePod(ctx context.Context, client PodmanClient, cfg PodConfig, podName string, imgs []string) error {

	for _, img := range imgs {
		if err := client.PullImage(ctx, img); err != nil {
			return fmt.Errorf("pull %s: %w", img, err)
		}
	}
	if cfg.Configs[models.ConfigVarnish]["enabled"] == "true" {
		if err := client.PullImage(ctx, models.ImgVarnish); err != nil {
			return fmt.Errorf("pull varnish: %w", err)
		}
	}
	if _, err := client.CreatePod(ctx, podName, cfg.Site); err != nil {
		return fmt.Errorf("create pod %s: %w", podName, err)
	}
	return nil
}
