// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package proxy

import (
	"net"
	"net/netip"
	"strings"

	"podnest/internal/db"
	"podnest/internal/logger"

	"github.com/gaissmai/bart"
)

// ipTable is a prefix-trie of IP rules. The stored value is the raw rule text
// so debug logging can name the matching entry. Bare IPs compile to /32 or /128.
type ipTable struct {
	tbl *bart.Table[string]
	n   int
}

// compiledUARule holds a lowercased pattern for case-insensitive substring matching
type compiledUARule struct {
	pattern string
}

// ruleSet holds the four lists for a single scope (global or per-site)
type ruleSet struct {
	ipBlacklist      ipTable
	ipWhitelist      ipTable
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

// matches reports whether the request UA matches this rule. The special
// pattern <blank> matches an empty or whitespace-only user-agent, which a
// plain substring match can never do.
func (r *compiledUARule) matches(uaLower string) bool {
	if r.pattern == "<blank>" {
		return uaLower == ""
	}
	return strings.Contains(uaLower, r.pattern)
}

// compilePrefix parses a CIDR string or bare IP into a netip.Prefix.
// Bare IPs (no mask) become host prefixes for exact matching.
func compilePrefix(cidr string) (netip.Prefix, error) {
	pfx, err := netip.ParsePrefix(cidr)
	if err == nil {
		return pfx.Masked(), nil
	}

	// fall back to treating it as a bare IP address
	addr, aerr := netip.ParseAddr(cidr)
	if aerr != nil {
		logger.Error("compilePrefix: invalid IP or CIDR '%s': %v", cidr, err)
		return netip.Prefix{}, err
	}
	return netip.PrefixFrom(addr, addr.BitLen()), nil
}

// add compiles and inserts a rule, allocating the table on first use.
// Invalid entries are skipped by the caller.
func (t *ipTable) add(cidr string) error {
	pfx, err := compilePrefix(cidr)
	if err != nil {
		return err
	}
	if t.tbl == nil {
		t.tbl = &bart.Table[string]{}
	}
	t.tbl.Insert(pfx, cidr)
	t.n++
	return nil
}

// len reports how many rules the table holds — an empty table imposes nothing.
func (t *ipTable) len() int {
	return t.n
}

// lookup reports whether the address falls inside any prefix, returning the
// raw text of the matching rule.
func (t *ipTable) lookup(ip netip.Addr) (string, bool) {
	if t == nil || t.tbl == nil {
		return "", false
	}
	return t.tbl.Lookup(ip)
}

// toAddr converts a net.IP to the netip.Addr form the tables index on,
// unmapping 4-in-6 addresses so a v4 client matches a v4 prefix.
func toAddr(ip net.IP) (netip.Addr, bool) {
	addr, ok := netip.AddrFromSlice(ip)
	if !ok {
		return netip.Addr{}, false
	}
	return addr.Unmap(), true
}

// buildSecurityCache compiles all IP and UA rules from the database into
// an in-memory securityCache ready for zero-allocation hot-path lookups.
func buildSecurityCache(ipRules []*db.IPRule, uaRules []*db.UARule, countryRules []*db.CountryRule, asnRules []*db.ASNRule) securityCache {
	cache := securityCache{
		perSite: make(map[int64]ruleSet),
	}

	// compile IP rules into the appropriate scope and list
	for _, r := range ipRules {
		var target *ipTable
		if r.SiteID == nil {
			// global rule
			if r.ListType == 0 {
				target = &cache.global.ipBlacklist
			} else {
				target = &cache.global.ipWhitelist
			}
			if err := target.add(r.CIDR); err != nil {
				// log and skip invalid entries rather than aborting the whole cache build
				logger.Warn("buildSecurityCache: skipping invalid IP rule '%s': %v", r.CIDR, err)
			}
			continue
		}

		// per-site rule — get or create the site's rule set
		rs := cache.perSite[*r.SiteID]
		if r.ListType == 0 {
			target = &rs.ipBlacklist
		} else {
			target = &rs.ipWhitelist
		}
		if err := target.add(r.CIDR); err != nil {
			logger.Warn("buildSecurityCache: skipping invalid IP rule '%s': %v", r.CIDR, err)
		}
		cache.perSite[*r.SiteID] = rs
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

// checkIP evaluates a client IP against a rule set. IP whitelists are the one
// exception to blacklist supremacy: a whitelist match in either scope allows
// the request outright, ahead of both blacklists and the Spamhaus DROP feed.
// A non-empty whitelist the IP does not match still blocks. skipGlobalDeny is
// set by the per-site pass, where the global blacklist and the DROP feed were
// already cleared by enforceGlobalSecurity and re-scanning them is wasted work.
// Returns false and the log attribution token when the request should be blocked.
func checkIP(ip net.IP, global, site ruleSet, feed *dropFeed, skipGlobalDeny bool) (bool, string) {

	addr, ok := toAddr(ip)
	if !ok {
		return true, ""
	}

	// per-site whitelist — a match allows outright, ahead of every blacklist
	if raw, hit := site.ipWhitelist.lookup(addr); hit {
		if logger.IsDebug() {
			logger.Debug("checkIP: allowed by site whitelist rule %s: %s", raw, ip)
		}
		return true, ""
	}

	// global whitelist — a match allows outright, ahead of every blacklist
	if raw, hit := global.ipWhitelist.lookup(addr); hit {
		if logger.IsDebug() {
			logger.Debug("checkIP: allowed by global whitelist rule %s: %s", raw, ip)
		}
		return true, ""
	}

	// a non-empty whitelist in either scope is a filter — no match means block
	if site.ipWhitelist.len() > 0 || global.ipWhitelist.len() > 0 {
		if logger.IsDebug() {
			logger.Debug("checkIP: blocked by whitelist miss: %s", ip)
		}
		return false, "ip"
	}

	if !skipGlobalDeny {

		// global blacklist — hard block
		if raw, hit := global.ipBlacklist.lookup(addr); hit {
			if logger.IsDebug() {
				logger.Debug("checkIP: blocked by global blacklist rule %s: %s", raw, ip)
			}
			return false, "ip"
		}

		// Spamhaus DROP — an extension of the global blacklist, attributed
		// separately so feed hits are distinguishable from operator rules
		if feed.matchesIP(addr) {
			if logger.IsDebug() {
				logger.Debug("checkIP: blocked by spamhaus drop: %s", ip)
			}
			return false, dropBlockReason
		}
	}

	// per-site blacklist — hard block
	if raw, hit := site.ipBlacklist.lookup(addr); hit {
		if logger.IsDebug() {
			logger.Debug("checkIP: blocked by site blacklist rule %s: %s", raw, ip)
		}
		return false, "ip"
	}

	return true, ""
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

// checkASN evaluates a resolved autonomous system number against a rule set.
// Blacklists win: global, then the Spamhaus ASN-DROP feed as an extension of
// it, then per-site, before any whitelist filtering. A zero ASN (unknown —
// private IP, unallocated range, or DB not loaded) is always allowed so local
// and unresolvable traffic is never locked out. Returns false and the log
// attribution token when the request should be blocked.
func checkASN(asn uint32, global, site ruleSet, feed *dropFeed) (bool, string) {

	// unknown ASN — default allow
	if asn == 0 {
		return true, ""
	}

	// global blacklist — hard block, no override
	if _, ok := global.asnBlacklist[asn]; ok {
		if logger.IsDebug() {
			logger.Debug("checkASN: blocked by global blacklist: AS%d", asn)
		}
		return false, "asn"
	}

	// Spamhaus ASN-DROP — attributed separately from operator rules
	if feed.matchesASN(asn) {
		if logger.IsDebug() {
			logger.Debug("checkASN: blocked by spamhaus drop: AS%d", asn)
		}
		return false, dropBlockReason
	}

	// per-site blacklist — hard block, no override
	if _, ok := site.asnBlacklist[asn]; ok {
		if logger.IsDebug() {
			logger.Debug("checkASN: blocked by site blacklist: AS%d", asn)
		}
		return false, "asn"
	}

	// global whitelist — if non-empty, the ASN must appear in it
	if len(global.asnWhitelist) > 0 {
		if _, ok := global.asnWhitelist[asn]; !ok {
			if logger.IsDebug() {
				logger.Debug("checkASN: blocked by global whitelist miss: AS%d", asn)
			}
			return false, "asn"
		}
	}

	// per-site whitelist — if non-empty, the ASN must appear in it
	if len(site.asnWhitelist) > 0 {
		if _, ok := site.asnWhitelist[asn]; !ok {
			if logger.IsDebug() {
				logger.Debug("checkASN: blocked by site whitelist miss: AS%d", asn)
			}
			return false, "asn"
		}
	}

	return true, ""
}

// hasASNRules reports whether either scope carries any ASN rules, or the DROP
// feed carries any ASNs — used to skip the ASN database lookup entirely on the
// hot path when nothing would consult it.
func hasASNRules(global, site ruleSet, feed *dropFeed) bool {
	return len(global.asnBlacklist) > 0 || len(global.asnWhitelist) > 0 ||
		len(site.asnBlacklist) > 0 || len(site.asnWhitelist) > 0 ||
		(feed != nil && len(feed.asns) > 0)
}

// checkUA evaluates a user-agent string against a rule set following the same
// precedence as checkIP: blacklist always wins, then whitelist must match.
// Returns false if the request should be blocked.
func checkUA(ua string, global, site ruleSet) bool {

	// lowercase once for all comparisons in this request
	uaLower := strings.ToLower(strings.TrimSpace(ua))

	// empty, whitespace-only, or control-character-only user-agents are never
	// legitimate — hard block unconditionally, before any rule evaluation
	if strings.TrimFunc(uaLower, func(r rune) bool { return r <= ' ' || r == 0x7f }) == "" {
		return false
	}

	// global blacklist — hard block, no override
	for _, r := range global.uaBlacklist {
		if r.matches(uaLower) {
			if logger.IsDebug() {
				logger.Debug("checkUA: blocked by global blacklist pattern '%s'", r.pattern)
			}
			return false
		}
	}

	// per-site blacklist — hard block, no override
	for _, r := range site.uaBlacklist {
		if r.matches(uaLower) {
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
			if r.matches(uaLower) {
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
			if r.matches(uaLower) {
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
func parseClientIP(remoteAddr, forwarded string, trustedProxies *ipTable) net.IP {

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
		addr, ok := toAddr(ip)
		if !ok {
			return false
		}
		_, hit := trustedProxies.lookup(addr)
		return hit
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
