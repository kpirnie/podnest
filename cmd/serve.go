// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package cmd

import (
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"podnest/internal/backup"
	"podnest/internal/cron"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/modules"
	"podnest/internal/modules/features/backups"
	"podnest/internal/modules/features/basicauth"
	"podnest/internal/modules/features/crons"
	"podnest/internal/modules/features/files"
	sftpfeature "podnest/internal/modules/features/sftp"
	"podnest/internal/modules/features/stats"
	"podnest/internal/modules/features/waf"
	"podnest/internal/modules/platform/fail2ban"
	"podnest/internal/modules/types/dotnet"
	"podnest/internal/modules/types/node"
	"podnest/internal/modules/types/php"
	"podnest/internal/modules/types/reverseproxy"
	"podnest/internal/modules/types/static"
	"podnest/internal/modules/types/wordpress"
	"podnest/internal/podman"
	"podnest/internal/server"
	sftpmanager "podnest/internal/sftp"

	"github.com/spf13/cobra"
)

// This file defines the "serve" command for the podnest CLI application, which starts the management UI and API server.
var serveCmd = &cobra.Command{
	Use:   "serve",
	Short: "Start the podnest management UI and API server",
	RunE:  runServe,
}

// init function to add the serve command to the root command
func init() {
	rootCmd.AddCommand(serveCmd)
}

// runServe is the main function that executes when "podnest serve" is called. It initializes logging, checks the Podman socket, opens/migrates the database, and starts the server.
func runServe(cmd *cobra.Command, args []string) error {

	// initialize the logger
	logger.Init()
	logger.Info("PodNest starting — debug=%v", logger.IsDebug())
	logger.Info("	Please hold so we can make sure")
	logger.Info("	your system is fully running")

	// ensure the podman socket is a valid socket file and not a directory —
	// podman-compose can incorrectly create it as a directory if the socket
	// does not exist at mount time
	if info, err := os.Stat(podmanSock); err == nil {
		if info.IsDir() {
			logger.Error("podman socket path '%s' is a directory - this is caused by podman-compose creating the mount point before the socket exists. Stop the container, run 'rm -rf %s' on the host, ensure 'systemctl start podman.socket' has run, then restart.", podmanSock, podmanSock)
			return fmt.Errorf("podman socket path is a directory, cannot continue")
		}
	}

	// wait for the socket to appear as a valid socket file
	for i := 0; i < 120; i++ {
		info, err := os.Stat(podmanSock)
		if err == nil && !info.IsDir() {
			break
		}
		logger.Debug("waiting for podman socket: %s", podmanSock)
		time.Sleep(1 * time.Second)
	}

	// open the database
	database, err := db.Open(dbPath())
	if err != nil {
		logger.Error("failed to open database: %v", err)
		return err
	}
	defer database.Close()

	// run the migrations
	if err := db.Migrate(database); err != nil {
		logger.Error("database migration failed: %v", err)
		return err
	}

	// seed the default admin user if it doesn't exist
	if err := db.SeedDefaultAdmin(database); err != nil {
		logger.Error("failed to seed default admin: %v", err)
		return err
	}

	// one podman client is shared by every consumer — they all talk to the same
	// socket and a second client only adds another connection pool
	podmanClient := podman.New(podmanSock)

	// create the sftp server
	sftpMgr := sftpmanager.New(podmanClient, database, appPath, "")

	// create the fail2ban manager
	f2bMgr := fail2ban.New(podmanClient, appPath, "")

	// create the backup manager
	backupMgr := backup.New(database, podmanClient, podmanSock, appPath)

	// create the cron manager
	cronMgr := cron.New(database, podmanClient)

	// register site type modules
	modules.RegisterType(wordpress.Module{})
	modules.RegisterType(php.Module{})
	modules.RegisterType(static.Module{})
	modules.RegisterType(node.Module{})
	modules.RegisterType(dotnet.Module{})
	modules.RegisterType(reverseproxy.Module{})

	// create the server
	srv := server.New(server.Config{
		DB:              database,
		Port:            serverPort,
		PodmanSock:      podmanSock,
		Podman:          podmanClient,
		AppPath:         appPath,
		SFTPManager:     sftpMgr,
		Fail2BanManager: f2bMgr,
		BackupManager:   backupMgr,
		CronManager:     cronMgr,
		CertDir:         appPath + "/certs",
		AdminDomain:     adminDomain,
	})

	// register the WAF
	modules.RegisterFeature(waf.Module{
		DB:      database,
		AppPath: appPath,
		WarmWAF: srv.WarmCaches,
	})

	// register the backups
	modules.RegisterFeature(backups.Module{
		DB:      database,
		Manager: backupMgr,
	})

	// register the cron job module
	modules.RegisterFeature(crons.Module{
		DB:      database,
		Manager: cronMgr,
	})

	// register the sftp module
	modules.RegisterFeature(sftpfeature.Module{
		DB:      database,
		Manager: sftpMgr,
	})

	// register the stats module
	modules.RegisterFeature(stats.Module{
		DB:      database,
		AppPath: appPath,
		Podman:  podmanClient,
	})

	// register the basic auth module
	modules.RegisterFeature(basicauth.Module{
		DB:         database,
		WarmCaches: srv.WarmCaches,
	})

	// register the file manager module
	modules.RegisterFeature(files.Module{
		Podman: podmanClient,
		SFTP:   sftpMgr,
	})

	// log that the server is started and on which port
	logger.Info("PodNest started on :%d", serverPort)

	// run the server on its own goroutine so the signal handler below can
	// drain instead of the process being dropped mid-write
	errCh := make(chan error, 1)
	go func() {
		errCh <- srv.Start()
	}()

	// drain on SIGINT/SIGTERM
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-errCh:
		if err != nil && err != http.ErrServerClosed {
			return err
		}
		return nil
	case sig := <-sigCh:
		logger.Info("received %s — draining", sig)
		srv.Stop()
		<-errCh
		logger.Info("PodNest stopped")
		return nil
	}
}
