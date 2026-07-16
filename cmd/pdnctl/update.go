// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package main

// This file defines the update subcommand — pulls the channel from the state
// file (or switches channels via --version and persists it), rewrites the
// unit's image tag, and restarts the service.
import (
	"fmt"
	"os"
	"regexp"

	"github.com/spf13/cobra"
)

// flag for the update subcommand — empty means keep the channel in the state file
var updateVersion string

// imageTagRe matches the image reference in the unit so the tag can be swapped —
// the Go equivalent of setup.sh's: sed s|ghcr.io/kpirnie/podnest:[^ ]*|...|
var imageTagRe = regexp.MustCompile(`ghcr\.io/kpirnie/podnest:[^ \n]*`)

// updateCmd pulls the requested (or current) channel and restarts the service
var updateCmd = &cobra.Command{
	Use:   "update",
	Short: "Pull the newest PodNest image and restart the service",
	RunE: func(cmd *cobra.Command, args []string) error {
		return runUpdate()
	},
}

// wire up the update flag
func init() {
	updateCmd.Flags().StringVar(&updateVersion, "version", "", "switch channels: latest, dev, or beta (default: keep current)")
	rootCmd.AddCommand(updateCmd)
}

// runUpdate carries out the pull + tag rewrite + restart
func runUpdate() error {
	s, err := loadState()
	if err != nil {
		return err
	}

	// no flag means stay on the channel the install (or last switch) recorded
	ver := s.Version
	if updateVersion != "" {
		if !validVersion(updateVersion) {
			return fmt.Errorf("--version must be one of: latest, dev, beta")
		}
		ver = updateVersion
	}

	// rewrite the image tag in the installed unit so the service runs the
	// requested version, not whatever tag it was originally set up with
	unit, err := os.ReadFile(s.UnitPath)
	if err != nil {
		return fmt.Errorf("unit file missing at %s: %w", s.UnitPath, err)
	}
	patched := imageTagRe.ReplaceAll(unit, []byte("ghcr.io/kpirnie/podnest:"+ver))
	if err := os.WriteFile(s.UnitPath, patched, 0o644); err != nil {
		return err
	}

	if err := userRun(s.User, s.UID, "podman", "pull", "ghcr.io/kpirnie/podnest:"+ver); err != nil {
		return err
	}
	if err := userRun(s.User, s.UID, "systemctl", "--user", "daemon-reload"); err != nil {
		return err
	}
	if err := userRun(s.User, s.UID, "systemctl", "--user", "restart", "podnest.service"); err != nil {
		return err
	}
	userRun(s.User, s.UID, "systemctl", "--user", "status", "podnest.service", "--no-pager")
	userRun(s.User, s.UID, "podman", "image", "prune", "-f")

	// persist a channel switch so the next bare update tracks the new channel
	if ver != s.Version {
		s.Version = ver
		if err := saveState(s); err != nil {
			return err
		}
		fmt.Printf(">>> Channel switched to %s — future updates will track it\n", ver)
	}
	return nil
}
