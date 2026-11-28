// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package stats

import (
	"context"
	"sync"
	"time"
)

const cacheTTL = 60 * time.Second

// trafficCache holds computed statistics and shares scans for the same scope.
type trafficCache struct {
	mu        sync.Mutex
	entries   map[string]trafficCacheEntry
	pending   map[string]*trafficScan
	nextSweep time.Time
}

type trafficCacheEntry struct {
	data    *TrafficStats
	expires time.Time
}

type trafficScan struct {
	done chan struct{}
	data *TrafficStats
	err  error
}

var globalCache = &trafficCache{
	entries: make(map[string]trafficCacheEntry),
	pending: make(map[string]*trafficScan),
}

// load returns a fresh result or joins a scan for the same authorized scope.
func (c *trafficCache) load(ctx context.Context, key string, sources []trafficSource) (*TrafficStats, error) {
	c.mu.Lock()
	now := time.Now()
	if !now.Before(c.nextSweep) {
		for k, entry := range c.entries {
			if !now.Before(entry.expires) {
				delete(c.entries, k)
			}
		}
		c.nextSweep = now.Add(cacheTTL)
	}
	if entry, ok := c.entries[key]; ok && now.Before(entry.expires) {
		c.mu.Unlock()
		return entry.data, nil
	}
	scan := c.pending[key]
	if scan == nil {
		scan = &trafficScan{done: make(chan struct{})}
		c.pending[key] = scan
		// Each waiter can leave independently. Bound the shared scan's lifetime.
		scanCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), cacheTTL)
		go func() {
			defer cancel()
			scan.data, scan.err = parseTrafficLog(scanCtx, sources)
			c.mu.Lock()
			defer c.mu.Unlock()
			if scan.err == nil {
				c.entries[key] = trafficCacheEntry{data: scan.data, expires: time.Now().Add(cacheTTL)}
			}
			delete(c.pending, key)
			close(scan.done)
		}()
	}
	c.mu.Unlock()

	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	case <-scan.done:
		return scan.data, scan.err
	}
}
