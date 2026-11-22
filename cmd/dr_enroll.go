// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package cmd

import (
	"bytes"
	"database/sql"
	"errors"
	"fmt"
	"os"

	"podnest/internal/backup"
	"podnest/internal/db"

	"github.com/spf13/cobra"
	"golang.org/x/term"
)

func init() {
	rootCmd.AddCommand(&cobra.Command{
		Use:   "dr-enroll",
		Short: "Protect the PodNest instance key for disaster recovery",
		Args:  cobra.NoArgs,
		RunE:  runDREnroll,
	})
	rootCmd.AddCommand(&cobra.Command{
		Use:   "dr-snapshot-application",
		Short: "Create a verified application-only disaster recovery snapshot",
		Args:  cobra.NoArgs,
		RunE:  runDRApplicationSnapshot,
	})
}

func openDRDatabase() (*sql.DB, error) {
	if err := db.ValidateNodeKey(); err != nil {
		return nil, err
	}
	if _, err := os.Stat(dbPath()); err != nil {
		return nil, fmt.Errorf("open existing PodNest database: %w", err)
	}
	database, err := db.Open(dbPath())
	if err != nil {
		return nil, err
	}
	if err := db.VerifyNodeKey(database); err != nil {
		database.Close()
		return nil, err
	}
	return database, nil
}

func runDREnroll(cmd *cobra.Command, args []string) error {
	database, err := openDRDatabase()
	if err != nil {
		return err
	}
	defer database.Close()
	fd := int(os.Stdin.Fd())
	if !term.IsTerminal(fd) {
		return errors.New("key enrollment requires a terminal for the recovery passphrase")
	}
	fmt.Fprint(cmd.ErrOrStderr(), "Recovery passphrase: ")
	passphrase, err := term.ReadPassword(fd)
	fmt.Fprintln(cmd.ErrOrStderr())
	if err != nil {
		return err
	}
	defer clear(passphrase)

	fmt.Fprint(cmd.ErrOrStderr(), "Confirm recovery passphrase: ")
	confirmation, err := term.ReadPassword(fd)
	fmt.Fprintln(cmd.ErrOrStderr())
	if err != nil {
		return err
	}
	defer clear(confirmation)
	if !bytes.Equal(passphrase, confirmation) {
		return errors.New("recovery passphrases do not match")
	}

	manager := backup.New(database, nil, "", appPath)
	id, err := manager.EnrollDRKey(cmd.Context(), string(passphrase))
	if err != nil {
		return err
	}
	fmt.Fprintf(cmd.OutOrStdout(), "Verified recovery key envelope for node %s. Retain the recovery passphrase outside PodNest and S3.\n", id)
	return nil
}

func runDRApplicationSnapshot(cmd *cobra.Command, args []string) error {
	database, err := openDRDatabase()
	if err != nil {
		return err
	}
	defer database.Close()
	manager := backup.New(database, nil, "", appPath)
	id, err := manager.SnapshotDRApplication(cmd.Context())
	if err != nil {
		return err
	}
	fmt.Fprintf(cmd.OutOrStdout(), "Verified application-only Restic snapshot %s.\n", id)
	return nil
}
