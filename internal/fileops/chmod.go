// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package fileops

import (
	"context"
	"errors"
	"podnest/internal/logger"
	"strconv"
)

// Permission rails applied to every chmod. These mirror the validated rules from
// the KP File Manager plugin: never world-writable, never setuid in a web root,
// and an owner-readable floor so the site user can never lock itself out.
var (
	// ErrBadMode is returned when the supplied mode is not valid 3-4 digit octal.
	ErrBadMode = errors.New("invalid octal permission mode")

	// ErrWorldWritable is returned when the mode would grant write to others.
	ErrWorldWritable = errors.New("world-writable permissions are not allowed")

	// ErrSetuid is returned when the mode would set the setuid bit.
	ErrSetuid = errors.New("setuid permissions are not allowed")

	// ErrBelowFloor is returned when the mode would remove owner read access.
	ErrBelowFloor = errors.New("owner must retain read access")
)

// Chmod sets the permission bits of the entry at the given site-relative path.
// mode is an octal string such as "644" or "2775". The target is fully resolved
// and must lie within the html root. Setgid and the sticky bit are permitted
// (the html root itself is legitimately setgid); setuid and world-writable are
// rejected, and a chmod that would drop owner read is refused.
func (m *Manager) Chmod(ctx context.Context, rel, mode string) error {

	// validate and normalise the requested mode before touching anything
	norm, err := validateMode(mode)
	if err != nil {
		return err
	}

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

	logger.Debug("fileops chmod: path=%q mode=%q user=%q", abs, norm, m.user())

	// apply the permissions to the single target
	res, err := m.run(ctx, []string{"chmod", norm, abs})
	if err != nil {
		return err
	}
	if res.ExitCode != 0 {
		return errExec("chmod", res)
	}

	return nil
}

// validateMode parses an octal permission string, enforces the safety rails, and
// returns the canonical octal form to hand to chmod.
func validateMode(mode string) (string, error) {

	// must parse as octal within the 12-bit permission/special range
	v, err := strconv.ParseUint(mode, 8, 32)
	if err != nil || v > 0o7777 {
		return "", ErrBadMode
	}

	// reject the setuid bit outright in a web root
	if v&0o4000 != 0 {
		return "", ErrSetuid
	}

	// reject any world-writable result
	if v&0o0002 != 0 {
		return "", ErrWorldWritable
	}

	// enforce the owner-read floor so the site user keeps access to its files
	if v&0o0400 == 0 {
		return "", ErrBelowFloor
	}

	// return canonical octal (no leading zero is fine for chmod)
	return strconv.FormatUint(v, 8), nil
}
