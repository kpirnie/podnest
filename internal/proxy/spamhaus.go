// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package proxy

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/netip"
	"os"
	"path/filepath"
	"time"

	"podnest/internal/logger"
)

const (
	dropV4URL   = "https://www.spamhaus.org/drop/drop_v4.json"
	dropV6URL   = "https://www.spamhaus.org/drop/drop_v6.json"
	dropASNURL  = "https://www.spamhaus.org/drop/asndrop.json"
	dropV4File  = "drop_v4.json"
	dropV6File  = "drop_v6.json"
	dropASNFile = "asndrop.json"

	dropUserAgent = "podnest-drop-updater/1.0"

	// dropMaxBytes caps a single list download — the largest DROP list is
	// well under a megabyte, so anything beyond this is a malformed or
	// hostile response and must not be read into memory
	dropMaxBytes = 16 << 20

	// dropCacheMaxAge is how long a cached list is considered current. Spamhaus
	// permits one fetch per list per day, so a fresher file is never re-fetched.
	dropCacheMaxAge = 24 * time.Hour

	// dropBlockReason is the access-log attribution token for feed hits,
	// keeping them separable from manually configured rule blocks
	dropBlockReason = "spamhaus-drop"
)

// dropHTTPClient is a shared HTTP client for all Spamhaus fetches.
var dropHTTPClient = &http.Client{Timeout: 60 * time.Second}

// dropRecord is a single JSON-lines entry from any DROP list. The final line
// of every list is a metadata record carrying a type field and no cidr or asn;
// it is skipped rather than treated as data.
type dropRecord struct {
	CIDR string `json:"cidr"`
	ASN  uint32 `json:"asn"`
	Type string `json:"type"`
}

// dropFeed is the in-memory Spamhaus DROP set. It is built complete and
// swapped in as a whole — never mutated under readers on the request path.
type dropFeed struct {
	cidrs ipTable
	asns  map[uint32]struct{}
}

// SpamhausDir returns the path where the cached Spamhaus DROP lists are stored.
func SpamhausDir(appPath string) string {
	return filepath.Join(appPath, "spamhaus")
}

// LoadSpamhausDrop builds the in-memory feed from the cached lists on disk and
// swaps it in. Missing, stale, or unreadable files leave the corresponding
// list empty; the caller fetches and reloads in that case. Reports whether
// every list was present and within dropCacheMaxAge.
func (p *Proxy) LoadSpamhausDrop() bool {
	dir := SpamhausDir(p.appPath)

	fresh := true
	read := func(filename string) []byte {
		path := filepath.Join(dir, filename)

		fi, err := os.Stat(path)
		if err != nil {
			logger.Debug("drop: %s not cached", filename)
			fresh = false
			return nil
		}
		if time.Since(fi.ModTime()) > dropCacheMaxAge {
			logger.Debug("drop: %s is stale", filename)
			fresh = false
		}

		data, err := os.ReadFile(path)
		if err != nil {
			logger.Warn("drop: read %s: %v", filename, err)
			fresh = false
			return nil
		}
		return data
	}

	feed := buildDropFeed(read(dropV4File), read(dropV6File), read(dropASNFile))

	// a corrupt file parses to nothing — force a refetch rather than running
	// with a partial block list
	if feed.empty() {
		fresh = false
	}

	p.swapDropFeed(feed)
	return fresh
}

// fetchDropList downloads a single DROP list into dir, validating the payload
// by parsing it before anything is written. A 304 response means the cached
// copy is still current and is left untouched. Spamhaus permits one fetch per
// list per day and firewalls abusers, so conditional headers are mandatory.
func fetchDropList(url, dir, filename string, parse func([]byte) error) error {
	final := filepath.Join(dir, filename)

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return fmt.Errorf("drop: request %s: %w", filename, err)
	}
	req.Header.Set("User-Agent", dropUserAgent)

	if tag, err := os.ReadFile(final + ".etag"); err == nil && len(tag) > 0 {
		req.Header.Set("If-None-Match", string(bytes.TrimSpace(tag)))
	}
	if fi, err := os.Stat(final); err == nil {
		req.Header.Set("If-Modified-Since", fi.ModTime().UTC().Format(http.TimeFormat))
	}

	resp, err := dropHTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("drop: fetch %s: %w", filename, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotModified {
		logger.Debug("drop: %s not modified", filename)
		return nil
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("drop: fetch %s: unexpected status %s", filename, resp.Status)
	}

	data, err := io.ReadAll(io.LimitReader(resp.Body, dropMaxBytes))
	if err != nil {
		return fmt.Errorf("drop: read %s: %w", filename, err)
	}

	// never overwrite a good cached list with a payload we cannot parse
	if err := parse(data); err != nil {
		return fmt.Errorf("drop: validate %s: %w", filename, err)
	}

	if err := writeDropFile(dir, filename, data); err != nil {
		return err
	}

	if tag := resp.Header.Get("ETag"); tag != "" {
		if err := os.WriteFile(final+".etag", []byte(tag), 0640); err != nil {
			logger.Warn("drop: etag write failed for %s: %v", filename, err)
		}
	}

	logger.Debug("drop: updated %s (%d bytes)", filename, len(data))
	return nil
}

