// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package cmd

import (
	"encoding/json"
	"fmt"
	"io"

	"podnest/internal/backup"

	"github.com/spf13/cobra"
)

func init() {
	rootCmd.AddCommand(&cobra.Command{
		Use:    "dr-stage [destination]",
		Short:  "Stage recovery data for the PodNest host installer",
		Hidden: true,
		Args:   cobra.MaximumNArgs(1),
		RunE:   runDRStage,
	})
}

func runDRStage(cmd *cobra.Command, args []string) error {
	var request struct {
		Storage    backup.DRStorage `json:"storage"`
		Source     string           `json:"source"`
		Passphrase string           `json:"passphrase"`
	}
	if err := json.NewDecoder(io.LimitReader(cmd.InOrStdin(), 16<<10)).Decode(&request); err != nil {
		return fmt.Errorf("invalid disaster recovery bootstrap request")
	}
	if len(args) == 0 {
		sources, err := backup.DiscoverDRSources(cmd.Context(), request.Storage)
		if err != nil {
			return err
		}
		return json.NewEncoder(cmd.OutOrStdout()).Encode(sources)
	}
	return backup.StageDRBootstrap(cmd.Context(), request.Storage, request.Source, request.Passphrase, args[0])
}
