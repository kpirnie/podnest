package logs

import (
	"bufio"
	"context"
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
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
	CheckOrigin:     func(r *http.Request) bool { return true },
}

// RegisterRoutes mounts log streaming routes onto api.
func (h *Handler) RegisterRoutes(api *http.ServeMux) {
	api.HandleFunc("GET /sites/{id}/logs", h.apiSiteLogs)
	api.HandleFunc("GET /sites/{id}/logs/waf", h.apiSiteWAFLog)
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

		payload := make([]byte, size)
		_, err = io.ReadFull(body, payload)
		if err != nil {
			logger.Error("failed to read log payload for container %s: %v", containerName, err)
			return
		}

		if err := conn.WriteMessage(websocket.TextMessage, payload); err != nil {
			logger.Debug("WebSocket write failed for container %s: %v", containerName, err)
			return
		}
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

func tailWAFLog(path string, domains []string, n int) ([]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var matches []string
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		for _, d := range domains {
			if strings.Contains(line, d) {
				matches = append(matches, line)
				break
			}
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}

	if len(matches) > n {
		matches = matches[len(matches)-n:]
	}
	return matches, nil
}
