// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package proxy

import (
	"fmt"
	"net/http"
	"os"
	"sync"
	"time"

	"podnest/internal/logger"
)

// siteLogFile returns the open *os.File for a per-site log, creating the file
// and its parent logs/ directory on first access. The result is cached in the
// appropriate sync.Map (cache) so the file is opened at most once per site.
// logType must be "access" or "waf"; the corresponding filename is derived from it.
func (p *Proxy) siteLogFile(cache *sync.Map, siteID int64, siteName, logType string) *os.File {
	// fast path — already open
	if v, ok := cache.Load(siteID); ok {
		return v.(*os.File)
	}

	// slow path — create directory and open file
	dir := fmt.Sprintf("%s/sites/%s/logs", p.appPath, siteName)
	if err := os.MkdirAll(dir, 0750); err != nil {
		logger.Error("proxy: siteLogFile: mkdir %s: %v", dir, err)
		return nil
	}

	filename := "access.log"
	if logType == "waf" {
		filename = "waf.log"
	}

	path := dir + "/" + filename
	f, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0640)
	if err != nil {
		logger.Error("proxy: siteLogFile: open %s: %v", path, err)
		return nil
	}
	logger.Debug("proxy: siteLogFile: opened %s for siteID=%d", path, siteID)

	// store; if another goroutine raced us, close the duplicate and use theirs
	actual, loaded := cache.LoadOrStore(siteID, f)
	if loaded {
		f.Close()
		return actual.(*os.File)
	}
	return f
}

// writeAccessLog writes a single structured line to the correct access log.
// siteID 0 (admin/unmatched traffic) routes to the global proxy-access.log;
// all other sites route to {appPath}/sites/{siteName}/logs/access.log.
// siteName is only required when siteID > 0.
func (p *Proxy) writeAccessLog(r *http.Request, status, bytes int, start time.Time, dur time.Duration, clientIP string, siteID int64, siteName string) {
	line := fmt.Sprintf("%s %s %s %s %d %d %s %s %q\n",
		start.UTC().Format(time.RFC3339),
		r.Method,
		r.Host,
		r.URL.Path,
		status,
		bytes,
		dur.Round(time.Millisecond).String(),
		clientIP,
		r.UserAgent(),
	)

	if siteID > 0 {
		// per-site log
		f := p.siteLogFile(&p.siteAccessLogs, siteID, siteName, "access")
		if f == nil {
			return
		}
		p.accessLogMu.Lock()
		_, err := f.WriteString(line)
		p.accessLogMu.Unlock()
		if err != nil {
			logger.Error("proxy: site access log write failed siteID=%d: %v", siteID, err)
		}
		return
	}

	// global log — siteID 0 (admin domain, unmatched)
	if p.accessLog == nil {
		return
	}
	p.accessLogMu.Lock()
	_, err := p.accessLog.WriteString(line)
	p.accessLogMu.Unlock()
	if err != nil {
		logger.Error("proxy: access log write failed: %v", err)
	}
}
