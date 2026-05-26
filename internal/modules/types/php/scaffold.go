package php

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"podnest/internal/config"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/modules"
)

// scaffoldDir creates the filesystem structure and writes config files for a PHP site.
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

	nginxSite, err := config.RenderNginxSite(marshalCfg(cfg.Configs[models.ConfigNginx]), models.SiteTypePHP, vEnabled)
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
