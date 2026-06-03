package sftp

import (
	"context"
	"fmt"
	"os"
	"strings"

	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/podman"
)

// setup our constants
const (
	GlobalContainerName = "podnest-sftp-global"
	GlobalPort          = 2222
	sftpUIDBase         = 3000
)

// Manager manages the global SFTP container
type Manager struct {
	client      *podman.Client
	appPath     string
	hostAppPath string
}

// New returns an SFTP manager bound to the given podman client and app paths
func New(client *podman.Client, appPath, hostAppPath string) *Manager {
	h := hostAppPath
	if h == "" {
		h = appPath
	}

	// make sure we have the SFTP manager config
	return &Manager{client: client, appPath: appPath, hostAppPath: h}
}

// SetHostAppPath updates the host-side app path after server detection
func (m *Manager) SetHostAppPath(p string) {
	if p != "" {
		logger.Debug("SFTP manager host app path updated to: %s", p)
		m.hostAppPath = p
	}
}

// UIDForSite returns a deterministic UID for a site based on its ID
func UIDForSite(siteID int64) int { return sftpUIDBase + int(siteID) }

// Ensure makes sure the global SFTP container exists and is running.
// If the container exists but is stopped or crashed, it attempts to start it.
func (m *Manager) Ensure(ctx context.Context) error {

	// if already running nothing to do
	running, err := m.client.ContainerIsRunning(ctx, GlobalContainerName)
	if err != nil {
		return err
	}
	if running {
		logger.Debug("global SFTP container already running")
		return nil
	}

	// container exists but is not running — try to start it before recreating
	exists, err := m.client.ContainerExists(ctx, GlobalContainerName)
	if err != nil {
		return err
	}
	if exists {
		logger.Debug("SFTP: container stopped or crashed, attempting restart")
		if err := m.client.StartContainer(ctx, GlobalContainerName); err != nil {
			logger.Error("SFTP: restart failed: %v", err)
			return err
		}
		logger.Debug("global SFTP container restarted")
		return nil
	}

	logger.Debug("SFTP container does not exist, creating it...")
	return m.create(ctx)
}

// AddUser adds a user to the running SFTP container with zero downtime
func (m *Manager) AddUser(ctx context.Context, siteName, password string, uid int) error {

	// persist the user to users.conf first so it survives container restarts
	if err := m.appendUsersConf(siteName, password, uid); err != nil {
		logger.Error("failed to append user %s to users.conf: %v", siteName, err)
		return err
	}

	// if the container isn't running yet, users.conf is enough — it will be read on next start
	exists, _ := m.client.ContainerExists(ctx, GlobalContainerName)
	if !exists {
		logger.Debug("SFTP container not running, user %s will be added on next start", siteName)
		return nil
	}

	// apply the user to the running container via exec — no restart needed
	gid := uid
	for _, cmd := range [][]string{
		{"addgroup", "-g", fmt.Sprintf("%d", gid), fmt.Sprintf("sftp-%s", siteName)},
		{"adduser", "-D", "-u", fmt.Sprintf("%d", uid), "-G", fmt.Sprintf("sftp-%s", siteName), "-G", "sftpusers", "-h", "/home/" + siteName, "-s", "/usr/lib/openssh/sftp-server", siteName},
		{"sh", "-c", fmt.Sprintf("echo '%s:%s' | chpasswd", siteName, password)},
		// chroot root (/home/sitename) stays root:root — only chown the content subdirs
		{"chown", "-R", fmt.Sprintf("%d:%d", uid, uid), "/home/" + siteName + "/html"},
		{"chown", "-R", fmt.Sprintf("%d:%d", uid, uid), "/home/" + siteName + "/php-fpm"},
		{"chown", "-R", fmt.Sprintf("%d:%d", uid, uid), "/home/" + siteName + "/redis"},
		{"chown", "-R", fmt.Sprintf("%d:%d", uid, uid), "/home/" + siteName + "/db"},
		{"chmod", "2775", "/home/" + siteName + "/html"},
		// backups dir — root:siteUID, read-only for the SFTP user
		{"chown", fmt.Sprintf("root:%d", uid), "/home/" + siteName + "/backups"},
		{"chmod", "0750", "/home/" + siteName + "/backups"},
	} {
		if err := m.exec(ctx, cmd); err != nil {
			logger.Warn("sftp AddUser exec %v: %v", cmd, err)
		}
	}

	logger.Debug("SFTP user added: %s (uid %d)", siteName, uid)
	return nil
}

