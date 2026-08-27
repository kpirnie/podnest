// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package logs

import (
	"bufio"
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"podnest/internal/apiutil"
	"podnest/internal/auth"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/podman"

	"github.com/gorilla/websocket"
)

// LogStreamer is the subset of podman.Client consumed by this handler.
type LogStreamer interface {
	StreamRaw(ctx context.Context, path string) (io.ReadCloser, error)
}

// Handler handles site log streaming WebSocket routes.
type Handler struct {
	DB      *sql.DB
	AppPath string
	Podman  LogStreamer
	Resolve modules.SiteResolver
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 4096,
	CheckOrigin:     apiutil.WSSameOrigin,
}

// logPayloadPool pools byte slices for Podman log frame reads to avoid
// a fresh heap allocation per log line on the streaming path
var logPayloadPool = sync.Pool{
	New: func() interface{} {
		b := make([]byte, 4096)
		return &b
	},
}

// tailChunkSize is how much is read per backward step when tailing a log
const tailChunkSize = 64 * 1024

// RegisterRoutes mounts log streaming routes onto api.
func (h *Handler) RegisterRoutes(api *http.ServeMux) {
	api.HandleFunc("GET /sites/{id}/logs", h.apiSiteLogs)
	api.HandleFunc("GET /sites/{id}/logs/waf", h.apiSiteWAFLog)
	api.HandleFunc("GET /sites/{id}/logs/proxy", h.apiSiteProxyLog)

	// global logs carry every tenant's hosts, paths, client IPs, and user agents — admin only
	api.Handle("GET /logs/proxy", auth.RequireAPIAdmin(http.HandlerFunc(h.apiGlobalProxyLog)))
	api.Handle("GET /logs/waf", auth.RequireAPIAdmin(http.HandlerFunc(h.apiGlobalWAFLog)))
}

func (h *Handler) apiSiteLogs(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		logger.Error("failed to resolve site: %v", r)
		return
	}

	container := r.URL.Query().Get("container")
	switch container {
	case "nginx", "php", "db", "redis", "app":
	default:
		container = "nginx"
	}

	tail := 100
	if t := r.URL.Query().Get("tail"); t != "" {
		if n, err := strconv.Atoi(t); err == nil && n > 0 && n <= 5000 {
			tail = n
		}
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Error("failed to upgrade connection to WebSocket for site %d: %v", site.ID, err)
		return
	}
	defer conn.Close()

	// configure ping/pong keepalive — clients that disappear without closing
	// the WebSocket would otherwise hold the goroutine and file handle forever
	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	})

	// start a ping ticker to detect dead clients
	pingTicker := time.NewTicker(30 * time.Second)
	defer pingTicker.Stop()

	containerName := podman.ContainerName(site.Name, container)
	ctx := r.Context()
	path := fmt.Sprintf(
		"/v4.0.0/libpod/containers/%s/logs?follow=true&stdout=true&stderr=true&tail=%d",
		containerName, tail,
	)

	body, err := h.Podman.StreamRaw(ctx, path)
	if err != nil {
		logger.Error("failed to open log stream for container %s: %v", containerName, err)
		conn.WriteMessage(websocket.TextMessage, []byte("[error] "+err.Error()))
		return
	}
	defer body.Close()

	logger.Debug("streaming logs for container %s on site %d (tail=%d)", containerName, site.ID, tail)

	hdr := make([]byte, 8)
	for {
		select {
		case <-ctx.Done():
			logger.Debug("log stream context cancelled for container %s", containerName)
			return
		case <-pingTicker.C:
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				// client gone — exit cleanly
				return
			}
		default:
		}

		_, err := io.ReadFull(body, hdr)
		if err != nil {
			logger.Debug("log stream ended for container %s: %v", containerName, err)
			return
		}

		size := int(hdr[4])<<24 | int(hdr[5])<<16 | int(hdr[6])<<8 | int(hdr[7])
		if size == 0 {
			continue
		}

		// acquire a pooled buffer — grow if this frame exceeds the pool's default size
		bufPtr := logPayloadPool.Get().(*[]byte)
		if cap(*bufPtr) < size {
			*bufPtr = make([]byte, size)
		}
		payload := (*bufPtr)[:size]
		_, err = io.ReadFull(body, payload)
		if err != nil {
			logPayloadPool.Put(bufPtr)
			logger.Error("failed to read log payload for container %s: %v", containerName, err)
			return
		}

		if err := conn.WriteMessage(websocket.TextMessage, payload); err != nil {
			logPayloadPool.Put(bufPtr)
			logger.Debug("WebSocket write failed for container %s: %v", containerName, err)
			return
		}
		logPayloadPool.Put(bufPtr)
		continue

	}
}

