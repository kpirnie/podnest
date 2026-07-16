// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package main

// This file defines the root command for the pdnctl host management binary using Cobra.
import (
	"fmt"
	"os"
	"podnest/internal/version"

	"github.com/spf13/cobra"
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:     "pdnctl",
	Short:   "PodNest host manager by Kevin Pirnie",
	Long:    `Installs, updates, and manages the PodNest service on the host machine.`,
	Version: version.AppVersion,

	// every subcommand touches /etc and other users' homes — require root up front
	PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
		if os.Geteuid() != 0 {
			return fmt.Errorf("pdnctl must be run as root")
		}
		return nil
	},
}

// the main entry point of the app
func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, "ERROR:", err)
		os.Exit(1)
	}
}
