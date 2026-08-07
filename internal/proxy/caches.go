// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package proxy

import (
	"crypto/tls"
	"fmt"
	"net/http"
	"net/netip"
	"os"
	"path/filepath"
	"podnest/internal/db"
	"podnest/internal/logger"
	"strings"
	"time"
)

// WarmCaches warms all proxy caches and connections in the correct order.
// Pass justTrustedProxies=true to only refresh the trusted proxy ranges —
// used by StartTrustedProxyRefresher to avoid unnecessary full rewarming.
func (p *Proxy) WarmCaches(justTrustedProxies bool) error {

	// get the trusted proxy CIDRs
	cidrs, err := db.GetTrustedProxies(p.database)
	if err != nil {
		return err
	}

	// get the IP rules
	ipRules, err := db.GetAllIPRules(p.database)
	if err != nil {
		return err
	}

	// get the UA rules
	uaRules, err := db.GetAllUARules(p.database)
	if err != nil {
		return err
	}

	// get the country rules
	countryRules, err := db.GetAllCountryRules(p.database)
	if err != nil {
		return err
	}

	// get the ASN rules
	asnRules, err := db.GetAllASNRules(p.database)
	if err != nil {
		return err
	}

	// get the bypass rules
	bypassRules, err := db.GetAllBypassRules(p.database)
	if err != nil {
		return err
	}

	// warm the caches in the correct order
	if justTrustedProxies {
		p.warmTrustedProxies(cidrs)
		return nil
	}
	if err := p.warmCache(); err != nil {
		return err
	}
	if err := p.warmRedirectCache(); err != nil {
		return err
	}
	if err := p.warmWAFCache(); err != nil {
		return err
	}
	p.warmSecurityCache(ipRules, uaRules, countryRules, asnRules)
	p.warmBypassCache(bypassRules)
	p.warmBasicAuthCache()
	p.warmTrustedProxies(cidrs)
	p.warmTLSCache()
	p.warmConnections()

	// default return
	return nil
}

// WarmCache loads all registered domain→port+siteID mappings from the database
// and atomically installs them. Called once on startup.
func (p *Proxy) warmCache() error {

	// load all domain entries from the database
	entries, err := db.GetAllDomainEntries(p.database)
	if err != nil {
		logger.Error("proxy: failed to warm domain cache: %v", err)
		return err
	}
	m := make(map[string]domainEntry, len(entries))
	for domain, e := range entries {
		m[domain] = domainEntry{port: e.Port, siteID: e.SiteID, siteName: e.SiteName}
	}

	// cache the domain→port+siteID mappings first
	p.cache.Store(&m)

	// load RP routes and attach upstream pools to matching cache entries
	routes, err := db.GetAllRPRoutes(p.database)
	if err != nil {
		logger.Error("proxy: failed to load RP routes: %v", err)
		return err
	}

	// group upstreams by domain; track siteID separately for RP-only domains
	// that have no kppn_domains entry and must be synthesised into the cache
	poolMap := make(map[string][]upstreamEntry)
	siteIDs := make(map[string]int64)
	for _, r := range routes {
		poolMap[r.Domain] = append(poolMap[r.Domain], upstreamEntry{
			upstream: r.Upstream,
			passHost: r.PassHost,
		})
		siteIDs[r.Domain] = r.SiteID
	}

	// build and attach upstream pools; RP domains absent from kppn_domains get
	// a synthesised zero-port entry so the proxy can route them via the pool
	if len(poolMap) > 0 {
		next := make(map[string]domainEntry, len(m)+len(poolMap))
		for k, v := range m {
			next[k] = v
		}

		// build and attach upstream pools to the cache entries
		for domain, upstreams := range poolMap {
			pool, err := newUpstreamPool(upstreams)
			if err != nil {
				logger.Error("proxy: failed to build upstream pool for '%s': %v", domain, err)
				continue
			}

			// if the domain is in kppn_domains — attach pool to existing entry
			if e, ok := next[domain]; ok {
				e.pool = pool
				next[domain] = e
			} else {
				sn := ""
				if s, err := db.GetSiteByID(p.database, siteIDs[domain]); err == nil && s != nil {
					sn = s.Name
				}
				next[domain] = domainEntry{port: 0, siteID: siteIDs[domain], siteName: sn, pool: pool}
			}
		}

		// atomically install the updated cache with attached pools
		p.cache.Store(&next)
		logger.Debug("proxy: RP routes loaded — %d domains with upstream pools", len(poolMap))
	}

	// log the success and return
	logger.Debug("proxy: domain cache warmed with %d entries", len(m))
	return nil
}