func (h *Handler) apiSiteWAFLog(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}

	var domains []string
	if site.SiteType == models.SiteTypeReverseProxy {
		routes, err := db.GetRPRoutesBySite(h.DB, site.ID)
		if err != nil || len(routes) == 0 {
			logger.Error("apiSiteWAFLog: no RP routes for site %d: %v", site.ID, err)
			http.Error(w, "no routes configured for this site", http.StatusNotFound)
			return
		}
		for _, r := range routes {
			domains = append(domains, r.Domain)
		}
	} else {
		siteDomains, err := db.GetDomainsBySite(h.DB, site.ID)
		if err != nil || len(siteDomains) == 0 {
			logger.Error("apiSiteWAFLog: no domains for site %d: %v", site.ID, err)
			http.Error(w, "no domains found for site", http.StatusNotFound)
			return
		}
		for _, d := range siteDomains {
			domains = append(domains, d.Domain)
		}
	}

	tail := 100
	if t := r.URL.Query().Get("tail"); t != "" {
		if n, err := strconv.Atoi(t); err == nil && n > 0 && n <= 5000 {
			tail = n
		}
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Error("apiSiteWAFLog: upgrade: %v", err)
		return
	}
	defer conn.Close()

	// configure ping/pong keepalive — clients that disappear without closing
	// the WebSocket would otherwise hold the goroutine and file handle forever
	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	})

	// start a ping ticker to detect dead clients
	pingTicker := time.NewTicker(30 * time.Second)
	defer pingTicker.Stop()

	// all sites write WAF events to their per-site log regardless of type
	wafLogPath := fmt.Sprintf("%s/sites/%s/logs/waf.log", h.AppPath, site.Name)
	ctx := r.Context()

	// if the per-site waf.log doesn't exist yet, start live tail with no initial lines
	initial, err := tailLogLines(wafLogPath, tail)
	if err != nil && !os.IsNotExist(err) {
		logger.Error("apiSiteWAFLog: tail failed for site %d: %v", site.ID, err)
		return
	}
	for _, line := range initial {
		if err := conn.WriteMessage(websocket.TextMessage, []byte(line)); err != nil {
			return
		}
	}

	// create the per-site waf.log if it doesn't exist yet so the live tail has a file to watch
	f, err := os.OpenFile(wafLogPath, os.O_CREATE|os.O_APPEND|os.O_RDONLY, 0640)
	if err != nil {
		logger.Error("apiSiteWAFLog: open for live tail: %v", err)
		return
	}
	defer f.Close()

	if _, err := f.Seek(0, io.SeekEnd); err != nil {
		logger.Error("apiSiteWAFLog: seek: %v", err)
		return
	}

	reader := bufio.NewReader(f)
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	logger.Debug("apiSiteWAFLog: live streaming waf.log for site %d domains=%v", site.ID, domains)

	for {
		select {
		case <-ctx.Done():
			return
		case <-pingTicker.C:
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				// client gone — exit cleanly
				return
			}
		case <-ticker.C:
			for {
				line, err := reader.ReadString('\n')
				if len(line) > 0 {
					line = strings.TrimRight(line, "\r\n")

					// per-site log is already scoped — no domain filtering needed
					if err := conn.WriteMessage(websocket.TextMessage, []byte(line)); err != nil {
						return
					}
				}
				if err == io.EOF {
					break
				}
				if err != nil {
					logger.Error("apiSiteWAFLog: read error: %v", err)
					return
				}
			}
		}
	}
}

