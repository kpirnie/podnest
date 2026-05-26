package podman

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"podnest/internal/logger"
	"podnest/internal/models"
)

// setup constants for image names and security options
const (
	imgNginx = models.ImgNginx
	imgDB    = models.ImgDB
	imgRedis = models.ImgRedis
	imgPMA   = models.ImgPMA

	// common security options applied to every container
	secNoNewPriv = "no-new-privileges:true"
)

// SiteConfig holds everything needed to create a full WordPress pod
type SiteConfig struct {
	Site           *models.Site
	SiteUID        int
	SiteDir        string
	DBName         string
	DBUser         string
	DBPass         string
	DBRootPass     string
	RedisPass      string
	NginxConf      string
	NginxSite      string
	PHPFPMConf     string
	PHPIniConf     string
	MariaDBConf    string
	RedisConf      string
	VarnishEnabled bool
	VarnishMemory  string
}

// PodName returns the canonical pod name for a site
func PodName(siteName string) string {
	return "kppn-" + siteName
}

// ContainerName returns the canonical container name for a site+role
func ContainerName(siteName, role string) string {
	return PodName(siteName) + "-" + role
}

// CreateSitePod provisions the full pod: mariadb → redis → php-fpm → nginx → sftp → pma
func (c *Client) CreateSitePod(ctx context.Context, cfg SiteConfig) error {

	// setup the canonical pod name for this site
	podName := PodName(cfg.Site.Name)

	// hold the list of images we need to pull before creating the pod; all types need nginx + sftp, but only dynamic types need db + redis + pma + runtime
	images := []string{imgNginx}

	// which other pods do we need to pull based on the site type?
	switch cfg.Site.SiteType {
	case models.SiteTypeWordPress:
		images = append(images, imgDB, imgRedis, imgPMA, models.PHPImage(cfg.Site.PHPVersion))
	}

	// pull the varnish image if enabled for this site
	if cfg.VarnishEnabled {
		images = append(images, models.ImgVarnish)
	}

	// iterate over the list of images and pull them before creating the pod; this ensures all images are available locally and avoids partial pod creation if a pull fails after the pod is created
	for _, img := range images {
		if err := c.PullImage(ctx, img); err != nil {
			logger.Error("Failed to pull image %s: %v", img, err)
			return err
		}
	}

	// create the pod with the specified name and shared config (network, IPC, PID namespaces)
	if _, err := c.CreatePod(ctx, podName, cfg.Site); err != nil {
		logger.Error("Failed to create pod %s: %v", podName, err)
		return err
	}

	// mariaDB and redis (dynamic types only)
	switch cfg.Site.SiteType {
	case models.SiteTypeWordPress:
		if err := c.createMariaDB(ctx, cfg); err != nil {
			logger.Error("Failed to create mariadb in pod %s: %v", podName, err)
			return err
		}
		if err := c.waitForMariaDB(ctx, cfg); err != nil {
			logger.Error("Mariadb not ready in pod %s: %v", podName, err)
			return err
		}
		// ensure the site user and database exist regardless of whether MariaDB
		// ran its init scripts (skipped when /db already contains existing data)
		if err := c.ensureMariaDBUser(ctx, cfg); err != nil {
			logger.Error("Failed to ensure MariaDB user in pod %s: %v", podName, err)
			return err
		}
		if err := c.createRedis(ctx, cfg); err != nil {
			logger.Error("Failed to create redis in pod %s: %v", podName, err)
			return err
		}
	}

	// setup the runtime container based on the site type; WordPress gets the full PHP image with built-in extensions, while PHP-only sites get a slimmer image without extra extensions; Node and DotNet sites get their respective runtime images
	switch cfg.Site.SiteType {
	case models.SiteTypeWordPress:
		if err := c.createPHP(ctx, cfg); err != nil {
			logger.Error("Failed to create php-fpm in pod %s: %v", podName, err)
			return err
		}
	}

	// setup the nginx container for all site types; nginx will be configured to reverse proxy to the appropriate runtime container based on the site type and listen on port 80 for incoming HTTP requests
	if err := c.createNginx(ctx, cfg); err != nil {
		logger.Error("Failed to create nginx in pod %s: %v", podName, err)
		return err
	}

	// varnish sits in front of nginx when enabled; provisioned after nginx
	// so the backend is available when varnish starts
	if cfg.VarnishEnabled {
		if err := c.createVarnish(ctx, cfg); err != nil {
			logger.Error("Failed to create varnish in pod %s: %v", podName, err)
			return err
		}
	}

	// setup the phpMyAdmin container for dynamic site types; this provides a web-based interface to manage the MariaDB database, and is configured to connect to the internal MariaDB container with the appropriate credentials; it is not created for static sites since they do not have a database
	if cfg.Site.SiteType != models.SiteTypeStatic {
		if err := c.createPMA(ctx, cfg); err != nil {
			logger.Error("Failed to create pma in pod %s: %v", podName, err)
			return err
		}
	}

	// if we reached this point, all containers were created and started successfully
	logger.Info("Successfully created pod %s for site %s", podName, cfg.Site.Name)
	return nil
}

