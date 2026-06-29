// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package fileops

import (
	"context"
	"errors"
	"path/filepath"
)

// ErrRootProtected is returned when an operation targets the html root itself.
var ErrRootProtected = errors.New("html root cannot be modified")

// Delete removes the file or directory at the given site-relative path,
// recursively for directories. The html root itself cannot be deleted. The leaf
// is confined by canonicalising its parent (not the leaf), so a symlink pointing
// outside the root is removed as a link rather than followed — rm never traverses
// into a symlinked directory for its final component.
func (m *Manager) Delete(ctx context.Context, rel string) error {

	// make sure the SFTP container is up before exec'ing into it
	if err := m.ensure(ctx); err != nil {
		return err
	}

	// resolve and confine the target lexically
	abs, err := m.confined(rel)
	if err != nil {
		return err
	}

	// never allow the html root itself to be removed
	if abs == m.htmlRoot() {
		return ErrRootProtected
	}

	// verify the parent directory has no symlink escape; the leaf is deliberately
	// left unresolved so a stray symlink-to-outside can still be cleaned up
	if err := m.canonical(ctx, filepath.Dir(abs)); err != nil {
		return err
	}

	// recursive force remove; rm does not follow a symlinked leaf
	res, err := m.run(ctx, []string{"rm", "-rf", abs})
	if err != nil {
		return err
	}
	if res.ExitCode != 0 {
		return errExec("delete", res)
	}

	return nil
}
