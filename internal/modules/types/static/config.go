package static

import (
	"podnest/internal/config"
	"podnest/internal/models"
)

// seedConfigs returns the nginx and varnish default configs for a static site.
// Static sites have no PHP, MariaDB, or Redis config types.
func seedConfigs() map[int]map[string]string {
	return map[int]map[string]string{
		models.ConfigNginx:   config.DefaultNginx,
		models.ConfigVarnish: config.DefaultVarnish,
	}
}
