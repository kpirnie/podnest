package static

import (
	"context"

	"podnest/internal/models"
	"podnest/internal/modules"
)

// Module implements modules.SiteTypeModule for static HTML sites.
type Module struct{}

func (Module) TypeID() int   { return models.SiteTypeStatic }
func (Module) Label() string { return "Static HTML" }

// Images returns the container images required for a static site pod.
func (Module) Images(site *models.Site) []string { return images(site) }

// Create provisions the static site pod.
func (Module) Create(ctx context.Context, client modules.PodmanClient, cfg modules.PodConfig) error {
	return create(ctx, client, cfg)
}

// SeedConfigs returns the default config maps for a static site.
func (Module) SeedConfigs() map[int]map[string]string { return seedConfigs() }

// Tabs returns site-detail tab descriptors for static sites.
func (Module) Tabs(_ *models.Site) []modules.TabDescriptor { return nil }

// ScaffoldDir sets up the filesystem structure for a static site.
func (Module) ScaffoldDir(dir string, cfg modules.ScaffoldConfig) error {
	return scaffoldDir(dir, cfg)
}
