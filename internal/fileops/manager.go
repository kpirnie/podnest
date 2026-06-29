// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package fileops

import (
	"context"
	"errors"
	"io"
	"path/filepath"
	"strconv"
	"strings"

	"podnest/internal/logger"
	"podnest/internal/podman"
	"podnest/internal/sftp"
)

// ErrPathEscape is returned when a requested path resolves outside the site's html root.
var ErrPathEscape = errors.New("path escapes site root")

// Manager performs file operations against a single site's html directory by
// exec'ing into the global SFTP container as the site's UID. Running as the
// owning UID means created files carry correct ownership with no chown, and the
// panel can never touch anything the site user itself could not.
type Manager struct {
	client   *podman.Client
	sftp     *sftp.Manager
	siteName string
	uid      int
}

// New returns a file operations manager scoped to the given site.
func New(client *podman.Client, sftpMgr *sftp.Manager, siteName string, siteID int64) *Manager {
	return &Manager{
		client:   client,
		sftp:     sftpMgr,
		siteName: siteName,
		uid:      sftp.UIDForSite(siteID),
	}
}

// htmlRoot returns the in-container absolute path of the site's html directory.
func (m *Manager) htmlRoot() string {
	return "/home/" + m.siteName + "/html"
}

// user returns the numeric "uid:gid" string the exec runs as. The SFTP AddUser
// flow creates the group with the same id as the UID, so uid == gid.
func (m *Manager) user() string {
	return strconv.Itoa(m.uid) + ":" + strconv.Itoa(m.uid)
}

// ensure guarantees the SFTP container is running before any operation, since
// all file work is performed via exec into it.
func (m *Manager) ensure(ctx context.Context) error {
	if err := m.sftp.Ensure(ctx); err != nil {
		logger.Error("fileops: SFTP container unavailable for site %s: %v", m.siteName, err)
		return err
	}
	return nil
}

// confined resolves a user-supplied relative path against the html root and
// returns the absolute in-container path. The leading-slash + Clean trick clamps
// any ".." segments to the root, so lexical traversal is impossible. Symlink
// escapes are caught separately by canonical at operation time.
func (m *Manager) confined(rel string) (string, error) {
	root := m.htmlRoot()
	abs := filepath.Join(root, filepath.Clean("/"+rel))
	if abs != root && !strings.HasPrefix(abs, root+"/") {
		logger.Warn("fileops: rejected path %q for site %s (escapes root)", rel, m.siteName)
		return "", ErrPathEscape
	}
	return abs, nil
}

// canonical resolves symlinks in abs inside the container (as the site UID) and
// verifies the real path is still within the html root. Catches symlink-based
// escapes that the lexical confined check cannot see.
func (m *Manager) canonical(ctx context.Context, abs string) error {
	real, err := m.resolveReal(ctx, abs)
	if err != nil {
		return err
	}
	root := m.htmlRoot()
	if real != root && !strings.HasPrefix(real, root+"/") {
		logger.Warn("fileops: rejected path %q for site %s (symlink escapes root)", abs, m.siteName)
		return ErrPathEscape
	}
	return nil
}

// resolveReal returns the physical path of abs, following symlinks. It resolves
// the parent chain via the shell builtins "cd ... && pwd -P" (no external binary,
// so it works on Alpine busybox where realpath lacks -m) and follows a symlinked
// leaf with a plain readlink, looping to handle chained links. Paths are passed
// as shell positional parameters, never interpolated into the script, so no
// command injection is possible. A non-existent leaf resolves to its real parent
// plus the leaf name, which is exactly what new-file/mkdir/destination targets
// need. A missing parent surfaces as a not-found error.
func (m *Manager) resolveReal(ctx context.Context, abs string) (string, error) {

	// follow at most a sane number of symlink hops before giving up
	cur := abs
	for i := 0; i < 32; i++ {
		dir := filepath.Dir(cur)
		base := filepath.Base(cur)

		// resolve the parent directory's physical path; cd fails if it is missing
		res, err := m.run(ctx, []string{"sh", "-c", `cd -- "$1" && pwd -P`, "sh", dir})
		if err != nil {
			return "", err
		}
		if res.ExitCode != 0 {
			return "", errors.New("No such file or directory")
		}
		realDir := strings.TrimSpace(string(res.Stdout))

		// rebuild the candidate path under the resolved parent
		full := realDir
		if base != "/" && base != "." {
			full = realDir + "/" + base
		}

		// if the leaf is not a symlink (or does not exist), this is the real path
		link, err := m.run(ctx, []string{"readlink", full})
		if err != nil {
			return "", err
		}
		if link.ExitCode != 0 {
			return full, nil
		}

		// follow the link target and resolve again, relative to the real parent
		target := strings.TrimSpace(string(link.Stdout))
		if filepath.IsAbs(target) {
			cur = filepath.Clean(target)
		} else {
			cur = filepath.Clean(realDir + "/" + target)
		}
	}

	return "", errors.New("too many levels of symbolic links")
}

// run executes an argv command in the SFTP container as the site UID and returns
// the captured result. Every file operation funnels through here.
func (m *Manager) run(ctx context.Context, cmd []string) (*podman.ExecResult, error) {
	return m.client.ExecCapture(ctx, sftp.GlobalContainerName, m.user(), cmd)
}

// runStream executes an argv command in the SFTP container as the site UID,
// piping stdin from r. Used for write and upload (e.g. "tee {path}").
func (m *Manager) runStream(ctx context.Context, cmd []string, r io.Reader) (*podman.ExecResult, error) {
	return m.client.ExecStream(ctx, sftp.GlobalContainerName, m.user(), cmd, r)
}

// errExec builds an error from a non-zero exec result, preferring stderr for the message.
func errExec(op string, res *podman.ExecResult) error {
	msg := strings.TrimSpace(string(res.Stderr))
	if msg == "" {
		msg = strings.TrimSpace(string(res.Stdout))
	}
	if msg == "" {
		msg = "exit " + strconv.Itoa(res.ExitCode)
	}
	return errors.New(op + ": " + msg)
}