// writeDropFile writes a list payload to a temp file in the same directory and
// renames it into place so the cached list is never observed half-written.
func writeDropFile(dir, filename string, data []byte) error {
	if err := os.MkdirAll(dir, 0750); err != nil {
		return fmt.Errorf("drop: dir: %w", err)
	}

	tmp, err := os.CreateTemp(dir, ".drop-*")
	if err != nil {
		return fmt.Errorf("drop: temp file: %w", err)
	}
	tmpPath := tmp.Name()

	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		os.Remove(tmpPath)
		return fmt.Errorf("drop: write: %w", err)
	}
	if err := tmp.Chmod(0640); err != nil {
		tmp.Close()
		os.Remove(tmpPath)
		return fmt.Errorf("drop: chmod: %w", err)
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("drop: close: %w", err)
	}

	if err := os.Rename(tmpPath, filepath.Join(dir, filename)); err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("drop: rename: %w", err)
	}
	return nil
}

// scanDropRecords walks a JSON-lines DROP payload, invoking fn for every data
// record. Blank lines and the trailing metadata record are skipped. A payload
// yielding no data records is treated as an error so a truncated or changed
// upstream format can never be mistaken for an empty list.
func scanDropRecords(data []byte, fn func(dropRecord) error) error {
	scanner := bufio.NewScanner(bytes.NewReader(data))
	scanner.Buffer(make([]byte, 0, 64*1024), 1<<20)

	count := 0
	for scanner.Scan() {
		line := bytes.TrimSpace(scanner.Bytes())
		if len(line) == 0 {
			continue
		}

		var rec dropRecord
		if err := json.Unmarshal(line, &rec); err != nil {
			return fmt.Errorf("line %d: %w", count+1, err)
		}
		if rec.Type != "" {
			continue
		}

		if err := fn(rec); err != nil {
			return err
		}
		count++
	}
	if err := scanner.Err(); err != nil {
		return err
	}
	if count == 0 {
		return fmt.Errorf("no records")
	}
	return nil
}

// parseDropCIDRs compiles a DROP list payload into a prefix table.
func parseDropCIDRs(data []byte, into *ipTable) error {
	return scanDropRecords(data, func(rec dropRecord) error {
		if rec.CIDR == "" {
			return nil
		}
		if err := into.add(rec.CIDR); err != nil {
			logger.Warn("drop: skipping invalid CIDR '%s': %v", rec.CIDR, err)
		}
		return nil
	})
}

// parseDropASNs compiles an ASN-DROP payload into a set for O(1) hot-path hits.
func parseDropASNs(data []byte) (map[uint32]struct{}, error) {
	out := make(map[uint32]struct{})

	err := scanDropRecords(data, func(rec dropRecord) error {
		if rec.ASN == 0 {
			return nil
		}
		out[rec.ASN] = struct{}{}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return out, nil
}

// UpdateSpamhausDrop refreshes all three cached DROP lists. Each list is
// fetched independently so one failure does not discard the others; the caller
// keeps the current in-memory feed on error rather than degrading to empty.
func UpdateSpamhausDrop(appPath string) error {
	dir := SpamhausDir(appPath)
	if err := os.MkdirAll(dir, 0750); err != nil {
		return fmt.Errorf("drop: dir: %w", err)
	}

	cidrParse := func(data []byte) error {
		var tbl ipTable
		return parseDropCIDRs(data, &tbl)
	}
	asnParse := func(data []byte) error {
		_, err := parseDropASNs(data)
		return err
	}

	var lastErr error
	for _, l := range []struct {
		url      string
		filename string
		parse    func([]byte) error
	}{
		{dropV4URL, dropV4File, cidrParse},
		{dropV6URL, dropV6File, cidrParse},
		{dropASNURL, dropASNFile, asnParse},
	} {
		if err := fetchDropList(l.url, dir, l.filename, l.parse); err != nil {
			logger.Warn("drop: %v", err)
			lastErr = err
		}
	}
	return lastErr
}

// matchesIP reports whether the address falls inside any DROP netblock.
func (f *dropFeed) matchesIP(addr netip.Addr) bool {
	if f == nil {
		return false
	}
	_, hit := f.cidrs.lookup(addr)
	return hit
}

// matchesASN reports whether the autonomous system number is in ASN-DROP.
func (f *dropFeed) matchesASN(asn uint32) bool {
	if f == nil || asn == 0 {
		return false
	}
	_, ok := f.asns[asn]
	return ok
}

// empty reports whether the feed carries no entries — used to skip the feed
// check entirely when the lists never loaded.
func (f *dropFeed) empty() bool {
	return f == nil || (f.cidrs.len() == 0 && len(f.asns) == 0)
}

// buildDropFeed parses the three cached list payloads into a single feed. A
// list that fails to parse is logged and left out rather than aborting the
// build, so one corrupt file cannot disable the whole feed.
func buildDropFeed(v4, v6, asn []byte) *dropFeed {
	feed := &dropFeed{asns: make(map[uint32]struct{})}

	for _, p := range [][]byte{v4, v6} {
		if len(p) == 0 {
			continue
		}
		if err := parseDropCIDRs(p, &feed.cidrs); err != nil {
			logger.Warn("drop: parse CIDR list: %v", err)
			continue
		}
	}

	if len(asn) > 0 {
		asns, err := parseDropASNs(asn)
		if err != nil {
			logger.Warn("drop: parse ASN list: %v", err)
		} else {
			feed.asns = asns
		}
	}

	return feed
}

// swapDropFeed installs a newly built feed. An empty result is discarded when
// a populated feed is already live — a failed refresh must never widen access
// by silently emptying the block list.
func (p *Proxy) swapDropFeed(feed *dropFeed) {
	if feed.empty() && !p.dropFeed.Load().empty() {
		logger.Warn("drop: refusing to swap in an empty feed — keeping current set")
		return
	}

	p.dropFeed.Store(feed)
	logger.Debug("drop: feed active with %d netblocks and %d ASNs", feed.cidrs.len(), len(feed.asns))
}
