// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package cmd

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/podman"
	"podnest/internal/sftp"

	"github.com/spf13/cobra"
)

// restartSiteCmd restarts a site and restores its runtime SMTP settings.
var restartSiteCmd = &cobra.Command{
	Use:   "restart-site <site>",
	Short: "Restart a site pod and restore its SMTP settings",
	Args:  cobra.ExactArgs(1),
	RunE:  runRestartSite,
}

func init() {
	rootCmd.AddCommand(restartSiteCmd)
}

// runRestartSite restarts an existing site through the managed Podman client.
func runRestartSite(cmd *cobra.Command, args []string) error {

	logger.Init()

	database, err := db.Open(dbPath())
	if err != nil {
		return fmt.Errorf("open PodNest database: %w", err)
	}
	defer database.Close()

	site, err := db.GetSiteByName(database, args[0])
	if err != nil {
		return fmt.Errorf("look up site %q: %w", args[0], err)
	}
	if site == nil {
		return fmt.Errorf("site %q not found", args[0])
	}
	if site.SiteType == models.SiteTypeReverseProxy {
		return fmt.Errorf("site %q does not have a pod", site.Name)
	}

	client := podman.New(podmanSock)
	configureSMTPResolver(client, database)

	ctx, cancel := context.WithTimeout(cmd.Context(), 2*time.Minute)
	defer cancel()

	if err := client.RestartPod(ctx, podman.PodName(site.Name)); err != nil {
		return fmt.Errorf("restart site %q: %w", site.Name, err)
	}

	fmt.Fprintf(cmd.OutOrStdout(), "Restarted site %s\n", site.Name)
	return nil
}

// configureSMTPResolver binds runtime credential lookup to the recorded site
// and container identity.
func configureSMTPResolver(client *podman.Client, database *sql.DB) {
	client.SetSMTPResolver(func(siteID int64, container, role string) (int, map[string]string, error) {
		site, err := db.GetSiteByID(database, siteID)
		if err != nil {
			return 0, nil, err
		}
		if site == nil {
			return 0, nil, fmt.Errorf("SMTP site does not exist")
		}

		var expectedRole string
		switch site.SiteType {
		case models.SiteTypePHP, models.SiteTypeWordPress:
			expectedRole = "php"
		case models.SiteTypeNode, models.SiteTypeDotNet, models.SiteTypePython:
			expectedRole = "app"
		default:
			return 0, nil, fmt.Errorf("site type does not support SMTP")
		}
		if role != expectedRole || container != podman.ContainerName(site.Name, expectedRole) {
			return 0, nil, fmt.Errorf("SMTP site and container do not match")
		}

		settings, err := db.GetSMTPRuntimeConfig(database, site.ID)
		if err != nil {
			return 0, nil, err
		}

		return sftp.UIDForSite(site.ID), settings, nil
	})
}
