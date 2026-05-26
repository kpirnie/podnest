package php

import (
	"context"

	"podnest/internal/models"
	"podnest/internal/modules"
)

// Module implements modules.SiteTypeModule for plain PHP sites.
type Module struct{}

func (Module) TypeID() int   { return models.SiteTypePHP }
func (Module) Label() string { return "PHP" }

// Images returns the container images required for a PHP site pod.
func (Module) Images(site *models.Site) []string { return images(site) }

// Create provisions all containers for a PHP site pod.
func (Module) Create(ctx context.Context, client modules.PodmanClient, cfg modules.PodConfig) error {
	return create(ctx, client, cfg)
}

// SeedConfigs returns the default config maps for a PHP site.
func (Module) SeedConfigs() map[int]map[string]string { return seedConfigs() }

// Tabs returns site-detail tab descriptors for PHP sites.
func (Module) Tabs(_ *models.Site) []modules.TabDescriptor { return nil }

// ScaffoldDir sets up the filesystem structure for a PHP site.
func (Module) ScaffoldDir(dir string, cfg modules.ScaffoldConfig) error {
	return scaffoldDir(dir, cfg)
}
