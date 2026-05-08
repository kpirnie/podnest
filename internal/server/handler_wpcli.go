package server

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/podman"
	"podnest/internal/sftp"

	"github.com/gorilla/websocket"
)

// wpcliContainerPath is where wp-cli is installed inside the PHP container
const wpcliContainerPath = "/usr/local/bin/wp"

// apiWPCLI upgrades the connection to a WebSocket, ensures wp-cli is
// available inside the PHP container, then executes the requested WP-CLI
// command and streams the output back to the client in real time.
func (s *Server) apiWPCLI(w http.ResponseWriter, r *http.Request) {

	// resolve and validate the site — WP-CLI is only available for WordPress sites
	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}
	if site.SiteType != models.SiteTypeWordPress {
		apiErrorMsg(w, http.StatusBadRequest, "WP-CLI is only available for WordPress sites")
		return
	}

	// upgrade the HTTP connection to a WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Error("apiWPCLI: failed to upgrade connection for site %d: %v", site.ID, err)
		return
	}
	defer conn.Close()

	// read the command from the first WebSocket message
	_, msg, err := conn.ReadMessage()
	if err != nil {
		logger.Error("apiWPCLI: failed to read command for site %d: %v", site.ID, err)
		return
	}

	// decode the command payload
	var payload struct {
		Command string `json:"command"`
	}
	if err := json.Unmarshal(msg, &payload); err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("[error] invalid command payload"))
		return
	}

	// strip any leading "wp " prefix the client may have included — we prepend it ourselves
	cmd := strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(payload.Command), "wp "))
	if cmd == "" {
		conn.WriteMessage(websocket.TextMessage, []byte("[error] empty command"))
		return
	}

	logger.Debug("apiWPCLI: site %d running command: wp %s", site.ID, cmd)

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Minute)
	defer cancel()

	// ensure wp-cli is installed inside the container before running the command
	if err := s.ensureWPCLI(ctx, site.Name, conn); err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("[error] failed to install WP-CLI: "+err.Error()))
		return
	}

	containerName := podman.ContainerName(site.Name, "php")
	siteUID := sftp.UIDForSite(site.ID)

	// create the exec instance inside the PHP container
	spec := map[string]any{
		"AttachStdout": true,
		"AttachStderr": true,
		"Detach":       false,
		"User":         fmt.Sprintf("%d", siteUID),
		"Cmd": []string{
			"sh", "-c",
			fmt.Sprintf("%s --path=/var/www/html --no-color %s", wpcliContainerPath, cmd),
		},
	}
	var execResp struct {
		ID string `json:"Id"`
	}
	if err := s.podman.PostJSON(ctx,
		"/v4.0.0/libpod/containers/"+containerName+"/exec",
		spec, &execResp,
	); err != nil {
		logger.Error("apiWPCLI: failed to create exec for site %d: %v", site.ID, err)
		conn.WriteMessage(websocket.TextMessage, []byte("[error] "+err.Error()))
		return
	}

	// POST to exec start — the response body IS the multiplexed output stream
	body, err := s.podman.StreamPost(ctx,
		fmt.Sprintf("/v4.0.0/libpod/exec/%s/start", execResp.ID),
		map[string]any{"Detach": false, "Tty": false},
	)
	if err != nil {
		logger.Error("apiWPCLI: failed to start exec stream for site %d: %v", site.ID, err)
		conn.WriteMessage(websocket.TextMessage, []byte("[error] "+err.Error()))
		return
	}
	defer body.Close()

	// strip the 8-byte multiplexed stream headers and forward each payload
	// to the WebSocket client, identical to the log streaming handler
	hdr := make([]byte, 8)
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		if _, err := readFull(body, hdr); err != nil {
			// EOF means the command completed
			conn.WriteMessage(websocket.TextMessage, []byte("\n[done]"))
			return
		}

		size := int(hdr[4])<<24 | int(hdr[5])<<16 | int(hdr[6])<<8 | int(hdr[7])
		if size == 0 {
			continue
		}

		payload := make([]byte, size)
		if _, err := readFull(body, payload); err != nil {
			conn.WriteMessage(websocket.TextMessage, []byte("[error] stream read failed"))
			return
		}

		if err := conn.WriteMessage(websocket.TextMessage, payload); err != nil {
			logger.Debug("apiWPCLI: WebSocket write failed for site %d: %v", site.ID, err)
			return
		}
	}
}

