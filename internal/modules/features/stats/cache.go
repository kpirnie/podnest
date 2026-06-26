// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package stats

import (
	"sync"
	"time"
)

const cacheTTL = 60 * time.Second

// trafficCache holds computed traffic stats entries per site (0 = global).
type trafficCache struct {
	mu      sync.Mutex
	entries map[int64]trafficCacheEntry
}

// trafficCacheEntry is a single cached result with its expiry time.
type trafficCacheEntry struct {
	data    *TrafficStats
	expires time.Time
}

// globalCache is the package-level traffic cache shared across all handlers.
var globalCache = &trafficCache{
	entries: make(map[int64]trafficCacheEntry),
}

// get returns a cached TrafficStats for the given key, or nil if absent/expired.
func (c *trafficCache) get(key int64) *TrafficStats {
	c.mu.Lock()
	defer c.mu.Unlock()

	e, ok := c.entries[key]
	if !ok || time.Now().After(e.expires) {
		return nil
	}
	return e.data
}

// set stores a TrafficStats result under the given key with a 60s TTL.
func (c *trafficCache) set(key int64, data *TrafficStats) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.entries[key] = trafficCacheEntry{
		data:    data,
		expires: time.Now().Add(cacheTTL),
	}
}
