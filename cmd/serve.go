package cmd

import (
	"fmt"
	"os"
	"time"

	"podnest/internal/backup"
	"podnest/internal/cron"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/modules"
	"podnest/internal/modules/features/backups"
	"podnest/internal/modules/features/crons"
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
	logger.Info("Please hold while we can make sure your system is fully running")

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

	// create the sftp server
	sftpMgr := sftpmanager.New(podman.New(podmanSock), appPath, "")

	// create the fail2ban manager
	f2bMgr := fail2ban.New(podman.New(podmanSock), appPath, "")

	// create the backup manager
	backupMgr := backup.New(database, podman.New(podmanSock), podmanSock, appPath)

	// create the cron manager
	cronMgr := cron.New(database, podman.New(podmanSock))

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
		WarmWAF: srv.WarmWAFCache,
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
		Podman:  podman.New(podmanSock),
	})

	logger.Info("PodNest management UI starting on :%d", serverPort)

	// start the server
	return srv.Start()
}
