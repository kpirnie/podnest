// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package backup

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"podnest/internal/logger"
)

// importFreeSpaceFloor is the amount of disk that must remain free on the
// extraction filesystem.
const importFreeSpaceFloor = 1 << 30

// extractBudget caps total bytes written across an entire archive.
type extractBudget struct {
	remaining int64
}

// budgetWriter charges every write against the archive's extraction budget
type budgetWriter struct {
	w io.Writer
	b *extractBudget
}

// newExtractBudget sizes the budget from the free space on destDir's filesystem
func newExtractBudget(destDir string) (*extractBudget, error) {
	var st syscall.Statfs_t
	if err := syscall.Statfs(destDir, &st); err != nil {
		return nil, fmt.Errorf("newExtractBudget: statfs %s: %w", destDir, err)
	}
	free := int64(st.Bavail) * int64(st.Bsize)
	allowance := free - importFreeSpaceFloor
	if allowance <= 0 {
		return nil, fmt.Errorf("insufficient disk space to extract: %d bytes free, %d required", free, int64(importFreeSpaceFloor))
	}
	return &extractBudget{remaining: allowance}, nil
}

// take draws n bytes from the budget, failing once the allowance is exhausted
func (b *extractBudget) take(n int64) error {
	if b.remaining < n {
		return fmt.Errorf("archive exceeds available disk space")
	}
	b.remaining -= n
	return nil
}

// Write implements io.Writer, refusing the write once the budget is exhausted
func (bw budgetWriter) Write(p []byte) (int, error) {
	if err := bw.b.take(int64(len(p))); err != nil {
		return 0, err
	}
	return bw.w.Write(p)
}

// emptyDir removes everything inside dir without removing dir itself
func emptyDir(dir string) error {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	for _, e := range entries {
		if err := os.RemoveAll(filepath.Join(dir, e.Name())); err != nil {
			return err
		}
	}
	return nil
}

// extractArchive dispatches to the correct extractor based on file extension.
// A failed extraction leaves nothing behind — partial output is removed before
// the error is returned.
func extractArchive(src, destDir string) error {
	budget, err := newExtractBudget(destDir)
	if err != nil {
		return fmt.Errorf("extractArchive: %w", err)
	}

	switch {
	case strings.HasSuffix(src, ".tar.gz"):
		err = extractTarGz(src, destDir, budget)
	case strings.HasSuffix(src, ".tar.xz"):
		err = extractTarXz(src, destDir, budget)
	case strings.HasSuffix(src, ".zip"):
		err = extractZip(src, destDir, budget)
	default:
		return fmt.Errorf("extractArchive: unsupported format: %s", filepath.Base(src))
	}

	if err != nil {
		if cleanErr := emptyDir(destDir); cleanErr != nil {
			logger.Error("extractArchive: cleanup of %s after failure: %v", destDir, cleanErr)
		}
		return err
	}
	return nil
}

// extractTarGz extracts a .tar.gz archive into destDir
func extractTarGz(src, destDir string, budget *extractBudget) error {

	// open the file and wrap in a gzip reader
	f, err := os.Open(src)
	if err != nil {
		return err
	}
	defer f.Close()

	// try to create a gzip reader; if it fails, the file may be a plain tar without gzip compression
	gr, err := gzip.NewReader(f)
	if err != nil {
		return fmt.Errorf("extractTarGz: gzip reader: %w", err)
	}
	defer gr.Close()

	// pass the gzip reader into the tar extractor
	return extractTar(tar.NewReader(gr), destDir, budget)
}

// extractTarXz extracts a .tar.xz archive into destDir via the xz binary
func extractTarXz(src, destDir string, budget *extractBudget) error {

	// bound the decompress so a malformed or oversized .tar.xz cannot hang the
	// restore indefinitely
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
	defer cancel()

	// decompress via xz CLI, pipe stdout into the tar reader
	xzCmd := exec.CommandContext(ctx, "xz", "-d", "-c", src)
	pr, err := xzCmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("extractTarXz: stdout pipe: %w", err)
	}

	// start the xz command to begin streaming decompressed data
	if err := xzCmd.Start(); err != nil {
		return fmt.Errorf("extractTarXz: start xz: %w", err)
	}

	// pass the xz stdout into the tar extractor; wait for xz to finish and capture any errors
	tarErr := extractTar(tar.NewReader(pr), destDir, budget)
	waitErr := xzCmd.Wait()
	if tarErr != nil {
		return tarErr
	}

	return waitErr
}