// RemoveSitePod force-removes the pod and all containers for a site
func (c *Client) RemoveSitePod(ctx context.Context, siteName string) error {
	return c.RemovePod(ctx, PodName(siteName))
}

// SiteStatus returns the pod inspect for a site
func (c *Client) SiteStatus(ctx context.Context, siteName string) (*PodInspect, error) {
	return c.InspectPod(ctx, PodName(siteName))
}

// createVarnish provisions the Varnish container inside the pod, listening on
// port 80 and proxying to the nginx container on VarnishNginxPort; the VCL
// file must already exist on disk before this is called
func (c *Client) createVarnish(ctx context.Context, cfg SiteConfig) error {
	podName := PodName(cfg.Site.Name)

	// fall back to the default memory size if none was provided
	memSize := cfg.VarnishMemory
	if memSize == "" {
		memSize = "256m"
	}

	_, err := c.CreateContainer(ctx, ContainerSpec{
		Name:  ContainerName(cfg.Site.Name, "varnish"),
		Image: models.ImgVarnish,
		Pod:   podName,
		Env: map[string]string{
			"VARNISH_SIZE":      memSize,
			"VARNISH_HTTP_PORT": "80",
		},
		Mounts: []Mount{
			{
				Type:        "bind",
				Source:      cfg.SiteDir + "/varnish/default.vcl",
				Destination: "/etc/varnish/default.vcl",
				Options:     []string{"ro", "z"},
			},
		},
		CapDrop: []string{"ALL"},
		CapAdd:  []string{"NET_BIND_SERVICE", "CHOWN", "DAC_OVERRIDE", "SETUID", "SETGID", "IPC_LOCK"},
		SecOpts: []string{secNoNewPriv},
	})
	if err != nil {
		logger.Error("Failed to create varnish in pod %s: %v", podName, err)
		return err
	}

	logger.Debug("Created varnish container for pod %s (memory: %s)", podName, memSize)
	return c.StartContainer(ctx, ContainerName(cfg.Site.Name, "varnish"))
}

