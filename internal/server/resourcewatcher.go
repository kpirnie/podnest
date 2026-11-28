// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package server

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
)

// resourceState holds mutable watcher runtime state, protected by a mutex.
type resourceState struct {
	mu      sync.RWMutex
	warning *models.ResourceWarning
}

// webhookClient bounds a webhook POST; http.DefaultClient has no timeout, so a
// hung receiver would pin the goroutine for the life of the process.
var webhookClient = &http.Client{Timeout: 15 * time.Second}

const webhookMaxRespBytes = 64 << 10

func newResourceState() *resourceState {
	return &resourceState{}
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
	var throttles []memoryThrottle
	attemptedThrottle := false
	defer func() {
		for _, throttle := range liftMemoryThrottles(throttles) {
			throttle.file.Close()
		}
	}()

	poll := func() int {
		ctx := s.ctx

		// one settings read per cycle rather than a query per key; changes still
		// take effect without a restart
		settings, err := db.GetAllSettings(s.cfg.DB)
		if err != nil {
			logger.Error("resourceWatcher: could not load settings: %v", err)
			settings = map[string]string{}
		}

		ramReserveGB := 2.0
		throttlePct := 50.0
		webhookURL := ""
		intervalSec := 30

		if f, err := strconv.ParseFloat(settings["resource_ram_reserve_gb"], 64); err == nil {
			ramReserveGB = f
		}
		if f, err := strconv.ParseFloat(settings["resource_throttle_pct"], 64); err == nil && f > 0 && f <= 100 {
			throttlePct = f
		}
		if v := settings["resource_webhook_url"]; v != "" {
			webhookURL = v
		}
		if n, err := strconv.Atoi(settings["resource_poll_interval"]); err == nil && n >= 5 {
			intervalSec = n
		}

		// read host memory state from /proc/meminfo
		totalMB, availableMB, err := readMemInfoMB()
		if err != nil {
			logger.Error("resourceWatcher: could not read /proc/meminfo: %v", err)
			return intervalSec
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
			throttles = liftMemoryThrottles(throttles)
			attemptedThrottle = false
			// available memory is above the reserve floor — resolve if previously breached
			if s.resource.GetWarning() != nil {
				s.resource.clearWarning()
				s.dispatchWebhook(webhookURL, map[string]any{
					"event":     "resource_threshold_resolved",
					"resource":  "memory",
					"timestamp": time.Now().UTC().Format(time.RFC3339),
				})
				logger.Debug("resourceWatcher: memory resolved (availableMB=%d reserveMB=%d)", availableMB, reserveMB)
			}
			return intervalSec
		}

		// find the heaviest pod
		offender, offenderMB := heaviestPod(podUsage)
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
		existing := s.resource.GetWarning()
		if existing != nil {
			w.Since = existing.Since
		}
		s.resource.setWarning(w)
		// Apply pressure once per breach, when container statistics are available.
		if !attemptedThrottle && offender != "" {
			attemptedThrottle = true
			for _, c := range allStats[offender] {
				throttle, err := s.applyMemoryThrottle(ctx, c.Name, c.MemUsage, throttlePct)
				if err != nil {
					logger.Warn("resourceWatcher: soft throttle unavailable for %s: %v", c.Name, err)
				} else if throttle.file != nil {
					throttles = append(throttles, throttle)
				}
			}
		}
		if existing != nil {
			return intervalSec
		}
		logger.Warn("resourceWatcher: memory threshold breached (availableMB=%d reserveMB=%d offender=%s %dMB)",
			availableMB, reserveMB, offender, offenderMB)

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
		s.dispatchWebhook(webhookURL, payload)

		// send admin notifications
		msg := fmt.Sprintf("PodNest: available memory low — %dMB available, %dMB reserved.", availableMB, reserveMB)
		if offender != "" {
			msg += fmt.Sprintf(" Highest usage: %s.", offender)
		}
		s.notify("PodNest Resource Alert", msg, msg)

		return intervalSec
	}

	intervalSec := poll()
	ticker := time.NewTicker(time.Duration(intervalSec) * time.Second)
	defer ticker.Stop()
	for s.tick(ticker) {
		if n := poll(); n != intervalSec {
			intervalSec = n
			ticker.Reset(time.Duration(intervalSec) * time.Second)
		}
	}
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

// dispatchWebhook fires an HTTP POST to url with a JSON payload on a tracked
// goroutine. Non-blocking — errors are logged but do not propagate.
func (s *Server) dispatchWebhook(url string, payload map[string]any) {
	if url == "" {
		return
	}
	s.goTracked(func() {
		b, err := json.Marshal(payload)
		if err != nil {
			logger.Error("dispatchWebhook: marshal: %v", err)
			return
		}
		req, err := http.NewRequestWithContext(s.ctx, http.MethodPost, url, bytes.NewReader(b))
		if err != nil {
			logger.Error("dispatchWebhook: could not create request")
			return
		}
		req.Header.Set("Content-Type", "application/json")
		resp, err := webhookClient.Do(req)
		if err != nil {
			logger.Error("dispatchWebhook: POST failed")
			return
		}
		defer resp.Body.Close()

		// drain a bounded amount so the connection is reusable without letting a
		// hostile receiver stream an unbounded body into the process
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, webhookMaxRespBytes))
		logger.Debug("dispatchWebhook: POST status %d", resp.StatusCode)
	})
}
