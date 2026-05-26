package node

import (
	"podnest/internal/config"
	"podnest/internal/models"
)

// seedConfigs returns the default config maps for a Node.js site.
// Node sites have no PHP config type.
func seedConfigs() map[int]map[string]string {
	return map[int]map[string]string{
		models.ConfigNginx:   config.DefaultNginx,
		models.ConfigMariaDB: config.DefaultMariaDB,
		models.ConfigRedis:   config.DefaultRedis,
		models.ConfigVarnish: config.DefaultVarnish,
	}
}
