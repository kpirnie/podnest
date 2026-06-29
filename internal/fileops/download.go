// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package fileops

import (
	"context"
	"io"
	"strings"

	"podnest/internal/sftp"
)

// Download streams the regular file at the given site-relative path straight to
// w (the HTTP response), without buffering, so files of any size or type transfer
// at flat memory cost. Directories and non-regular files are rejected. Callers
// are responsible for setting an attachment Content-Disposition and a neutral
// Content-Type so served content can never execute in the panel origin.
func (m *Manager) Download(ctx context.Context, rel string, w io.Writer) error {

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

	// reject anything that is not a regular file before streaming bytes
	stat, err := m.run(ctx, []string{"stat", "-c", "%F", abs})
	if err != nil {
		return err
	}
	if stat.ExitCode != 0 {
		return errExec("download", stat)
	}
	if t := strings.TrimSpace(string(stat.Stdout)); t != "regular file" && t != "regular empty file" {
		return ErrNotFile
	}

	// stream the file contents straight to the writer as the site UID
	res, err := m.client.ExecStreamOut(ctx, sftp.GlobalContainerName, m.user(), []string{"cat", abs}, w)
	if err != nil {
		return err
	}
	if res.ExitCode != 0 {
		return errExec("download", res)
	}

	return nil
}
