// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package fileops

import (
	"context"
	"path/filepath"
)

// Move renames or moves the entry at src to dst, both site-relative. It covers
// both in-place rename and relocation into another directory. The html root
// cannot be moved, an existing destination is never overwritten, and the
// destination's parent must already exist. Source confinement resolves the
// parent only, so a symlink entry can itself be moved rather than its target.
func (m *Manager) Move(ctx context.Context, src, dst string) error {

	// make sure the SFTP container is up before exec'ing into it
	if err := m.ensure(ctx); err != nil {
		return err
	}

	// confine both endpoints lexically
	absSrc, err := m.confined(src)
	if err != nil {
		return err
	}
	absDst, err := m.confined(dst)
	if err != nil {
		return err
	}

	// never allow the html root itself to be moved
	if absSrc == m.htmlRoot() {
		return ErrRootProtected
	}

	// verify neither parent escapes via symlink; leaves are left unresolved so a
	// symlink source can be moved and a not-yet-existing destination is allowed
	if err := m.canonical(ctx, filepath.Dir(absSrc)); err != nil {
		return err
	}
	if err := m.canonical(ctx, filepath.Dir(absDst)); err != nil {
		return err
	}

	// refuse to clobber an existing destination
	if exists, err := m.exists(ctx, absDst); err != nil {
		return err
	} else if exists {
		return ErrExists
	}

	// perform the move; -T treats the destination as a normal target so a moved
	// directory never lands inside an unexpected same-named subdirectory
	res, err := m.run(ctx, []string{"mv", "-T", absSrc, absDst})
	if err != nil {
		return err
	}
	if res.ExitCode != 0 {
		return errExec("move", res)
	}

	return nil
}
