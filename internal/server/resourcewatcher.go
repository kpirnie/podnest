package server

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/podman"
)

// resourceState holds mutable watcher runtime state, protected by a mutex.
type resourceState struct {
	mu        sync.RWMutex
	warning   *models.ResourceWarning
	throttled map[string]bool // pod name → currently throttled
}

func newResourceState() *resourceState {
	return &resourceState{throttled: make(map[string]bool)}
}

// GetWarning returns a copy of the current warning state (nil if none).
func (rs *resourceState) GetWarning() *models.ResourceWarning {
	rs.mu.RLock()
	defer rs.mu.RUnlock()
	if rs.warning == nil {
		return nil
	}
	w := *rs.warning
	return &w
}

// setWarning records a new breach warning.
func (rs *resourceState) setWarning(w *models.ResourceWarning) {
	rs.mu.Lock()
	rs.warning = w
	rs.mu.Unlock()
}

// clearWarning removes the active warning.
func (rs *resourceState) clearWarning() {
	rs.mu.Lock()
	rs.warning = nil
	rs.mu.Unlock()
}

// resourceWatcher polls available host memory against the configured reserve.
// When available memory drops below the reserve, it throttles the heaviest pod
// and dispatches notifications. Fires immediately then on the configured interval.
func (s *Server) resourceWatcher() {
	poll := func() {
		ctx := context.Background()

		// load settings from DB each cycle so changes take effect without restart
		ramReserveGB := 2.0
		throttlePct := 50.0
		webhookURL := ""

		if v, _ := db.GetSetting(s.cfg.DB, "resource_ram_reserve_gb"); v != "" {
			if f, err := strconv.ParseFloat(v, 64); err == nil {
				ramReserveGB = f
			}
		}
		if v, _ := db.GetSetting(s.cfg.DB, "resource_throttle_pct"); v != "" {
			if f, err := strconv.ParseFloat(v, 64); err == nil {
				throttlePct = f
			}
		}
		if v, _ := db.GetSetting(s.cfg.DB, "resource_webhook_url"); v != "" {
			webhookURL = v
		}

		// read host memory state from /proc/meminfo
		totalMB, availableMB, err := readMemInfoMB()
		if err != nil {
			logger.Error("resourceWatcher: could not read /proc/meminfo: %v", err)
			return
		}
		reserveMB := int64(ramReserveGB * 1024)
		logger.Debug("resourceWatcher: totalMB=%d availableMB=%d reserveMB=%d", totalMB, availableMB, reserveMB)

		// sum memory usage across all running pods from the stats cache
		allStats := s.stats.allStats()
		var totalUsedMB int64
		podUsage := make(map[string]int64)

		for podName, containers := range allStats {
			var podMB int64
			for _, c := range containers {
				podMB += int64(c.MemUsage) / (1024 * 1024)
			}
			podUsage[podName] = podMB
			totalUsedMB += podMB
		}

		logger.Debug("resourceWatcher: allStats=%d pods totalUsedMB=%d availableMB=%d reserveMB=%d",
			len(allStats), totalUsedMB, availableMB, reserveMB)
		for pod, mb := range podUsage {
			logger.Debug("resourceWatcher: pod=%s usedMB=%d", pod, mb)
		}

		if availableMB >= reserveMB {
			// available memory is above the reserve floor — resolve if previously breached
			if s.resource.GetWarning() != nil {
				s.liftThrottles(ctx, allStats)
				s.resource.clearWarning()
				dispatchWebhook(webhookURL, map[string]any{
					"event":     "resource_threshold_resolved",
					"resource":  "memory",
					"timestamp": time.Now().UTC().Format(time.RFC3339),
				})
				logger.Debug("resourceWatcher: memory resolved (availableMB=%d reserveMB=%d)", availableMB, reserveMB)
			}
			return
		}

		// find the heaviest pod
		offender, offenderMB := heaviestPod(podUsage)
		if offender == "" {
			return
		}

		logger.Warn("resourceWatcher: memory threshold breached (availableMB=%d reserveMB=%d offender=%s %dMB)",
			availableMB, reserveMB, offender, offenderMB)

		// set / refresh the warning state
		w := &models.ResourceWarning{
			Active:      true,
			Resource:    "memory",
			CurrentMB:   totalMB - availableMB,
			ThresholdMB: reserveMB,
			Offender:    offender,
			OffenderMB:  offenderMB,
			Since:       time.Now().UTC(),
		}
		if existing := s.resource.GetWarning(); existing != nil {
			w.Since = existing.Since // preserve original breach time
		}
		s.resource.setWarning(w)

		// apply throttle to the offending pod's containers
		s.applyThrottle(ctx, offender, allStats[offender], throttlePct)

		// dispatch webhook and notification
		payload := map[string]any{
			"event":             "resource_threshold_exceeded",
			"resource":          "memory",
			"current_usage_mb":  totalMB - availableMB,
			"threshold_mb":      reserveMB,
			"offender":          offender,
			"offender_usage_mb": offenderMB,
			"timestamp":         time.Now().UTC().Format(time.RFC3339),
		}
		dispatchWebhook(webhookURL, payload)

		// send admin notifications
		msg := fmt.Sprintf("PodNest: available memory low — %dMB available, %dMB reserved. Throttling %s.", availableMB, reserveMB, offender)
		s.notify("PodNest Resource Alert", msg, msg)
	}

	// read poll interval from DB; default 30s
	intervalSec := 30
	if v, _ := db.GetSetting(s.cfg.DB, "resource_poll_interval"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 5 {
			intervalSec = n
		}
	}

	poll()
	ticker := time.NewTicker(time.Duration(intervalSec) * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		// reload interval from DB in case it changed
		if v, _ := db.GetSetting(s.cfg.DB, "resource_poll_interval"); v != "" {
			if n, err := strconv.Atoi(v); err == nil && n >= 5 && n != intervalSec {
				intervalSec = n
				ticker.Reset(time.Duration(intervalSec) * time.Second)
			}
		}
		poll()
	}
}

