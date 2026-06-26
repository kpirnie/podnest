// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package health

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"time"

	"podnest/internal/apiutil"
	"podnest/internal/auth"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/podman"

	"github.com/gorilla/websocket"
)

// HealthCache is the subset of the server stats cache consumed by this handler.
type HealthCache interface {
	ContainerHealthFor(podName string) ([]models.ContainerHealth, bool)
}

// ContainerRestarter is the subset of podman.Client consumed by this handler.
type ContainerRestarter interface {
	RestartContainer(ctx context.Context, name string) error
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

// RegisterRoutes mounts health routes onto api.
func (h *Handler) RegisterRoutes(api *http.ServeMux) {
	api.HandleFunc("GET /sites/{id}/health/stream", h.apiHealthStream)
	api.Handle("POST /sites/{id}/containers/{container}/restart",
		auth.RequireAPIAdmin(http.HandlerFunc(h.apiContainerRestart)),
	)
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

	pingTicker := time.NewTicker(30 * time.Second)
	defer pingTicker.Stop()

	// push health state immediately then every 2 seconds
	streamTicker := time.NewTicker(2 * time.Second)
	defer streamTicker.Stop()

	podName := podman.PodName(site.Name)
	ctx := r.Context()

	send := func() bool {
		containers, _ := h.Cache.ContainerHealthFor(podName)
		payload, err := json.Marshal(containers)
		if err != nil {
			logger.Error("apiHealthStream: marshal failed: %v", err)
			return true
		}
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
		case <-pingTicker.C:
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		case <-streamTicker.C:
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
	if role == "" {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "container role is required")
		return
	}

	containerName := podman.ContainerName(site.Name, role)
	if err := h.Podman.RestartContainer(r.Context(), containerName); err != nil {
		logger.Error("apiContainerRestart: failed to restart %s: %v", containerName, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("apiContainerRestart: restarted %s for site %d", containerName, site.ID)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
