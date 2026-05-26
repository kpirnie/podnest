package static

import (
	"context"
	"fmt"

	"podnest/internal/config"
	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/podman"
)

// Module implements modules.SiteTypeModule for static HTML sites.
type Module struct{}

func (Module) TypeID() int   { return models.SiteTypeStatic }
func (Module) Label() string { return "Static HTML" }

// Images returns the container images required for a static site pod.
func (Module) Images(_ *models.Site) []string {
	return []string{models.ImgNginx}
}

// Create provisions the static site pod via the legacy CreateSitePod shim.
// Replaced in Phase 2 with direct container calls.
func (Module) Create(ctx context.Context, client modules.PodmanClient, cfg modules.PodConfig) error {
	adapter, ok := client.(*modules.PodmanClientAdapter)
	if !ok {
		return fmt.Errorf("static.Module.Create: expected *modules.PodmanClientAdapter")
	}
	return adapter.Client.CreateSitePod(ctx, podman.SiteConfig{
		Site:           cfg.Site,
		SiteUID:        cfg.SiteUID,
		SiteDir:        cfg.SiteDir,
		DBName:         cfg.Site.Name,
		VarnishEnabled: cfg.Configs[models.ConfigVarnish]["enabled"] == "true",
		VarnishMemory:  cfg.Configs[models.ConfigVarnish]["memory_size"],
	})
}

// SeedConfigs returns default config maps for a static site.
func (Module) SeedConfigs() map[int]map[string]string {
	return map[int]map[string]string{
		models.ConfigNginx:   config.DefaultNginx,
		models.ConfigVarnish: config.DefaultVarnish,
	}
}

// Tabs returns site-detail tab descriptors for static sites.
func (Module) Tabs(_ *models.Site) []modules.TabDescriptor { return nil }

// ScaffoldDir sets up the filesystem for a static site.
func (Module) ScaffoldDir(_ string, _ modules.ScaffoldConfig) error { return nil }
