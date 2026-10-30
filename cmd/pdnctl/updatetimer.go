// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package main

// This file defines the queued-update timer — a root systemd timer that runs
// update whenever the panel drops a request flag in the app's data dir. The
// panel only has the rootless podman socket, so the flag is its only way to
// ask the host for an update that includes the root-owned pdnctl binary.
import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"
)

// where the root timer and its oneshot service are installed
const (
	updateUnitDir     = "/etc/systemd/system"
	updateServiceName = "pdnctl-update.service"
	updateTimerName   = "pdnctl-update.timer"
)

// updateFlagName is the request flag the panel writes under <DataPath>/data
const updateFlagName = ".update-requested"

// updateQueuedCmd runs update only when the panel has requested one
var updateQueuedCmd = &cobra.Command{
	Use:    "update-queued",
	Short:  "Run update if the panel has queued one (called by the update timer)",
	Hidden: true,
	RunE: func(cmd *cobra.Command, args []string) error {
		return runUpdateQueued()
	},
}

// wire up the update-queued subcommand
func init() {
	rootCmd.AddCommand(updateQueuedCmd)
}

// updateFlagPath returns the host-side path of the panel's update request flag
func updateFlagPath(s *State) string {
	return filepath.Join(s.DataPath, "data", updateFlagName)
}

// runUpdateQueued runs a full update when the request flag is present, then
// clears the flag whether or not the update succeeded so a failing update is
// not retried every minute
func runUpdateQueued() error {
	s, err := loadState()
	if err != nil {
		return err
	}

	// the flag lives in a directory the podnest user controls — Lstat so root
	// never follows a planted symlink, and only a regular file counts
	flag := updateFlagPath(s)
	fi, err := os.Lstat(flag)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	// Remove unlinks the entry itself, never a symlink's target
	defer os.Remove(flag)
	if !fi.Mode().IsRegular() {
		return fmt.Errorf("%s is not a regular file — ignoring", flag)
	}

	fmt.Println(">>> Update requested from the panel")
	return runUpdate()
}

// ensureUpdateTimer writes and enables the root update timer and service when
// either is missing — install creates them, update adds them to older installs
func ensureUpdateTimer() error {
	svcPath := filepath.Join(updateUnitDir, updateServiceName)
	tmrPath := filepath.Join(updateUnitDir, updateTimerName)
	_, svcErr := os.Stat(svcPath)
	_, tmrErr := os.Stat(tmrPath)
	if svcErr == nil && tmrErr == nil {
		return nil
	}

	exe, err := os.Executable()
	if err != nil {
		return err
	}
	exe, err = filepath.EvalSymlinks(exe)
	if err != nil {
		return err
	}

	svc := fmt.Sprintf(`[Unit]
Description=PodNest queued update
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=%s update-queued
`, exe)

	tmr := `[Unit]
Description=Run a PodNest update queued from the panel

[Timer]
OnCalendar=minutely
AccuracySec=5s

[Install]
WantedBy=timers.target
`

	if err := os.WriteFile(svcPath, []byte(svc), 0o644); err != nil {
		return err
	}
	if err := os.WriteFile(tmrPath, []byte(tmr), 0o644); err != nil {
		return err
	}
	if err := run("systemctl", "daemon-reload"); err != nil {
		return err
	}
	return run("systemctl", "enable", "--now", updateTimerName)
}

// removeUpdateTimer disables and deletes the root update timer and service —
// best-effort, matching the rest of uninstall
func removeUpdateTimer() {
	run("systemctl", "disable", "--now", updateTimerName)
	os.Remove(filepath.Join(updateUnitDir, updateTimerName))
	os.Remove(filepath.Join(updateUnitDir, updateServiceName))
	run("systemctl", "daemon-reload")
}