// RemoveUser removes a user from the running SFTP container with zero downtime
func (m *Manager) RemoveUser(ctx context.Context, siteName string) error {

	// remove from users.conf first so the user does not come back on restart
	if err := m.removeFromUsersConf(siteName); err != nil {
		logger.Error("failed to remove user %s from users.conf: %v", siteName, err)
		return err
	}

	// if the container isn't running, nothing further to do
	exists, _ := m.client.ContainerExists(ctx, GlobalContainerName)
	if !exists {
		logger.Debug("SFTP container not running, user %s removed from users.conf only", siteName)
		return nil
	}

	// remove the user from the running container via exec
	if err := m.exec(ctx, []string{"deluser", siteName}); err != nil {
		logger.Warn("sftp RemoveUser exec: %v", err)
	}

	logger.Debug("SFTP user removed: %s", siteName)
	return nil
}

// RegeneratePassword updates a user's password with zero downtime
func (m *Manager) RegeneratePassword(ctx context.Context, siteName, newPassword string) error {

	// update users.conf first so the new password survives container restarts
	if err := m.updateUsersConf(siteName, newPassword); err != nil {
		logger.Error("failed to update password for %s in users.conf: %v", siteName, err)
		return err
	}

	// if the container isn't running, users.conf update is sufficient
	exists, _ := m.client.ContainerExists(ctx, GlobalContainerName)
	if !exists {
		logger.Debug("SFTP container not running, password for %s updated in users.conf only", siteName)
		return nil
	}

	// update the password in the running container via chpasswd — no restart needed
	if err := m.exec(ctx, []string{"sh", "-c", fmt.Sprintf("echo '%s:%s' | chpasswd", siteName, newPassword)}); err != nil {
		logger.Error("sftp RegeneratePassword exec failed for %s: %v", siteName, err)
		return err
	}

	logger.Debug("SFTP password regenerated for: %s", siteName)
	return nil
}

// create initialises config files and starts the global SFTP container
func (m *Manager) create(ctx context.Context) error {
	base := m.appPath + "/sftp"

	// ensure the required directory structure exists before creating the container
	for _, d := range []string{base + "/keys", base + "/etc-ssh/sshd_config.d"} {
		if err := os.MkdirAll(d, 0750); err != nil {
			logger.Error("failed to create SFTP directory %s: %v", d, err)
			return err
		}
		logger.Debug("ensured SFTP directory: %s", d)
	}

	// create an empty users.conf with a placeholder user so atmoz/sftp
	// can start before any real sites are provisioned
	ucPath := base + "/users.conf"
	if _, err := os.Stat(ucPath); os.IsNotExist(err) {
		if err := os.WriteFile(ucPath, []byte("# podnest managed sftp users\nplaceholder:placeholder:9999\n"), 0600); err != nil {
			logger.Error("failed to create users.conf: %v", err)
			return err
		}
		logger.Debug("created users.conf with placeholder user at %s", ucPath)
	}

	// create the log file if it does not exist so fail2ban can watch it
	logFile := base + "/logs/messages"
	if _, err := os.Stat(logFile); os.IsNotExist(err) {
		if err := os.WriteFile(logFile, []byte{}, 0640); err != nil {
			logger.Error("failed to create SFTP log file: %v", err)
			return err
		}
		logger.Debug("created SFTP log file at %s", logFile)
	}

	// pull the SFTP image before creating the container
	if err := m.client.PullImage(ctx, models.ImgSFTP); err != nil {
		logger.Error("failed to pull SFTP image: %v", err)
		return err
	}

	// create the global SFTP container with a single mount covering all sites
	hostBase := m.hostAppPath + "/sftp"
	_, err := m.client.CreateContainer(ctx, podman.ContainerSpec{
		Name:  GlobalContainerName,
		Image: models.ImgSFTP,
		NetNS: podman.NetworkNamespace{NSMode: "host"},
		Mounts: []podman.Mount{
			{Type: "bind", Source: m.hostAppPath + "/sites", Destination: "/home", Options: []string{"rw", "z"}},
			{Type: "bind", Source: hostBase + "/keys", Destination: "/etc/ssh/keys", Options: []string{"rw", "z"}},
			{Type: "bind", Source: hostBase + "/etc-ssh/sshd_config.d", Destination: "/etc/ssh/sshd_config.d", Options: []string{"ro", "z"}},
			{Type: "bind", Source: hostBase + "/users.conf", Destination: "/etc/sftp/users.conf", Options: []string{"ro", "z"}},
			{Type: "bind", Source: m.hostAppPath + "/sftp/logs", Destination: "/var/log", Options: []string{"rw", "z"}},
		},
		CapDrop: []string{"ALL"},
		CapAdd:  []string{"CHOWN", "SETUID", "SETGID", "DAC_OVERRIDE", "AUDIT_WRITE", "NET_BIND_SERVICE", "SYS_CHROOT"},
		SecOpts: []string{"no-new-privileges:true"},
	})
	if err != nil {
		logger.Error("failed to create global SFTP container: %v", err)
		return err
	}

	// start the container after creation
	if err := m.client.StartContainer(ctx, GlobalContainerName); err != nil {
		logger.Error("failed to start global SFTP container: %v", err)
		return err
	}

	logger.Debug("global SFTP container started on port %d", GlobalPort)
	return nil
}

