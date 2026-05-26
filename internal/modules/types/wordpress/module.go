package wordpress

import (
	"context"
	"fmt"

	"podnest/internal/config"
	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/podman"
)

// Module implements modules.SiteTypeModule for WordPress sites.
type Module struct{}

func (Module) TypeID() int   { return models.SiteTypeWordPress }
func (Module) Label() string { return "WordPress" }

// Images returns the container images required for a WordPress pod.
func (Module) Images(site *models.Site) []string {
	return []string{
		models.ImgNginx,
		models.ImgDB,
		models.ImgRedis,
		models.ImgPMA,
		models.PHPImage(site.PHPVersion),
	}
}

// Create provisions the WordPress pod via the legacy CreateSitePod shim.
// Replaced in Phase 2 with direct container calls.
func (Module) Create(ctx context.Context, client modules.PodmanClient, cfg modules.PodConfig) error {
	adapter, ok := client.(*modules.PodmanClientAdapter)
	if !ok {
		return fmt.Errorf("wordpress.Module.Create: expected *modules.PodmanClientAdapter")
	}
	return adapter.Client.CreateSitePod(ctx, podman.SiteConfig{
		Site:           cfg.Site,
		SiteUID:        cfg.SiteUID,
		SiteDir:        cfg.SiteDir,
		DBName:         cfg.Site.Name,
		DBUser:         cfg.DBUser,
		DBPass:         cfg.DBPass,
		DBRootPass:     cfg.DBRootPass,
		RedisPass:      cfg.RedisPass,
		VarnishEnabled: cfg.Configs[models.ConfigVarnish]["enabled"] == "true",
		VarnishMemory:  cfg.Configs[models.ConfigVarnish]["memory_size"],
	})
}

// SeedConfigs returns default config maps for a WordPress site.
func (Module) SeedConfigs() map[int]map[string]string {
	return map[int]map[string]string{
		models.ConfigNginx:   config.DefaultNginx,
		models.ConfigPHP:     config.DefaultPHP,
		models.ConfigMariaDB: config.DefaultMariaDB,
		models.ConfigRedis:   config.DefaultRedis,
		models.ConfigVarnish: config.DefaultVarnish,
	}
}

// Tabs returns site-detail tab descriptors for WordPress sites.
// Populated post-JS→templates refactor.
func (Module) Tabs(_ *models.Site) []modules.TabDescriptor { return nil }

// ScaffoldDir sets up the filesystem for a WordPress site.
// Delegated to the legacy scaffoldSiteDir call site until Phase 2.
func (Module) ScaffoldDir(_ string, _ modules.ScaffoldConfig) error { return nil }
