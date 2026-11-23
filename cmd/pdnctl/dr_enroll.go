// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package main

import (
	"os"

	"github.com/spf13/cobra"
)

func init() {
	var appPath string
	command := &cobra.Command{
		Use:   "dr-enroll",
		Short: "Protect the installed PodNest instance key for disaster recovery",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			state, err := loadState()
			if err != nil {
				return err
			}
			child := userCommand(state.User, state.UID, "podman", "exec", "-it",
				"podnest", "podnest", "dr-enroll", "--app-path", appPath)
			child.Stdin = os.Stdin
			return child.Run()
		},
	}
	command.Flags().StringVar(&appPath, "app-path", "/opt/podnest", "PodNest data path inside the container")
	rootCmd.AddCommand(command)
}