// exec runs a command inside the global SFTP container detached
func (m *Manager) exec(ctx context.Context, cmd []string) error {

	// create the exec instance inside the running container
	spec := map[string]any{
		"AttachStdout": false,
		"AttachStderr": false,
		"Detach":       true,
		"Cmd":          cmd,
	}
	var execResp struct {
		ID string `json:"Id"`
	}
	if err := m.client.PostJSON(ctx, "/v4.0.0/libpod/containers/"+GlobalContainerName+"/exec", spec, &execResp); err != nil {
		logger.Error("failed to create exec instance for cmd %v: %v", cmd, err)
		return err
	}

	// start the exec instance detached — fire and forget
	if err := m.client.PostJSON(ctx, "/v4.0.0/libpod/exec/"+execResp.ID+"/start", map[string]any{"Detach": true}, nil); err != nil {
		logger.Error("failed to start exec instance for cmd %v: %v", cmd, err)
		return err
	}

	logger.Debug("exec'd in SFTP container: %v", cmd)
	return nil
}

// appendUsersConf appends a new user entry to the users.conf file
func (m *Manager) appendUsersConf(username, password string, uid int) error {
	f, err := os.OpenFile(m.appPath+"/sftp/users.conf", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0600)
	if err != nil {
		logger.Error("failed to open users.conf for append: %v", err)
		return err
	}
	defer f.Close()

	// format: username:password:uid
	_, err = fmt.Fprintf(f, "%s:%s:%d\n", username, password, uid)
	if err != nil {
		logger.Error("failed to write user %s to users.conf: %v", username, err)
	}
	return err
}

// removeFromUsersConf removes a user entry from the users.conf file
func (m *Manager) removeFromUsersConf(username string) error {
	path := m.appPath + "/sftp/users.conf"

	// read the current contents
	data, err := os.ReadFile(path)
	if err != nil {
		logger.Error("failed to read users.conf for removal of %s: %v", username, err)
		return err
	}

	// filter out the matching line and rewrite the file
	var kept []string
	prefix := username + ":"
	for _, l := range strings.Split(string(data), "\n") {
		if l != "" && !strings.HasPrefix(l, prefix) {
			kept = append(kept, l)
		}
	}

	if err := os.WriteFile(path, []byte(strings.Join(kept, "\n")+"\n"), 0600); err != nil {
		logger.Error("failed to rewrite users.conf after removing %s: %v", username, err)
		return err
	}

	logger.Debug("removed user %s from users.conf", username)
	return nil
}

// updateUsersConf replaces the password for an existing user entry in users.conf
func (m *Manager) updateUsersConf(username, newPassword string) error {
	path := m.appPath + "/sftp/users.conf"

	// read the current contents
	data, err := os.ReadFile(path)
	if err != nil {
		logger.Error("failed to read users.conf for password update of %s: %v", username, err)
		return err
	}

	// find the matching line and replace the password field in place
	prefix := username + ":"
	lines := strings.Split(string(data), "\n")
	for i, l := range lines {
		if strings.HasPrefix(l, prefix) {
			parts := strings.SplitN(l, ":", 3)
			if len(parts) == 3 {
				parts[1] = newPassword
				lines[i] = strings.Join(parts, ":")
			}
		}
	}

	if err := os.WriteFile(path, []byte(strings.Join(lines, "\n")), 0600); err != nil {
		logger.Error("failed to rewrite users.conf after password update for %s: %v", username, err)
		return err
	}

	logger.Debug("updated password in users.conf for user %s", username)
	return nil
}
