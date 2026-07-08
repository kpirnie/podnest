// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package proxy

import (
	"compress/gzip"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"podnest/internal/logger"

	"github.com/oschwald/maxminddb-golang"
)

const (
	// geoDBURLPattern is the DB-IP Lite country database download URL;
	// the %s is the release month in YYYY-MM format (published monthly)
	geoDBURLPattern = "https://download.db-ip.com/free/dbip-country-lite-%s.mmdb.gz"

	// geoDBFilename is the on-disk name of the active country database
	geoDBFilename = "dbip-country-lite.mmdb"
)

// geoHTTPClient is a shared HTTP client for geo database downloads
var geoHTTPClient = &http.Client{Timeout: 120 * time.Second}

// geoRecord is the minimal decode target for a country lookup — restricting
// the struct to just the ISO code keeps the mmdb decode allocation-free
type geoRecord struct {
	Country struct {
		ISOCode string `maxminddb:"iso_code"`
	} `maxminddb:"country"`
}

// GeoDir returns the path where the downloaded geo database is stored
func GeoDir(appPath string) string {
	return filepath.Join(appPath, "geoip")
}

// UpdateGeoDB downloads the latest DB-IP Lite country database to
// {appPath}/geoip/. DB-IP publishes monthly; the current month is tried
// first, falling back to the previous month if it is not yet available.
// Returns nil if the installed version is already current.
func UpdateGeoDB(appPath string) error {
	geoDir := GeoDir(appPath)

	// candidate release months — current first, previous as fallback
	now := time.Now().UTC()
	months := []string{
		now.Format("2006-01"),
		now.AddDate(0, -1, 0).Format("2006-01"),
	}

	// skip the download entirely if either candidate is already installed
	versionFile := filepath.Join(geoDir, ".version")
	if current, err := os.ReadFile(versionFile); err == nil {
		v := strings.TrimSpace(string(current))
		for _, m := range months {
			if v == m {
				logger.Debug("geoip: already up to date (%s)", v)
				return nil
			}
		}
	}

	// ensure the target directory exists
	if err := os.MkdirAll(geoDir, 0750); err != nil {
		return fmt.Errorf("geoip: mkdir %s: %w", geoDir, err)
	}

	// try each candidate month until one downloads successfully
	var lastErr error
	for _, month := range months {
		url := fmt.Sprintf(geoDBURLPattern, month)
		if err := downloadGeoDB(url, geoDir); err != nil {
			lastErr = err
			logger.Debug("geoip: %s not available: %v", month, err)
			continue
		}

		// record the installed version for future skip checks
		if err := os.WriteFile(versionFile, []byte(month), 0640); err != nil {
			logger.Warn("geoip: version file write failed: %v", err)
		}
		logger.Debug("geoip: updated to %s", month)
		return nil
	}

	return fmt.Errorf("geoip: no release available: %w", lastErr)
}

// downloadGeoDB fetches a gzipped mmdb from url, decompresses it to a
// temporary file in geoDir, and atomically renames it into place so the
// active database file is never observed in a partially written state.
func downloadGeoDB(url, geoDir string) error {
	resp, err := geoHTTPClient.Get(url)
	if err != nil {
		return fmt.Errorf("download: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download: unexpected status %s", resp.Status)
	}

	// decompress the gzip stream
	gz, err := gzip.NewReader(resp.Body)
	if err != nil {
		return fmt.Errorf("gunzip: %w", err)
	}
	defer gz.Close()

	// write to a temp file in the same directory so the rename is atomic
	tmp, err := os.CreateTemp(geoDir, ".geoip-*")
	if err != nil {
		return fmt.Errorf("temp file: %w", err)
	}
	tmpPath := tmp.Name()

	if _, err := io.Copy(tmp, gz); err != nil {
		tmp.Close()
		os.Remove(tmpPath)
		return fmt.Errorf("write: %w", err)
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("close: %w", err)
	}

	// atomic swap into place
	final := filepath.Join(geoDir, geoDBFilename)
	if err := os.Rename(tmpPath, final); err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("rename: %w", err)
	}
	return nil
}

// LoadGeoDB reads the on-disk country database fully into memory and swaps
// it into the proxy's atomic holder. Loading via FromBytes rather than Open
// avoids mmap page-fault jitter on the request hot path. Any previously
// loaded reader is left for the GC once all in-flight lookups complete.
func (p *Proxy) LoadGeoDB() error {
	path := filepath.Join(GeoDir(p.appPath), geoDBFilename)

	// read the whole database into memory
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("geoip: read %s: %w", path, err)
	}

	reader, err := maxminddb.FromBytes(data)
	if err != nil {
		return fmt.Errorf("geoip: parse %s: %w", path, err)
	}

	// swap atomically — the hot path nil-checks the pointer, so lookups
	// simply pass through until the first successful load completes
	p.geoDB.Store(reader)
	logger.Debug("geoip: database loaded (%d bytes)", len(data))
	return nil
}

// countryCode resolves the ISO 3166-1 alpha-2 country code for ip.
// Returns "" when the database is not yet loaded, the IP is private or
// unallocated, or the lookup fails — callers treat "" as unknown, which
// enforcement handles as default-allow.
func (p *Proxy) countryCode(ip net.IP) string {
	// nil-check the holder — lookups pass through until the first load
	reader := p.geoDB.Load()
	if reader == nil || ip == nil {
		return ""
	}

	// decode only the country ISO code from the record
	var rec geoRecord
	if err := reader.Lookup(ip, &rec); err != nil {
		return ""
	}
	return rec.Country.ISOCode
}
