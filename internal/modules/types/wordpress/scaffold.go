// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package wordpress

import (
	"archive/tar"
	"compress/gzip"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"podnest/internal/config"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/modules"
)

// scaffoldDir creates the filesystem structure and writes config files for a WordPress site.
func scaffoldDir(dir string, cfg modules.ScaffoldConfig) error {
	dirs := []string{
		dir + "/html",
		dir + "/nginx/conf.d",
		dir + "/nginx/logs",
		dir + "/php-fpm",
		dir + "/db",
		dir + "/redis",
		dir + "/varnish",
	}
	for _, d := range dirs {
		if err := os.MkdirAll(d, 0755); err != nil {
			return fmt.Errorf("create dir %s: %w", d, err)
		}
	}
	if err := os.MkdirAll(filepath.Join(dir, "backups"), 0755); err != nil {
		return fmt.Errorf("create backups dir: %w", err)
	}

	if err := os.Chown(dir, 0, 0); err != nil {
		logger.Warn("could not chown site dir to root: %v", err)
	}
	if err := os.Chmod(dir, 0755); err != nil {
		logger.Warn("could not chmod site dir: %v", err)
	}
	if err := os.Chown(dir+"/html", 33, cfg.SiteUID); err != nil {
		logger.Warn("could not chown html: %v", err)
	}
	if err := os.Chmod(dir+"/html", 02775); err != nil {
		logger.Warn("could not chmod html: %v", err)
	}
	for _, d := range []string{"php-fpm", "redis"} {
		if err := os.Chown(dir+"/"+d, cfg.SiteUID, cfg.SiteUID); err != nil {
			logger.Warn("could not chown %s: %v", d, err)
		}
	}
	if err := os.Chown(dir+"/db", 999, 999); err != nil {
		logger.Warn("could not chown db dir: %v", err)
	}
	if err := os.Chown(dir+"/nginx", cfg.SiteUID, cfg.SiteUID); err != nil {
		logger.Warn("could not chown nginx dir: %v", err)
	}
	if err := os.Chown(dir+"/nginx/logs", 101, 101); err != nil {
		logger.Warn("could not chown nginx/logs: %v", err)
	}
	if err := os.Chmod(dir+"/nginx/logs", 0750); err != nil {
		logger.Warn("could not chmod nginx/logs: %v", err)
	}

	marshalCfg := func(kv map[string]string) string {
		if kv == nil {
			return "{}"
		}
		b, _ := json.Marshal(kv)
		return string(b)
	}

	vEnabled := config.VarnishEnabled(marshalCfg(cfg.Configs[models.ConfigVarnish]))

	nginxMain, err := config.RenderNginxMain(marshalCfg(cfg.Configs[models.ConfigNginx]))
	if err != nil {
		return fmt.Errorf("render nginx main: %w", err)
	}
	if err := os.WriteFile(dir+"/nginx/nginx.conf", []byte(nginxMain), 0644); err != nil {
		return fmt.Errorf("write nginx.conf: %w", err)
	}

	nginxSite, err := config.RenderNginxSite(marshalCfg(cfg.Configs[models.ConfigNginx]), models.SiteTypeWordPress, vEnabled)
	if err != nil {
		return fmt.Errorf("render nginx site: %w", err)
	}
	if err := os.WriteFile(dir+"/nginx/conf.d/site.conf", []byte(nginxSite), 0644); err != nil {
		return fmt.Errorf("write site.conf: %w", err)
	}

	phpFPM, err := config.RenderPHPFPM(marshalCfg(cfg.Configs[models.ConfigPHP]), cfg.SiteUID)
	if err != nil {
		return fmt.Errorf("render php-fpm: %w", err)
	}
	if err := os.WriteFile(dir+"/php-fpm/www.conf", []byte(phpFPM), 0644); err != nil {
		return fmt.Errorf("write www.conf: %w", err)
	}

	phpIni, err := config.RenderPHPIni(marshalCfg(cfg.Configs[models.ConfigPHP]))
	if err != nil {
		return fmt.Errorf("render php.ini: %w", err)
	}
	if err := os.WriteFile(dir+"/php-fpm/php.ini", []byte(phpIni), 0644); err != nil {
		return fmt.Errorf("write php.ini: %w", err)
	}

	env := "DB_NAME=" + cfg.Site.Name + "\n" +
		"DB_USER=" + cfg.DBUser + "\n" +
		"DB_PASS=" + cfg.DBPass + "\n" +
		"DB_ROOT_PASS=" + cfg.DBRootPass + "\n" +
		"REDIS_PASS=" + cfg.RedisPass + "\n"
	if err := os.WriteFile(dir+"/.env", []byte(env), 0600); err != nil {
		return fmt.Errorf("write .env: %w", err)
	}

	wpCfg := GenerateWPConfig(cfg.Site.Name, cfg.DBUser, cfg.DBPass, cfg.RedisPass)
	if err := os.WriteFile(dir+"/html/wp-config.php", []byte(wpCfg), 0640); err != nil {
		return fmt.Errorf("write wp-config.php: %w", err)
	}
	if err := os.Chown(dir+"/html/wp-config.php", cfg.SiteUID, cfg.SiteUID); err != nil {
		logger.Warn("could not chown wp-config.php: %v", err)
	}

	if err := DownloadWordPress(dir+"/html", cfg.SiteUID); err != nil {
		return fmt.Errorf("download WordPress: %w", err)
	}

	mariaDB, err := config.RenderMariaDB(marshalCfg(cfg.Configs[models.ConfigMariaDB]))
	if err != nil {
		return fmt.Errorf("render mariadb config: %w", err)
	}
	if err := os.WriteFile(dir+"/db/my.cnf", []byte(mariaDB), 0640); err != nil {
		return fmt.Errorf("write my.cnf: %w", err)
	}

	redisCfg, err := config.RenderRedis(marshalCfg(cfg.Configs[models.ConfigRedis]), cfg.RedisPass)
	if err != nil {
		return fmt.Errorf("render redis config: %w", err)
	}
	if err := os.WriteFile(dir+"/redis/redis.conf", []byte(redisCfg), 0644); err != nil {
		return fmt.Errorf("write redis.conf: %w", err)
	}

	vcl, err := config.RenderVarnish(marshalCfg(cfg.Configs[models.ConfigVarnish]))
	if err != nil {
		return fmt.Errorf("render varnish VCL: %w", err)
	}
	if err := os.WriteFile(dir+"/varnish/default.vcl", []byte(vcl), 0644); err != nil {
		return fmt.Errorf("write varnish VCL: %w", err)
	}

	return nil
}

