// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package containers

import (
	"context"
	"fmt"
	"podnest/internal/models"
	"podnest/internal/modules"
)

// CreateRedis creates and starts the nginx container for a site pod.
func CreateMariaDB(ctx context.Context, client modules.PodmanClient, cfg modules.PodConfig, podName string) error {
	if err := client.CreateContainer(ctx, modules.ContainerConfig{
		Name:    modules.ContainerName(cfg.Site.Name, "db"),
		Image:   models.ImgDB,
		PodName: podName,
		Env: map[string]string{
			"MARIADB_ROOT_PASSWORD": cfg.DBRootPass,
			"MARIADB_DATABASE":      cfg.Site.Name,
			"MARIADB_USER":          cfg.DBUser,
			"MARIADB_PASSWORD":      cfg.DBPass,
			"MARIADB_ROOT_HOST":     "%",
		},
		Mounts: []modules.Mount{
			{Type: "bind", Source: cfg.SiteDir + "/db", Destination: "/var/lib/mysql", Options: []string{"z"}},
			{Type: "bind", Source: cfg.SiteDir + "/db/my.cnf", Destination: "/etc/mysql/conf.d/custom.cnf", Options: []string{"ro", "z"}},
		},
		CapDrop:     []string{"ALL"},
		CapAdd:      []string{"CHOWN", "SETUID", "SETGID", "DAC_OVERRIDE", "IPC_LOCK"},
		SecOpts:     []string{"no-new-privileges:true"},
		Healthcheck: modules.HC(modules.HCRoleDB),
	}); err != nil {
		return fmt.Errorf("create db: %w", err)
	}
	if err := client.StartContainer(ctx, modules.ContainerName(cfg.Site.Name, "db")); err != nil {
		return fmt.Errorf("start db: %w", err)
	}
	if err := client.WaitForMariaDB(ctx, modules.ContainerName(cfg.Site.Name, "db"), cfg.DBRootPass); err != nil {
		return fmt.Errorf("wait for db: %w", err)
	}
	if err := client.EnsureMariaDBUser(ctx, modules.ContainerName(cfg.Site.Name, "db"), cfg.DBRootPass, cfg.Site.Name, cfg.DBUser, cfg.DBPass); err != nil {
		return fmt.Errorf("ensure db user: %w", err)
	}
	return nil
}
