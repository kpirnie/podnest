package php

import (
	"podnest/internal/config"
	"podnest/internal/models"
)

// seedConfigs returns the default config maps for a PHP site.
func seedConfigs() map[int]map[string]string {
	return map[int]map[string]string{
		models.ConfigNginx:   config.DefaultNginx,
		models.ConfigPHP:     config.DefaultPHP,
		models.ConfigMariaDB: config.DefaultMariaDB,
		models.ConfigRedis:   config.DefaultRedis,
		models.ConfigVarnish: config.DefaultVarnish,
	}
}
