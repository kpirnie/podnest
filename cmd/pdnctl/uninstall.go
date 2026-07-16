// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package main

// This file defines the uninstall subcommand — stops and removes the service,
// socket override, sysctl file, and state. The user and site data survive by
// default; --purge removes those too.
import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

// flag for the uninstall subcommand
var uninstallPurge bool

// uninstallCmd removes the PodNest install from this host
var uninstallCmd = &cobra.Command{
	Use:   "uninstall",
	Short: "Remove PodNest from this host (keeps user and site data unless --purge)",
	RunE: func(cmd *cobra.Command, args []string) error {
		return runUninstall()
	},
}

// wire up the uninstall flag
func init() {
	uninstallCmd.Flags().BoolVar(&uninstallPurge, "purge", false, "also delete the dedicated user and all site data")
	rootCmd.AddCommand(uninstallCmd)
}

// runUninstall tears down everything install created — each step is
// best-effort so a partially broken install can still be cleaned up
func runUninstall() error {
	s, err := loadState()
	if err != nil {
		return err
	}

	home := "/home/" + s.User

	// stop and disable the service and the rootless socket
	userRun(s.User, s.UID, "systemctl", "--user", "disable", "--now", "podnest.service")
	userRun(s.User, s.UID, "podman", "rm", "-f", "podnest")
	userRun(s.User, s.UID, "systemctl", "--user", "disable", "--now", "podman.socket")

	// remove the unit, socket override, and enable symlink
	os.Remove(s.UnitPath)
	os.RemoveAll(home + "/.config/systemd/user/podman.socket.d")
	os.Remove(home + "/.config/systemd/user/sockets.target.wants/podman.socket")
	userRun(s.User, s.UID, "systemctl", "--user", "daemon-reload")

	// undo the install-time host tweaks
	run("loginctl", "disable-linger", s.User)
	os.Remove("/etc/sysctl.d/99-podnest.conf")
	run("sysctl", "--system")

	// purge takes the user and everything in their home — site data included
	if uninstallPurge {
		run("systemctl", "stop", fmt.Sprintf("user@%d.service", s.UID))
		if err := run("userdel", "-r", s.User); err != nil {
			return fmt.Errorf("userdel failed: %w", err)
		}
	}

	// drop the state last so a failed run above can be retried
	if err := os.RemoveAll(stateDir); err != nil {
		return err
	}

	if uninstallPurge {
		fmt.Println(">>> Done. PodNest, the dedicated user, and all site data removed.")
	} else {
		fmt.Printf(">>> Done. PodNest removed — user %q and site data at %s kept.\n    Re-run with --purge to remove those too.\n", s.User, s.DataPath)
	}
	return nil
}
