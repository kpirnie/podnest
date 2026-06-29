// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package fileops

import (
	"context"
	"errors"
)

// ErrExists is returned when a create target already exists.
var ErrExists = errors.New("target already exists")

// Mkdir creates a single new directory at the given site-relative path. The
// parent must already exist; the directory is created owned by the site UID with
// the user's default umask. Fails if the target already exists.
func (m *Manager) Mkdir(ctx context.Context, rel string) error {

	// make sure the SFTP container is up before exec'ing into it
	if err := m.ensure(ctx); err != nil {
		return err
	}

	// resolve and confine the target, then verify no symlink escape
	abs, err := m.confined(rel)
	if err != nil {
		return err
	}
	if err := m.canonical(ctx, abs); err != nil {
		return err
	}

	// plain mkdir (no -p) so a missing parent or an existing target is reported
	res, err := m.run(ctx, []string{"mkdir", abs})
	if err != nil {
		return err
	}
	if res.ExitCode != 0 {
		return errExec("mkdir", res)
	}

	return nil
}

// NewFile creates a new empty file at the given site-relative path, owned by the
// site UID. Fails if the target already exists, so it never clobbers content.
func (m *Manager) NewFile(ctx context.Context, rel string) error {

	// make sure the SFTP container is up before exec'ing into it
	if err := m.ensure(ctx); err != nil {
		return err
	}

	// resolve and confine the target, then verify no symlink escape
	abs, err := m.confined(rel)
	if err != nil {
		return err
	}
	if err := m.canonical(ctx, abs); err != nil {
		return err
	}

	// refuse to overwrite an existing path — touch alone would update mtime on one
	if exists, err := m.exists(ctx, abs); err != nil {
		return err
	} else if exists {
		return ErrExists
	}

	// create the empty file
	res, err := m.run(ctx, []string{"touch", abs})
	if err != nil {
		return err
	}
	if res.ExitCode != 0 {
		return errExec("create", res)
	}

	return nil
}

// exists reports whether a path exists inside the container, as the site UID.
func (m *Manager) exists(ctx context.Context, abs string) (bool, error) {
	res, err := m.run(ctx, []string{"test", "-e", abs})
	if err != nil {
		return false, err
	}
	// test exits 0 when the path exists, 1 when it does not
	return res.ExitCode == 0, nil
}
