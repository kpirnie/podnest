// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package wpcli

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"podnest/internal/apiutil"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/podman"

	"github.com/gorilla/websocket"
)

// wpcliContainerPath is where wp-cli is installed inside the PHP container.
// the rootfs is read-only, so it lives on the /tmp tmpfs and reinstalls on demand
const wpcliContainerPath = "/tmp/wp"

// WPCLIClient is the subset of podman.Client consumed by this handler.
type WPCLIClient interface {
	PostJSON(ctx context.Context, path string, body any, out any) error
	GetJSON(ctx context.Context, path string, out any) error
	StreamPost(ctx context.Context, path string, body any) (io.ReadCloser, error)
}

// Handler handles WP-CLI WebSocket terminal routes.
type Handler struct {
	Podman  WPCLIClient
	Resolve modules.SiteResolver
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 4096,
	// reject cross-origin upgrades — only same-origin (or non-browser, empty
	// Origin) clients may open the WP-CLI terminal, which is an effective root
	// shell in the container
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

// RegisterRoutes mounts WP-CLI routes onto api.
func (h *Handler) RegisterRoutes(api *http.ServeMux) {
	api.HandleFunc("GET /sites/{id}/wpcli", h.apiWPCLI)
}

func (h *Handler) apiWPCLI(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}
	if site.SiteType != models.SiteTypeWordPress {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "WP-CLI is only available for WordPress sites")
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Error("apiWPCLI: failed to upgrade connection for site %d: %v", site.ID, err)
		return
	}
	defer conn.Close()

	_, msg, err := conn.ReadMessage()
	if err != nil {
		logger.Error("apiWPCLI: failed to read command for site %d: %v", site.ID, err)
		return
	}

	var payload struct {
		Command string `json:"command"`
	}
	if err := json.Unmarshal(msg, &payload); err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("[error] invalid command payload"))
		return
	}

	cmd := strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(payload.Command), "wp "))
	if cmd == "" {
		conn.WriteMessage(websocket.TextMessage, []byte("[error] empty command"))
		return
	}

	logger.Debug("apiWPCLI: site %d running command: wp %s", site.ID, cmd)

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Minute)
	defer cancel()

	if err := h.ensureWPCLI(ctx, site.Name, conn); err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("[error] failed to install WP-CLI: "+err.Error()))
		return
	}

	containerName := podman.ContainerName(site.Name, "php")

	spec := map[string]any{
		"AttachStdout": true,
		"AttachStderr": true,
		"Detach":       false,
		"User":         "0",
		"Cmd": []string{
			"sh", "-c",
			fmt.Sprintf("%s --path=/var/www/html --no-color --allow-root %s", wpcliContainerPath, cmd),
		},
	}
	var execResp struct {
		ID string `json:"Id"`
	}
	if err := h.Podman.PostJSON(ctx,
		"/v4.0.0/libpod/containers/"+containerName+"/exec",
		spec, &execResp,
	); err != nil {
		logger.Error("apiWPCLI: failed to create exec for site %d: %v", site.ID, err)
		conn.WriteMessage(websocket.TextMessage, []byte("[error] "+err.Error()))
		return
	}

	body, err := h.Podman.StreamPost(ctx,
		fmt.Sprintf("/v4.0.0/libpod/exec/%s/start", execResp.ID),
		map[string]any{"Detach": false, "Tty": false},
	)
	if err != nil {
		logger.Error("apiWPCLI: failed to start exec stream for site %d: %v", site.ID, err)
		conn.WriteMessage(websocket.TextMessage, []byte("[error] "+err.Error()))
		return
	}
	defer body.Close()

	hdr := make([]byte, 8)
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		if _, err := io.ReadFull(body, hdr); err != nil {
			conn.WriteMessage(websocket.TextMessage, []byte("\n[done]"))
			return
		}

		size := int(hdr[4])<<24 | int(hdr[5])<<16 | int(hdr[6])<<8 | int(hdr[7])
		if size == 0 {
			continue
		}

		pl := make([]byte, size)
		if _, err := io.ReadFull(body, pl); err != nil {
			conn.WriteMessage(websocket.TextMessage, []byte("[error] stream read failed"))
			return
		}

		if err := conn.WriteMessage(websocket.TextMessage, pl); err != nil {
			logger.Debug("apiWPCLI: WebSocket write failed for site %d: %v", site.ID, err)
			return
		}
	}
}

