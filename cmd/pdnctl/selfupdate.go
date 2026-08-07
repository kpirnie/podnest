// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package main

// This file defines the pdnctl self-update — pulls the newest release binary
// from GitHub and swaps it into place, the same asset bootstrap.sh installs.
import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"podnest/internal/version"
)

// where the release binaries are published — matches bootstrap.sh
const pdnctlAssetURL = "https://github.com/kpirnie/podnest/releases/latest/download/pdnctl-linux-"

// leading bytes of a Linux ELF executable
var elfMagic = []byte{0x7f, 'E', 'L', 'F'}

// selfUpdate replaces the running pdnctl binary with the newest release asset
func selfUpdate() error {
	var arch string
	switch runtime.GOARCH {
	case "amd64", "arm64":
		arch = runtime.GOARCH
	default:
		return fmt.Errorf("unsupported architecture: %s", runtime.GOARCH)
	}

	// skip the download when the running binary already matches the newest tag
	latest, newer := version.CheckLatest()
	if latest != "" && !newer {
		fmt.Printf(">>> pdnctl %s is current\n", version.AppVersion)
		return nil
	}

	// resolve through symlinks so the real file is replaced, not the link
	exe, err := os.Executable()
	if err != nil {
		return err
	}
	exe, err = filepath.EvalSymlinks(exe)
	if err != nil {
		return err
	}

	body, err := fetchAsset(pdnctlAssetURL + arch)
	if err != nil {
		return err
	}
	// a truncated download or an HTML error page would otherwise be renamed
	// into place and leave the host without a working pdnctl
	if !bytes.HasPrefix(body, elfMagic) {
		return fmt.Errorf("downloaded pdnctl-linux-%s is not an executable", arch)
	}

	// stage alongside the target so the swap is a same-filesystem rename
	tmp := filepath.Join(filepath.Dir(exe), ".pdnctl.new")
	defer os.Remove(tmp)
	if err := os.WriteFile(tmp, body, 0o755); err != nil {
		return err
	}
	// renaming over a running binary is safe — this process stays on the old
	// inode until it exits
	if err := os.Rename(tmp, exe); err != nil {
		return err
	}

	if latest != "" {
		fmt.Printf(">>> pdnctl updated: %s -> %s (takes effect on the next run)\n", version.AppVersion, latest)
	} else {
		fmt.Printf(">>> pdnctl updated to the newest release (takes effect on the next run)\n")
	}
	return nil
}

// fetchAsset downloads a release asset, following the redirect GitHub issues
// for the latest/download alias
func fetchAsset(url string) ([]byte, error) {
	client := &http.Client{Timeout: 2 * time.Minute}
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "pdnctl/"+version.AppVersion)
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("download failed: %s returned %d", url, resp.StatusCode)
	}
	return io.ReadAll(resp.Body)
}