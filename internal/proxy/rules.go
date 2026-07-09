// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package proxy

import (
	"net"
	"strings"

	"podnest/internal/db"
	"podnest/internal/logger"
)

// compiledIPRule holds a parsed network for fast CIDR matching
type compiledIPRule struct {
	raw  string
	net  *net.IPNet
	host net.IP // set when raw is a bare IP with no mask
}

// compiledUARule holds a lowercased pattern for case-insensitive substring matching
type compiledUARule struct {
	pattern string
}

// ruleSet holds the four lists for a single scope (global or per-site)
type ruleSet struct {
	ipBlacklist      []*compiledIPRule
	ipWhitelist      []*compiledIPRule
	uaBlacklist      []*compiledUARule
	uaWhitelist      []*compiledUARule
	countryBlacklist []string
	countryWhitelist []string
	asnBlacklist     map[uint32]struct{}
	asnWhitelist     map[uint32]struct{}
}

// securityCache holds the compiled global rule set and a map of per-site rule sets
type securityCache struct {
	global  ruleSet
	perSite map[int64]ruleSet
}

// compileIPRule parses a CIDR string or bare IP into a compiledIPRule.
// Bare IPs (no mask) are stored as host addresses for exact matching.
func compileIPRule(cidr string) (*compiledIPRule, error) {

	// attempt to parse as a CIDR block first
	_, network, err := net.ParseCIDR(cidr)
	if err == nil {
		logger.Debug("compileIPRule: compiled CIDR %s", cidr)
		return &compiledIPRule{raw: cidr, net: network}, nil
	}

	// fall back to treating it as a bare IP address
	ip := net.ParseIP(cidr)
	if ip == nil {
		logger.Error("compileIPRule: invalid IP or CIDR '%s': %v", cidr, err)
		return nil, err
	}

	logger.Debug("compileIPRule: compiled bare IP %s", cidr)
	return &compiledIPRule{raw: cidr, host: ip}, nil
}

// matchesIP returns true if the given IP address matches this rule.
func (r *compiledIPRule) matchesIP(ip net.IP) bool {
	if r.net != nil {
		return r.net.Contains(ip)
	}
	return r.host.Equal(ip)
}

