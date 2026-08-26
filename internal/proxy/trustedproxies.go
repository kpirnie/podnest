// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package proxy

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/netip"
	"strings"
	"time"

	"podnest/internal/db"
	"podnest/internal/logger"

	"golang.org/x/net/html"

	goDb "database/sql"
)

// sucuriDocsURL is the only place Sucuri publishes its WAF egress ranges —
// there is no machine-readable endpoint. The canonical list sits in a
// <pre><code> block containing nothing but the CIDRs.
const sucuriDocsURL = "https://docs.sucuri.net/website-firewall/sucuri-firewall-troubleshooting-guide/"

// sucuriMaxRanges bounds what a page edit or stray markup can inject
const sucuriMaxRanges = 32

// trustedProxyHTTPClient bounds every provider fetch so a hung or slow endpoint
// cannot stall the refresher goroutine indefinitely — the bare http.Get has no
// timeout. Response sizes are separately capped via io.LimitReader at each call site.
var trustedProxyHTTPClient = &http.Client{Timeout: 30 * time.Second}

// trustedProxyUA identifies the fetcher to provider endpoints. Cloudflare's
// ips-v4/ips-v6 pages 403 the default Go-http-client user-agent outright.
const trustedProxyUA = "PodNest/1.0 (+https://github.com/kpirnie/podnest)"

// fetchURL issues a GET carrying trustedProxyUA so provider endpoints that
// filter on user-agent do not reject the request.
func fetchURL(url string) (*http.Response, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", trustedProxyUA)
	return trustedProxyHTTPClient.Do(req)
}

// fetchText fetches a plain-text URL and returns each non-empty line as a slice
func fetchText(url string) ([]string, error) {
	resp, err := fetchURL(url)
	if err != nil {
		return nil, fmt.Errorf("GET %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GET %s: status %d", url, resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<16))
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", url, err)
	}

	var lines []string
	for _, line := range strings.Split(string(body), "\n") {
		if cidr := strings.TrimSpace(line); cidr != "" {
			lines = append(lines, cidr)
		}
	}
	return lines, nil
}

// trustedPrefixOK rejects prefixes too broad to be a plausible proxy egress
// range. Every entry in this list grants XFF authority over everything inside
// it, so an over-wide scrape result must not be accepted.
func trustedPrefixOK(pfx netip.Prefix) bool {
	if pfx.Addr().Is4() {
		return pfx.Bits() >= 16
	}
	return pfx.Bits() >= 24
}

// collectPreBlocks appends the text content of every <pre> element to out
func collectPreBlocks(n *html.Node, out *[]string) {
	if n.Type == html.ElementNode && n.Data == "pre" {
		var sb strings.Builder
		var text func(*html.Node)
		text = func(c *html.Node) {
			if c.Type == html.TextNode {
				sb.WriteString(c.Data)
			}
			for k := c.FirstChild; k != nil; k = k.NextSibling {
				text(k)
			}
		}
		text(n)
		*out = append(*out, sb.String())
		return
	}
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		collectPreBlocks(c, out)
	}
}

