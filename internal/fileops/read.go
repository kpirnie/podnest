// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package fileops

import (
	"bytes"
	"context"
	"errors"
	"strconv"
	"strings"
)

// maxEditSize caps how large a file may be to load into the in-browser editor.
// Larger files are downloaded instead of edited.
const maxEditSize = 5 << 20 // 5 MiB

// ErrTooLarge is returned when a file exceeds maxEditSize for editor reads.
var ErrTooLarge = errors.New("file too large to edit")

// ErrBinary is returned when a file's contents are binary and cannot be edited as text.
var ErrBinary = errors.New("binary file cannot be edited")

// ErrNotFile is returned when a path expected to be a regular file is a directory or other type.
var ErrNotFile = errors.New("not a regular file")

// FileContent holds the contents and metadata of a file read for editing.
type FileContent struct {
	Content string `json:"content"`
	Size    int64  `json:"size"`
	Mode    string `json:"mode"` // octal permission bits, e.g. "644"
}

// Read returns the contents of the file at the given site-relative path for the
// editor. It rejects directories, files larger than maxEditSize, and binary
// content (detected by an embedded NUL byte). Use Download for binaries or large
// files. Content is buffered in memory, bounded by the size guard.
func (m *Manager) Read(ctx context.Context, rel string) (*FileContent, error) {

	// make sure the SFTP container is up before exec'ing into it
	if err := m.ensure(ctx); err != nil {
		return nil, err
	}

	// resolve and confine the target, then verify no symlink escape
	abs, err := m.confined(rel)
	if err != nil {
		return nil, err
	}
	if err := m.canonical(ctx, abs); err != nil {
		return nil, err
	}

	// stat first to enforce the type and size guards before reading any bytes
	stat, err := m.run(ctx, []string{"stat", "-c", "%F\t%s\t%a", abs})
	if err != nil {
		return nil, err
	}
	if stat.ExitCode != 0 {
		return nil, errExec("read", stat)
	}

	// parse "type<TAB>size<TAB>octal-mode"
	parts := strings.SplitN(strings.TrimSpace(string(stat.Stdout)), "\t", 3)
	if len(parts) != 3 {
		return nil, errExec("read", stat)
	}
	if parts[0] != "regular file" && parts[0] != "regular empty file" {
		return nil, ErrNotFile
	}
	size, _ := strconv.ParseInt(parts[1], 10, 64)
	if size > maxEditSize {
		return nil, ErrTooLarge
	}

	// read the file contents
	res, err := m.run(ctx, []string{"cat", abs})
	if err != nil {
		return nil, err
	}
	if res.ExitCode != 0 {
		return nil, errExec("read", res)
	}

	// reject binary content — a NUL byte is a reliable text/binary discriminator
	if bytes.IndexByte(res.Stdout, 0) >= 0 {
		return nil, ErrBinary
	}

	return &FileContent{
		Content: string(res.Stdout),
		Size:    size,
		Mode:    parts[2],
	}, nil
}
