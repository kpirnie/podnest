// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package health

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"time"

	"podnest/internal/apiutil"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/podman"

	"github.com/gorilla/websocket"
)

// HealthCache is the subset of the server stats cache consumed by this handler.
type HealthCache interface {
	ContainerHealthWatch(podName string) ([]models.ContainerHealth, <-chan struct{})
}

// ContainerRestarter is the subset of podman.Client consumed by this handler.
type ContainerRestarter interface {
	RestartContainer(ctx context.Context, name string) error
	ContainerIsRunning(ctx context.Context, name string) (bool, error)
	StartContainer(ctx context.Context, name string) error
}

// Handler handles container health streaming and per-container restart routes.
type Handler struct {
	Cache   HealthCache
	Podman  ContainerRestarter
	Resolve modules.SiteResolver
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  512,
	WriteBufferSize: 4096,
	CheckOrigin:     apiutil.WSSameOrigin,
}

// RegisterRoutes mounts health routes onto api.
func (h *Handler) RegisterRoutes(api *http.ServeMux) {
	api.HandleFunc("GET /sites/{id}/health/stream", h.apiHealthStream)
	api.HandleFunc("POST /sites/{id}/containers/{container}/restart", h.apiContainerRestart)
}

// apiHealthStream upgrades to WebSocket and streams container health states
// for the site's pod from the shared stats cache every 2 seconds.
func (h *Handler) apiHealthStream(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}

	// reverse proxy sites have no pod — nothing to stream
	if site.SiteType == models.SiteTypeReverseProxy {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "reverse proxy sites have no containers")
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Error("apiHealthStream: upgrade failed for site %d: %v", site.ID, err)
		return
	}
	defer conn.Close()

	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	})

	// the pong handler only runs inside a read, and a hijacked connection's
	// request context is not cancelled when the client goes away — this loop
	// does both, closing done on disconnect or a missed pong deadline
	_ = conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	done := make(chan struct{})
	go func() {
		defer close(done)
		for {
			if _, _, err := conn.NextReader(); err != nil {
				return
			}
		}
	}()

	pingTicker := time.NewTicker(30 * time.Second)
	defer pingTicker.Stop()

	podName := podman.PodName(site.Name)
	ctx := r.Context()

	var (
		last    []byte
		changed <-chan struct{}
	)

	send := func() bool {
		var containers []models.ContainerHealth
		containers, changed = h.Cache.ContainerHealthWatch(podName)
		payload, err := json.Marshal(containers)
		if err != nil {
			logger.Error("apiHealthStream: marshal failed: %v", err)
			return true
		}

		// every reconcile swaps the whole cache — only push when this pod changed
		if bytes.Equal(payload, last) {
			return true
		}
		last = payload

		if err := conn.WriteMessage(websocket.TextMessage, payload); err != nil {
			logger.Debug("apiHealthStream: write failed for site %d: %v", site.ID, err)
			return false
		}
		return true
	}

	// send immediately on connect
	if !send() {
		return
	}

	for {
		select {
		case <-ctx.Done():
			return
		case <-done:
			return
		case <-pingTicker.C:
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		case <-changed:
			if !send() {
				return
			}
		}
	}
}

// apiContainerRestart restarts a single named container within the site's pod.
func (h *Handler) apiContainerRestart(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}

	role := r.PathValue("container")
	switch role {
	case "nginx", "php", "db", "redis", "app", "pma", "varnish":
	default:
		apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid container role")
		return
	}

	// podman rejects a restart against a container that is not running with a
	// "container state improper" 500 — start it instead of surfacing that
	containerName := podman.ContainerName(site.Name, role)
	running, err := h.Podman.ContainerIsRunning(r.Context(), containerName)
	if err != nil {
		logger.Error("apiContainerRestart: failed to inspect %s: %v", containerName, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if !running {
		if err := h.Podman.StartContainer(r.Context(), containerName); err != nil {
			logger.Error("apiContainerRestart: failed to start %s: %v", containerName, err)
			apiutil.Error(w, http.StatusInternalServerError, err)
			return
		}
		logger.Debug("apiContainerRestart: started stopped container %s for site %d", containerName, site.ID)
		apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
		return
	}
	if err := h.Podman.RestartContainer(r.Context(), containerName); err != nil {
		logger.Error("apiContainerRestart: failed to restart %s: %v", containerName, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("apiContainerRestart: restarted %s for site %d", containerName, site.ID)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