// generateWPConfig renders a wp-config.php for the given site credentials.
// Used instead of the WordPress Docker entrypoint so php-fpm can run as siteUID.
func GenerateWPConfig(dbName, dbUser, dbPass, redisPass string) string {
	salt := func() string {
		b := make([]byte, 48)
		rand.Read(b)
		return hex.EncodeToString(b)
	}
	return fmt.Sprintf(`<?php
defined('DB_NAME') || define('DB_NAME',     '%s');
defined('DB_USER') || define('DB_USER',     '%s');
defined('DB_PASSWORD') || define('DB_PASSWORD', '%s');
defined('DB_HOST') || define('DB_HOST',     '127.0.0.1:3306');
defined('DB_CHARSET') || define('DB_CHARSET',  'utf8mb4');
defined('DB_COLLATE') || define('DB_COLLATE',  '');
defined('AUTH_KEY') || define('AUTH_KEY',         '%s');
defined('SECURE_AUTH_KEY') || define('SECURE_AUTH_KEY',  '%s');
defined('LOGGED_IN_KEY') || define('LOGGED_IN_KEY',    '%s');
defined('NONCE_KEY') || define('NONCE_KEY',        '%s');
defined('AUTH_SALT') || define('AUTH_SALT',        '%s');
defined('SECURE_AUTH_SALT') || define('SECURE_AUTH_SALT', '%s');
defined('LOGGED_IN_SALT') || define('LOGGED_IN_SALT',   '%s');
defined('NONCE_SALT') || define('NONCE_SALT',       '%s');
defined('WP_REDIS_HOST') || define('WP_REDIS_HOST',     '127.0.0.1');
defined('WP_REDIS_PORT') || define('WP_REDIS_PORT',     6379);
defined('WP_REDIS_PASSWORD') || define('WP_REDIS_PASSWORD', '%s');
defined('WP_CACHE') || define('WP_CACHE',          true);
defined('WP_DEBUG') || define('WP_DEBUG',          false);
defined('DISALLOW_FILE_EDIT') || define('DISALLOW_FILE_EDIT', true);
defined('FORCE_SSL_ADMIN') || define('FORCE_SSL_ADMIN',   true);
defined('WP_AUTO_UPDATE_CORE') || define('WP_AUTO_UPDATE_CORE', 'minor');
defined('FS_METHOD') || define('FS_METHOD',         'direct');
defined('DISABLE_WP_CRON') || define('DISABLE_WP_CRON',   true);
defined('COOKIEHASH') || define( 'COOKIEHASH', md5( AUTH_SALT ) );
defined('WP_MEMORY_LIMIT') || define( 'WP_MEMORY_LIMIT', '256M' );
defined('WP_MAX_MEMORY_LIMIT') || define( 'WP_MAX_MEMORY_LIMIT', '512M' );
defined('AUTOSAVE_INTERVAL') || define( 'AUTOSAVE_INTERVAL', 600 );
defined('WP_POST_REVISIONS') || define( 'WP_POST_REVISIONS', 3 );
defined('EMPTY_TRASH_DAYS') || define( 'EMPTY_TRASH_DAYS', 1 );

$table_prefix = 'wp_';
defined('ABSPATH') || define( 'ABSPATH', __DIR__ . '/' );
if (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') {
    $_SERVER['HTTPS'] = 'on';
}
require_once ABSPATH . 'wp-settings.php';
`,
		dbName, dbUser, dbPass,
		salt(), salt(), salt(), salt(),
		salt(), salt(), salt(), salt(),
		redisPass,
	)
}

