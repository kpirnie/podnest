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

// EnsureMUPluginsDir creates wp-content/mu-plugins in the site's html dir and
// hands it to the site user, so the runtime can create the SSO mu-plugin's
// mount point inside it. Only the directory itself is chowned; its contents
// are left untouched.
func EnsureMUPluginsDir(siteDir string, uid int) error {

	// html sits under the root-owned site dir, so it is the confinement root —
	// wp-content and mu-plugins are site-owned and may be planted links
	root, err := os.OpenRoot(filepath.Join(siteDir, "html"))
	if err != nil {
		return fmt.Errorf("open html dir: %w", err)
	}
	defer root.Close()

	dir := filepath.Join("wp-content", "mu-plugins")
	if err := root.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("create mu-plugins dir: %w", err)
	}
	if err := root.Lchown(dir, uid, uid); err != nil {
		return fmt.Errorf("chown mu-plugins dir: %w", err)
	}
	return nil
}
