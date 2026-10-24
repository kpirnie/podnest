// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package wordpress

import (
	_ "embed"
	"fmt"
	"os"
	"path/filepath"
)

// SSOPluginName is the managed wp-admin SSO mu-plugin's file name, both in the
// site directory and inside wp-content/mu-plugins
const SSOPluginName = "podnest-sso.php"

//go:embed podnest-sso.php
var ssoPlugin []byte

// WriteSSOPlugin writes the managed SSO mu-plugin into the site's root-owned
// directory, where the site user cannot alter it. os.WriteFile truncates in
// place rather than replacing the inode, so a running pod's bind mount picks
// up the new copy without a recreate.
func WriteSSOPlugin(siteDir string) error {
	if err := os.WriteFile(filepath.Join(siteDir, SSOPluginName), ssoPlugin, 0644); err != nil {
		return fmt.Errorf("write %s: %w", SSOPluginName, err)
	}
	return nil
}
