package logs

import (
	"bufio"
	"context"
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

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
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		if origin == "" {
			return true
		}
		u, err := url.Parse(origin)
		if err != nil {
			return false
		}
		return u.Host == r.Host
	},
}

// logPayloadPool pools byte slices for Podman log frame reads to avoid
// a fresh heap allocation per log line on the streaming path
var logPayloadPool = sync.Pool{
	New: func() interface{} {
		b := make([]byte, 4096)
		return &b
	},
}

// RegisterRoutes mounts log streaming routes onto api.
func (h *Handler) RegisterRoutes(api *http.ServeMux) {
	api.HandleFunc("GET /sites/{id}/logs", h.apiSiteLogs)
	api.HandleFunc("GET /sites/{id}/logs/waf", h.apiSiteWAFLog)
	api.HandleFunc("GET /sites/{id}/logs/proxy", h.apiSiteProxyLog)
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

	wafLogPath := h.AppPath + "/logs/waf.log"
	ctx := r.Context()

	initial, err := tailWAFLog(wafLogPath, domains, tail)
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("[waf] no WAF log entries yet"))
		logger.Debug("apiSiteWAFLog: waf.log not readable for site %d: %v", site.ID, err)
		return
	}
	for _, line := range initial {
		if err := conn.WriteMessage(websocket.TextMessage, []byte(line)); err != nil {
			return
		}
	}

	f, err := os.Open(wafLogPath)
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
					for _, d := range domains {
						if strings.Contains(line, d) {
							if err := conn.WriteMessage(websocket.TextMessage, []byte(line)); err != nil {
								return
							}
							break
						}
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

// tailWAFLog returns the last n lines from path that contain any of the given
// domains. Reads the file sequentially and keeps only the last n matches to
// avoid loading the entire log into memory on large files.
func tailWAFLog(path string, domains []string, n int) ([]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	// use a circular buffer of size n so we never hold more than n lines in memory
	buf := make([]string, n)
	pos := 0
	count := 0

	scanner := bufio.NewScanner(f)
	// raise the scanner buffer for long log lines (default 64KB is usually fine
	// but WAF lines with long UAs can exceed it)
	scanner.Buffer(make([]byte, 128*1024), 128*1024)
	for scanner.Scan() {
		line := scanner.Text()
		for _, d := range domains {
			if strings.Contains(line, d) {
				buf[pos%n] = line
				pos++
				count++
				break
			}
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}

	if count == 0 {
		return []string{}, nil
	}

	// reassemble in chronological order from the circular buffer
	if count <= n {
		return buf[:count], nil
	}
	result := make([]string, n)
	for i := 0; i < n; i++ {
		result[i] = buf[(pos+i)%n]
	}
	return result, nil
}

// apiSiteProxyLog streams proxy-access.log entries filtered to this site's domains via WebSocket.
func (h *Handler) apiSiteProxyLog(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}

	// RP sites use route domains; all others use assigned domains
	var domains []string
	if site.SiteType == models.SiteTypeReverseProxy {
		routes, err := db.GetRPRoutesBySite(h.DB, site.ID)
		if err != nil || len(routes) == 0 {
			logger.Error("apiSiteProxyLog: no RP routes for site %d: %v", site.ID, err)
			http.Error(w, "no routes configured for this site", http.StatusNotFound)
			return
		}
		for _, rt := range routes {
			domains = append(domains, rt.Domain)
		}
	} else {
		siteDomains, err := db.GetDomainsBySite(h.DB, site.ID)
		if err != nil || len(siteDomains) == 0 {
			logger.Error("apiSiteProxyLog: no domains for site %d: %v", site.ID, err)
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

	logPath := h.AppPath + "/logs/proxy-access.log"
	ctx := r.Context()

	// send initial tail of matching lines
	initial, err := tailWAFLog(logPath, domains, tail)
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("[proxy] no proxy log entries yet"))
		logger.Debug("apiSiteProxyLog: proxy-access.log not readable for site %d: %v", site.ID, err)
		return
	}
	for _, line := range initial {
		if err := conn.WriteMessage(websocket.TextMessage, []byte(line)); err != nil {
			return
		}
	}

	f, err := os.Open(logPath)
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

	logger.Debug("apiSiteProxyLog: live streaming proxy-access.log for site %d domains=%v", site.ID, domains)

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
					for _, d := range domains {
						if strings.Contains(line, d) {
							if err := conn.WriteMessage(websocket.TextMessage, []byte(line)); err != nil {
								return
							}
							break
						}
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