// buildSecurityCache compiles all IP and UA rules from the database into
// an in-memory securityCache ready for zero-allocation hot-path lookups.
func buildSecurityCache(ipRules []*db.IPRule, uaRules []*db.UARule, countryRules []*db.CountryRule, asnRules []*db.ASNRule) securityCache {
	cache := securityCache{
		perSite: make(map[int64]ruleSet),
	}

	// compile IP rules into the appropriate scope and list
	for _, r := range ipRules {
		compiled, err := compileIPRule(r.CIDR)
		if err != nil {
			// log and skip invalid entries rather than aborting the whole cache build
			logger.Warn("buildSecurityCache: skipping invalid IP rule '%s': %v", r.CIDR, err)
			continue
		}

		if r.SiteID == nil {
			// global rule
			if r.ListType == 0 {
				cache.global.ipBlacklist = append(cache.global.ipBlacklist, compiled)
			} else {
				cache.global.ipWhitelist = append(cache.global.ipWhitelist, compiled)
			}
		} else {
			// per-site rule — get or create the site's rule set
			rs := cache.perSite[*r.SiteID]
			if r.ListType == 0 {
				rs.ipBlacklist = append(rs.ipBlacklist, compiled)
			} else {
				rs.ipWhitelist = append(rs.ipWhitelist, compiled)
			}
			cache.perSite[*r.SiteID] = rs
		}
	}

	// compile UA rules into the appropriate scope and list
	for _, r := range uaRules {

		// lowercase once at compile time so hot-path matching only lowercases the request UA
		compiled := &compiledUARule{pattern: strings.ToLower(r.Pattern)}

		if r.SiteID == nil {
			// global rule
			if r.ListType == 0 {
				cache.global.uaBlacklist = append(cache.global.uaBlacklist, compiled)
			} else {
				cache.global.uaWhitelist = append(cache.global.uaWhitelist, compiled)
			}
		} else {
			// per-site rule — get or create the site's rule set
			rs := cache.perSite[*r.SiteID]
			if r.ListType == 0 {
				rs.uaBlacklist = append(rs.uaBlacklist, compiled)
			} else {
				rs.uaWhitelist = append(rs.uaWhitelist, compiled)
			}
			cache.perSite[*r.SiteID] = rs
		}
	}

	// compile country rules into the appropriate scope and list — codes are
	// uppercased once at compile time so hot-path matching is a direct compare
	for _, r := range countryRules {
		code := strings.ToUpper(strings.TrimSpace(r.Code))
		if len(code) != 2 {
			// log and skip invalid entries rather than aborting the whole cache build
			logger.Warn("buildSecurityCache: skipping invalid country code '%s'", r.Code)
			continue
		}

		if r.SiteID == nil {
			// global rule
			if r.ListType == 0 {
				cache.global.countryBlacklist = append(cache.global.countryBlacklist, code)
			} else {
				cache.global.countryWhitelist = append(cache.global.countryWhitelist, code)
			}
		} else {
			// per-site rule — get or create the site's rule set
			rs := cache.perSite[*r.SiteID]
			if r.ListType == 0 {
				rs.countryBlacklist = append(rs.countryBlacklist, code)
			} else {
				rs.countryWhitelist = append(rs.countryWhitelist, code)
			}
			cache.perSite[*r.SiteID] = rs
		}
	}

	// compile ASN rules into the appropriate scope and list — stored as
	// sets so hot-path matching is O(1) regardless of list size
	for _, r := range asnRules {
		if r.ASN == 0 {
			// log and skip invalid entries rather than aborting the whole cache build
			logger.Warn("buildSecurityCache: skipping invalid ASN 0")
			continue
		}

		if r.SiteID == nil {
			// global rule
			if r.ListType == 0 {
				if cache.global.asnBlacklist == nil {
					cache.global.asnBlacklist = make(map[uint32]struct{})
				}
				cache.global.asnBlacklist[r.ASN] = struct{}{}
			} else {
				if cache.global.asnWhitelist == nil {
					cache.global.asnWhitelist = make(map[uint32]struct{})
				}
				cache.global.asnWhitelist[r.ASN] = struct{}{}
			}
		} else {
			// per-site rule — get or create the site's rule set
			rs := cache.perSite[*r.SiteID]
			if r.ListType == 0 {
				if rs.asnBlacklist == nil {
					rs.asnBlacklist = make(map[uint32]struct{})
				}
				rs.asnBlacklist[r.ASN] = struct{}{}
			} else {
				if rs.asnWhitelist == nil {
					rs.asnWhitelist = make(map[uint32]struct{})
				}
				rs.asnWhitelist[r.ASN] = struct{}{}
			}
			cache.perSite[*r.SiteID] = rs
		}
	}

	logger.Debug("buildSecurityCache: compiled %d IP rules, %d UA rules, %d country rules, and %d ASN rules", len(ipRules), len(uaRules), len(countryRules), len(asnRules))
	return cache
}

// checkIP evaluates a client IP against a rule set following the precedence:
// blacklist always wins, then whitelist (if non-empty) must match.
// Returns false if the request should be blocked.
func checkIP(ip net.IP, global, site ruleSet) bool {

	// global blacklist — hard block, no override
	for _, r := range global.ipBlacklist {
		if r.matchesIP(ip) {
			if logger.IsDebug() {
				logger.Debug("checkIP: blocked by global blacklist: %s", ip)
			}
			return false
		}
	}

	// per-site blacklist — hard block, no override
	for _, r := range site.ipBlacklist {
		if r.matchesIP(ip) {
			if logger.IsDebug() {
				logger.Debug("checkIP: blocked by site blacklist: %s", ip)
			}
			return false
		}
	}

	// global whitelist — if non-empty, IP must appear in it
	if len(global.ipWhitelist) > 0 {
		allowed := false
		for _, r := range global.ipWhitelist {
			if r.matchesIP(ip) {
				allowed = true
				break
			}
		}
		if !allowed {
			if logger.IsDebug() {
				logger.Debug("checkIP: blocked by site whitelist miss: %s", ip)
			}
			return false
		}
	}

	// per-site whitelist — if non-empty, IP must appear in it
	if len(site.ipWhitelist) > 0 {
		allowed := false
		for _, r := range site.ipWhitelist {
			if r.matchesIP(ip) {
				allowed = true
				break
			}
		}
		if !allowed {
			logger.Debug("checkIP: blocked by site whitelist miss: %s", ip)
			return false
		}
	}

	return true
}

