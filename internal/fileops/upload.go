// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package fileops

import (
	"context"
	"errors"
	"io"
)

// maxUploadSize caps a single uploaded file. Uploads may be binary and larger
// than the editor limit, so this is independent of maxEditSize.
const maxUploadSize = 512 << 20 // 512 MiB

// Upload streams an incoming file to the given site-relative destination path,
// owned by the site UID. The content is piped to "cp /dev/stdin {path}" and
// never buffered server-side, so memory use stays flat regardless of file size.
// An existing destination is replaced in place (re-upload is an expected action);
// the parent directory must already exist. Streams beyond maxUploadSize are
// aborted mid-transfer.
func (m *Manager) Upload(ctx context.Context, rel string, r io.Reader) error {

	// make sure the SFTP container is up before exec'ing into it
	if err := m.ensure(ctx); err != nil {
		return err
	}

	// resolve and confine the destination, then verify no symlink escape
	abs, err := m.confined(rel)
	if err != nil {
		return err
	}
	if err := m.canonical(ctx, abs); err != nil {
		return err
	}

	// stream the body through a size-capped reader straight to the file; the cap
	// surfaces as a copy error that aborts the partially written upload
	res, err := m.runStream(ctx, []string{"cp", "/dev/stdin", abs}, &cappedReader{r: r, left: maxUploadSize})
	if err != nil {
		return err
	}
	if res.ExitCode != 0 {
		return errExec("upload", res)
	}

	return nil
}

// cappedReader wraps a reader and returns ErrTooLarge once more than the allowed
// number of bytes have been read, halting the underlying stream copy.
type cappedReader struct {
	r    io.Reader
	left int64
}

// Read passes through to the wrapped reader until the byte budget is exhausted.
func (c *cappedReader) Read(p []byte) (int, error) {
	if c.left < 0 {
		return 0, ErrTooLarge
	}

	// allow one extra byte so an exactly-at-limit file is accepted while the next
	// read past the limit trips the guard
	if int64(len(p)) > c.left+1 {
		p = p[:c.left+1]
	}
	n, err := c.r.Read(p)
	c.left -= int64(n)
	if c.left < 0 {
		return n, ErrTooLarge
	}
	return n, err
}

// ensure the errors import stays used even as rails evolve
var _ = errors.New