// downloadWordPress fetches the latest WordPress release from wordpress.org and
// extracts it directly into htmlDir, stripping the top-level "wordpress/" prefix.
func DownloadWordPress(htmlDir string, siteUID int) error {
	resp, err := http.Get("https://wordpress.org/latest.tar.gz")
	if err != nil {
		return fmt.Errorf("downloading WordPress: %w", err)
	}
	defer resp.Body.Close()

	gz, err := gzip.NewReader(resp.Body)
	if err != nil {
		return fmt.Errorf("reading gzip stream: %w", err)
	}
	defer gz.Close()

	tr := tar.NewReader(gz)
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("reading tar: %w", err)
		}

		name := strings.TrimPrefix(hdr.Name, "wordpress/")
		if name == "" {
			continue
		}
		target := filepath.Join(htmlDir, filepath.Clean(name))

		switch hdr.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, 0755); err != nil {
				return fmt.Errorf("mkdir %s: %w", target, err)
			}
			_ = os.Chown(target, siteUID, siteUID)
		case tar.TypeReg:
			if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
				return fmt.Errorf("mkdir parent %s: %w", target, err)
			}
			f, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, os.FileMode(hdr.Mode))
			if err != nil {
				return fmt.Errorf("creating %s: %w", target, err)
			}
			_, copyErr := io.Copy(f, tr)
			f.Close()
			if copyErr != nil {
				return fmt.Errorf("writing %s: %w", target, copyErr)
			}
			_ = os.Chown(target, siteUID, siteUID)
		}
	}
	return nil
}
