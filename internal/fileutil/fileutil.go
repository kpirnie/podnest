// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package fileutil

import (
	"bufio"
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"syscall"

	"podnest/internal/logger"
)

// ErrPathEscape is returned when a name resolves outside its base directory.
var ErrPathEscape = errors.New("path escapes base directory")

// SiteDir joins name onto base and returns the result only if it lands strictly
// inside base. A name of "." or ".." cleans back to base itself, which would
// hand the caller the entire sites tree, so equality with base is rejected too.
func SiteDir(base, name string) (string, error) {
	dir := filepath.Join(base, filepath.Clean("/"+name))
	if !strings.HasPrefix(dir, base+"/") {
		logger.Warn("fileutil: rejected site directory %q under %q", name, base)
		return "", ErrPathEscape
	}
	return dir, nil
}

// SafeFileMode normalizes a mode carried inside an archive. Archive-supplied
// modes are attacker-controlled input, so setuid, setgid and sticky are dropped
// and group/world write is never honored — the entry is reduced to
// executable-or-not, matching what an extracted tree actually needs.
func SafeFileMode(m os.FileMode) os.FileMode {
	if m.Perm()&0o111 != 0 {
		return 0o755
	}
	return 0o644
}

// WriteFile writes content to name inside dir. The write is confined to dir: a
// path component that is a symlink leading outside it is refused, and a symlink
// sitting at name itself is replaced with a regular file. Site subdirectories
// are writable by the site owner, so a planted link must never redirect a
// privileged write onto another site or the host.
func WriteFile(dir, name, content string, perm os.FileMode) error {
	root, err := os.OpenRoot(dir)
	if err != nil {
		logger.Error("failed to open %s for writing %s: %v", dir, name, err)
		return err
	}
	defer root.Close()

	if fi, err := root.Lstat(name); err == nil && fi.Mode()&os.ModeSymlink != 0 {
		if err := root.Remove(name); err != nil {
			logger.Error("failed to remove symlink %s/%s: %v", dir, name, err)
			return err
		}
	}

	if err := root.WriteFile(name, []byte(content), perm); err != nil {
		logger.Error("failed to write file %s/%s: %v", dir, name, err)
		return err
	}
	logger.Debug("wrote file %s/%s", dir, name)
	return nil
}

// Remove deletes name inside dir without following a symlinked path component
// out of dir. A missing file is not an error.
func Remove(dir, name string) error {
	root, err := os.OpenRoot(dir)
	if err != nil {
		return err
	}
	defer root.Close()

	if err := root.Remove(name); err != nil && !errors.Is(err, fs.ErrNotExist) {
		return err
	}
	return nil
}

// ReadEnvValue reads a KEY=VALUE .env file and returns the value for the given key.
func ReadEnvValue(base, name, key string) (string, error) {
	dir, err := SiteDir(base, name)
	if err != nil {
		return "", err
	}
	path := dir + "/.env"
	f, err := os.Open(path)
	if err != nil {
		logger.Error("failed to open env file %s: %v", path, err)
		return "", err
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	prefix := key + "="
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, prefix) {
			logger.Debug("found key '%s' in %s", key, path)
			return strings.TrimPrefix(line, prefix), nil
		}
	}

	logger.Debug("key '%s' not found in %s", key, path)
	return "", scanner.Err()
}

// ChownTree recursively forces ownership of root and everything beneath it to
// uid:uid, skipping any entry already correct so the common (no-drift) case costs
// only stat calls, not chowns. Symlinks are changed with Lchown so a stray link
// is never followed out of the tree. Only a foreign-uid writer (restore, clone,
// import) leaves drift behind, so this is called at the completion of those
// operations rather than on a hot path.
func ChownTree(root string, uid int) {
	filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil // unreadable entry — skip, don't abort the walk
		}
		info, err := d.Info()
		if err != nil {
			return nil
		}
		st, ok := info.Sys().(*syscall.Stat_t)
		if ok && int(st.Uid) == uid && int(st.Gid) == uid {
			return nil // already correct — no syscall needed
		}
		if err := os.Lchown(path, uid, uid); err != nil {
			logger.Debug("ChownTree: %s: %v", path, err)
		}
		return nil
	})
}