// checkCountry evaluates a resolved ISO country code against a rule set
// following the same precedence as checkIP: blacklist always wins, then
// whitelist (if non-empty) must match. An empty code (unknown country —
// private IP, unallocated range, or DB not loaded) is always allowed so
// local and unresolvable traffic is never locked out. Returns false if
// the request should be blocked.
func checkCountry(code string, global, site ruleSet) bool {

	// unknown country — default allow
	if code == "" {
		return true
	}

	// global blacklist — hard block, no override
	for _, c := range global.countryBlacklist {
		if c == code {
			if logger.IsDebug() {
				logger.Debug("checkCountry: blocked by global blacklist: %s", code)
			}
			return false
		}
	}

	// per-site blacklist — hard block, no override
	for _, c := range site.countryBlacklist {
		if c == code {
			if logger.IsDebug() {
				logger.Debug("checkCountry: blocked by site blacklist: %s", code)
			}
			return false
		}
	}

	// global whitelist — if non-empty, code must appear in it
	if len(global.countryWhitelist) > 0 {
		allowed := false
		for _, c := range global.countryWhitelist {
			if c == code {
				allowed = true
				break
			}
		}
		if !allowed {
			if logger.IsDebug() {
				logger.Debug("checkCountry: blocked by global whitelist miss: %s", code)
			}
			return false
		}
	}

	// per-site whitelist — if non-empty, code must appear in it
	if len(site.countryWhitelist) > 0 {
		allowed := false
		for _, c := range site.countryWhitelist {
			if c == code {
				allowed = true
				break
			}
		}
		if !allowed {
			if logger.IsDebug() {
				logger.Debug("checkCountry: blocked by site whitelist miss: %s", code)
			}
			return false
		}
	}

	return true
}

// hasCountryRules reports whether either scope carries any country rules —
// used to skip the geo database lookup entirely on the hot path when the
// feature is unconfigured.
func hasCountryRules(global, site ruleSet) bool {
	return len(global.countryBlacklist) > 0 || len(global.countryWhitelist) > 0 ||
		len(site.countryBlacklist) > 0 || len(site.countryWhitelist) > 0
}

// checkASN evaluates a resolved autonomous system number against a rule set
// following the same precedence as checkIP: blacklist always wins, then
// whitelist (if non-empty) must match. A zero ASN (unknown — private IP,
// unallocated range, or DB not loaded) is always allowed so local and
// unresolvable traffic is never locked out. Returns false if the request
// should be blocked.
func checkASN(asn uint32, global, site ruleSet) bool {

	// unknown ASN — default allow
	if asn == 0 {
		return true
	}

	// global blacklist — hard block, no override
	if _, ok := global.asnBlacklist[asn]; ok {
		if logger.IsDebug() {
			logger.Debug("checkASN: blocked by global blacklist: AS%d", asn)
		}
		return false
	}

	// per-site blacklist — hard block, no override
	if _, ok := site.asnBlacklist[asn]; ok {
		if logger.IsDebug() {
			logger.Debug("checkASN: blocked by site blacklist: AS%d", asn)
		}
		return false
	}

	// global whitelist — if non-empty, the ASN must appear in it
	if len(global.asnWhitelist) > 0 {
		if _, ok := global.asnWhitelist[asn]; !ok {
			if logger.IsDebug() {
				logger.Debug("checkASN: blocked by global whitelist miss: AS%d", asn)
			}
			return false
		}
	}

	// per-site whitelist — if non-empty, the ASN must appear in it
	if len(site.asnWhitelist) > 0 {
		if _, ok := site.asnWhitelist[asn]; !ok {
			if logger.IsDebug() {
				logger.Debug("checkASN: blocked by site whitelist miss: AS%d", asn)
			}
			return false
		}
	}

	return true
}

