package proxy

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"podnest/internal/db"
	"podnest/internal/logger"

	goDb "database/sql"
)

// sucuriCIDRs contains the static Sucuri/GoDaddy WAF IP ranges
// These are maintained manually as Sucuri does not publish a machine-readable endpoint
var sucuriCIDRs = []string{
	"192.88.134.0/23",
	"185.93.228.0/22",
	"66.248.200.0/22",
	"208.109.0.0/22",
	"2a02:fe80::/29",
}

// fetchText fetches a plain-text URL and returns each non-empty line as a slice
func fetchText(url string) ([]string, error) {
	resp, err := http.Get(url)
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
	resp, err := http.Get("https://api.fastly.com/public-ip-list")
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
	resp, err := http.Get("https://ip-ranges.amazonaws.com/ip-ranges.json")
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

	// fetch dynamic provider ranges — log failures but continue with what we get
	for name, fn := range map[string]func() ([]string, error){
		"cloudflare": fetchCloudflareCIDRs,
		"fastly":     fetchFastlyCIDRs,
		"cloudfront": fetchCloudfrontCIDRs,
	} {
		cidrs, err := fn()
		if err != nil {
			logger.Warn("RefreshTrustedProxyRanges: %s fetch failed: %v", name, err)
			continue
		}
		all = append(all, cidrs...)
	}

	// append static Sucuri ranges
	all = append(all, sucuriCIDRs...)

	if len(all) == 0 {
		return fmt.Errorf("RefreshTrustedProxyRanges: all provider fetches failed")
	}

	value := strings.Join(all, "\n")
	if err := db.SetTrustedProxiesAuto(database, value); err != nil {
		return err
	}

	logger.Debug("RefreshTrustedProxyRanges: saved %d total ranges", len(all))
	return nil
}

// StartTrustedProxyRefresher runs RefreshTrustedProxyRanges immediately then
// repeats on the given interval for the lifetime of the process
func StartTrustedProxyRefresher(database *goDb.DB, interval time.Duration) {
	go func() {
		if err := RefreshTrustedProxyRanges(database); err != nil {
			logger.Warn("trusted proxy initial refresh: %v", err)
		}
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for range ticker.C {
			if err := RefreshTrustedProxyRanges(database); err != nil {
				logger.Warn("trusted proxy refresh: %v", err)
			}
		}
	}()
}
