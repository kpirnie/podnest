// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

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
