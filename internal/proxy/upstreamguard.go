// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package proxy

import (
	"context"
	"errors"
	"fmt"
	"net/netip"
	"time"

	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/podman"
)

// errForeignUpstream is returned when an upstream resolves to an address or
// port belonging to a site owned by a different user.
var errForeignUpstream = errors.New("upstream targets another owner's site")

const (
	guardMaxAge    = 30 * time.Second
	guardMissRetry = 2 * time.Second
)

type guardSubnet struct {
	prefix netip.Prefix
	owner  int64
}

// upstreamGuard maps every site-owned address and port to its owning user so
// a reverse proxy route can be refused when it targets another owner's site.
// The proxy applies security settings for the domain a request arrives on, not
// the site it is forwarded to — without this, a route pointed at another
// owner's site serves it with none of that site's protections (basic auth, WAF,
// IP rules) applied.
type upstreamGuard struct {
	gateway   netip.Addr
	siteOwner map[int64]int64
	portOwner map[int]int64
	subnets   []guardSubnet
	built     time.Time
}

// check reports whether addr belongs to a site owned by someone other than the
// owner of siteID, and whether the guard had enough data to decide. An unknown
// siteID is reported as foreign so a guard that still misses it after a
// rebuild fails closed.
func (g *upstreamGuard) check(siteID int64, addr netip.AddrPort) (foreign, known bool) {
	owner, ok := g.siteOwner[siteID]
	if !ok {
		return true, false
	}

	// site web and pma ports are only published on the host gateway
	ip := addr.Addr().Unmap()
	if ip.IsLoopback() || ip.IsUnspecified() || ip == g.gateway {
		portOwner, ok := g.portOwner[int(addr.Port())]
		if !ok {
			return false, false
		}
		return portOwner != owner, true
	}

	// any port inside a site network — redis, mariadb, php, web — belongs to that site
	for _, s := range g.subnets {
		if s.prefix.Contains(ip) {
			return s.owner != owner, true
		}
	}

	// site networks are always private, so a public miss is conclusive
	return false, !ip.IsPrivate()
}

// buildUpstreamGuard loads site ownership from the database and site network
// subnets from Podman.
func (p *Proxy) buildUpstreamGuard(ctx context.Context) (*upstreamGuard, error) {
	sites, err := db.GetAllSites(p.database)
	if err != nil {
		logger.Error("proxy: upstream guard failed to load sites: %v", err)
		return nil, err
	}

	g := &upstreamGuard{
		siteOwner: make(map[int64]int64, len(sites)),
		portOwner: make(map[int]int64, len(sites)*2),
		built:     time.Now(),
	}
	if gw, err := netip.ParseAddr(p.hostGateway); err == nil {
		g.gateway = gw.Unmap()
	}

	netOwner := make(map[string]int64, len(sites))
	for _, s := range sites {
		g.siteOwner[s.ID] = s.UID
		if s.Port > 0 {
			g.portOwner[s.Port] = s.UID
		}
		if s.PMAPort > 0 {
			g.portOwner[s.PMAPort] = s.UID
		}
		netOwner[podman.NetworkName(s.Name)] = s.UID
	}

	if p.podman == nil {
		return nil, fmt.Errorf("upstream guard: no podman client")
	}
	nets, err := p.podman.NetworkSubnets(ctx)
	if err != nil {
		logger.Error("proxy: upstream guard failed to load network subnets: %v", err)
		return nil, err
	}
	for name, prefixes := range nets {
		owner, ok := netOwner[name]
		if !ok {
			continue
		}
		for _, pfx := range prefixes {
			g.subnets = append(g.subnets, guardSubnet{prefix: pfx, owner: owner})
		}
	}

	logger.Debug("proxy: upstream guard built — %d sites, %d ports, %d subnets", len(g.siteOwner), len(g.portOwner), len(g.subnets))
	return g, nil
}

// loadUpstreamGuard returns the current guard, rebuilding it when it has been
// invalidated or has aged out. refresh forces a rebuild once the current guard
// is older than guardMissRetry, so a miss can pick up a just-created site
// without letting a stream of misses hammer the Podman API.
func (p *Proxy) loadUpstreamGuard(ctx context.Context, refresh bool) (*upstreamGuard, error) {
	maxAge := guardMaxAge
	if refresh {
		maxAge = guardMissRetry
	}

	if g := p.guard.Load(); g != nil && time.Since(g.built) <= maxAge {
		return g, nil
	}

	p.guardMu.Lock()
	defer p.guardMu.Unlock()

	// another caller may have rebuilt it while this one waited
	if g := p.guard.Load(); g != nil && time.Since(g.built) <= maxAge {
		return g, nil
	}

	g, err := p.buildUpstreamGuard(ctx)
	if err != nil {
		return nil, err
	}
	p.guard.Store(g)
	return g, nil
}

// invalidateUpstreamGuard drops the current guard so the next check rebuilds it.
func (p *Proxy) invalidateUpstreamGuard() {
	p.guard.Store(nil)
}

// checkUpstream returns an error wrapping errForeignUpstream when addr belongs
// to a site owned by someone other than the owner of siteID. A guard that
// cannot decide is rebuilt once and asked again; a guard that cannot be built
// refuses the upstream.
func (p *Proxy) checkUpstream(ctx context.Context, siteID int64, addr netip.AddrPort) error {
	g, err := p.loadUpstreamGuard(ctx, false)
	if err != nil {
		return err
	}

	foreign, known := g.check(siteID, addr)
	if !known {
		if g, err = p.loadUpstreamGuard(ctx, true); err != nil {
			return err
		}
		foreign, _ = g.check(siteID, addr)
	}

	if foreign {
		logger.Warn("proxy: refused upstream %s for site %d: owned by another user", addr, siteID)
		return fmt.Errorf("%w: %s", errForeignUpstream, addr)
	}
	return nil
}
