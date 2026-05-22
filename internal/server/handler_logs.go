package server

import (
	"bufio"
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
	"podnest/internal/podman"

	"github.com/gorilla/websocket"
)

// upgrade the websocket connection
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 4096,
	// allow connections from the UI served by this same server
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// apiSiteLogs upgrades the connection to a WebSocket and streams live container logs
func (s *Server) apiSiteLogs(w http.ResponseWriter, r *http.Request) {

	// resolve the site from the request path
	site, ok := s.resolveSite(w, r)
	if !ok {
		logger.Error("failed to resolve site: %v", r)
		return
	}

	// resolve the target container from the query string, defaulting to nginx
	container := r.URL.Query().Get("container")
	switch container {
	case "nginx", "php", "db", "redis", "app":
	default:
		container = "nginx"
	}

	// resolve the tail line count from the query string, defaulting to 100
	tail := 100
	if t := r.URL.Query().Get("tail"); t != "" {
		if n, err := strconv.Atoi(t); err == nil && n > 0 && n <= 5000 {
			tail = n
		}
	}

	// upgrade the HTTP connection to a WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Error("failed to upgrade connection to WebSocket for site %d: %v", site.ID, err)
		return
	}
	defer conn.Close()

	// build the canonical container name and Podman log stream path
	containerName := podman.ContainerName(site.Name, container)
	ctx := r.Context()
	path := fmt.Sprintf(
		"/v4.0.0/libpod/containers/%s/logs?follow=true&stdout=true&stderr=true&tail=%d",
		containerName, tail,
	)

	// open the raw multiplexed log stream from the Podman API
	body, err := s.podman.StreamRaw(ctx, path)
	if err != nil {
		logger.Error("failed to open log stream for container %s: %v", containerName, err)
		conn.WriteMessage(websocket.TextMessage, []byte("[error] "+err.Error()))
		return
	}
	defer body.Close()

	logger.Debug("streaming logs for container %s on site %d (tail=%d)", containerName, site.ID, tail)

	// strip 8-byte multiplexed stream headers
	hdr := make([]byte, 8)
	for {
		select {
		case <-ctx.Done():
			logger.Debug("log stream context cancelled for container %s", containerName)
			return
		default:
		}

		// read the next 8-byte stream header; return on EOF or context cancellation
		_, err := io.ReadFull(body, hdr)
		if err != nil {
			logger.Debug("log stream ended for container %s: %v", containerName, err)
			return
		}

		// parse the payload byte length from bytes 4-7 of the header
		size := int(hdr[4])<<24 | int(hdr[5])<<16 | int(hdr[6])<<8 | int(hdr[7])
		if size == 0 {
			continue
		}

		// read the payload and forward it to the WebSocket client
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

// apiSiteWAFLog upgrades the connection to a WebSocket, streams the last n matching
// lines from waf.log for all of the site's domains, then polls for new entries live.
func (s *Server) apiSiteWAFLog(w http.ResponseWriter, r *http.Request) {

	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}

	// reverse proxy sites store their domains in rp_routes; all other types use the domains table
	var domains []string
	if site.SiteType == models.SiteTypeReverseProxy {
		routes, err := db.GetRPRoutesBySite(s.cfg.DB, site.ID)
		if err != nil || len(routes) == 0 {
			logger.Error("apiSiteWAFLog: no RP routes for site %d: %v", site.ID, err)
			http.Error(w, "no routes configured for this site", http.StatusNotFound)
			return
		}
		for _, r := range routes {
			domains = append(domains, r.Domain)
		}
	} else {
		siteDomains, err := db.GetDomainsBySite(s.cfg.DB, site.ID)
		if err != nil || len(siteDomains) == 0 {
			logger.Error("apiSiteWAFLog: no domains for site %d: %v", site.ID, err)
			http.Error(w, "no domains found for site", http.StatusNotFound)
			return
		}
		for _, d := range siteDomains {
			domains = append(domains, d.Domain)
		}
	}

	// resolve tail line count from query string, defaulting to 100
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

	wafLogPath := s.cfg.AppPath + "/logs/waf.log"
	ctx := r.Context()

	// send the initial tail of lines matching any registered domain before switching to live follow
	initial, err := tailWAFLog(wafLogPath, domains, tail)
	if err != nil {
		// log file may not exist yet if no WAF events have fired for this site
		conn.WriteMessage(websocket.TextMessage, []byte("[waf] no WAF log entries yet"))
		logger.Debug("apiSiteWAFLog: waf.log not readable for site %d: %v", site.ID, err)
		return
	}
	for _, line := range initial {
		if err := conn.WriteMessage(websocket.TextMessage, []byte(line)); err != nil {
			return
		}
	}

	// open the file and seek to the end for live streaming
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
			// drain all new lines written since the last tick
			for {
				line, err := reader.ReadString('\n')
				if len(line) > 0 {
					line = strings.TrimRight(line, "\r\n")
					// forward the line if it matches any domain registered to this site
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
					// no more data yet — wait for the next tick
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

// tailWAFLog reads waf.log and returns the last n lines that contain any of the given domains
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
		// match any domain registered to this site
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

	// return only the last n matches
	if len(matches) > n {
		matches = matches[len(matches)-n:]
	}
	return matches, nil
}
