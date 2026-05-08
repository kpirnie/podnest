package server

import (
	"fmt"
	"io"
	"net/http"
	"strconv"

	"podnest/internal/logger"
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
