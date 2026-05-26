package reverseproxy

import (
	"context"
	"time"

	"podnest/internal/models"
	"podnest/internal/modules"
)

// Module implements modules.SiteTypeModule for reverse proxy sites.
type Module struct{}

func (Module) TypeID() int   { return models.SiteTypeReverseProxy }
func (Module) Label() string { return "Reverse Proxy" }

// Create provisions the reverse proxy site; no pod or containers are needed.
func (Module) Create(ctx context.Context, client modules.PodmanClient, cfg modules.PodConfig) error {
	return create(ctx, client, cfg)
}

// SeedConfigs returns the default config maps for a reverse proxy site.
func (Module) SeedConfigs() map[int]map[string]string {
	return seedConfigs()
}

// ScaffoldDir sets up the filesystem for a reverse proxy site; no-op.
func (Module) ScaffoldDir(dir string, cfg modules.ScaffoldConfig) error {
	return scaffoldDir(dir, cfg)
}

// Tabs returns site-detail tab descriptors for reverse proxy sites.
func (Module) Tabs(_ *models.Site) []modules.TabDescriptor { return nil }

func (Module) StartupTimeout() time.Duration { return 30 * time.Second }
func (Module) HasPHPFPM() bool               { return false }
func (Module) HasRedis() bool                { return false }

func (Module) HasPod() bool         { return false }
func (Module) HasSFTP() bool        { return false }
func (Module) HasDatabase() bool    { return false }
func (Module) HasCronSupport() bool { return false }

func (Module) RuntimeContainerRole() string { return "" }
