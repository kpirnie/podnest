// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package main

// This file defines the upgrade subcommand — runs update, re-pulls every image,
// recreates every site pod on the fresh images, then prunes stopped standalone
// containers and unused images.
import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/cobra"
)

// upgradeCmd updates PodNest, refreshes every image and site pod, then cleans up
var upgradeCmd = &cobra.Command{
	Use:   "upgrade",
	Short: "Update PodNest, pull all images, recreate every site pod, and prune leftovers",
	RunE: func(cmd *cobra.Command, args []string) error {
		return runUpgrade()
	},
}

// wire up the upgrade subcommand
func init() {
	rootCmd.AddCommand(upgradeCmd)
}

// runUpgrade chains update, pull-images, the site recreate, and the prune —
// any failure stops the run before the prune so nothing still needed is removed
func runUpgrade() error {
	if err := runUpdate(); err != nil {
		return err
	}
	if err := runPullImages(); err != nil {
		return err
	}

	s, err := loadState()
	if err != nil {
		return err
	}

	// update just restarted the service — the recreate runs inside its container
	fmt.Println(">>> Waiting for the podnest container")
	if !waitForContainer(s, "podnest", 120) {
		return fmt.Errorf("podnest container did not come up after the update")
	}

	fmt.Println(">>> Recreating site pods")
	if err := userRun(s.User, s.UID, "podman", "exec", "podnest",
		"podnest", "recreate", "--all", "--app-path", "/opt/podnest", "--socket", "/run/podman/podman.sock",
	); err != nil {
		return fmt.Errorf("site recreate failed: %w", err)
	}

	// stopped containers outside a pod only — a stopped site's pod containers
	// must survive or that site can no longer be started
	fmt.Println(">>> Pruning stopped containers")
	out, err := userOut(s.User, s.UID, "podman", "ps", "-a", "--filter", "status=exited", "--format", "{{.Names}} {{.PodName}}")
	if err != nil {
		return err
	}
	for _, line := range strings.Split(strings.TrimSpace(out), "\n") {
		f := strings.Fields(line)
		if len(f) != 1 {
			continue
		}
		if err := userRun(s.User, s.UID, "podman", "rm", f[0]); err != nil {
			fmt.Printf("WARNING: could not remove container %s: %v\n", f[0], err)
		}
	}

	// images still referenced by any container, running or stopped, are kept
	fmt.Println(">>> Pruning unused images")
	return userRun(s.User, s.UID, "podman", "image", "prune", "-a", "-f")
}

// waitForContainer polls until the named container is running, one second per attempt
func waitForContainer(s *State, name string, attempts int) bool {
	for i := 0; i < attempts; i++ {
		out, err := userOut(s.User, s.UID, "podman", "container", "inspect", name, "--format", "{{.State.Running}}")
		if err == nil && strings.TrimSpace(out) == "true" {
			return true
		}
		time.Sleep(time.Second)
	}
	return false
}