// applyThrottle sets a cgroup memory limit on each container of the offending pod.
func (s *Server) applyThrottle(ctx context.Context, podName string, containers []podman.ContainerStat, throttlePct float64) {
	s.resource.mu.Lock()
	s.resource.throttled[podName] = true
	s.resource.mu.Unlock()

	for _, c := range containers {
		if c.MemUsage == 0 {
			continue
		}
		// reduce current usage by throttle percentage
		limit := int64(float64(c.MemUsage) * (1 - throttlePct/100))
		if limit < 64*1024*1024 {
			limit = 64 * 1024 * 1024 // floor at 64MB
		}
		if err := s.podman.UpdateContainerResources(ctx, c.Name, limit); err != nil {
			logger.Error("applyThrottle: failed for %s: %v", c.Name, err)
		} else {
			logger.Debug("applyThrottle: set %dMB limit on %s", limit/(1024*1024), c.Name)
		}
	}
}

// liftThrottles removes memory limits from all previously throttled pods.
func (s *Server) liftThrottles(ctx context.Context, allStats map[string][]podman.ContainerStat) {
	s.resource.mu.Lock()
	throttled := make(map[string]bool, len(s.resource.throttled))
	for k, v := range s.resource.throttled {
		throttled[k] = v
	}
	s.resource.mu.Unlock()

	for podName := range throttled {
		containers, ok := allStats[podName]
		if !ok {
			continue
		}
		for _, c := range containers {
			if err := s.podman.UpdateContainerResources(ctx, c.Name, 0); err != nil {
				logger.Error("liftThrottles: failed for %s: %v", c.Name, err)
			} else {
				logger.Debug("liftThrottles: removed limit on %s", c.Name)
			}
		}
	}

	s.resource.mu.Lock()
	s.resource.throttled = make(map[string]bool)
	s.resource.mu.Unlock()
}

// heaviestPod returns the pod name and MB of the pod with the highest memory usage.
func heaviestPod(usage map[string]int64) (string, int64) {
	var name string
	var max int64
	for k, v := range usage {
		if v > max {
			max = v
			name = k
		}
	}
	return name, max
}

// readMemInfoMB parses /proc/meminfo and returns MemTotal and MemAvailable in MB.
func readMemInfoMB() (total, available int64, err error) {
	data, err := os.ReadFile("/proc/meminfo")
	if err != nil {
		return 0, 0, err
	}
	for _, line := range strings.Split(string(data), "\n") {
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}
		kb, e := strconv.ParseInt(fields[1], 10, 64)
		if e != nil {
			continue
		}
		switch fields[0] {
		case "MemTotal:":
			total = kb / 1024
		case "MemAvailable:":
			available = kb / 1024
		}
	}
	if total == 0 {
		return 0, 0, fmt.Errorf("MemTotal not found in /proc/meminfo")
	}
	return total, available, nil
}

// dispatchWebhook fires an HTTP POST to url with a JSON payload.
// Non-blocking — errors are logged but do not propagate.
func dispatchWebhook(url string, payload map[string]any) {
	if url == "" {
		return
	}
	go func() {
		b, err := json.Marshal(payload)
		if err != nil {
			logger.Error("dispatchWebhook: marshal: %v", err)
			return
		}
		resp, err := http.Post(url, "application/json", bytes.NewReader(b))
		if err != nil {
			logger.Error("dispatchWebhook: POST %s: %v", url, err)
			return
		}
		defer resp.Body.Close()
		logger.Debug("dispatchWebhook: POST %s → %d", url, resp.StatusCode)
	}()
}