func (h *Handler) ensureWPCLI(ctx context.Context, siteName string, conn *websocket.Conn) error {
	containerName := podman.ContainerName(siteName, "php")

	checkSpec := map[string]any{
		"AttachStdout": true,
		"AttachStderr": false,
		"Detach":       false,
		"Cmd":          []string{"test", "-f", wpcliContainerPath},
	}
	var checkResp struct {
		ID string `json:"Id"`
	}
	if err := h.Podman.PostJSON(ctx,
		"/v4.0.0/libpod/containers/"+containerName+"/exec",
		checkSpec, &checkResp,
	); err == nil {
		_ = h.Podman.PostJSON(ctx,
			"/v4.0.0/libpod/exec/"+checkResp.ID+"/start",
			map[string]any{"Detach": false}, nil,
		)
		var inspect struct {
			ExitCode int `json:"ExitCode"`
		}
		if err := h.Podman.GetJSON(ctx,
			"/v4.0.0/libpod/exec/"+checkResp.ID+"/json",
			&inspect,
		); err == nil && inspect.ExitCode == 0 {
			logger.Debug("ensureWPCLI: wp-cli already present in container %s", containerName)
			return nil
		}
	}

	conn.WriteMessage(websocket.TextMessage, []byte("[info] installing WP-CLI into container..."))
	logger.Debug("ensureWPCLI: installing wp-cli inside container %s", containerName)

	installSpec := map[string]any{
		"AttachStdout": true,
		"AttachStderr": true,
		"Detach":       false,
		"Cmd": []string{
			"sh", "-c",
			fmt.Sprintf("wget -q https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar -O /tmp/wp-cli.phar && chmod +x /tmp/wp-cli.phar && mv /tmp/wp-cli.phar %s", wpcliContainerPath),
		},
	}
	var installResp struct {
		ID string `json:"Id"`
	}
	if err := h.Podman.PostJSON(ctx,
		"/v4.0.0/libpod/containers/"+containerName+"/exec",
		installSpec, &installResp,
	); err != nil {
		logger.Error("ensureWPCLI: failed to create install exec: %v", err)
		return err
	}

	if err := h.Podman.PostJSON(ctx,
		"/v4.0.0/libpod/exec/"+installResp.ID+"/start",
		map[string]any{"Detach": false}, nil,
	); err != nil {
		logger.Error("ensureWPCLI: failed to run install exec: %v", err)
		return err
	}

	deadline := time.Now().Add(60 * time.Second)
	var installInspect struct {
		ExitCode int  `json:"ExitCode"`
		Running  bool `json:"Running"`
	}
	for time.Now().Before(deadline) {
		time.Sleep(500 * time.Millisecond)
		if err := h.Podman.GetJSON(ctx,
			"/v4.0.0/libpod/exec/"+installResp.ID+"/json",
			&installInspect,
		); err != nil {
			logger.Error("ensureWPCLI: failed to inspect install exec: %v", err)
			return err
		}
		if !installInspect.Running {
			break
		}
	}

	if installInspect.Running {
		return fmt.Errorf("wp-cli install timed out")
	}
	if installInspect.ExitCode != 0 {
		return fmt.Errorf("wp-cli install failed with exit code %d", installInspect.ExitCode)
	}

	logger.Debug("ensureWPCLI: wp-cli installed successfully in container %s", containerName)
	conn.WriteMessage(websocket.TextMessage, []byte("[info] WP-CLI installed successfully"))
	return nil
}
