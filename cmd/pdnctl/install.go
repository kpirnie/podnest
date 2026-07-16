// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package main

// This file defines the install subcommand — a fresh rootless setup under a
// dedicated user: account + subuid/subgid ranges, unprivileged-port sysctl,
// linger, podman socket override, the systemd user unit, and the state file.
import (
	"fmt"
	"os"
	"os/exec"
	"os/user"
	"strconv"
	"strings"
	"time"

	"github.com/spf13/cobra"
)

// the UI port baked into the unit
const installPort = 9000

// flags for the install subcommand
var (
	installUser    string
	installVersion string
)

// installCmd performs a fresh PodNest setup on this host
var installCmd = &cobra.Command{
	Use:   "install",
	Short: "Install PodNest rootless under a dedicated user",
	RunE: func(cmd *cobra.Command, args []string) error {
		return runInstall()
	},
}

// wire up the install flags
func init() {
	installCmd.Flags().StringVar(&installUser, "user", "", "the dedicated user PodNest runs under")
	installCmd.Flags().StringVar(&installVersion, "version", "", "the PodNest image tag: latest, dev, or beta")
	installCmd.MarkFlagRequired("user")
	installCmd.MarkFlagRequired("version")
	rootCmd.AddCommand(installCmd)
}

// run executes a command with output passed through to the terminal
func run(name string, args ...string) error {
	c := exec.Command(name, args...)
	c.Stdout = os.Stdout
	c.Stderr = os.Stderr
	return c.Run()
}

// userRun executes a command as the podnest user with the runtime dir set
func userRun(uname string, uid int, args ...string) error {
	full := append([]string{"-u", uname, fmt.Sprintf("XDG_RUNTIME_DIR=/run/user/%d", uid)}, args...)
	c := exec.Command("sudo", full...)
	// run from / — the invoking cwd may not be accessible to the podnest user
	c.Dir = "/tmp"
	c.Stdout = os.Stdout
	c.Stderr = os.Stderr
	return c.Run()
}

// detectTZ pulls the timezone from the host, falling back to UTC with a warning
func detectTZ() string {
	// debian-family keeps the zone name in /etc/timezone
	if b, err := os.ReadFile("/etc/timezone"); err == nil {
		if tz := strings.TrimSpace(string(b)); tz != "" {
			return tz
		}
	}
	// otherwise parse it out of the /etc/localtime symlink target
	if link, err := os.Readlink("/etc/localtime"); err == nil {
		if i := strings.Index(link, "zoneinfo/"); i != -1 {
			return link[i+len("zoneinfo/"):]
		}
	}
	fmt.Println("WARNING: could not detect host timezone — defaulting to UTC")
	return "UTC"
}

// validVersion checks the tag against the allowed channels
func validVersion(v string) bool {
	return v == "latest" || v == "dev" || v == "beta"
}

