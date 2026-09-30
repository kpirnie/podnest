// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package stats

import (
	"bufio"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"syscall"
	"time"

	"podnest/internal/logger"
)

// hostStatsResponse is the dashboard host-usage WebSocket push payload.
type hostStatsResponse struct {
	CPUPercent   float64 `json:"cpu_percent"`
	MemUsed      int64   `json:"mem_used"`
	MemTotal     int64   `json:"mem_total"`
	DiskUsed     int64   `json:"disk_used"`
	DiskTotal    int64   `json:"disk_total"`
	ProcsRunning int     `json:"procs_running"`
	ProcsTotal   int     `json:"procs_total"`
}

// apiHostStats upgrades to WebSocket and pushes host CPU, memory, disk, and
// process counts every 2s. /proc/stat, /proc/meminfo, and /proc/loadavg report
// host-wide figures even from inside the container's own PID namespace; disk
// is the filesystem holding the app path.
func (h *Handler) apiHostStats(w http.ResponseWriter, r *http.Request) {
	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Error("stats: ws upgrade for host stats: %v", err)
		return
	}
	defer conn.Close()

	// CPU percent is a delta between samples, so take the baseline up front
	prevTotal, prevIdle, err := readCPUTimes()
	if err != nil {
		logger.Debug("stats: host cpu baseline: %v", err)
	}

	ctx := r.Context()
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			var resp hostStatsResponse

			if total, idle, err := readCPUTimes(); err != nil {
				logger.Debug("stats: host cpu: %v", err)
			} else {
				if dt := total - prevTotal; prevTotal > 0 && dt > 0 {
					resp.CPUPercent = float64(dt-(idle-prevIdle)) / float64(dt) * 100
				}
				prevTotal, prevIdle = total, idle
			}

			if used, total, err := readHostMem(); err != nil {
				logger.Debug("stats: host mem: %v", err)
			} else {
				resp.MemUsed, resp.MemTotal = used, total
			}

			var st syscall.Statfs_t
			if err := syscall.Statfs(h.AppPath, &st); err != nil {
				logger.Debug("stats: host disk: %v", err)
			} else {
				bs := int64(st.Bsize)
				resp.DiskTotal = int64(st.Blocks) * bs
				resp.DiskUsed = int64(st.Blocks-st.Bfree) * bs
			}

			if running, total, err := readProcCounts(); err != nil {
				logger.Debug("stats: host procs: %v", err)
			} else {
				resp.ProcsRunning, resp.ProcsTotal = running, total
			}

			if err := conn.WriteJSON(resp); err != nil {
				logger.Debug("stats: ws write failed for host stats: %v", err)
				return
			}
		}
	}
}

// readCPUTimes returns the aggregate jiffies from the first line of /proc/stat
// as a total and the idle portion (idle + iowait).
func readCPUTimes() (total, idle uint64, err error) {
	f, err := os.Open("/proc/stat")
	if err != nil {
		return 0, 0, err
	}
	defer f.Close()

	sc := bufio.NewScanner(f)
	if !sc.Scan() {
		return 0, 0, fmt.Errorf("empty /proc/stat")
	}
	fields := strings.Fields(sc.Text())
	if len(fields) < 9 || fields[0] != "cpu" {
		return 0, 0, fmt.Errorf("unexpected /proc/stat cpu line")
	}

	// user nice system idle iowait irq softirq steal — guest time is already
	// counted inside user, so summing it again would double count
	for i, s := range fields[1:9] {
		v, err := strconv.ParseUint(s, 10, 64)
		if err != nil {
			return 0, 0, fmt.Errorf("parse /proc/stat: %w", err)
		}
		total += v
		if i == 3 || i == 4 {
			idle += v
		}
	}
	return total, idle, nil
}

// readHostMem returns used (MemTotal - MemAvailable) and total memory in bytes
// from /proc/meminfo.
func readHostMem() (used, total int64, err error) {
	data, err := os.ReadFile("/proc/meminfo")
	if err != nil {
		return 0, 0, err
	}

	var avail int64
	for _, line := range strings.Split(string(data), "\n") {
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}
		switch fields[0] {
		case "MemTotal:":
			total, _ = strconv.ParseInt(fields[1], 10, 64)
		case "MemAvailable:":
			avail, _ = strconv.ParseInt(fields[1], 10, 64)
		}
	}
	if total == 0 {
		return 0, 0, fmt.Errorf("MemTotal not found in /proc/meminfo")
	}
	return (total - avail) * 1024, total * 1024, nil
}

// readProcCounts returns the host-wide runnable and total scheduling entity
// counts from the fourth field of /proc/loadavg.
func readProcCounts() (running, total int, err error) {
	data, err := os.ReadFile("/proc/loadavg")
	if err != nil {
		return 0, 0, err
	}
	fields := strings.Fields(string(data))
	if len(fields) < 4 {
		return 0, 0, fmt.Errorf("unexpected /proc/loadavg format")
	}
	r, t, ok := strings.Cut(fields[3], "/")
	if !ok {
		return 0, 0, fmt.Errorf("unexpected /proc/loadavg running/total field")
	}
	if running, err = strconv.Atoi(r); err != nil {
		return 0, 0, fmt.Errorf("parse /proc/loadavg running: %w", err)
	}
	if total, err = strconv.Atoi(t); err != nil {
		return 0, 0, fmt.Errorf("parse /proc/loadavg total: %w", err)
	}
	return running, total, nil
}
