package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"syscall"

	"podnest/internal/auth"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"

	"github.com/spf13/cobra"
	"golang.org/x/term"
)

// setup the 'init' command
var initCmd = &cobra.Command{
	Use:   "init",
	Short: "Initialize the database and create the admin account",
	RunE:  runInit,
}

// add the 'init' command to the root command
func init() {
	rootCmd.AddCommand(initCmd)
}

// runInit executes the initialization process, including database setup and admin account creation.
func runInit(cmd *cobra.Command, args []string) error {

	// make sure the database directory exists and has appropriate permissions (0750)
	if err := os.MkdirAll(filepath.Dir(dbPath()), 0750); err != nil {
		logger.Error("failed to create database directory: %v", err)
		return err
	}

	// open the database connection and ensure it is properly closed after the function returns
	database, err := db.Open(dbPath())
	if err != nil {
		logger.Error("failed to open database: %v", err)
		return err
	}
	defer database.Close()

	// run database migrations to set up the necessary tables and schema
	if err := db.Migrate(database); err != nil {
		logger.Error("database migration failed: %v", err)
		return err
	}

	// check if an admin account already exists
	exists, err := db.AdminExists(database)
	if err != nil {
		logger.Error("failed to check for existing admin: %v", err)
		return err
	}
	if exists {
		logger.Error("admin account already exists — use the UI to manage users")
		return nil
	}

	// prompt the user to create an admin account by collecting necessary information and securely handling the password input
	logger.Info("Creating admin account...")

	// hold the user input for the admin account details variables
	var uname, fname, lname, email, phone string

	// prompt the user for the admin account details, read the input from the terminal and validate
	fmt.Print("Username : ")
	fmt.Scanln(&uname)
	fmt.Print("First name: ")
	fmt.Scanln(&fname)
	fmt.Print("Last name : ")
	fmt.Scanln(&lname)
	fmt.Print("Email     : ")
	fmt.Scanln(&email)
	fmt.Print("Phone     : ")
	fmt.Scanln(&phone)
	fmt.Print("Password  : ")
	pwBytes, err := term.ReadPassword(int(syscall.Stdin))
	fmt.Println()
	if err != nil {
		logger.Error("failed to read password: %v", err)
		return err
	}
	fmt.Print("Confirm   : ")
	confirmBytes, err := term.ReadPassword(int(syscall.Stdin))
	fmt.Println()
	if err != nil {
		logger.Error("failed to read password confirmation: %v", err)
		return err
	}
	if string(pwBytes) != string(confirmBytes) {
		logger.Error("passwords do not match")
		return nil
	}

	// hash the password using the auth package to securely store it in the database
	hash, err := auth.HashPassword(string(pwBytes))
	if err != nil {
		logger.Error("failed to hash password: %v", err)
		return err
	}

	// generate a unique user hash (UHash) for the admin account, which can be used for authentication and identification purposes
	uhash, err := models.GenerateUHash()
	if err != nil {
		logger.Error("failed to generate user hash: %v", err)
		return err
	}

	// setup the user struct with the collected information and hashed password, and assign the admin role
	user := &models.User{
		UName: uname,
		PWord: string(hash),
		UHash: uhash,
		FName: fname,
		LName: lname,
		Email: email,
		Phone: phone,
		Role:  models.RoleAdmin,
	}

	// create the admin account in the database using the db package, and handle any errors that may occur during the process
	if err := db.CreateUser(database, user); err != nil {
		logger.Error("failed to create admin account: %v", err)
		return err
	}

	// print a success message to the user indicating that the admin account has been created successfully, and provide instructions on how to start the server
	logger.Info("Admin account '%s' created successfully.", uname)
	logger.Info("Start the server with: podnest serve")

	// return nil to indicate that the initialization process completed successfully without any errors
	return nil
}