// runInstall carries out the full fresh setup
func runInstall() error {
	if !validVersion(installVersion) {
		return fmt.Errorf("--version must be one of: latest, dev, beta")
	}

	// refuse to double-install — update is the path once state exists
	if _, err := os.Stat(statePath); err == nil {
		return fmt.Errorf("already installed (%s exists) — run: pdnctl update", statePath)
	}

	tz := detectTZ()

	// 1. account + rootless prerequisites
	if _, err := user.Lookup(installUser); err != nil {
		if err := run("useradd", "-m", "-s", "/usr/sbin/nologin", installUser); err != nil {
			return fmt.Errorf("useradd failed: %w", err)
		}
	}

	u, err := user.Lookup(installUser)
	if err != nil {
		return err
	}
	uid, _ := strconv.Atoi(u.Uid)
	home := u.HomeDir
	dataPath := home + "/sites"

	// subuid/subgid ranges for rootless podman
	if !fileHasPrefix("/etc/subuid", installUser+":") {
		if err := run("usermod", "--add-subuids", "200000-265535", installUser); err != nil {
			return err
		}
	}
	if !fileHasPrefix("/etc/subgid", installUser+":") {
		if err := run("usermod", "--add-subgids", "200000-265535", installUser); err != nil {
			return err
		}
	}

	// rootless proxy needs to bind 80/443
	if err := os.WriteFile("/etc/sysctl.d/99-podnest.conf", []byte("net.ipv4.ip_unprivileged_port_start=80\n"), 0o644); err != nil {
		return err
	}
	if err := run("sysctl", "--system"); err != nil {
		return err
	}

	// run user services with no login, and bring the user manager up now
	if err := run("loginctl", "enable-linger", installUser); err != nil {
		return err
	}
	if err := run("systemctl", "start", fmt.Sprintf("user@%d.service", uid)); err != nil {
		return err
	}

	if err := os.MkdirAll(dataPath, 0o755); err != nil {
		return err
	}
	if err := run("chown", "-R", installUser+":"+installUser, dataPath); err != nil {
		return err
	}

	// the user manager must have created this
	runDir := fmt.Sprintf("/run/user/%d", uid)
	if !waitForPath(runDir, 10, isDir) {
		return fmt.Errorf("%s missing (user manager not running)", runDir)
	}

	// 2. socket override so it cleans up on stop
	//    (prevents the stale-path 'listening but no .sock' issue)
	sockDropin := home + "/.config/systemd/user/podman.socket.d"
	if err := os.MkdirAll(sockDropin, 0o755); err != nil {
		return err
	}
	if err := os.WriteFile(sockDropin+"/override.conf", []byte("[Socket]\nRemoveOnStop=yes\n"), 0o644); err != nil {
		return err
	}
	// fix root-owned intermediates created along the .config chain
	if err := run("chown", "-R", installUser+":"+installUser, home+"/.config"); err != nil {
		return err
	}
	// clear a stale/dangling enable symlink from prior installs
	os.Remove(home + "/.config/systemd/user/sockets.target.wants/podman.socket")

	// 3. bring up the rootless podman socket
	if err := userRun(installUser, uid, "systemctl", "--user", "daemon-reload"); err != nil {
		return err
	}
	if err := userRun(installUser, uid, "systemctl", "--user", "enable", "podman.socket"); err != nil {
		return err
	}
	// clear any stale path, then (re)start and wait for the real socket file
	sock := runDir + "/podman/podman.sock"
	os.RemoveAll(sock)
	if err := userRun(installUser, uid, "systemctl", "--user", "restart", "podman.socket"); err != nil {
		return err
	}
	if !waitForPath(sock, 10, isSocket) {
		userRun(installUser, uid, "systemctl", "--user", "status", "podman.socket", "--no-pager")
		return fmt.Errorf("rootless socket missing at %s", sock)
	}
	fmt.Println("OK:", sock)

	// 4. podnest user service unit
	unitPath := home + "/.config/systemd/user/podnest.service"
	if err := os.WriteFile(unitPath, []byte(buildUnit(installVersion, tz)), 0o644); err != nil {
		return err
	}
	if err := run("chown", installUser+":"+installUser, unitPath); err != nil {
		return err
	}

	// 5. enable + start podnest
	if err := userRun(installUser, uid, "systemctl", "--user", "daemon-reload"); err != nil {
		return err
	}
	if err := userRun(installUser, uid, "systemctl", "--user", "enable", "--now", "podnest.service"); err != nil {
		return err
	}
	userRun(installUser, uid, "systemctl", "--user", "status", "podnest.service", "--no-pager")

	// persist the install state so every other subcommand needs zero flags
	if err := saveState(&State{
		User:      installUser,
		UID:       uid,
		Version:   installVersion,
		Port:      installPort,
		DataPath:  dataPath,
		TZ:        tz,
		UnitPath:  unitPath,
		Installed: time.Now().UTC(),
	}); err != nil {
		return err
	}

	fmt.Printf(`
>>> Done. PodNest is running — UI at http://<this-host>:%d

>>> Manage it with:
    pdnctl start | stop | restart | status
    pdnctl update [--version latest|dev|beta]
    pdnctl uninstall
`, installPort)
	return nil
}

// buildUnit renders the systemd user unit for the requested tag and timezone
func buildUnit(ver, tz string) string {
	return fmt.Sprintf(`[Unit]
Description=PodNest Management UI
After=podman.socket
Requires=podman.socket

[Service]
Restart=always
RestartSec=5
TimeoutStartSec=120
ExecStartPre=-/usr/bin/podman rm -f podnest
ExecStart=/usr/bin/podman run \
    --name podnest \
    --hostname podnest \
    --network host \
    -v %%t/podman/podman.sock:/run/podman/podman.sock:rw \
    -v %%h/sites:/opt/podnest:z \
    --tmpfs /tmp \
    -e TZ=%s \
    -e LOG_LEVEL=INFO \
    ghcr.io/kpirnie/podnest:%s serve --app-path /opt/podnest --port %d --socket /run/podman/podman.sock
ExecStop=/usr/bin/podman stop podnest

[Install]
WantedBy=default.target
`, tz, ver, installPort)
}

// fileHasPrefix reports whether any line in the file starts with the prefix
func fileHasPrefix(path, prefix string) bool {
	b, err := os.ReadFile(path)
	if err != nil {
		return false
	}
	for _, line := range strings.Split(string(b), "\n") {
		if strings.HasPrefix(line, prefix) {
			return true
		}
	}
	return false
}

// waitForPath polls for a path to satisfy the check, one second per attempt
func waitForPath(path string, attempts int, check func(os.FileInfo) bool) bool {
	for i := 0; i < attempts; i++ {
		if fi, err := os.Stat(path); err == nil && check(fi) {
			return true
		}
		time.Sleep(time.Second)
	}
	return false
}

// isDir reports whether the stat result is a directory
func isDir(fi os.FileInfo) bool { return fi.IsDir() }

// isSocket reports whether the stat result is a unix socket file
func isSocket(fi os.FileInfo) bool { return fi.Mode()&os.ModeSocket != 0 }