// ensureWPCLI checks whether wp is already present inside the PHP container.
// If not, it downloads wp-cli.phar directly inside the container via wget,
// installs it to /usr/local/bin/wp, and makes it executable.
func (s *Server) ensureWPCLI(ctx context.Context, siteName string, conn *websocket.Conn) error {
	containerName := podman.ContainerName(siteName, "php")

	// check if wp is already present inside the container
	checkSpec := map[string]any{
		"AttachStdout": false,
		"AttachStderr": false,
		"Detach":       false,
		"Cmd":          []string{"test", "-f", wpcliContainerPath},
	}
	var checkResp struct {
		ID string `json:"Id"`
	}
	if err := s.podman.PostJSON(ctx,
		"/v4.0.0/libpod/containers/"+containerName+"/exec",
		checkSpec, &checkResp,
	); err == nil {

		// start the test exec and inspect the exit code
		_ = s.podman.PostJSON(ctx,
			"/v4.0.0/libpod/exec/"+checkResp.ID+"/start",
			map[string]any{"Detach": false}, nil,
		)
		var inspect struct {
			ExitCode int `json:"ExitCode"`
		}
		if err := s.podman.GetJSON(ctx,
			"/v4.0.0/libpod/exec/"+checkResp.ID+"/json",
			&inspect,
		); err == nil && inspect.ExitCode == 0 {
			// wp-cli already present — nothing to do
			logger.Debug("ensureWPCLI: wp-cli already present in container %s", containerName)
			return nil
		}
	}

	// wp-cli not found — download it directly inside the container via wget,
	// stage it in /tmp, then move it to /usr/local/bin/wp
	conn.WriteMessage(websocket.TextMessage, []byte("[info] installing WP-CLI into container..."))
	logger.Info("ensureWPCLI: installing wp-cli inside container %s", containerName)

	installSpec := map[string]any{
		"AttachStdout": true,
		"AttachStderr": true,
		"Detach":       false,
		"Cmd": []string{
			"sh", "-c",
			"wget -q https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar -O /tmp/wp-cli.phar && chmod +x /tmp/wp-cli.phar && mv /tmp/wp-cli.phar /usr/local/bin/wp",
		},
	}
	var installResp struct {
		ID string `json:"Id"`
	}
	if err := s.podman.PostJSON(ctx,
		"/v4.0.0/libpod/containers/"+containerName+"/exec",
		installSpec, &installResp,
	); err != nil {
		logger.Error("ensureWPCLI: failed to create install exec: %v", err)
		return err
	}

	if err := s.podman.PostJSON(ctx,
		"/v4.0.0/libpod/exec/"+installResp.ID+"/start",
		map[string]any{"Detach": false}, nil,
	); err != nil {
		logger.Error("ensureWPCLI: failed to run install exec: %v", err)
		return err
	}

	// poll until the exec completes
	deadline := time.Now().Add(60 * time.Second)
	var installInspect struct {
		ExitCode int  `json:"ExitCode"`
		Running  bool `json:"Running"`
	}
	for time.Now().Before(deadline) {
		time.Sleep(500 * time.Millisecond)
		if err := s.podman.GetJSON(ctx,
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

	logger.Info("ensureWPCLI: wp-cli installed successfully in container %s", containerName)
	conn.WriteMessage(websocket.TextMessage, []byte("[info] WP-CLI installed successfully"))
	return nil
}
