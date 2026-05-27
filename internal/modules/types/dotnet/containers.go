package dotnet

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"

	"podnest/internal/models"
	"podnest/internal/modules"
)

const secNoNewPriv = "no-new-privileges:true"

// images returns the container images required for a .NET site pod.
func images(site *models.Site) []string {
	return []string{
		models.ImgNginx,
		models.ImgDB,
		models.ImgRedis,
		models.ImgPMA,
		models.RuntimeImage(site),
	}
}

// create provisions all containers for a .NET site pod.
func create(ctx context.Context, client modules.PodmanClient, cfg modules.PodConfig) error {
	podName := modules.PodName(cfg.Site.Name)
	dbName := cfg.Site.Name
	vEnabled := cfg.Configs[models.ConfigVarnish]["enabled"] == "true"

	for _, img := range images(cfg.Site) {
		if err := client.PullImage(ctx, img); err != nil {
			return fmt.Errorf("pull %s: %w", img, err)
		}
	}
	if vEnabled {
		if err := client.PullImage(ctx, models.ImgVarnish); err != nil {
			return fmt.Errorf("pull varnish: %w", err)
		}
	}

	if _, err := client.CreatePod(ctx, podName, cfg.Site); err != nil {
		return fmt.Errorf("create pod %s: %w", podName, err)
	}

	// MariaDB
	if err := client.CreateContainer(ctx, modules.ContainerConfig{
		Name:    modules.ContainerName(cfg.Site.Name, "db"),
		Image:   models.ImgDB,
		PodName: podName,
		Env: map[string]string{
			"MARIADB_ROOT_PASSWORD": cfg.DBRootPass,
			"MARIADB_DATABASE":      dbName,
			"MARIADB_USER":          cfg.DBUser,
			"MARIADB_PASSWORD":      cfg.DBPass,
			"MARIADB_ROOT_HOST":     "%",
		},
		Mounts: []modules.Mount{
			{Type: "bind", Source: cfg.SiteDir + "/db", Destination: "/var/lib/mysql", Options: []string{"z"}},
			{Type: "bind", Source: cfg.SiteDir + "/db/my.cnf", Destination: "/etc/mysql/conf.d/custom.cnf", Options: []string{"ro", "z"}},
		},
		CapDrop: []string{"ALL"},
		CapAdd:  []string{"CHOWN", "SETUID", "SETGID", "DAC_OVERRIDE", "IPC_LOCK"},
		SecOpts: []string{secNoNewPriv},
	}); err != nil {
		return fmt.Errorf("create db: %w", err)
	}
	if err := client.StartContainer(ctx, modules.ContainerName(cfg.Site.Name, "db")); err != nil {
		return fmt.Errorf("start db: %w", err)
	}
	if err := client.WaitForMariaDB(ctx, modules.ContainerName(cfg.Site.Name, "db"), cfg.DBRootPass); err != nil {
		return fmt.Errorf("wait for db: %w", err)
	}
	if err := client.EnsureMariaDBUser(ctx, modules.ContainerName(cfg.Site.Name, "db"), cfg.DBRootPass, dbName, cfg.DBUser, cfg.DBPass); err != nil {
		return fmt.Errorf("ensure db user: %w", err)
	}

	// Redis
	if err := client.CreateContainer(ctx, modules.ContainerConfig{
		Name:    modules.ContainerName(cfg.Site.Name, "redis"),
		Image:   models.ImgRedis,
		PodName: podName,
		Command: []string{"redis-server", "/usr/local/etc/redis/redis.conf"},
		Env:     map[string]string{"SKIP_FIX_PERMS": "1"},
		Mounts: []modules.Mount{
			{Type: "bind", Source: cfg.SiteDir + "/redis/redis.conf", Destination: "/usr/local/etc/redis/redis.conf", Options: []string{"z"}},
			{Type: "tmpfs", Destination: "/tmp"},
		},
		CapDrop: []string{"ALL"},
		CapAdd:  []string{"SETUID", "SETGID"},
		SecOpts: []string{secNoNewPriv},
	}); err != nil {
		return fmt.Errorf("create redis: %w", err)
	}
	if err := client.StartContainer(ctx, modules.ContainerName(cfg.Site.Name, "redis")); err != nil {
		return fmt.Errorf("start redis: %w", err)
	}

	// .NET app container
	appCfg := modules.ContainerConfig{
		Name:       modules.ContainerName(cfg.Site.Name, "app"),
		Image:      models.RuntimeImage(cfg.Site),
		PodName:    podName,
		User:       fmt.Sprintf("%d:%d", cfg.SiteUID, cfg.SiteUID),
		WorkingDir: "/app",
		Env: map[string]string{
			"ASPNETCORE_URLS": fmt.Sprintf("http://+:%d", models.DotNetInternalPort),
		},
		Mounts: []modules.Mount{
			{Type: "bind", Source: cfg.SiteDir + "/html", Destination: "/app", Options: []string{"rw", "z"}},
		},
		CapDrop: []string{"ALL"},
		CapAdd:  []string{"SETUID", "SETGID"},
		SecOpts: []string{secNoNewPriv},
	}
	if cfg.Site.StartCommand != "" {
		appCfg.Command = strings.Fields(cfg.Site.StartCommand)
	}
	if err := client.CreateContainer(ctx, appCfg); err != nil {
		return fmt.Errorf("create app: %w", err)
	}
	if err := client.StartContainer(ctx, modules.ContainerName(cfg.Site.Name, "app")); err != nil {
		return fmt.Errorf("start app: %w", err)
	}

	// Nginx
	if err := client.CreateContainer(ctx, modules.ContainerConfig{
		Name:    modules.ContainerName(cfg.Site.Name, "nginx"),
		Image:   models.ImgNginx,
		PodName: podName,
		Env:     map[string]string{"UMASK": "0000"},
		Mounts: []modules.Mount{
			{Type: "tmpfs", Destination: "/var/log/nginx"},
			{Type: "bind", Source: cfg.SiteDir + "/html", Destination: "/var/www/html", Options: []string{"ro", "z"}},
			{Type: "bind", Source: cfg.SiteDir + "/nginx/nginx.conf", Destination: "/etc/nginx/nginx.conf", Options: []string{"ro", "z"}},
			{Type: "bind", Source: cfg.SiteDir + "/nginx/conf.d", Destination: "/etc/nginx/conf.d", Options: []string{"ro", "z"}},
		},
		CapDrop: []string{"ALL"},
		CapAdd:  []string{"NET_BIND_SERVICE", "CHOWN", "SETUID", "SETGID"},
		SecOpts: []string{secNoNewPriv},
	}); err != nil {
		return fmt.Errorf("create nginx: %w", err)
	}
	if err := client.StartContainer(ctx, modules.ContainerName(cfg.Site.Name, "nginx")); err != nil {
		return fmt.Errorf("start nginx: %w", err)
	}

	// Varnish (optional)
	if vEnabled {
		memSize := cfg.Configs[models.ConfigVarnish]["memory_size"]
		if memSize == "" {
			memSize = "256m"
		}
		if err := client.CreateContainer(ctx, modules.ContainerConfig{
			Name:    modules.ContainerName(cfg.Site.Name, "varnish"),
			Image:   models.ImgVarnish,
			PodName: podName,
			Env:     map[string]string{"VARNISH_SIZE": memSize, "VARNISH_HTTP_PORT": "80"},
			Mounts: []modules.Mount{
				{Type: "bind", Source: cfg.SiteDir + "/varnish/default.vcl", Destination: "/etc/varnish/default.vcl", Options: []string{"ro", "z"}},
			},
			CapDrop: []string{"ALL"},
			CapAdd:  []string{"NET_BIND_SERVICE", "CHOWN", "DAC_OVERRIDE", "SETUID", "SETGID", "IPC_LOCK"},
			SecOpts: []string{secNoNewPriv},
		}); err != nil {
			return fmt.Errorf("create varnish: %w", err)
		}
		if err := client.StartContainer(ctx, modules.ContainerName(cfg.Site.Name, "varnish")); err != nil {
			return fmt.Errorf("start varnish: %w", err)
		}
	}

	// phpMyAdmin
	h := sha256.Sum256([]byte(cfg.DBRootPass))
	blowfish := hex.EncodeToString(h[:])[:32]
	if err := client.CreateContainer(ctx, modules.ContainerConfig{
		Name:    modules.ContainerName(cfg.Site.Name, "pma"),
		Image:   models.ImgPMA,
		PodName: podName,
		Env: map[string]string{
			"PMA_HOST":                "127.0.0.1",
			"PMA_PORT":                "3306",
			"PMA_USER":                cfg.DBUser,
			"PMA_PASSWORD":            cfg.DBPass,
			"PMA_BLOWFISH_SECRET":     blowfish,
			"PMA_ABSOLUTE_URI":        fmt.Sprintf("/pma/%d/", cfg.Site.ID),
			"APACHE_PORT":             fmt.Sprintf("%d", models.PHPMyAdminPort),
			"PHP_MEMORY_LIMIT":        "512M",
			"PHP_MAX_EXECUTION_TIME":  "300",
			"PHP_UPLOAD_MAX_FILESIZE": "256M",
			"PHP_POST_MAX_SIZE":       "256M",
			"UPLOAD_LIMIT":            "256M",
		},
		CapDrop: []string{"ALL"},
		CapAdd:  []string{"CHOWN", "SETUID", "SETGID", "DAC_OVERRIDE", "NET_BIND_SERVICE"},
		SecOpts: []string{secNoNewPriv},
	}); err != nil {
		return fmt.Errorf("create pma: %w", err)
	}
	if err := client.StartContainer(ctx, modules.ContainerName(cfg.Site.Name, "pma")); err != nil {
		return fmt.Errorf("start pma: %w", err)
	}

	return nil
}
