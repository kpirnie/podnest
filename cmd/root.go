package cmd

// This file defines the root command for the podnest CLI application using Cobra.
import (
	"fmt"
	"os"
	"podnest/internal/logger"

	"github.com/spf13/cobra"
)

// Global variables for configuration
var (
	appPath     string
	serverPort  int
	podmanSock  string
	adminDomain string
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "podnest",
	Short: "PodNest by Kevin Pirnie",
	Long:  `Manage hardened, high-performance website pods with a web-based management UI.`,
}

// Execute is the entrypoint called from main.go
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		logger.Error("Error executing command: %v", err)
		os.Exit(1)
	}
}

// Helper functions to construct paths for database and sites
func dbPath() string    { return appPath + "/podnest.db" }
func sitesPath() string { return appPath + "/sites" }

// init function to set up flags and default values
func init() {
	rootCmd.PersistentFlags().StringVar(
		&appPath,
		"app-path",
		"/opt/podnest",
		"Base path for all application data (db, sites, configs)",
	)
	rootCmd.PersistentFlags().IntVar(
		&serverPort,
		"port",
		8080,
		"Port for the management UI",
	)
	rootCmd.PersistentFlags().StringVar(
		&podmanSock,
		"socket",
		fmt.Sprintf("/run/user/%d/podman/podman.sock", os.Getuid()),
		"Path to Podman socket",
	)
	rootCmd.PersistentFlags().StringVar(
		&adminDomain,
		"domain",
		"",
		"Optional domain for the management UI panel (enables TLS via Let's Encrypt)",
	)
}