// WarmTLSCache proactively loads certificates for all registered domains into
// the autocert in-memory cache to prevent disk reads on the first TLS handshake
// after a restart. Runs in a goroutine so it does not block proxy startup.
func (p *Proxy) warmTLSCache() {

	// warm the TLS cache in a goroutine so it does not block startup
	go func() {

		// load the current domain cache snapshot
		ptr := p.cache.Load()
		if ptr == nil {
			return
		}
		for domain := range *ptr {
			hello := &tls.ClientHelloInfo{ServerName: domain}
			if _, err := p.manager.GetCertificate(hello); err != nil {
				// not fatal — cert may not exist yet or may need renewal
				logger.Debug("WarmTLSCache: could not pre-load cert for '%s': %v", domain, err)
			}
		}
		logger.Debug("WarmTLSCache: completed pre-load for %d domains", len(*ptr))
	}()
}

// WarmConnections proactively establishes TCP connections to all registered
// site backends so the first real visitor request never pays the dial cost.
// Container sites are warmed via p.transport; RP upstream URLs via p.rpTransport.
// Runs in a goroutine — failures are non-fatal (pod may not be running yet).
func (p *Proxy) warmConnections() {

	// warm the connections in a goroutine so it does not block startup
	go func() {

		// load the current domain cache snapshot
		ptr := p.cache.Load()
		if ptr == nil {
			return
		}

		// short timeout — we only want to establish the connection, not wait
		// for a full response; failures are expected for stopped pods
		client := &http.Client{
			Transport: p.transport,
			Timeout:   5 * time.Second,
		}
		rpClient := &http.Client{
			Transport: p.rpTransport,
			Timeout:   5 * time.Second,
		}

		// track which ports have already been warmed to avoid duplicate dials
		seenPorts := make(map[int]struct{})

		// iterate over the cache entries and warm each unique port
		for _, entry := range *ptr {

			// warm RP upstream pool connections via rpTransport
			if entry.pool != nil {
				targets := entry.pool.Targets()
				for _, target := range targets {

					// probe the cert verdict so serving can opportunistically verify TLS
					p.probeUpstreamTLS(target)

					// setup the url
					url := target.Scheme + "://" + target.Host + "/"
					resp, err := rpClient.Head(url)
					if err != nil {
						logger.Debug("WarmConnections: RP upstream %s: %v", url, err)
						continue
					}
					resp.Body.Close()
					logger.Debug("WarmConnections: warmed RP upstream %s", url)
				}
			}

			// skip zero-port entries with no pool, and skip the admin port
			if entry.port == 0 || entry.port == p.adminPort {
				continue
			}

			// deduplicate — multiple domains may share the same container port
			if _, seen := seenPorts[entry.port]; seen {
				continue
			}
			seenPorts[entry.port] = struct{}{}

			// warm the container site backend via transport
			url := fmt.Sprintf("http://%s:%d/", p.hostGateway, entry.port)
			resp, err := client.Head(url)
			if err != nil {
				logger.Debug("WarmConnections: port %d: %v", entry.port, err)
				continue
			}
			resp.Body.Close()
			logger.Debug("WarmConnections: warmed port %d", entry.port)
		}

		// log the success
		logger.Debug("WarmConnections: completed warmup for %d unique ports", len(seenPorts))
	}()
}

// WarmSecurityCache compiles all IP, UA, and country rules from the database
// and atomically installs the result. Called once on startup and after any rule change.
func (p *Proxy) warmSecurityCache(ipRules []*db.IPRule, uaRules []*db.UARule, countryRules []*db.CountryRule, asnRules []*db.ASNRule) {
	cache := buildSecurityCache(ipRules, uaRules, countryRules, asnRules)
	p.secCache.Store(&cache)
	logger.Debug("proxy: security cache warmed — %d IP rules, %d UA rules, %d country rules, %d ASN rules", len(ipRules), len(uaRules), len(countryRules), len(asnRules))
}

// WarmTrustedProxies loads trusted proxy CIDRs from the database, compiles them
// into net.IPNet ranges, and atomically installs the result. Called on startup,
// after a settings change, and by StartTrustedProxyRefresher after each fetch.
func (p *Proxy) warmTrustedProxies(cidrs []string) {

	// compile the CIDRs into net.IPNet ranges, skipping any invalid entries
	tbl := ipTable{}
	for _, cidr := range cidrs {

		// bare IPs are not valid proxy ranges — reject anything without a mask
		if _, err := netip.ParsePrefix(cidr); err != nil {
			logger.Warn("WarmTrustedProxies: skipping invalid CIDR '%s': %v", cidr, err)
			continue
		}
		if err := tbl.add(cidr); err != nil {
			logger.Warn("WarmTrustedProxies: skipping invalid CIDR '%s': %v", cidr, err)
		}
	}

	// atomically install the compiled ranges
	p.trustedProxies.Store(&tbl)
	logger.Debug("proxy: trusted proxies warmed — %d ranges", tbl.len())
}

