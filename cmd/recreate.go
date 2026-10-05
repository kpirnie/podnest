// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package cmd

import (
	"context"
	"fmt"

	"podnest/internal/db"
	"podnest/internal/handlers/sites"
	"podnest/internal/logger"
	"podnest/internal/modules"
	"podnest/internal/modules/types/dotnet"
	"podnest/internal/modules/types/node"
	"podnest/internal/modules/types/php"
	"podnest/internal/modules/types/python"
	"podnest/internal/modules/types/reverseproxy"
	"podnest/internal/modules/types/static"
	"podnest/internal/modules/types/wordpress"
	"podnest/internal/podman"
	"podnest/internal/server"

	"github.com/spf13/cobra"
)

// setup the 'recreate' command
var recreateCmd = &cobra.Command{
	Use:   "recreate",
	Short: "Recreate site pods on freshly pulled images",
	RunE:  runRecreate,
}

// recreateAll holds the all flag value
var recreateAll bool

// add the 'recreate' command and its flags to the root command
func init() {
	rootCmd.AddCommand(recreateCmd)
	recreateCmd.Flags().BoolVar(&recreateAll, "all", false, "Recreate every site that has a pod (required)")
}

// runRecreate rebuilds every site pod in turn, stopping at the first failure so
// a broken rebuild is never followed by cleanup that would hide it.
func runRecreate(cmd *cobra.Command, args []string) error {

	// only the full sweep exists today — refuse a bare call rather than guess
	if !recreateAll {
		return fmt.Errorf("--all is required")
	}

	// initialize the logger
	logger.Init()

	// open the database
	database, err := db.Open(dbPath())
	if err != nil {
		logger.Error("failed to open database: %v", err)
		return err
	}
	defer database.Close()

	// register site type modules — pod creation resolves them by site type
	modules.RegisterType(wordpress.Module{})
	modules.RegisterType(php.Module{})
	modules.RegisterType(static.Module{})
	modules.RegisterType(node.Module{})
	modules.RegisterType(dotnet.Module{})
	modules.RegisterType(python.Module{})
	modules.RegisterType(reverseproxy.Module{})

	// resolve the host-side paths and published IP the same way serve does, so
	// rebuilt pods mount and publish exactly as the server would build them
	podmanClient := podman.New(podmanSock)
	podman.SetPublishHostIP(server.DetectHostGateway(podmanClient))
	h := &sites.Handler{
		DB:           database,
		AppPath:      appPath,
		HostAppPath:  server.DetectHostAppPath(podmanClient, appPath),
		PodmanSock:   podmanSock,
		Podman:       podmanClient,
		PodmanClient: podmanClient,
	}

	// grab every site
	all, err := db.GetAllSites(database)
	if err != nil {
		logger.Error("failed to list sites: %v", err)
		return err
	}

	// rebuild each pod, waiting on the mariadb upgrade since this process exits after
	for _, site := range all {
		if !modules.TypeModule(site.SiteType).HasPod() {
			continue
		}
		logger.Info("recreating site %s", site.Name)
		status, err := h.RecreateSite(context.Background(), site, nil, false, true)
		if err != nil {
			return fmt.Errorf("recreate %s: %w", site.Name, err)
		}
		logger.Info("site %s recreated — %s", site.Name, status)
	}
	return nil
}
