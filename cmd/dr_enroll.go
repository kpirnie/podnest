// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package cmd

import (
	"bytes"
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
}

func runDREnroll(cmd *cobra.Command, args []string) error {
	if err := db.ValidateNodeKey(); err != nil {
		return err
	}
	if _, err := os.Stat(dbPath()); err != nil {
		return fmt.Errorf("open existing PodNest database: %w", err)
	}
	database, err := db.Open(dbPath())
	if err != nil {
		return err
	}
	defer database.Close()

	if err := db.VerifyNodeKey(database); err != nil {
		return err
	}
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
