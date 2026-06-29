// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package fileops

import (
	"context"
	"path/filepath"
)

// Copy duplicates the entry at src to dst, both site-relative, recursively for
// directories. An existing destination is never overwritten and the
// destination's parent must already exist. The source is fully canonicalised so
// a top-level symlink pointing outside the root is rejected rather than pulling
// external content into the web root; symlinks within a copied tree are
// preserved as links, not dereferenced. Copies are owned by the site UID.
func (m *Manager) Copy(ctx context.Context, src, dst string) error {

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

	// resolve the source fully — it must exist and must not be a symlink that
	// escapes the root — and verify the destination parent has no symlink escape
	if err := m.canonical(ctx, absSrc); err != nil {
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

	// recursive copy; -T treats the destination as a normal target so a copied
	// directory does not nest inside a same-named subdirectory. Default symlink
	// handling preserves in-tree links rather than dereferencing them, and
	// ownership is not preserved so copies land as the site UID.
	res, err := m.run(ctx, []string{"cp", "-rT", absSrc, absDst})
	if err != nil {
		return err
	}
	if res.ExitCode != 0 {
		return errExec("copy", res)
	}

	return nil
}
