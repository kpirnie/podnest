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
	ipBlacklist []*compiledIPRule
	ipWhitelist []*compiledIPRule
	uaBlacklist []*compiledUARule
	uaWhitelist []*compiledUARule
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

// matchesUA returns true if the given user-agent contains this rule's pattern
// using case-insensitive substring matching.
func (r *compiledUARule) matchesUA(ua string) bool {
	return strings.Contains(strings.ToLower(ua), r.pattern)
}

// buildSecurityCache compiles all IP and UA rules from the database into
// an in-memory securityCache ready for zero-allocation hot-path lookups.
func buildSecurityCache(ipRules []*db.IPRule, uaRules []*db.UARule) securityCache {
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

	logger.Debug("buildSecurityCache: compiled %d IP rules and %d UA rules", len(ipRules), len(uaRules))
	return cache
}

// checkIP evaluates a client IP against a rule set following the precedence:
// blacklist always wins, then whitelist (if non-empty) must match.
// Returns false if the request should be blocked.
func checkIP(ip net.IP, global, site ruleSet) bool {

	// global blacklist — hard block, no override
	for _, r := range global.ipBlacklist {
		if r.matchesIP(ip) {
			logger.Debug("checkIP: blocked by global blacklist: %s", ip)
			return false
		}
	}

	// per-site blacklist — hard block, no override
	for _, r := range site.ipBlacklist {
		if r.matchesIP(ip) {
			logger.Debug("checkIP: blocked by site blacklist: %s", ip)
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
			logger.Debug("checkIP: blocked by global whitelist miss: %s", ip)
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

// checkUA evaluates a user-agent string against a rule set following the same
// precedence as checkIP: blacklist always wins, then whitelist must match.
// Returns false if the request should be blocked.
func checkUA(ua string, global, site ruleSet) bool {

	// lowercase once for all comparisons in this request
	uaLower := strings.ToLower(ua)

	// global blacklist — hard block, no override
	for _, r := range global.uaBlacklist {
		if strings.Contains(uaLower, r.pattern) {
			logger.Debug("checkUA: blocked by global blacklist pattern '%s'", r.pattern)
			return false
		}
	}

	// per-site blacklist — hard block, no override
	for _, r := range site.uaBlacklist {
		if strings.Contains(uaLower, r.pattern) {
			logger.Debug("checkUA: blocked by site blacklist pattern '%s'", r.pattern)
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
			logger.Debug("checkUA: blocked by global whitelist miss")
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
			logger.Debug("checkUA: blocked by site whitelist miss")
			return false
		}
	}

	return true
}

// parseClientIP extracts the real client IP from the request. X-Forwarded-For
// is only trusted when RemoteAddr falls within a known trusted proxy range —
// otherwise RemoteAddr is used directly to prevent header spoofing.
func parseClientIP(remoteAddr, forwarded string, trustedProxies []*net.IPNet) net.IP {

	// strip port from RemoteAddr and parse
	host, _, err := net.SplitHostPort(remoteAddr)
	if err != nil {
		host = remoteAddr
	}
	remote := net.ParseIP(host)

	// only honour X-Forwarded-For when the connection arrives from a trusted proxy
	if forwarded != "" && remote != nil {
		for _, network := range trustedProxies {
			if network.Contains(remote) {
				parts := strings.SplitN(forwarded, ",", 2)
				if ip := net.ParseIP(strings.TrimSpace(parts[0])); ip != nil {
					return ip
				}
				break
			}
		}
	}

	return remote
}