// fetchSucuriCIDRs scrapes the current Sucuri WAF ranges from their docs page.
// Only a block whose every token is a valid, sufficiently narrow prefix is
// accepted — the Apache and nginx samples further down the page carry the same
// addresses interleaved with directives and are skipped.
func fetchSucuriCIDRs() ([]string, error) {
	resp, err := fetchURL(sucuriDocsURL)
	if err != nil {
		return nil, fmt.Errorf("sucuri: GET: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("sucuri: status %d", resp.StatusCode)
	}

	doc, err := html.Parse(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return nil, fmt.Errorf("sucuri: parse: %w", err)
	}

	var blocks []string
	collectPreBlocks(doc, &blocks)

	for _, block := range blocks {
		fields := strings.Fields(block)
		if len(fields) < 3 || len(fields) > sucuriMaxRanges {
			continue
		}
		cidrs := make([]string, 0, len(fields))
		ok := true
		for _, f := range fields {
			pfx, perr := netip.ParsePrefix(f)
			if perr != nil || !trustedPrefixOK(pfx) {
				ok = false
				break
			}
			cidrs = append(cidrs, f)
		}
		if ok {
			logger.Debug("fetchSucuriCIDRs: fetched %d ranges", len(cidrs))
			return cidrs, nil
		}
	}

	return nil, fmt.Errorf("sucuri: no CIDR block found")
}

// fetchCloudflareCIDRs fetches the current Cloudflare IPv4 and IPv6 ranges
func fetchCloudflareCIDRs() ([]string, error) {
	var all []string

	for _, url := range []string{
		"https://www.cloudflare.com/ips-v4/",
		"https://www.cloudflare.com/ips-v6/",
	} {
		cidrs, err := fetchText(url)
		if err != nil {
			return nil, fmt.Errorf("cloudflare: %w", err)
		}
		all = append(all, cidrs...)
	}

	logger.Debug("fetchCloudflareCIDRs: fetched %d ranges", len(all))
	return all, nil
}

// fetchFastlyCIDRs fetches the current Fastly IP ranges from their JSON endpoint
func fetchFastlyCIDRs() ([]string, error) {
	resp, err := fetchURL("https://api.fastly.com/public-ip-list")
	if err != nil {
		return nil, fmt.Errorf("fastly: GET: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("fastly: status %d", resp.StatusCode)
	}

	var payload struct {
		Addresses     []string `json:"addresses"`
		IPv6Addresses []string `json:"ipv6_addresses"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<16)).Decode(&payload); err != nil {
		return nil, fmt.Errorf("fastly: decode: %w", err)
	}

	all := append(payload.Addresses, payload.IPv6Addresses...)
	logger.Debug("fetchFastlyCIDRs: fetched %d ranges", len(all))
	return all, nil
}

// fetchCloudfrontCIDRs fetches AWS IP ranges and filters for CloudFront entries
func fetchCloudfrontCIDRs() ([]string, error) {
	resp, err := fetchURL("https://ip-ranges.amazonaws.com/ip-ranges.json")
	if err != nil {
		return nil, fmt.Errorf("cloudfront: GET: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("cloudfront: status %d", resp.StatusCode)
	}

	var payload struct {
		Prefixes []struct {
			IPPrefix string `json:"ip_prefix"`
			Service  string `json:"service"`
		} `json:"prefixes"`
		IPv6Prefixes []struct {
			IPv6Prefix string `json:"ipv6_prefix"`
			Service    string `json:"service"`
		} `json:"ipv6_prefixes"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 4<<20)).Decode(&payload); err != nil {
		return nil, fmt.Errorf("cloudfront: decode: %w", err)
	}

	var all []string
	for _, p := range payload.Prefixes {
		if p.Service == "CLOUDFRONT" {
			all = append(all, p.IPPrefix)
		}
	}
	for _, p := range payload.IPv6Prefixes {
		if p.Service == "CLOUDFRONT" {
			all = append(all, p.IPv6Prefix)
		}
	}

	logger.Debug("fetchCloudfrontCIDRs: fetched %d ranges", len(all))
	return all, nil
}

// RefreshTrustedProxyRanges fetches current CIDR ranges from all provider endpoints,
// merges in the static Sucuri ranges, and persists the result to trusted_proxies_auto.
// Partial failures are logged but do not abort — whatever was fetched is saved.
func RefreshTrustedProxyRanges(database *goDb.DB) error {
	var all []string
	var failed int

	// fetch dynamic provider ranges — log failures but continue with what we get
	for name, fn := range map[string]func() ([]string, error){
		"cloudflare": fetchCloudflareCIDRs,
		"fastly":     fetchFastlyCIDRs,
		"cloudfront": fetchCloudfrontCIDRs,
		"sucuri":     fetchSucuriCIDRs,
	} {
		cidrs, err := fn()
		if err != nil {
			logger.Warn("RefreshTrustedProxyRanges: %s fetch failed: %v", name, err)
			failed++
			continue
		}
		all = append(all, cidrs...)
	}

	if len(all) == 0 {
		return fmt.Errorf("RefreshTrustedProxyRanges: all provider fetches failed")
	}

	// a partial failure must not drop the missing provider's ranges — the static
	// Sucuri append alone clears any emptiness guard, so merge what was fetched
	// over the previously stored list rather than replacing it outright
	if failed > 0 {
		prior, err := db.GetSetting(database, "trusted_proxies_auto")
		if err != nil {
			logger.Warn("RefreshTrustedProxyRanges: prior list unreadable, keeping fetched only: %v", err)
		} else {
			seen := make(map[string]struct{}, len(all))
			for _, cidr := range all {
				seen[cidr] = struct{}{}
			}
			for _, line := range strings.Split(prior, "\n") {
				cidr := strings.TrimSpace(line)
				if cidr == "" {
					continue
				}
				if _, dup := seen[cidr]; dup {
					continue
				}
				seen[cidr] = struct{}{}
				all = append(all, cidr)
			}
		}
		logger.Warn("RefreshTrustedProxyRanges: %d provider(s) failed, merged with prior list — %d total", failed, len(all))
	}

	value := strings.Join(all, "\n")
	if err := db.SetTrustedProxiesAuto(database, value); err != nil {
		return err
	}

	logger.Debug("RefreshTrustedProxyRanges: saved %d total ranges", len(all))
	return nil
}

// StartTrustedProxyRefresher runs RefreshTrustedProxyRanges immediately then
// repeats on the given interval for the lifetime of the process.
// px is used to reload the compiled ranges into the running proxy after each fetch.
func StartTrustedProxyRefresher(px *Proxy, interval time.Duration) {
	go func() {
		if err := RefreshTrustedProxyRanges(px.database); err != nil {
			logger.Warn("trusted proxy initial refresh: %v", err)
		} else {
			// reload the freshly fetched ranges into the running proxy
			if err := px.WarmCaches(true); err != nil {
				logger.Warn("trusted proxy initial warm failed: %v", err)
			}
		}
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for range ticker.C {
			if err := RefreshTrustedProxyRanges(px.database); err != nil {
				logger.Warn("trusted proxy refresh: %v", err)
			} else {
				if err := px.WarmCaches(true); err != nil {
					logger.Warn("trusted proxy warm failed: %v", err)
				}
			}
		}
	}()
}
