package proxy

import (
	"archive/tar"
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"podnest/internal/logger"
)

const (
	// crsReleasesAPI is the GitHub API endpoint for the latest CRS release
	crsReleasesAPI = "https://api.github.com/repos/coreruleset/coreruleset/releases/latest"

	// crsUserAgent identifies PodNest to the GitHub API
	crsUserAgent = "podnest-crs-updater/1.0"
)

// CRSDir returns the path where downloaded CRS rule files are stored
func CRSDir(appPath string) string {
	return filepath.Join(appPath, "waf", "crs")
}

// UpdateCRS downloads the latest OWASP CRS release from GitHub and extracts
// the rule files to {appPath}/waf/crs/. Returns nil if already up to date.
func UpdateCRS(appPath string) error {
	crsDir := CRSDir(appPath)

	// fetch the latest release tag and tarball URL from GitHub
	tag, tarURL, err := fetchLatestCRSRelease()
	if err != nil {
		return fmt.Errorf("crs: fetch release info: %w", err)
	}

	// skip the download if this version is already installed
	versionFile := filepath.Join(crsDir, ".version")
	if current, err := os.ReadFile(versionFile); err == nil && strings.TrimSpace(string(current)) == tag {
		logger.Info("crs: already up to date (%s)", tag)
		return nil
	}

	logger.Info("crs: downloading %s from %s", tag, tarURL)

	resp, err := crsHTTPGet(tarURL)
	if err != nil {
		return fmt.Errorf("crs: download: %w", err)
	}
	defer resp.Body.Close()

	// extract the tarball into a temporary directory
	tmpDir, err := os.MkdirTemp("", "crs-*")
	if err != nil {
		return fmt.Errorf("crs: temp dir: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	if err := extractCRSTar(resp.Body, tmpDir); err != nil {
		return fmt.Errorf("crs: extract: %w", err)
	}

	// GitHub tarballs unpack into a single root directory with an unpredictable name
	entries, err := os.ReadDir(tmpDir)
	if err != nil || len(entries) == 0 {
		return fmt.Errorf("crs: extract produced no output")
	}
	srcDir := filepath.Join(tmpDir, entries[0].Name())

	// write to a staging directory then atomically rename to avoid serving
	// a partially-updated rule set during the copy
	stagingDir := crsDir + ".staging"
	_ = os.RemoveAll(stagingDir)
	if err := os.MkdirAll(stagingDir, 0750); err != nil {
		return fmt.Errorf("crs: staging dir: %w", err)
	}

	// copy the CRS setup config
	if err := crsCopyFile(
		filepath.Join(srcDir, "crs-setup.conf.example"),
		filepath.Join(stagingDir, "crs-setup.conf.example"),
	); err != nil {
		return fmt.Errorf("crs: copy setup conf: %w", err)
	}

	// copy the rule files — CRS release tarballs use a rules/ directory
	rulesDir := filepath.Join(stagingDir, "rules")
	if err := os.MkdirAll(rulesDir, 0750); err != nil {
		return fmt.Errorf("crs: rules dir: %w", err)
	}
	if err := crsCopyDir(filepath.Join(srcDir, "rules"), rulesDir, ".conf"); err != nil {
		return fmt.Errorf("crs: copy rules: %w", err)
	}

	// record the installed version for update-check on the next run
	_ = os.WriteFile(filepath.Join(stagingDir, ".version"), []byte(tag), 0640)

	// atomic swap: remove current install and rename staging into place
	_ = os.RemoveAll(crsDir)
	if err := os.Rename(stagingDir, crsDir); err != nil {
		return fmt.Errorf("crs: install: %w", err)
	}

	logger.Info("crs: updated to %s", tag)
	return nil
}

// fetchLatestCRSRelease queries the GitHub API and returns the tag name and
// tarball download URL for the latest CRS release.
func fetchLatestCRSRelease() (tag, tarURL string, err error) {
	resp, err := crsHTTPGet(crsReleasesAPI)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	var rel struct {
		TagName    string `json:"tag_name"`
		TarballURL string `json:"tarball_url"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&rel); err != nil {
		return "", "", fmt.Errorf("decode: %w", err)
	}
	if rel.TagName == "" || rel.TarballURL == "" {
		return "", "", fmt.Errorf("empty tag or tarball URL in GitHub response")
	}
	return rel.TagName, rel.TarballURL, nil
}

// extractCRSTar extracts a gzip-compressed tar stream into destDir,
// rejecting any paths that would escape the destination.
func extractCRSTar(r io.Reader, destDir string) error {
	gz, err := gzip.NewReader(r)
	if err != nil {
		return err
	}
	defer gz.Close()

	tr := tar.NewReader(gz)
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}

		// reject path traversal attempts
		target := filepath.Join(destDir, filepath.Clean("/"+hdr.Name))
		if !strings.HasPrefix(target, filepath.Clean(destDir)+string(os.PathSeparator)) {
			logger.Warn("crs: skipping suspicious tar entry: %s", hdr.Name)
			continue
		}

		switch hdr.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, 0750); err != nil {
				return err
			}
		case tar.TypeReg:
			if err := os.MkdirAll(filepath.Dir(target), 0750); err != nil {
				return err
			}
			f, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0640)
			if err != nil {
				return err
			}
			if _, err := io.Copy(f, tr); err != nil {
				f.Close()
				return err
			}
			f.Close()
		}
	}
	return nil
}

// crsCopyFile copies a single file from src to dst
func crsCopyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0640)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}

// crsCopyDir copies all files with the given suffix from srcDir into dstDir
func crsCopyDir(srcDir, dstDir, suffix string) error {
	entries, err := os.ReadDir(srcDir)
	if err != nil {
		return err
	}
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), suffix) {
			continue
		}
		if err := crsCopyFile(
			filepath.Join(srcDir, e.Name()),
			filepath.Join(dstDir, e.Name()),
		); err != nil {
			return err
		}
	}
	return nil
}

// crsHTTPGet performs a GET with a 120 s timeout and the PodNest user-agent
func crsHTTPGet(url string) (*http.Response, error) {
	client := &http.Client{Timeout: 120 * time.Second}
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", crsUserAgent)
	req.Header.Set("Accept", "application/vnd.github+json")
	return client.Do(req)
}
