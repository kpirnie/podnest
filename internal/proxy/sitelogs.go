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

// accessLogEntry is a single formatted log line queued for async write.
// siteID 0 routes to the global log; siteName is only meaningful when
// siteID > 0. waf selects the WAF log rather than the access log.
type accessLogEntry struct {
	siteID   int64
	siteName string
	line     string
	waf      bool
}

// closeReq asks the drain to close and forget a site's cached log handles.
// Rotation compresses and unlinks the file; without this the drain keeps
// writing to the unlinked inode, losing every line after the first rotation
// and leaking a descriptor per rotation per site.
type closeReq struct {
	siteID int64
	done   chan struct{}
}

// enqueueWAFLog is the wafLogSink implementation handed to the WAF engine.
func (p *Proxy) enqueueWAFLog(siteID int64, siteName, line string) {
	select {
	case p.accessLogCh <- accessLogEntry{siteID: siteID, siteName: siteName, line: line, waf: true}:
	default:
		logger.Warn("proxy: access log channel full — WAF line dropped siteID=%d", siteID)
	}
}

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

// CloseSiteLogs closes and evicts the cached access and WAF log handles for a
// site, blocking until the drain has done so. Callers must invoke this before
// removing or renaming the underlying files. siteID 0 is ignored — the global
// handles are owned by Shutdown.
func (p *Proxy) CloseSiteLogs(siteID int64) {
	if p == nil || p.logCloseCh == nil || siteID <= 0 {
		return
	}

	done := make(chan struct{})
	select {
	case p.logCloseCh <- closeReq{siteID: siteID, done: done}:
		<-done
	case <-time.After(5 * time.Second):
		logger.Warn("proxy: CloseSiteLogs timed out siteID=%d", siteID)
	}
}

// drainAccessLogs is the sole writer of every access log file. Running all
// writes through one goroutine removes the shared mutex and the write syscall
// from the request path entirely. Closing accessLogCh terminates it; the done
// channel signals that every queued line has been written.
func (p *Proxy) drainAccessLogs() {
	defer close(p.accessLogDone)

	for {
		select {
		case req := <-p.logCloseCh:
			for _, cache := range []*sync.Map{&p.siteAccessLogs, &p.siteWAFLogs} {
				if v, ok := cache.LoadAndDelete(req.siteID); ok {
					v.(*os.File).Close()
				}
			}
			close(req.done)
		case e, ok := <-p.accessLogCh:
			if !ok {
				return
			}
			p.writeLogEntry(e)
		}
	}
}

// writeLogEntry resolves the target handle and writes one queued line.
func (p *Proxy) writeLogEntry(e accessLogEntry) {
	if e.siteID > 0 {
		cache := &p.siteAccessLogs
		logType := "access"
		if e.waf {
			cache = &p.siteWAFLogs
			logType = "waf"
		}
		f := p.siteLogFile(cache, e.siteID, e.siteName, logType)
		if f == nil {
			return
		}
		if _, err := f.WriteString(e.line); err != nil {
			logger.Error("proxy: site %s log write failed siteID=%d: %v", logType, e.siteID, err)
		}
		return
	}

	global := p.accessLog
	if e.waf {
		global = p.wafLog
	}
	if global == nil {
		return
	}
	if _, err := global.WriteString(e.line); err != nil {
		logger.Error("proxy: global log write failed: %v", err)
	}
}

// writeAccessLog formats a single structured access log line and enqueues it
// for async write. siteID 0 (admin/unmatched traffic) routes to the global
// proxy-access.log; all other sites route to
// {appPath}/sites/{siteName}/logs/access.log. siteName is only required when
// siteID > 0. reason is an optional variadic block-reason token (e.g. "ip",
// "ua", "geo:CN"); when provided, it is appended to the log line after the
// quoted user agent as "reason=<value>" so existing positional parsers remain
// unaffected.
func (p *Proxy) writeAccessLog(r *http.Request, status, bytes int, start time.Time, dur time.Duration, clientIP string, siteID int64, siteName string, reason ...string) {
	line := fmt.Sprintf("%s %s %s %s %d %d %s %s %q",
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

	// append the block-reason token when one was supplied
	if len(reason) > 0 && reason[0] != "" {
		line += " reason=" + reason[0]
	}
	line += "\n"

	// non-blocking send — drop rather than stall a request goroutine
	select {
	case p.accessLogCh <- accessLogEntry{siteID: siteID, siteName: siteName, line: line}:
	default:
		logger.Warn("proxy: access log channel full — line dropped siteID=%d", siteID)
	}
}
