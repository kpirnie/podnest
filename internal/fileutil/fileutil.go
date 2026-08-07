// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package fileutil

import (
	"bufio"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"syscall"

	"podnest/internal/logger"
)

// WriteFile writes content to path with the given file permissions.
func WriteFile(path, content string, perm os.FileMode) error {
	if err := os.WriteFile(path, []byte(content), perm); err != nil {
		logger.Error("failed to write file %s: %v", path, err)
		return err
	}
	logger.Debug("wrote file %s", path)
	return nil
}

// ReadEnvValue reads a KEY=VALUE .env file and returns the value for the given key.
func ReadEnvValue(path, key string) (string, error) {
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
