// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package reverseproxy

import (
	"context"

	"podnest/internal/models"
	"podnest/internal/modules"
)

// create is a no-op; reverse proxy sites have no Podman pod.
func create(_ context.Context, _ modules.PodmanClient, _ modules.PodConfig) error {
	return nil
}

// Images returns nil; reverse proxy sites have no containers.
func (Module) Images(_ *models.Site) []string { return nil }
