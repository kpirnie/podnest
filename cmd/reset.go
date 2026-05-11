package cmd

import (
	"fmt"
	"syscall"

	"podnest/internal/auth"
	"podnest/internal/db"

	"github.com/spf13/cobra"
	"golang.org/x/term"
)

// setup the 'reset' command
var resetCmd = &cobra.Command{
	Use:   "reset",
	Short: "Reset a user's password and/or TOTP",
	RunE:  runReset,
}

// resetUsername holds the username flag value
var resetUsername string

// add the 'reset' command and its flags to the root command
func init() {
	rootCmd.AddCommand(resetCmd)
	resetCmd.Flags().StringVar(&resetUsername, "user", "", "Username to reset (required)")
	resetCmd.MarkFlagRequired("user")
}

// runReset resets the password and clears TOTP for the given username
func runReset(cmd *cobra.Command, args []string) error {

	// open the database
	database, err := db.Open(dbPath())
	if err != nil {
		return err
	}
	defer database.Close()

	// look up the user
	user, err := db.GetUserByUsername(database, resetUsername)
	if err != nil {
		return err
	}
	if user == nil {
		return fmt.Errorf("user '%s' not found", resetUsername)
	}

	// prompt for new password
	fmt.Print("New password : ")
	pwBytes, err := term.ReadPassword(int(syscall.Stdin))
	fmt.Println()
	if err != nil {
		return err
	}
	fmt.Print("Confirm      : ")
	confirmBytes, err := term.ReadPassword(int(syscall.Stdin))
	fmt.Println()
	if err != nil {
		return err
	}
	if string(pwBytes) != string(confirmBytes) {
		return fmt.Errorf("passwords do not match")
	}

	// hash and store the new password
	hash, err := auth.HashPassword(string(pwBytes))
	if err != nil {
		return err
	}
	if err := db.UpdatePassword(database, user.ID, hash); err != nil {
		return err
	}

	// clear TOTP secret and disable it
	if err := db.DisableTOTP(database, user.ID); err != nil {
		return err
	}

	// delete any backup codes
	if err := db.DeleteBackupCodes(database, user.ID); err != nil {
		return err
	}

	// invalidate all existing sessions so the old password can't be reused
	if err := db.DeleteUserSessions(database, user.ID); err != nil {
		return err
	}

	fmt.Printf("User '%s' password reset and TOTP cleared successfully.\n", resetUsername)
	return nil
}