// tailMatching returns the last n lines satisfying keep, in chronological order.
// The file is read backward from EOF a chunk at a time and stops as soon as n
// matches are held, so returning the tail of a multi-gigabyte log does not read
// the whole thing.
func tailMatching(path string, n int, keep func(string) bool) ([]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	fi, err := f.Stat()
	if err != nil {
		return nil, err
	}

	out := make([]string, 0, n)
	off := fi.Size()
	var carry []byte

	for off > 0 && len(out) < n {
		start := off - tailChunkSize
		if start < 0 {
			start = 0
		}
		chunk := make([]byte, off-start)
		if _, err := f.ReadAt(chunk, start); err != nil && err != io.EOF {
			return nil, err
		}
		off = start

		chunk = append(chunk, carry...)
		lines := bytes.Split(chunk, []byte("\n"))

		// the first element is a partial line unless the file start was reached
		if off > 0 {
			carry = lines[0]
			lines = lines[1:]
		} else {
			carry = nil
		}

		for i := len(lines) - 1; i >= 0 && len(out) < n; i-- {
			line := string(bytes.TrimRight(lines[i], "\r"))
			if line == "" {
				continue
			}
			if keep != nil && !keep(line) {
				continue
			}
			out = append(out, line)
		}
	}

	// collected newest-first — flip to chronological
	for i, j := 0, len(out)-1; i < j; i, j = i+1, j-1 {
		out[i], out[j] = out[j], out[i]
	}
	return out, nil
}

// tailWAFLog returns the last n lines from path that contain any of the given
// domains. Reads the file sequentially and keeps only the last n matches to
// avoid loading the entire log into memory on large files.
func tailWAFLog(path string, domains []string, n int) ([]string, error) {
	return tailMatching(path, n, func(line string) bool {
		for _, d := range domains {
			if strings.Contains(line, d) {
				return true
			}
		}
		return false
	})
}

// apiSiteProxyLog streams proxy-access.log entries filtered to this site's domains via WebSocket.
func (h *Handler) apiSiteProxyLog(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}

	// all sites write access events to their per-site log — no domain filtering needed

	tail := 100
	if t := r.URL.Query().Get("tail"); t != "" {
		if n, err := strconv.Atoi(t); err == nil && n > 0 && n <= 5000 {
			tail = n
		}
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Error("apiSiteProxyLog: upgrade: %v", err)
		return
	}
	defer conn.Close()

	// configure ping/pong keepalive — clients that disappear without closing
	// the WebSocket would otherwise hold the goroutine and file handle forever
	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	})

	// start a ping ticker to detect dead clients
	pingTicker := time.NewTicker(30 * time.Second)
	defer pingTicker.Stop()

	// all sites write to per-site access.log — no domain filtering needed
	logPath := fmt.Sprintf("%s/sites/%s/logs/access.log", h.AppPath, site.Name)
	ctx := r.Context()

	// send initial tail; if the file doesn't exist yet return no entries
	initial, err := tailLogLines(logPath, tail)
	if err != nil && !os.IsNotExist(err) {
		logger.Error("apiSiteProxyLog: tail failed for site %d: %v", site.ID, err)
		return
	}
	for _, line := range initial {
		if err := conn.WriteMessage(websocket.TextMessage, []byte(line)); err != nil {
			return
		}
	}

	// create the per-site access.log if it doesn't exist yet so the live tail has a file to watch
	f, err := os.OpenFile(logPath, os.O_CREATE|os.O_APPEND|os.O_RDONLY, 0640)
	if err != nil {
		logger.Error("apiSiteProxyLog: open for live tail: %v", err)
		return
	}
	defer f.Close()

	if _, err := f.Seek(0, io.SeekEnd); err != nil {
		logger.Error("apiSiteProxyLog: seek: %v", err)
		return
	}

	reader := bufio.NewReader(f)
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	logger.Debug("apiSiteProxyLog: live streaming %s for site %d", logPath, site.ID)

	for {
		select {
		case <-ctx.Done():
			return
		case <-pingTicker.C:
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				// client gone — exit cleanly
				return
			}
		case <-ticker.C:
			for {
				line, err := reader.ReadString('\n')
				if len(line) > 0 {
					line = strings.TrimRight(line, "\r\n")
					// per-site log is already scoped — write every line
					if err := conn.WriteMessage(websocket.TextMessage, []byte(line)); err != nil {
						return
					}
				}
				if err == io.EOF {
					break
				}
				if err != nil {
					logger.Error("apiSiteProxyLog: read error: %v", err)
					return
				}
			}
		}
	}
}

