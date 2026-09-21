// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package main

// This file defines the podman inspection subcommands — images, containers,
// pull-images, and pod-restart — thin rootless-podman wrappers run as the
// podnest service user.
import (
	"fmt"
	"os"
	"os/exec"
	"os/user"
	"strings"

	"github.com/spf13/cobra"
)

// imagesCmd lists the podman images owned by the podnest user
var imagesCmd = &cobra.Command{
	Use:   "images",
	Short: "Show the current podman images",
	RunE: func(cmd *cobra.Command, args []string) error {
		s, err := loadState()
		if err != nil {
			return err
		}
		return userRun(s.User, s.UID, "podman", "images")
	},
}

// containersCmd lists the running podman containers owned by the podnest user
var containersCmd = &cobra.Command{
	Use:   "containers",
	Short: "Show the currently running podman containers",
	RunE: func(cmd *cobra.Command, args []string) error {
		s, err := loadState()
		if err != nil {
			return err
		}
		return userRun(s.User, s.UID, "podman", "ps")
	},
}

// pullImagesCmd re-pulls every tagged image already present on the host
var pullImagesCmd = &cobra.Command{
	Use:   "pull-images",
	Short: "Pull updated versions of the current podman images",
	RunE: func(cmd *cobra.Command, args []string) error {
		return runPullImages()
	},
}

// podRestartCmd restarts the pod belonging to a single site
var podRestartCmd = &cobra.Command{
	Use:   "pod-restart <site>",
	Short: "Restart a specific site's pod",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		s, err := loadState()
		if err != nil {
			return err
		}
		return userRun(s.User, s.UID, "podman", "pod", "restart", "pn-"+args[0])
	},
}

// wire up the podman subcommands
func init() {
	rootCmd.AddCommand(imagesCmd, containersCmd, pullImagesCmd, podRestartCmd)
}

// runPullImages pulls a fresh copy of every tagged image on the host, reporting
// failures per image rather than aborting the whole run
func runPullImages() error {
	s, err := loadState()
	if err != nil {
		return err
	}

	out, err := userOut(s.User, s.UID, "podman", "images", "--format", "{{.Repository}}:{{.Tag}}")
	if err != nil {
		return err
	}

	seen := map[string]bool{}
	failed := 0
	for _, ref := range strings.Split(strings.TrimSpace(out), "\n") {
		ref = strings.TrimSpace(ref)
		// dangling layers carry no usable tag, so a pull of one can only fail
		if ref == "" || strings.Contains(ref, "<none>") || seen[ref] {
			continue
		}
		seen[ref] = true
		fmt.Printf(">>> Pulling %s\n", ref)
		if err := userRun(s.User, s.UID, "podman", "pull", ref); err != nil {
			fmt.Printf("WARNING: could not pull %s: %v\n", ref, err)
			failed++
		}
	}

	if failed > 0 {
		return fmt.Errorf("%d image(s) failed to pull", failed)
	}
	return nil
}

// userOut runs a command as the podnest user and returns its stdout, mirroring
// userRun's sudo environment so rootless podman finds the right graphroot
func userOut(uname string, uid int, args ...string) (string, error) {
	home := "/home/" + uname
	if u, err := user.Lookup(uname); err == nil && u.HomeDir != "" {
		home = u.HomeDir
	}
	full := append([]string{
		"-H", "-u", uname,
		fmt.Sprintf("XDG_RUNTIME_DIR=/run/user/%d", uid),
		"HOME=" + home,
	}, args...)
	c := exec.Command("sudo", full...)
	c.Dir = "/tmp"
	c.Stderr = os.Stderr
	b, err := c.Output()
	return string(b), err
}
