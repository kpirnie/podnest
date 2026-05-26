package modules

import (
	"context"

	"podnest/internal/models"
	"podnest/internal/podman"
)

// PodmanClientAdapter wraps *podman.Client to satisfy PodmanClient.
// The Client field is exposed for Phase 1 shims in type module stubs.
type PodmanClientAdapter struct {
	Client *podman.Client
}

// CreatePod delegates to the underlying podman client.
func (a *PodmanClientAdapter) CreatePod(ctx context.Context, name string, site *models.Site) (string, error) {
	return a.Client.CreatePod(ctx, name, site)
}

// CreateContainer translates modules.ContainerConfig to podman.ContainerSpec.
// Phase 2 stubs will populate the full field set; Phase 1 stubs bypass this path.
func (a *PodmanClientAdapter) CreateContainer(ctx context.Context, cfg ContainerConfig) error {
	_, err := a.Client.CreateContainer(ctx, podman.ContainerSpec{
		Name:    cfg.Name,
		Image:   cfg.Image,
		Pod:     cfg.PodName,
		Env:     cfg.Env,
		Command: cfg.Args,
	})
	return err
}

// PullImage delegates to the underlying podman client.
func (a *PodmanClientAdapter) PullImage(ctx context.Context, image string) error {
	return a.Client.PullImage(ctx, image)
}

// RemovePod delegates to the underlying podman client.
func (a *PodmanClientAdapter) RemovePod(ctx context.Context, name string) error {
	return a.Client.RemovePod(ctx, name)
}