// warmBypassCache compiles bypass CIDRs/IPs and atomically installs the result.
// Called on startup and after any bypass rule change.
func (p *Proxy) warmBypassCache(rules []*db.BypassRule) {

	// compile the bypass CIDRs into compiledIPRule entries, skipping any invalid entries
	tbl := ipTable{}
	for _, r := range rules {
		if err := tbl.add(r.CIDR); err != nil {
			logger.Warn("warmBypassCache: skipping invalid entry '%s': %v", r.CIDR, err)
		}
	}

	// atomically install the compiled bypass rules
	p.bypassNets.Store(&tbl)
	logger.Debug("proxy: bypass cache warmed — %d entries", tbl.len())
}

// WarmWAFCache loads WAF settings and per-site overrides from the database,
// compiles the Coraza engine(s), and installs them atomically.
// Called once on startup and after any WAF settings change.
func (p *Proxy) warmWAFCache() error {

	// load the global WAF settings from the database
	settings, err := db.GetWAFSettings(p.database)
	if err != nil {
		logger.Error("proxy: failed to load WAF settings: %v", err)
		return err
	}

	// clear any previously compiled site engines
	p.wafSiteEngines.Range(func(k, _ any) bool {
		p.wafSiteEngines.Delete(k)
		return true
	})

	// if WAF is disabled, clear the global engine and overrides and return
	if !settings.Enabled {
		p.wafEnabled.Store(false)
		p.wafEngine.Store(nil)
		empty := make(map[int64]db.WAFSiteOverride)
		p.wafOverrides.Store(&empty)
		logger.Debug("proxy: WAF disabled")
		return nil
	}

	// prefer locally downloaded CRS rules over the embedded coraza-coreruleset;
	// fall back to the embedded ruleset only when no local install is present
	crsDir := ""
	localCRS := CRSDir(p.appPath)
	if _, err := os.Stat(filepath.Join(localCRS, ".version")); err == nil {
		crsDir = localCRS
		logger.Debug("proxy: using local CRS rules from %s", crsDir)
	} else {
		logger.Warn("proxy: local CRS not found, falling back to embedded coraza-coreruleset")
	}

	// build the global engine — no plugins loaded at the global level
	engine, err := NewWAFEngine(settings, "", crsDir, nil)
	if err != nil {
		return err
	}

	// fetch per-site overrides and plugin selections for cache warming
	siteOverrides, err := db.GetAllWAFSiteOverrides(p.database)
	if err != nil {
		logger.Error("proxy: failed to load WAF site overrides: %v", err)
		return err
	}

	// fetch all site plugin selections for cache warming
	sitePlugins, err := db.GetAllSitePlugins(p.database)
	if err != nil {
		logger.Error("proxy: failed to load WAF site plugins: %v", err)
		return err
	}

	// build a map of siteID→override for atomic installation; build site engines
	// for any site that has additional exclusions or plugins to apply
	overrideMap := make(map[int64]db.WAFSiteOverride, len(siteOverrides))
	for _, o := range siteOverrides {
		overrideMap[o.SiteID] = o
		plugins := sitePlugins[o.SiteID] // nil when no plugins selected
		// build a site engine when there are additional exclusions or plugins to apply
		needsSiteEngine := strings.TrimSpace(o.Exclusions) != "" || len(plugins) > 0
		if needsSiteEngine && o.Override != db.WAFOverrideOff {
			siteEngine, err := NewWAFEngine(settings, o.Exclusions, crsDir, plugins)
			if err != nil {
				logger.Error("proxy: WAF site engine build failed siteID=%d: %v", o.SiteID, err)
				continue
			}
			p.wafSiteEngines.Store(o.SiteID, siteEngine)
		}
	}

	// atomically install the global engine and the site override map
	p.wafEngine.Store(engine)
	p.wafOverrides.Store(&overrideMap)
	p.wafEnabled.Store(true)
	logger.Debug("proxy: WAF cache warmed — %d site overrides", len(siteOverrides))
	return nil
}

// swapCache applies fn to a shallow copy of the current domain map and
// atomically installs the result. The CAS loop handles concurrent writers.
func (p *Proxy) swapCache(fn func(map[string]domainEntry) map[string]domainEntry) {

	// CAS loop to handle concurrent writers
	for {
		oldPtr := p.cache.Load()
		var cur map[string]domainEntry
		if oldPtr != nil {
			cur = *oldPtr
		} else {
			cur = make(map[string]domainEntry)
		}
		next := fn(cur)
		if p.cache.CompareAndSwap(oldPtr, &next) {
			return
		}
	}
}

// WarmBypassCache is the exported wrapper called by the security handler after a bypass rule change.
func (p *Proxy) WarmBypassCache(rules []*db.BypassRule) {
	p.warmBypassCache(rules)
}
