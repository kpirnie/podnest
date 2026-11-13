// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package cache

import (
	"fmt"
	"podnest/internal/config"
	"podnest/internal/models"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// sizePattern matches a size such as 128M, 64m or 512K
var sizePattern = regexp.MustCompile(`^([0-9]+)([kKmM])$`)

// Settings holds the parsed per-site proxy response cache config
type Settings struct {
	Enabled bool
	TTL     time.Duration
	TTLMode string
	Memory  int64
}

// ParseSettings parses and validates a proxy cache config map, falling back to
// config.DefaultProxyCache for any key that is missing or empty
func ParseSettings(kv map[string]string) (Settings, error) {
	val := func(key string) string {
		if v := strings.TrimSpace(kv[key]); v != "" {
			return v
		}
		return config.DefaultProxyCache[key]
	}

	var s Settings

	switch strings.ToLower(val("enabled")) {
	case "true":
		s.Enabled = true
	case "false":
	default:
		return s, fmt.Errorf("enabled must be true or false")
	}

	ttl, err := time.ParseDuration(val("ttl"))
	if err != nil || ttl <= 0 {
		return s, fmt.Errorf("ttl must be a positive duration such as 60s")
	}
	s.TTL = ttl

	s.TTLMode = strings.ToLower(val("ttl_mode"))
	if s.TTLMode != "fixed" && s.TTLMode != "upstream" {
		return s, fmt.Errorf("ttl_mode must be fixed or upstream")
	}

	m := sizePattern.FindStringSubmatch(val("memory"))
	if m == nil {
		return s, fmt.Errorf("memory must be a size such as 128M")
	}
	n, err := strconv.ParseInt(m[1], 10, 64)
	if err != nil || n <= 0 || n > models.ProxyCacheMaxMemory {
		return s, fmt.Errorf("memory must be between 1K and 256M")
	}
	if strings.EqualFold(m[2], "m") {
		n <<= 20
	} else {
		n <<= 10
	}
	if n > models.ProxyCacheMaxMemory {
		return s, fmt.Errorf("memory must be between 1K and 256M")
	}
	s.Memory = n

	return s, nil
}