// apiGlobalProxyLog streams the global proxy-access.log via WebSocket — admin only.
func (h *Handler) apiGlobalProxyLog(w http.ResponseWriter, r *http.Request) {
	tail := 100
	if t := r.URL.Query().Get("tail"); t != "" {
		if n, err := strconv.Atoi(t); err == nil && n > 0 && n <= 5000 {
			tail = n
		}
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Error("apiGlobalProxyLog: upgrade: %v", err)
		return
	}
	defer conn.Close()

	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	})
	pingTicker := time.NewTicker(30 * time.Second)
	defer pingTicker.Stop()

	logPath := h.AppPath + "/logs/proxy-access.log"
	ctx := r.Context()

	initial, err := tailLogLines(logPath, tail)
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("[proxy] no log entries yet"))
		logger.Debug("apiGlobalProxyLog: proxy-access.log not readable: %v", err)
		return
	}
	for _, line := range initial {
		if err := conn.WriteMessage(websocket.TextMessage, []byte(line)); err != nil {
			return
		}
	}

	f, err := os.Open(logPath)
	if err != nil {
		logger.Error("apiGlobalProxyLog: open for live tail: %v", err)
		return
	}
	defer f.Close()

	if _, err := f.Seek(0, io.SeekEnd); err != nil {
		logger.Error("apiGlobalProxyLog: seek: %v", err)
		return
	}

	reader := bufio.NewReader(f)
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	logger.Debug("apiGlobalProxyLog: live streaming proxy-access.log")

	for {
		select {
		case <-ctx.Done():
			return
		case <-pingTicker.C:
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				// client gone — exit cleanly
				return
			}
		case <-ticker.C:
			for {
				line, err := reader.ReadString('\n')
				if len(line) > 0 {
					line = strings.TrimRight(line, "\r\n")
					if err := conn.WriteMessage(websocket.TextMessage, []byte(line)); err != nil {
						return
					}
				}
				if err == io.EOF {
					break
				}
				if err != nil {
					logger.Error("apiGlobalProxyLog: read error: %v", err)
					return
				}
			}
		}
	}
}

// apiGlobalWAFLog streams the global waf.log via WebSocket — admin only.
func (h *Handler) apiGlobalWAFLog(w http.ResponseWriter, r *http.Request) {
	tail := 100
	if t := r.URL.Query().Get("tail"); t != "" {
		if n, err := strconv.Atoi(t); err == nil && n > 0 && n <= 5000 {
			tail = n
		}
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Error("apiGlobalWAFLog: upgrade: %v", err)
		return
	}
	defer conn.Close()

	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	})
	pingTicker := time.NewTicker(30 * time.Second)
	defer pingTicker.Stop()

	logPath := h.AppPath + "/logs/waf.log"
	ctx := r.Context()

	initial, err := tailLogLines(logPath, tail)
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("[waf] no log entries yet"))
		logger.Debug("apiGlobalWAFLog: waf.log not readable: %v", err)
		return
	}
	for _, line := range initial {
		if err := conn.WriteMessage(websocket.TextMessage, []byte(line)); err != nil {
			return
		}
	}

	f, err := os.Open(logPath)
	if err != nil {
		logger.Error("apiGlobalWAFLog: open for live tail: %v", err)
		return
	}
	defer f.Close()

	if _, err := f.Seek(0, io.SeekEnd); err != nil {
		logger.Error("apiGlobalWAFLog: seek: %v", err)
		return
	}

	reader := bufio.NewReader(f)
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	logger.Debug("apiGlobalWAFLog: live streaming waf.log")

	for {
		select {
		case <-ctx.Done():
			return
		case <-pingTicker.C:
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		case <-ticker.C:
			for {
				line, err := reader.ReadString('\n')
				if len(line) > 0 {
					line = strings.TrimRight(line, "\r\n")
					if err := conn.WriteMessage(websocket.TextMessage, []byte(line)); err != nil {
						return
					}
				}
				if err == io.EOF {
					break
				}
				if err != nil {
					logger.Error("apiGlobalWAFLog: read error: %v", err)
					return
				}
			}
		}
	}
}

// tailLogLines returns the last n lines from path with no domain filtering.
func tailLogLines(path string, n int) ([]string, error) {
	return tailMatching(path, n, nil)
}