// createPMA provisions the phpMyAdmin container bound to the internal PMA port
func (c *Client) createPMA(ctx context.Context, cfg SiteConfig) error {

	// setup the pod name for this site
	podName := PodName(cfg.Site.Name)

	// derive a deterministic 32-char blowfish secret from the DB root password;
	// prevents PMA security warnings and session invalidation on pod restarts
	h := sha256.Sum256([]byte(cfg.DBRootPass))
	blowfishSecret := hex.EncodeToString(h[:])[:32]
	logger.Debug("derived PMA blowfish secret for pod %s", podName)

	// create the container with the official phpMyAdmin image, setting environment variables to configure the connection to the internal MariaDB container with the appropriate credentials; also set security options to drop all capabilities except those needed for file ownership and permissions and network binding, and apply the no-new-privileges seccomp option for additional security hardening
	_, err := c.CreateContainer(ctx, ContainerSpec{
		Name:  ContainerName(cfg.Site.Name, "pma"),
		Image: imgPMA,
		Pod:   podName,
		Env: map[string]string{
			"PMA_HOST":                "127.0.0.1",
			"PMA_PORT":                "3306",
			"PMA_USER":                cfg.DBUser,
			"PMA_PASSWORD":            cfg.DBPass,
			"PMA_BLOWFISH_SECRET":     blowfishSecret,
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
	})
	if err != nil {
		logger.Error("Failed to create phpMyAdmin in pod %s: %v", podName, err)
		return err
	}

	// log the successful creation of the phpMyAdmin container for this site and start the container, returning any errors that occur during startup
	logger.Debug("Created phpMyAdmin container for pod %s", podName)
	return c.StartContainer(ctx, ContainerName(cfg.Site.Name, "pma"))
}

// createMariaDB provisions the MariaDB container with the appropriate environment variables and mounts for data persistence and configuration overrides
func (c *Client) createMariaDB(ctx context.Context, cfg SiteConfig) error {

	// setup the pod name for this site
	podName := PodName(cfg.Site.Name)

	// create the container with the official MariaDB image, setting environment variables for the root password, database name, user, and user password based on the provided site configuration; also set a root host of "%" to allow connections from any container in the pod; mount the site's db directory to /var/lib/mysql for data persistence and a custom my.cnf for configuration overrides; apply security options to drop all capabilities except those needed for file ownership and permissions and IPC locking, and apply the no-new-privileges seccomp option for additional security hardening
	_, err := c.CreateContainer(ctx, ContainerSpec{
		Name:  ContainerName(cfg.Site.Name, "db"),
		Image: imgDB,
		Pod:   podName,
		Env: map[string]string{
			"MARIADB_ROOT_PASSWORD": cfg.DBRootPass,
			"MARIADB_DATABASE":      cfg.DBName,
			"MARIADB_USER":          cfg.DBUser,
			"MARIADB_PASSWORD":      cfg.DBPass,
			"MARIADB_ROOT_HOST":     "%",
		},
		Mounts: []Mount{
			{
				Type:        "bind",
				Source:      cfg.SiteDir + "/db",
				Destination: "/var/lib/mysql",
				Options:     []string{"z"},
			},
			{
				Type:        "bind",
				Source:      cfg.SiteDir + "/db/my.cnf",
				Destination: "/etc/mysql/conf.d/custom.cnf",
				Options:     []string{"ro", "z"},
			},
		},
		CapDrop: []string{"ALL"},
		CapAdd:  []string{"CHOWN", "SETUID", "SETGID", "DAC_OVERRIDE", "IPC_LOCK"},
		SecOpts: []string{secNoNewPriv},
	})
	if err != nil {
		logger.Error("Failed to create mariadb in pod %s: %v", podName, err)
		return err
	}

	// log the successful creation of the mariadb container for this site and start the container, returning any errors that occur during startup
	logger.Debug("Created mariadb container for pod %s with database %s", podName, cfg.DBName)
	return c.StartContainer(ctx, ContainerName(cfg.Site.Name, "db"))
}

// createRedis provisions the Redis container with a custom configuration file that sets the requirepass directive based on the provided Redis password, and mounts for configuration overrides and a tmpfs for /tmp
func (c *Client) createRedis(ctx context.Context, cfg SiteConfig) error {

	// setup the pod name for this site
	podName := PodName(cfg.Site.Name)

	// create the container with the official Redis image, setting the command to run redis-server with a custom configuration file that sets the requirepass directive based on the provided Redis password; mount the custom redis.conf for configuration overrides and a tmpfs for /tmp; apply security options to drop all capabilities except those needed for file ownership and permissions and setting user/group IDs, and apply the no-new-privileges seccomp option for additional security hardening
	_, err := c.CreateContainer(ctx, ContainerSpec{
		Name:    ContainerName(cfg.Site.Name, "redis"),
		Image:   imgRedis,
		Pod:     podName,
		Command: []string{"redis-server", "/usr/local/etc/redis/redis.conf"},
		Env: map[string]string{
			"SKIP_FIX_PERMS": "1",
		},
		Mounts: []Mount{
			{
				Type:        "bind",
				Source:      cfg.SiteDir + "/redis/redis.conf",
				Destination: "/usr/local/etc/redis/redis.conf",
				Options:     []string{"z"},
			},
			{
				Type:        "tmpfs",
				Destination: "/tmp",
			},
		},
		CapDrop: []string{"ALL"},
		CapAdd:  []string{"SETUID", "SETGID"},
		SecOpts: []string{secNoNewPriv},
	})
	if err != nil {
		logger.Error("Failed to create redis in pod %s: %v", podName, err)
		return err
	}

	// log the successful creation of the redis container for this site and start the container, returning any errors that occur during startup
	logger.Debug("Created redis container for pod %s", podName)
	return c.StartContainer(ctx, ContainerName(cfg.Site.Name, "redis"))
}

// createPHP provisions the PHP-FPM container with the appropriate environment variables to connect to the internal MariaDB and Redis containers, and mounts for the site html directory and custom PHP configuration overrides; it uses the full PHP image with built-in extensions suitable for WordPress sites
func (c *Client) createPHP(ctx context.Context, cfg SiteConfig) error {
	podName := PodName(cfg.Site.Name)
	phpImage := models.PHPImage(cfg.Site.PHPVersion)

	_, err := c.CreateContainer(ctx, ContainerSpec{
		Name:  ContainerName(cfg.Site.Name, "php"),
		Image: models.PHPImage(cfg.Site.PHPVersion),
		Pod:   podName,
		User:  fmt.Sprintf("%d:%d", cfg.SiteUID, cfg.SiteUID),
		// no Entrypoint override — serversideup's entrypoint.d system manages startup
		Env: map[string]string{
			"DB_HOST":    "127.0.0.1",
			"DB_NAME":    cfg.DBName,
			"DB_USER":    cfg.DBUser,
			"DB_PASS":    cfg.DBPass,
			"REDIS_HOST": "127.0.0.1",
			"REDIS_PASS": cfg.RedisPass,
		},
		Mounts: []Mount{
			{
				Type:        "bind",
				Source:      cfg.SiteDir + "/html",
				Destination: "/var/www/html",
				Options:     []string{"rw"},
			},
			{
				Type:        "bind",
				Source:      cfg.SiteDir + "/php-fpm/www.conf",
				Destination: "/usr/local/etc/php-fpm.d/www.conf",
				Options:     []string{"ro", "z"},
			},
			{
				Type:        "bind",
				Source:      cfg.SiteDir + "/php-fpm/php.ini",
				Destination: "/usr/local/etc/php/conf.d/99-custom.ini",
				Options:     []string{"ro", "z"},
			},
		},
		CapDrop: []string{"ALL"},
		CapAdd:  []string{"CHOWN", "SETUID", "SETGID", "DAC_OVERRIDE", "FOWNER"},
		SecOpts: []string{secNoNewPriv},
	})

	if err != nil {
		logger.Error("Failed to create php-fpm in pod %s: %v", podName, err)
		return err
	}

	logger.Debug("Created php-fpm container for pod %s with image %s", podName, phpImage)
	return c.StartContainer(ctx, ContainerName(cfg.Site.Name, "php"))
}

// createPHPOnly provisions the PHP-FPM container with the appropriate environment variables to connect to the internal MariaDB and Redis containers, and mounts for the site html directory and custom PHP configuration overrides; it uses a slimmer PHP image without extra extensions suitable for non-WordPress PHP sites
func (c *Client) createPHPOnly(ctx context.Context, cfg SiteConfig) error {

	// setup the pod name for this site
	podName := PodName(cfg.Site.Name)

	// use the same WordPress image so the PHP extensions are identical, but override
	// the entrypoint to skip the WordPress install script entirely
	_, err := c.CreateContainer(ctx, ContainerSpec{
		Name:  ContainerName(cfg.Site.Name, "php"),
		Image: models.PHPImage(cfg.Site.PHPVersion),
		Pod:   podName,
		User:  fmt.Sprintf("%d:%d", cfg.SiteUID, cfg.SiteUID),
		Env: map[string]string{
			"DB_HOST":    "127.0.0.1",
			"DB_NAME":    cfg.DBName,
			"DB_USER":    cfg.DBUser,
			"DB_PASS":    cfg.DBPass,
			"REDIS_HOST": "127.0.0.1",
			"REDIS_PASS": cfg.RedisPass,
		},
		Mounts: []Mount{
			{
				Type:        "bind",
				Source:      cfg.SiteDir + "/html",
				Destination: "/var/www/html",
				Options:     []string{"rw"},
			},
			{
				Type:        "bind",
				Source:      cfg.SiteDir + "/php-fpm/www.conf",
				Destination: "/usr/local/etc/php-fpm.d/www.conf",
				Options:     []string{"ro", "z"},
			},
			{
				Type:        "bind",
				Source:      cfg.SiteDir + "/php-fpm/php.ini",
				Destination: "/usr/local/etc/php/conf.d/99-custom.ini",
				Options:     []string{"ro", "z"},
			},
		},
		CapDrop: []string{"ALL"},
		CapAdd:  []string{"CHOWN", "SETUID", "SETGID", "DAC_OVERRIDE", "FOWNER"},
		SecOpts: []string{secNoNewPriv},
	})
	if err != nil {
		logger.Error("Failed to create php-fpm in pod %s: %v", podName, err)
		return err
	}

	// log the successful creation of the php-fpm container for this site and start the container, returning any errors that occur during startup
	logger.Debug("Created php-fpm container for pod %s with image %s (plain PHP)", podName, models.PHPImage(cfg.Site.PHPVersion))
	return c.StartContainer(ctx, ContainerName(cfg.Site.Name, "php"))
}

// createNginx provisions the Nginx container with mounts for the site html directory and custom nginx configuration, and security options to drop all capabilities except those needed for file ownership and permissions and network binding, and apply the no-new-privileges seccomp option for additional security hardening; it uses the official nginx:alpine image for a lightweight web server to reverse proxy to the appropriate runtime container based on the site type
func (c *Client) createNginx(ctx context.Context, cfg SiteConfig) error {

	// setup the pod name for this site
	podName := PodName(cfg.Site.Name)

	// create the container with mounts for the site html directory and custom nginx configuration, and security options to drop all capabilities except those needed for file ownership and permissions and network binding, and apply the no-new-privileges seccomp option for additional security hardening; use the official nginx:alpine image for a lightweight web server to reverse proxy to the appropriate runtime container based on the site type
	_, err := c.CreateContainer(ctx, ContainerSpec{
		Name:  ContainerName(cfg.Site.Name, "nginx"),
		Image: imgNginx,
		Pod:   PodName(cfg.Site.Name),
		Mounts: []Mount{
			{
				Type:        "bind",
				Source:      cfg.SiteDir + "/html",
				Destination: "/var/www/html",
				Options:     []string{"ro", "z"},
			},
			{
				Type:        "bind",
				Source:      cfg.SiteDir + "/nginx/nginx.conf",
				Destination: "/etc/nginx/nginx.conf",
				Options:     []string{"ro", "z"},
			},
			{
				Type:        "bind",
				Source:      cfg.SiteDir + "/nginx/conf.d",
				Destination: "/etc/nginx/conf.d",
				Options:     []string{"ro", "z"},
			},
		},
		CapDrop: []string{"ALL"},
		CapAdd:  []string{"NET_BIND_SERVICE", "CHOWN", "SETUID", "SETGID"},
		SecOpts: []string{secNoNewPriv},
		Env: map[string]string{
			"UMASK": "0000",
		},
	})
	if err != nil {
		logger.Error("Failed to create nginx in pod %s: %v", podName, err)
		return err
	}

	// log the successful creation of the nginx container for this site and start the container, returning any errors that occur during startup
	logger.Debug("Created nginx container for pod %s", podName)
	return c.StartContainer(ctx, ContainerName(cfg.Site.Name, "nginx"))
}

func (c *Client) waitForMariaDB(ctx context.Context, cfg SiteConfig) error {
	return c.WaitForMariaDB(ctx, ContainerName(cfg.Site.Name, "db"), cfg.DBRootPass)
}

func (c *Client) ensureMariaDBUser(ctx context.Context, cfg SiteConfig) error {
	return c.EnsureMariaDBUser(ctx, ContainerName(cfg.Site.Name, "db"), cfg.DBRootPass, cfg.DBName, cfg.DBUser, cfg.DBPass)
}

// WaitForMariaDB blocks until MariaDB in containerName accepts connections or ctx expires.
func (c *Client) WaitForMariaDB(ctx context.Context, containerName, rootPass string) error {
	deadline := time.Now().Add(120 * time.Second)
	for time.Now().Before(deadline) {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}
		var info struct {
			State struct {
				Status string `json:"Status"`
			} `json:"State"`
		}
		if err := c.get(ctx, "/v4.0.0/libpod/containers/"+containerName+"/json", &info); err != nil || info.State.Status != "running" {
			logger.Debug("WaitForMariaDB: container %s not running yet (status=%q)", containerName, info.State.Status)
			time.Sleep(3 * time.Second)
			continue
		}
		execSpec := map[string]any{
			"AttachStdout": false,
			"AttachStderr": false,
			"Detach":       true,
			"Cmd": []string{
				"mariadb-admin", "--host=127.0.0.1", "--port=3306",
				"-u", "root", "-p" + rootPass,
				"ping", "--silent", "--connect-timeout=2",
			},
		}
		var execResp struct {
			ID string `json:"Id"`
		}
		if err := c.post(ctx, "/v4.0.0/libpod/containers/"+containerName+"/exec", execSpec, &execResp); err != nil || execResp.ID == "" {
			logger.Debug("WaitForMariaDB: not ready yet in %s: %v", containerName, err)
			time.Sleep(3 * time.Second)
			continue
		}
		if err := c.post(ctx, "/v4.0.0/libpod/exec/"+execResp.ID+"/start", map[string]any{"Detach": true}, nil); err != nil {
			time.Sleep(3 * time.Second)
			continue
		}
		time.Sleep(500 * time.Millisecond)
		var inspect struct {
			ExitCode int  `json:"ExitCode"`
			Running  bool `json:"Running"`
		}
		if err := c.get(ctx, "/v4.0.0/libpod/exec/"+execResp.ID+"/json", &inspect); err == nil && !inspect.Running && inspect.ExitCode == 0 {
			logger.Debug("WaitForMariaDB: ready in %s", containerName)
			return nil
		}
		time.Sleep(3 * time.Second)
	}
	logger.Error("WaitForMariaDB: timed out waiting for %s", containerName)
	return fmt.Errorf("timed out waiting for MariaDB to be ready")
}

