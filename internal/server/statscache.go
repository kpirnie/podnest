package server

import (
	"sync"
	"time"

	"podnest/internal/models"
	"podnest/internal/podman"
)

// PodHealth holds health states for all containers in a pod.
type PodHealth struct {
	Containers []models.ContainerHealth
	UpdatedAt  time.Time
}

// statsCache is the shared in-memory store for container health and resource stats.
// Populated by the background poller; read by the WebSocket handler and resource watcher.
type statsCache struct {
	mu     sync.RWMutex
	health map[string]PodHealth              // keyed by pod name
	stats  map[string][]podman.ContainerStat // keyed by pod name
}

// newStatsCache returns an initialised statsCache.
func newStatsCache() *statsCache {
	return &statsCache{
		health: make(map[string]PodHealth),
		stats:  make(map[string][]podman.ContainerStat),
	}
}

// setHealth stores the latest health state for a pod.
func (c *statsCache) setHealth(podName string, containers []models.ContainerHealth) {
	c.mu.Lock()
	c.health[podName] = PodHealth{Containers: containers, UpdatedAt: time.Now()}
	c.mu.Unlock()
}

// getHealth returns the last-known health state for a pod.
func (c *statsCache) getHealth(podName string) (PodHealth, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	h, ok := c.health[podName]
	return h, ok
}

// setStats stores the latest resource stats for a pod.
func (c *statsCache) setStats(podName string, stats []podman.ContainerStat) {
	c.mu.Lock()
	c.stats[podName] = stats
	c.mu.Unlock()
}

// getStats returns the last-known resource stats for a pod.
func (c *statsCache) getStats(podName string) ([]podman.ContainerStat, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	s, ok := c.stats[podName]
	return s, ok
}

// allStats returns a snapshot of stats for all pods.
func (c *statsCache) allStats() map[string][]podman.ContainerStat {
	c.mu.RLock()
	defer c.mu.RUnlock()
	out := make(map[string][]podman.ContainerStat, len(c.stats))
	for k, v := range c.stats {
		out[k] = v
	}
	return out
}

// ContainerHealthFor returns the container health slice for a pod.
// Used to satisfy the health.HealthCache interface in the handler package.
func (c *statsCache) ContainerHealthFor(podName string) ([]models.ContainerHealth, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	h, ok := c.health[podName]
	if !ok {
		return nil, false
	}
	return h.Containers, ok
}
