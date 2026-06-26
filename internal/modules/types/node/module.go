// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package node

import (
	"context"
	"time"

	"podnest/internal/models"
	"podnest/internal/modules"
)

// Module implements modules.SiteTypeModule for Node.js sites.
type Module struct{}

func (Module) TypeID() int   { return models.SiteTypeNode }
func (Module) Label() string { return "Node.js" }

// Images returns the container images required for a Node.js site pod.
func (Module) Images(site *models.Site) []string { return images(site) }

// Create provisions all containers for a Node.js site pod.
func (Module) Create(ctx context.Context, client modules.PodmanClient, cfg modules.PodConfig) error {
	return create(ctx, client, cfg)
}

// SeedConfigs returns the default config maps for a Node.js site.
func (Module) SeedConfigs() map[int]map[string]string { return seedConfigs() }

// Tabs returns site-detail tab descriptors for Node.js sites.
func (Module) Tabs(_ *models.Site) []modules.TabDescriptor { return nil }

// ScaffoldDir sets up the filesystem structure for a Node.js site.
func (Module) ScaffoldDir(dir string, cfg modules.ScaffoldConfig) error {
	return scaffoldDir(dir, cfg)
}

func (Module) StartupTimeout() time.Duration { return 30 * time.Second }
func (Module) HasPHPFPM() bool               { return false }
func (Module) HasRedis() bool                { return true }

func (Module) HasPod() bool         { return true }
func (Module) HasSFTP() bool        { return true }
func (Module) HasDatabase() bool    { return true }
func (Module) HasCronSupport() bool { return true }

func (Module) RuntimeContainerRole() string { return "app" }
