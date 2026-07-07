// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package wordpress

import (
	"context"
	"fmt"

	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/modules/containers"
)

// images returns the container images required for a WordPress site pod.
func images(site *models.Site) []string {
	return []string{
		models.ImgNginx,
		models.ImgDB,
		models.ImgRedis,
		models.ImgPMA,
		models.PHPImage(site.PHPVersion),
	}
}

// create provisions all containers for a WordPress site pod.
func create(ctx context.Context, client modules.PodmanClient, cfg modules.PodConfig) error {

	// setup the pod name
	podName := modules.PodName(cfg.Site.Name)

	// create the primary containers for the pod
	if err := containers.CreateThePrimaries(ctx, client, cfg, podName, images(cfg.Site)); err != nil {
		return err
	}

	// PHP-FPM
	if err := client.CreateContainer(ctx, modules.ContainerConfig{
		Name:    modules.ContainerName(cfg.Site.Name, "php"),
		Image:   models.PHPImage(cfg.Site.PHPVersion),
		PodName: podName,
		User:    fmt.Sprintf("%d:%d", cfg.SiteUID, cfg.SiteUID),
		Env: map[string]string{
			"DB_HOST":    "127.0.0.1",
			"DB_NAME":    cfg.Site.Name,
			"DB_USER":    cfg.DBUser,
			"DB_PASS":    cfg.DBPass,
			"REDIS_HOST": "127.0.0.1",
			"REDIS_PASS": cfg.RedisPass,
		},
		Mounts: []modules.Mount{
			{Type: "bind", Source: cfg.SiteDir + "/html", Destination: "/var/www/html", Options: []string{"rw"}},
			{Type: "bind", Source: cfg.SiteDir + "/php-fpm/www.conf", Destination: "/usr/local/etc/php-fpm.d/www.conf", Options: []string{"ro", "z"}},
			{Type: "bind", Source: cfg.SiteDir + "/php-fpm/php.ini", Destination: "/usr/local/etc/php/conf.d/99-custom.ini", Options: []string{"ro", "z"}},
			// writable scratch backed by tmpfs so the rest of the rootfs can be read-only —
			// confines a webshell to the site's own /var/www/html plus RAM that is wiped on
			// restart; nosuid/nodev block setuid binaries and device nodes a payload might drop
			{Type: "tmpfs", Destination: "/tmp", Options: []string{"rw", "nosuid", "nodev", "mode=1777", "size=512m"}},
			{Type: "tmpfs", Destination: "/run", Options: []string{"rw", "nosuid", "nodev", "mode=0755", "size=16m"}},
		},
		ReadOnly:    true,
		CapDrop:     []string{"ALL"},
		CapAdd:      []string{"CHOWN", "SETUID", "SETGID", "DAC_OVERRIDE", "FOWNER"},
		SecOpts:     []string{"no-new-privileges:true"},
		Healthcheck: modules.HC(modules.HCRolePHP),
	}); err != nil {
		return fmt.Errorf("create php: %w", err)
	}
	if err := client.StartContainer(ctx, modules.ContainerName(cfg.Site.Name, "php")); err != nil {
		return fmt.Errorf("start php: %w", err)
	}

	return nil
}
