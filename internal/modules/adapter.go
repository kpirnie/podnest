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
func (a *PodmanClientAdapter) CreateContainer(ctx context.Context, cfg ContainerConfig) error {
	mounts := make([]podman.Mount, len(cfg.Mounts))
	for i, m := range cfg.Mounts {
		mounts[i] = podman.Mount{
			Type:        m.Type,
			Source:      m.Source,
			Destination: m.Destination,
			Options:     m.Options,
		}
	}

	spec := podman.ContainerSpec{
		Name:       cfg.Name,
		Image:      cfg.Image,
		Pod:        cfg.PodName,
		Env:        cfg.Env,
		Mounts:     mounts,
		Command:    cfg.Command,
		Entrypoint: cfg.Entrypoint,
		User:       cfg.User,
		WorkingDir: cfg.WorkingDir,
		CapAdd:     cfg.CapAdd,
		CapDrop:    cfg.CapDrop,
		SecOpts:    cfg.SecOpts,
	}

	// map healthcheck if defined
	if cfg.Healthcheck != nil {
		spec.Healthcheck = &podman.HealthcheckConfig{
			Test:        cfg.Healthcheck.Test,
			Interval:    cfg.Healthcheck.Interval,
			Timeout:     cfg.Healthcheck.Timeout,
			Retries:     cfg.Healthcheck.Retries,
			StartPeriod: cfg.Healthcheck.StartPeriod,
		}
	}

	_, err := a.Client.CreateContainer(ctx, spec)
	return err
}

// StartContainer delegates to the underlying podman client.
func (a *PodmanClientAdapter) StartContainer(ctx context.Context, name string) error {
	return a.Client.StartContainer(ctx, name)
}

// PullImage delegates to the underlying podman client.
func (a *PodmanClientAdapter) PullImage(ctx context.Context, image string) error {
	return a.Client.PullImage(ctx, image)
}

// RemovePod delegates to the underlying podman client.
func (a *PodmanClientAdapter) RemovePod(ctx context.Context, name string) error {
	return a.Client.RemovePod(ctx, name)
}

// WaitForMariaDB delegates to the underlying podman client.
func (a *PodmanClientAdapter) WaitForMariaDB(ctx context.Context, containerName, rootPass string) error {
	return a.Client.WaitForMariaDB(ctx, containerName, rootPass)
}

// EnsureMariaDBUser delegates to the underlying podman client.
func (a *PodmanClientAdapter) EnsureMariaDBUser(ctx context.Context, containerName, rootPass, dbName, dbUser, dbPass string) error {
	return a.Client.EnsureMariaDBUser(ctx, containerName, rootPass, dbName, dbUser, dbPass)
}
