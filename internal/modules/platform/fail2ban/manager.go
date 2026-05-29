package fail2ban

import (
	"context"
	"os"

	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/podman"
)

// setup our constants
const (
	GlobalContainerName = "podnest-fail2ban-global"
)

// Manager manages the global Fail2Ban container
type Manager struct {
	client      *podman.Client
	appPath     string
	hostAppPath string
}

// New returns a Fail2Ban manager bound to the given podman client and app paths
func New(client *podman.Client, appPath, hostAppPath string) *Manager {
	h := hostAppPath
	if h == "" {
		h = appPath
	}
	return &Manager{client: client, appPath: appPath, hostAppPath: h}
}

// SetHostAppPath updates the host-side app path after server detection
func (m *Manager) SetHostAppPath(p string) {
	if p != "" {
		logger.Debug("fail2ban manager host app path updated to: %s", p)
		m.hostAppPath = p
	}
}

// Ensure makes sure the global Fail2Ban container exists and is running.
// If the container exists but is stopped or crashed, it attempts to start it.
func (m *Manager) Ensure(ctx context.Context) error {

	// if already running nothing to do
	running, err := m.client.ContainerIsRunning(ctx, GlobalContainerName)
	if err != nil {
		return err
	}
	if running {
		logger.Debug("fail2ban: global container already running")
		return nil
	}

	// container exists but is not running — try to start it before recreating
	exists, err := m.client.ContainerExists(ctx, GlobalContainerName)
	if err != nil {
		return err
	}
	if exists {
		logger.Debug("fail2ban: container stopped or crashed, attempting restart")
		if err := m.client.StartContainer(ctx, GlobalContainerName); err != nil {
			logger.Error("fail2ban: restart failed: %v", err)
			return err
		}
		logger.Info("fail2ban: global container restarted")
		return nil
	}

	logger.Debug("fail2ban: container does not exist, creating it...")
	return m.create(ctx)
}

// create pulls the image and starts the global Fail2Ban container
func (m *Manager) create(ctx context.Context) error {

	// create the fail2ban database directory if it does not exist
	if err := os.MkdirAll(m.appPath+"/fail2ban", 0750); err != nil {
		logger.Error("fail2ban: failed to create database directory: %v", err)
		return err
	}

	// pull the image before creating the container
	if err := m.client.PullImage(ctx, models.ImgFail2Ban); err != nil {
		logger.Error("fail2ban: failed to pull image: %v", err)
		return err
	}

	// create the container — host network mode is required so Fail2Ban can
	// manipulate iptables rules on the host network stack
	_, err := m.client.CreateContainer(ctx, podman.ContainerSpec{
		Name:  GlobalContainerName,
		Image: models.ImgFail2Ban,
		NetNS: podman.NetworkNamespace{NSMode: "host"},
		Mounts: []podman.Mount{
			// proxy access log — written by podnest, watched by fail2ban
			{Type: "bind", Source: m.hostAppPath + "/logs", Destination: "/var/log/proxy", Options: []string{"ro", "z"}},
			// sftp container logs — watched by fail2ban for ssh brute-force
			{Type: "bind", Source: m.hostAppPath + "/sftp/logs", Destination: "/var/log/sftp", Options: []string{"ro", "z"}},
			// persistent fail2ban database so bans survive container restarts
			{Type: "bind", Source: m.hostAppPath + "/fail2ban", Destination: "/var/run/fail2ban", Options: []string{"rw", "z"}},
			// sftp messages log — watched by alpine-ssh jail for brute-force attempts
			{Type: "bind", Source: m.hostAppPath + "/sftp/logs/messages", Destination: "/var/log/messages", Options: []string{"ro", "z"}},
		},
		// NET_ADMIN and NET_RAW are required to manage iptables rules
		CapDrop: []string{"ALL"},
		CapAdd:  []string{"NET_ADMIN", "NET_RAW"},
		SecOpts: []string{"no-new-privileges:true"},
	})
	if err != nil {
		logger.Error("fail2ban: failed to create container: %v", err)
		return err
	}

	// start the container after creation
	if err := m.client.StartContainer(ctx, GlobalContainerName); err != nil {
		logger.Error("fail2ban: failed to start container: %v", err)
		return err
	}

	logger.Info("fail2ban: global container started")
	return nil
}