// safeFileMode normalizes a mode carried inside an archive. Archive-supplied
// modes are attacker-controlled input on the import path, so setuid, setgid and
// sticky are dropped and group/world write is never honored — the entry is
// reduced to executable-or-not, matching what a restored site actually needs.
func safeFileMode(m os.FileMode) os.FileMode {
	if m.Perm()&0o111 != 0 {
		return 0o755
	}
	return 0o644
}

// extractTar reads all entries from a tar.Reader into destDir, guarding
// against path traversal attacks
func extractTar(tr *tar.Reader, destDir string, budget *extractBudget) error {

	// iterate through each entry in the tar archive and write it to the destination directory
	for {

		// read the next header from the tar stream
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("extractTar: next: %w", err)
		}

		// guard against path traversal
		target := filepath.Join(destDir, filepath.Clean("/"+hdr.Name))
		if !strings.HasPrefix(target, destDir+string(os.PathSeparator)) && target != destDir {
			logger.Warn("extractTar: skipping unsafe path %s", hdr.Name)
			continue
		}

		// handle directories and regular files; skip other types like symlinks for safety
		switch hdr.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, 0755); err != nil {
				return fmt.Errorf("extractTar: mkdir %s: %w", hdr.Name, err)
			}
		case tar.TypeReg:
			if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
				return fmt.Errorf("extractTar: mkdir parent %s: %w", hdr.Name, err)
			}
			f, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, safeFileMode(hdr.FileInfo().Mode()))
			if err != nil {
				return fmt.Errorf("extractTar: create %s: %w", hdr.Name, err)
			}
			if _, err := io.Copy(budgetWriter{w: f, b: budget}, tr); err != nil {
				f.Close()
				return fmt.Errorf("extractTar: write %s: %w", hdr.Name, err)
			}
			f.Close()
		case tar.TypeSymlink, tar.TypeLink:
			// never recreate links from an archive — a crafted backup could point
			// one outside destDir; legitimate backups hold only dirs and reg files
			logger.Warn("extractTar: skipping link entry %q -> %q", hdr.Name, hdr.Linkname)
			continue
		default:
			logger.Warn("extractTar: skipping unsupported entry %q (type %d)", hdr.Name, hdr.Typeflag)
			continue
		}
	}
	return nil
}

// extractZip extracts a .zip archive into destDir, guarding against path traversal
func extractZip(src, destDir string, budget *extractBudget) error {

	// stat the file to get its size for zip.OpenReader
	fi, err := os.Stat(src)
	if err != nil {
		return fmt.Errorf("extractZip: stat: %w", err)
	}

	// open the file and create a zip reader
	f, err := os.Open(src)
	if err != nil {
		return fmt.Errorf("extractZip: open: %w", err)
	}
	defer f.Close()
	zr, err := zip.NewReader(f, fi.Size())
	if err != nil {
		return fmt.Errorf("extractZip: reader: %w", err)
	}

	// iterate through each file in the zip archive and write it to the destination directory
	for _, zf := range zr.File {
		target := filepath.Join(destDir, filepath.Clean("/"+zf.Name))
		if !strings.HasPrefix(target, destDir+string(os.PathSeparator)) && target != destDir {
			logger.Warn("extractZip: skipping unsafe path %s", zf.Name)
			continue
		}

		// skip unsupported file types like symlinks for safety; only handle directories and regular files
		if zf.FileInfo().IsDir() {
			os.MkdirAll(target, 0755)
			continue
		}

		// reject symlink entries — never materialise a link from an archive
		if zf.Mode()&os.ModeSymlink != 0 {
			logger.Warn("extractZip: skipping symlink entry %s", zf.Name)
			continue
		}

		// ensure the parent directory exists before creating the file
		if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
			return fmt.Errorf("extractZip: mkdir %s: %w", zf.Name, err)
		}

		// open the zip file entry and copy its contents to the target file
		rc, err := zf.Open()
		if err != nil {
			return fmt.Errorf("extractZip: open entry %s: %w", zf.Name, err)
		}
		out, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, safeFileMode(zf.Mode()))
		if err != nil {
			rc.Close()
			return fmt.Errorf("extractZip: create %s: %w", zf.Name, err)
		}
		_, copyErr := io.Copy(budgetWriter{w: out, b: budget}, rc)
		rc.Close()
		out.Close()
		if copyErr != nil {
			return fmt.Errorf("extractZip: write %s: %w", zf.Name, copyErr)
		}
	}
	return nil
}
