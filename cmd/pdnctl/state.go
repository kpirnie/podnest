// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package main

// This file defines the install state persisted to /etc/podnest/install.json —
// written once by install, read by every other subcommand so no flags are ever
// needed after the initial setup.
import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

// where the install state lives on the host
const stateDir = "/etc/podnest"
const statePath = stateDir + "/install.json"

// State holds everything pdnctl needs to know about the install
type State struct {
	User      string    `json:"user"`      // the dedicated user podnest runs under
	UID       int       `json:"uid"`       // that user's uid — used for XDG_RUNTIME_DIR
	Version   string    `json:"version"`   // the image tag channel: latest, dev, or beta
	Port      int       `json:"port"`      // the UI port baked into the unit
	DataPath  string    `json:"data_path"` // host-side site data path
	TZ        string    `json:"tz"`        // host timezone baked into the unit
	UnitPath  string    `json:"unit_path"` // full path to the systemd user unit
	Installed time.Time `json:"installed"` // when install was run
}

// loadState reads and parses the install state, with a helpful error when
// pdnctl has never installed anything on this host
func loadState() (*State, error) {
	b, err := os.ReadFile(statePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("no install found at %s — run: pdnctl install --user <username> --version <latest|dev|beta>", statePath)
		}
		return nil, err
	}
	var s State
	if err := json.Unmarshal(b, &s); err != nil {
		return nil, fmt.Errorf("could not parse %s: %w", statePath, err)
	}
	return &s, nil
}

// saveState writes the install state to disk, creating /etc/podnest if needed
func saveState(s *State) error {
	if err := os.MkdirAll(stateDir, 0o700); err != nil {
		return err
	}
	b, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	// write via temp + rename so a crash never leaves a half-written state file
	tmp := filepath.Join(stateDir, ".install.json.tmp")
	if err := os.WriteFile(tmp, b, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, statePath)
}
