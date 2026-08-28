// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package proxy

import (
	"podnest/internal/logger"
	"strings"
)

// AddDomain inserts a domain→port+siteID mapping into the cache atomically.
func (p *Proxy) AddDomain(domain string, port int, siteID int64, siteName string) {
	p.swapCache(func(cur map[string]domainEntry) map[string]domainEntry {
		next := make(map[string]domainEntry, len(cur)+1)
		for k, v := range cur {
			next[k] = v
		}
		next[domain] = domainEntry{port: port, siteID: siteID, siteName: siteName}
		return next
	})
	logger.Debug("proxy: cache added '%s' → port %d site %d", domain, port, siteID)
}

// RemoveDomain removes a single domain from the cache atomically.
func (p *Proxy) RemoveDomain(domain string) {
	p.swapCache(func(cur map[string]domainEntry) map[string]domainEntry {
		next := make(map[string]domainEntry, len(cur))
		for k, v := range cur {
			if k != domain {
				next[k] = v
			}
		}
		return next
	})
	logger.Debug("proxy: cache removed '%s'", domain)
}

// RemoveDomains removes a set of domains atomically — used when an entire site is deleted.
func (p *Proxy) RemoveDomains(domains []string) {
	drop := make(map[string]struct{}, len(domains))
	for _, d := range domains {
		drop[d] = struct{}{}
	}
	p.swapCache(func(cur map[string]domainEntry) map[string]domainEntry {
		next := make(map[string]domainEntry, len(cur))
		for k, v := range cur {
			if _, skip := drop[k]; !skip {
				next[k] = v
			}
		}
		return next
	})
	logger.Debug("proxy: cache removed %d domains", len(domains))
}

// ForgetSite evicts every piece of per-site proxy state — called on site
// deletion. Must run after RemoveDomains so the upstream sweep no longer sees
// this site's pools; anything still reachable through the domain cache is
// another site's and is left alone.
func (p *Proxy) ForgetSite(siteID int64, port int) {
	p.rpCache.Delete(port)
	p.basicAuthCache.Delete(siteID)
	p.redirectCache.Delete(siteID)
	p.ReopenLogs(siteID)
	p.pruneUpstreamCaches()
}

// pruneUpstreamCaches drops cached reverse proxies and TLS verdicts for
// upstreams no longer referenced by any pool in the domain cache.
func (p *Proxy) pruneUpstreamCaches() {
	live := make(map[string]struct{})
	liveTLS := make(map[string]struct{})
	if ptr := p.cache.Load(); ptr != nil {
		for _, e := range *ptr {
			if e.pool == nil {
				continue
			}
			for _, t := range e.pool.Targets() {
				live[t.String()] = struct{}{}
				liveTLS[upstreamTLSKey(t)] = struct{}{}
			}
		}
	}

	p.rpProxyCache.Range(func(k, _ any) bool {
		key, _ := k.(string)
		target, _, _ := strings.Cut(key, "|ph=")
		if _, ok := live[target]; !ok {
			p.rpProxyCache.Delete(k)
		}
		return true
	})

	p.rpTLSVerified.Range(func(k, _ any) bool {
		key, _ := k.(string)
		if _, ok := liveTLS[key]; !ok {
			p.rpTLSVerified.Delete(k)
		}
		return true
	})
}

// SetAdminDomain updates the admin domain on the running proxy without a restart.
func (p *Proxy) SetAdminDomain(domain string) {
	p.adminMu.Lock()
	defer p.adminMu.Unlock()
	p.adminDomain = domain
	logger.Debug("proxy admin domain updated to '%s'", domain)
}
