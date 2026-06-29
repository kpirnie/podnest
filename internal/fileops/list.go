// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package fileops

import (
	"context"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"podnest/internal/sftp"
)

// Entry describes a single directory entry returned by List.
type Entry struct {
	Name    string    `json:"name"`
	Type    string    `json:"type"` // "f" file, "d" dir, "l" symlink (find's %y)
	Size    int64     `json:"size"`
	Mode    string    `json:"mode"` // octal permission bits, e.g. "644", "2775"
	ModTime time.Time `json:"mod_time"`
	IsDir   bool      `json:"is_dir"`
}

// List returns the contents of the directory at the given site-relative path,
// including dotfiles. Symlinks are reported as type "l" but not followed during
// listing — escapes are caught when the target is later opened. Names are
// gathered with "find -print0" (NUL-delimited, so spaces/newlines in names are
// safe) and each is described with a single "stat -c" call, since busybox find
// has no -printf.
func (m *Manager) List(ctx context.Context, rel string) ([]Entry, error) {

	// make sure the SFTP container is up before exec'ing into it
	if err := m.ensure(ctx); err != nil {
		return nil, err
	}

	// resolve and confine the target directory, then verify no symlink escape
	abs, err := m.confined(rel)
	if err != nil {
		return nil, err
	}
	if err := m.canonical(ctx, abs); err != nil {
		return nil, err
	}

	// collect entry names one level deep, NUL-terminated to survive odd filenames
	names, err := m.run(ctx, []string{"find", abs, "-mindepth", "1", "-maxdepth", "1", "-print0"})
	if err != nil {
		return nil, err
	}
	if names.ExitCode != 0 {
		return nil, errExec("list", names)
	}

	// describe every entry in one stat call: "type<TAB>octal-mode<TAB>size<TAB>epoch<TAB>path"
	// %F gives a human type we map to a code; %s size; %Y mtime epoch; %n the path.
	var paths []string
	for _, p := range strings.Split(string(names.Stdout), "\x00") {
		if p != "" {
			paths = append(paths, p)
		}
	}
	if len(paths) == 0 {
		return nil, nil
	}

	statArgs := append([]string{"stat", "-c", "%F\t%a\t%s\t%Y\t%n"}, paths...)
	st, err := m.run(ctx, statArgs)
	if err != nil {
		return nil, err
	}
	if st.ExitCode != 0 {
		return nil, errExec("list", st)
	}

	// parse one line per entry
	var entries []Entry
	for _, line := range strings.Split(strings.TrimRight(string(st.Stdout), "\n"), "\n") {
		if line == "" {
			continue
		}

		// path is the final field; cap the split so tabs in a name cannot shift columns
		parts := strings.SplitN(line, "\t", 5)
		if len(parts) != 5 {
			continue
		}

		size, _ := strconv.ParseInt(parts[2], 10, 64)
		sec, _ := strconv.ParseInt(parts[3], 10, 64)
		typ := statTypeCode(parts[0])

		entries = append(entries, Entry{
			Name:    filepath.Base(parts[4]),
			Type:    typ,
			Size:    size,
			Mode:    parts[1],
			ModTime: time.Unix(sec, 0),
			IsDir:   typ == "d",
		})
	}

	// directories first, then case-insensitive name; the front-end may re-sort
	sort.SliceStable(entries, func(i, j int) bool {
		if entries[i].IsDir != entries[j].IsDir {
			return entries[i].IsDir
		}
		return strings.ToLower(entries[i].Name) < strings.ToLower(entries[j].Name)
	})

	return entries, nil
}

// statTypeCode maps stat's %F human description to find's single-letter type code.
func statTypeCode(human string) string {
	switch human {
	case "directory":
		return "d"
	case "symbolic link":
		return "l"
	default:
		return "f"
	}
}

// guard against unused import when this is the only operation file present
var _ = sftp.GlobalContainerName
