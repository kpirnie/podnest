// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package fileops

import (
	"context"
	"strings"
)

// Write saves text content to the file at the given site-relative path, for the
// editor's save action. It streams the content to "cp /dev/stdin {path}" run as
// the site UID: when the file already exists cp truncates it in place, preserving
// the existing inode, ownership, and mode; when it is new the file is created
// owned by the site UID. The parent directory must already exist — use Mkdir
// first for a save-as into a new folder.
func (m *Manager) Write(ctx context.Context, rel, content string) error {

	// guard the editor save size, mirroring the read-side cap
	if len(content) > maxEditSize {
		return ErrTooLarge
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

	// stream the content to the file via stdin; cp /dev/stdin emits nothing on
	// stdout, so nothing is buffered back on success
	res, err := m.runStream(ctx, []string{"cp", "/dev/stdin", abs}, strings.NewReader(content))
	if err != nil {
		return err
	}
	if res.ExitCode != 0 {
		return errExec("write", res)
	}

	return nil
}
