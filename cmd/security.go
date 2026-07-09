// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package cmd

import (
	"fmt"
	"net"

	"podnest/internal/db"

	"github.com/spf13/cobra"
)

// setup the 'security' command
var securityCmd = &cobra.Command{
	Use:   "security",
	Short: "Security recovery operations (lockout escape hatch)",
	RunE:  runSecurity,
}

// securityBypass holds the bypass flag value
var securityBypass string

// add the 'security' command and its flags to the root command
func init() {
	rootCmd.AddCommand(securityCmd)
	securityCmd.Flags().StringVar(&securityBypass, "bypass", "", "IP or CIDR to add to the security bypass list (skips all IP/UA/country/ASN/WAF checks)")
}

// runSecurity performs the requested recovery operation directly against
// the database — intended for use when the web UI is unreachable due to a
// self-inflicted block. The running instance picks the change up on restart.
func runSecurity(cmd *cobra.Command, args []string) error {

	// require at least one operation flag
	if securityBypass == "" {
		return fmt.Errorf("no operation specified — see --help")
	}

	// validate the bypass entry as a CIDR block or bare IP
	if _, _, err := net.ParseCIDR(securityBypass); err != nil {
		if net.ParseIP(securityBypass) == nil {
			return fmt.Errorf("'%s' is not a valid IP or CIDR", securityBypass)
		}
	}

	// open the database
	database, err := db.Open(dbPath())
	if err != nil {
		return err
	}
	defer database.Close()

	// insert the bypass entry
	if err := db.AddBypassRule(database, securityBypass, "added via CLI recovery"); err != nil {
		return err
	}

	fmt.Printf("Bypass entry '%s' added. Restart the podnest service for it to take effect.\n", securityBypass)
	return nil
}