// EnsureMariaDBUser creates the site database, user, and grants if they do not already exist.
func (c *Client) EnsureMariaDBUser(ctx context.Context, containerName, rootPass, dbName, dbUser, dbPass string) error {
	sql := fmt.Sprintf(
		"CREATE DATABASE IF NOT EXISTS `%s`; "+
			"CREATE USER IF NOT EXISTS '%s'@'%%' IDENTIFIED BY '%s'; "+
			"GRANT ALL ON `%s`.* TO '%s'@'%%'; "+
			"FLUSH PRIVILEGES;",
		dbName, dbUser, dbPass, dbName, dbUser,
	)
	spec := map[string]any{
		"AttachStdout": true,
		"AttachStderr": true,
		"Detach":       false,
		"Cmd":          []string{"mariadb", "--host=127.0.0.1", "--port=3306", "-u", "root", "-p" + rootPass, "-e", sql},
	}
	var execResp struct {
		ID string `json:"Id"`
	}
	if err := c.post(ctx, "/v4.0.0/libpod/containers/"+containerName+"/exec", spec, &execResp); err != nil {
		return fmt.Errorf("EnsureMariaDBUser: create exec in %s: %w", containerName, err)
	}
	if err := c.post(ctx, "/v4.0.0/libpod/exec/"+execResp.ID+"/start", map[string]any{"Detach": false}, nil); err != nil {
		return fmt.Errorf("EnsureMariaDBUser: start exec in %s: %w", containerName, err)
	}
	deadline := time.Now().Add(30 * time.Second)
	var inspect struct {
		ExitCode int  `json:"ExitCode"`
		Running  bool `json:"Running"`
	}
	for time.Now().Before(deadline) {
		time.Sleep(500 * time.Millisecond)
		if err := c.get(ctx, "/v4.0.0/libpod/exec/"+execResp.ID+"/json", &inspect); err != nil {
			return fmt.Errorf("EnsureMariaDBUser: inspect exec in %s: %w", containerName, err)
		}
		if !inspect.Running {
			break
		}
	}
	if inspect.Running {
		return fmt.Errorf("EnsureMariaDBUser: timed out in %s", containerName)
	}
	if inspect.ExitCode != 0 {
		return fmt.Errorf("EnsureMariaDBUser: SQL exec exited %d in %s", inspect.ExitCode, containerName)
	}
	logger.Debug("EnsureMariaDBUser: user '%s' and database '%s' ensured in %s", dbUser, dbName, containerName)
	return nil
}
