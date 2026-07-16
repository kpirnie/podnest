// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package main

// This file defines the service lifecycle subcommands — start, stop, restart,
// and status — thin systemctl wrappers driven entirely by the state file.
import (
	"fmt"

	"github.com/spf13/cobra"
)

// startCmd starts the podnest service
var startCmd = &cobra.Command{
	Use:   "start",
	Short: "Start the PodNest service",
	RunE: func(cmd *cobra.Command, args []string) error {
		return serviceAction("start")
	},
}

// stopCmd stops the podnest service
var stopCmd = &cobra.Command{
	Use:   "stop",
	Short: "Stop the PodNest service",
	RunE: func(cmd *cobra.Command, args []string) error {
		return serviceAction("stop")
	},
}

// restartCmd restarts the podnest service
var restartCmd = &cobra.Command{
	Use:   "restart",
	Short: "Restart the PodNest service",
	RunE: func(cmd *cobra.Command, args []string) error {
		return serviceAction("restart")
	},
}

// statusCmd prints the install summary and the service status
var statusCmd = &cobra.Command{
	Use:   "status",
	Short: "Show the PodNest install summary and service status",
	RunE: func(cmd *cobra.Command, args []string) error {
		s, err := loadState()
		if err != nil {
			return err
		}
		fmt.Printf("User:      %s (uid %d)\n", s.User, s.UID)
		fmt.Printf("Channel:   %s\n", s.Version)
		fmt.Printf("Port:      %d\n", s.Port)
		fmt.Printf("Data:      %s\n", s.DataPath)
		fmt.Printf("Timezone:  %s\n", s.TZ)
		fmt.Printf("Installed: %s\n\n", s.Installed.Format("2006-01-02 15:04:05 MST"))
		return userRun(s.User, s.UID, "systemctl", "--user", "status", "podnest.service", "--no-pager")
	},
}

// wire up the lifecycle subcommands
func init() {
	rootCmd.AddCommand(startCmd, stopCmd, restartCmd, statusCmd)
}

// serviceAction runs the given systemctl verb against the podnest service
func serviceAction(verb string) error {
	s, err := loadState()
	if err != nil {
		return err
	}
	return userRun(s.User, s.UID, "systemctl", "--user", verb, "podnest.service")
}