// hasASNRules reports whether either scope carries any ASN rules —
// used to skip the ASN database lookup entirely on the hot path when the
// feature is unconfigured.
func hasASNRules(global, site ruleSet) bool {
	return len(global.asnBlacklist) > 0 || len(global.asnWhitelist) > 0 ||
		len(site.asnBlacklist) > 0 || len(site.asnWhitelist) > 0
}

// checkUA evaluates a user-agent string against a rule set following the same
// precedence as checkIP: blacklist always wins, then whitelist must match.
// Returns false if the request should be blocked.
func checkUA(ua string, global, site ruleSet) bool {

	// lowercase once for all comparisons in this request
	uaLower := strings.ToLower(ua)

	// global blacklist — hard block, no override
	for _, r := range global.uaBlacklist {
		if strings.Contains(uaLower, r.pattern) {
			if logger.IsDebug() {
				logger.Debug("checkUA: blocked by global blacklist pattern '%s'", r.pattern)
			}
			return false
		}
	}

	// per-site blacklist — hard block, no override
	for _, r := range site.uaBlacklist {
		if strings.Contains(uaLower, r.pattern) {
			if logger.IsDebug() {
				logger.Debug("checkUA: blocked by site blacklist pattern '%s'", r.pattern)
			}
			return false
		}
	}

	// global whitelist — if non-empty, UA must match at least one pattern
	if len(global.uaWhitelist) > 0 {
		allowed := false
		for _, r := range global.uaWhitelist {
			if strings.Contains(uaLower, r.pattern) {
				allowed = true
				break
			}
		}
		if !allowed {
			if logger.IsDebug() {
				logger.Debug("checkUA: blocked by global whitelist miss")
			}
			return false
		}
	}

	// per-site whitelist — if non-empty, UA must match at least one pattern
	if len(site.uaWhitelist) > 0 {
		allowed := false
		for _, r := range site.uaWhitelist {
			if strings.Contains(uaLower, r.pattern) {
				allowed = true
				break
			}
		}
		if !allowed {
			if logger.IsDebug() {
				logger.Debug("checkUA: blocked by site whitelist miss")
			}
			return false
		}
	}

	return true
}

// parseClientIP extracts the real client IP from the request. X-Forwarded-For
// is only consulted when the direct peer (RemoteAddr) is itself a trusted proxy
// or loopback; otherwise the header is attacker-controlled and RemoteAddr wins.
// When trusted, the forwarded chain is walked right-to-left skipping trusted
// hops — the first untrusted address is the real client as seen at our trust
// boundary. Taking the leftmost entry instead would trust a value the client
// can spoof, since appending proxies (Cloudflare/Fastly) preserve any
// client-supplied X-Forwarded-For entries to the left of the real chain.
func parseClientIP(remoteAddr, forwarded string, trustedProxies []*net.IPNet) net.IP {

	// strip port from RemoteAddr and parse
	host, _, err := net.SplitHostPort(remoteAddr)
	if err != nil {
		host = remoteAddr
	}
	remote := net.ParseIP(host)

	// isTrusted reports whether an IP is a hop we control: loopback (internal
	// forwarding by the proxy itself) or within a configured trusted-proxy range
	isTrusted := func(ip net.IP) bool {
		if ip == nil {
			return false
		}
		if ip.IsLoopback() {
			return true
		}
		for _, network := range trustedProxies {
			if network.Contains(ip) {
				return true
			}
		}
		return false
	}

	// the header is only trustworthy when the connection itself arrived from a
	// trusted hop; otherwise RemoteAddr is authoritative
	if forwarded == "" || !isTrusted(remote) {
		return remote
	}

	// walk right-to-left, skipping trusted hops; first untrusted entry is the client
	parts := strings.Split(forwarded, ",")
	for i := len(parts) - 1; i >= 0; i-- {
		ip := net.ParseIP(strings.TrimSpace(parts[i]))
		if ip == nil {
			continue
		}
		if !isTrusted(ip) {
			return ip
		}
	}

	// every forwarded hop was trusted — fall back to the direct peer
	return remote
}
