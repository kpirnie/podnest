// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package proxy

import (
	"net"
	"net/http"
	"net/netip"
	"strconv"
	"time"

	"podnest/internal/db"
	"podnest/internal/logger"
)

// abVerdict is the outcome of an auto-ban check
type abVerdict int

const (
	abAllow    abVerdict = iota // no ban or cooldown applies
	abCooldown                  // the IP is rate limited and gets a 429
	abBanned                    // the IP is banned and gets a 403
)

// abKey identifies an IP within an auto-ban scope; siteID 0 is the global
// scope, which counts hits on unregistered domains
type abKey struct {
	siteID int64
	ip     netip.Addr
}

// abCounter tracks one IP's qualifying hits within the current window and any
// 429 cooldown it is serving
type abCounter struct {
	start         time.Time
	hits          int
	total         int
	cooldownUntil time.Time
}

// abBan is one IP's ban within a scope. Expired bans are kept until their
// strike window lapses so repeat offences escalate to permanent.
type abBan struct {
	hits         int
	strikes      int
	strikesSince time.Time
	expires      time.Time
	permanent    bool
}

// active reports whether the ban is in force at now
func (b *abBan) active(now time.Time) bool {
	return b.permanent || now.Before(b.expires)
}

// autoBanSettings resolves the effective auto-ban settings for a scope and
// whether auto-ban is enabled there. The global scope is always enabled.
func (p *Proxy) autoBanSettings(siteID int64) (db.AutoBanSettings, bool) {
	s := *p.abSettings.Load()
	if siteID == 0 {
		return s, true
	}

	o, ok := (*p.abOverrides.Load())[siteID]
	if !ok {
		return s, true
	}

	// nil override values inherit the global setting
	for _, f := range []struct {
		dst *int
		src *int
	}{
		{&s.Threshold, o.Threshold},
		{&s.WindowSecs, o.WindowSecs},
		{&s.CooldownSecs, o.CooldownSecs},
		{&s.BanSecs, o.BanSecs},
		{&s.PermStrikes, o.PermStrikes},
		{&s.PermWindowSecs, o.PermWindowSecs},
	} {
		if f.src != nil {
			*f.dst = *f.src
		}
	}
	return s, o.Enabled
}

// autoBanExempt reports whether an IP is outside auto-ban entirely — bypassed
// IPs and IP-whitelist matches in either scope are trusted by the operator.
func (p *Proxy) autoBanExempt(clientIP net.IP, addr netip.Addr, siteID int64) bool {
	if isIPBypassed(clientIP, p.bypassNets.Load()) {
		return true
	}

	sec := p.secCache.Load()
	if _, hit := sec.global.ipWhitelist.lookup(addr); hit {
		return true
	}
	if siteID > 0 {
		if rs, ok := sec.perSite[siteID]; ok {
			if _, hit := rs.ipWhitelist.lookup(addr); hit {
				return true
			}
		}
	}
	return false
}

// abCount adds a hit to c, restarting the window once it has lapsed, and
// reports whether the threshold was reached. A trip restarts the window.
func abCount(c *abCounter, s db.AutoBanSettings, now time.Time) bool {
	if now.Sub(c.start) > time.Duration(s.WindowSecs)*time.Second {
		c.start = now
		c.hits = 0
	}
	c.hits++
	c.total++
	if c.hits < s.Threshold {
		return false
	}
	c.start = now
	c.hits = 0
	return true
}

// autoBanCheck reports whether addr is banned or cooling down in the global
// scope or the given site's scope. Hits that arrive during a cooldown count
// toward the ban, so a client that ignores the 429 converts it into one.
func (p *Proxy) autoBanCheck(addr netip.Addr, siteID int64, now time.Time) (abVerdict, time.Duration) {
	scopes := []int64{0}
	if siteID > 0 {
		if _, enabled := p.autoBanSettings(siteID); enabled {
			scopes = append(scopes, siteID)
		}
	}

	// fast path — nearly every request carries no ban or cooldown, so a read
	// lock is all the hot path pays
	cooling := false
	p.abMu.RLock()
	for _, sid := range scopes {
		key := abKey{sid, addr}
		if b := p.abBans[key]; b != nil && b.active(now) {
			p.abMu.RUnlock()
			return abBanned, 0
		}
		if c := p.abCounters[key]; c != nil && now.Before(c.cooldownUntil) {
			cooling = true
		}
	}
	p.abMu.RUnlock()
	if !cooling {
		return abAllow, 0
	}

	p.abMu.Lock()
	defer p.abMu.Unlock()
	for _, sid := range scopes {
		key := abKey{sid, addr}
		c := p.abCounters[key]
		if c == nil || !now.Before(c.cooldownUntil) {
			continue
		}
		s, _ := p.autoBanSettings(sid)
		if abCount(c, s, now) {
			p.abBan(key, c, s, now)
			return abBanned, 0
		}
		return abCooldown, c.cooldownUntil.Sub(now)
	}
	return abAllow, 0
}

// autoBanRecord counts a 4xx/5xx response toward the IP's auto-ban in the
// given scope — siteID 0 counts hits on unregistered domains, which no
// legitimate client lands on. Crossing the threshold starts a 429 cooldown.
func (p *Proxy) autoBanRecord(clientIP net.IP, siteID int64, status int) {
	if clientIP == nil || status < 400 {
		return
	}
	addr, ok := toAddr(clientIP)
	if !ok || p.autoBanExempt(clientIP, addr, siteID) {
		return
	}
	s, enabled := p.autoBanSettings(siteID)
	if !enabled {
		return
	}

	now := time.Now()
	key := abKey{siteID, addr}

	p.abMu.Lock()
	defer p.abMu.Unlock()

	c := p.abCounters[key]
	if c == nil {
		c = &abCounter{start: now}
		p.abCounters[key] = c
	}
	if !abCount(c, s, now) {
		return
	}

	// a trip while already cooling down converts straight to a ban
	if now.Before(c.cooldownUntil) {
		p.abBan(key, c, s, now)
		return
	}
	c.cooldownUntil = now.Add(time.Duration(s.CooldownSecs) * time.Second)
	logger.Warn("autoban: %s rate limited on siteID=%d for %ds after %d error responses", addr, siteID, s.CooldownSecs, s.Threshold)
}

// abBan bans key, carrying strikes forward within the strike window and making
// the ban permanent once the strike limit is reached. A site ban escalates to
// a global one when the IP is banned on enough sites. Caller holds abMu.
func (p *Proxy) abBan(key abKey, c *abCounter, s db.AutoBanSettings, now time.Time) {
	b := p.abBans[key]
	if b == nil {
		b = &abBan{}
		p.abBans[key] = b
	}

	if b.strikes == 0 || now.Sub(b.strikesSince) > time.Duration(s.PermWindowSecs)*time.Second {
		b.strikes = 1
		b.strikesSince = now
	} else {
		b.strikes++
	}
	if c != nil {
		b.hits += c.total
	}
	b.permanent = b.permanent || b.strikes >= s.PermStrikes
	b.expires = now.Add(time.Duration(s.BanSecs) * time.Second)
	delete(p.abCounters, key)

	logger.Warn("autoban: %s banned on siteID=%d (strike %d, permanent=%v)", key.ip, key.siteID, b.strikes, b.permanent)
	p.persistAutoBan(key, b)

	if key.siteID != 0 {
		p.abEscalate(key.ip, now)
	}
}

// abEscalate bans ip globally once it holds active bans on enough sites — the
// same IP failing across sites is probing the server, not one site. Caller
// holds abMu.
func (p *Proxy) abEscalate(ip netip.Addr, now time.Time) {
	gkey := abKey{0, ip}
	if b := p.abBans[gkey]; b != nil && b.active(now) {
		return
	}

	s, _ := p.autoBanSettings(0)
	sites := 0
	for k, b := range p.abBans {
		if k.ip == ip && k.siteID != 0 && b.active(now) {
			sites++
		}
	}
	if sites < s.EscalateSites {
		return
	}

	logger.Warn("autoban: %s escalated to a global ban after bans on %d sites", ip, sites)
	p.abBan(gkey, nil, s, now)
}

// persistAutoBan writes a ban to the database off the request path. Caller
// holds abMu, so the row is copied out before the goroutine runs.
func (p *Proxy) persistAutoBan(key abKey, b *abBan) {
	row := &db.AutoBan{
		IP:           key.ip.String(),
		Hits:         b.hits,
		Strikes:      b.strikes,
		StrikesSince: b.strikesSince.UTC(),
	}
	if key.siteID != 0 {
		sid := key.siteID
		row.SiteID = &sid
	}
	if !b.permanent {
		exp := b.expires.UTC()
		row.Expires = &exp
	}

	go func() {
		if err := db.SaveAutoBan(p.database, row); err != nil {
			logger.Error("autoban: persist %s for siteID=%d failed: %v", row.IP, key.siteID, err)
		}
	}()
}

// autoBanBlock enforces auto-bans for a request, writing a 403 for a ban or a
// 429 with Retry-After for a cooldown. Bypassed and whitelisted IPs are exempt.
// Returns true when the request was blocked and handled.
func (p *Proxy) autoBanBlock(w http.ResponseWriter, r *http.Request, clientIP net.IP, clientIPStr string, start time.Time, siteID int64, siteName string) bool {
	addr, ok := toAddr(clientIP)
	if !ok || p.autoBanExempt(clientIP, addr, siteID) {
		return false
	}

	verdict, retry := p.autoBanCheck(addr, siteID, time.Now())
	switch verdict {
	case abBanned:
		p.blockRequest(w, r, clientIPStr, start, siteID, siteName, "autoban")
		return true
	case abCooldown:
		w.Header().Set("Retry-After", strconv.Itoa(int(retry.Seconds())+1))
		http.Error(w, "too many requests", http.StatusTooManyRequests)
		p.writeAccessLog(r, http.StatusTooManyRequests, 0, start, time.Since(start), clientIPStr, siteID, siteName, "autoban-429")
		return true
	}
	return false
}

// autoBanBanned reports whether an IP holds an active global auto-ban. Used by
// the panel, which enforces bans but never counts toward or serves a cooldown.
func (p *Proxy) autoBanBanned(clientIP net.IP) bool {
	addr, ok := toAddr(clientIP)
	if !ok || p.autoBanExempt(clientIP, addr, 0) {
		return false
	}

	p.abMu.RLock()
	defer p.abMu.RUnlock()
	b := p.abBans[abKey{0, addr}]
	return b != nil && b.active(time.Now())
}

// AutoBanRemove lifts an IP's ban, strike history and any cooldown within a
// scope; siteID 0 is the global scope.
func (p *Proxy) AutoBanRemove(siteID int64, ip string) {
	addr, err := netip.ParseAddr(ip)
	if err != nil {
		return
	}
	key := abKey{siteID, addr.Unmap()}

	p.abMu.Lock()
	defer p.abMu.Unlock()
	delete(p.abBans, key)
	delete(p.abCounters, key)
}

// AutoBanSetPermanent makes an IP's ban within a scope permanent; siteID 0 is
// the global scope.
func (p *Proxy) AutoBanSetPermanent(siteID int64, ip string) {
	addr, err := netip.ParseAddr(ip)
	if err != nil {
		return
	}
	key := abKey{siteID, addr.Unmap()}

	p.abMu.Lock()
	defer p.abMu.Unlock()
	if b := p.abBans[key]; b != nil {
		b.permanent = true
	}
}

// forgetAutoBans drops every counter and ban held for a deleted site
func (p *Proxy) forgetAutoBans(siteID int64) {
	p.abMu.Lock()
	defer p.abMu.Unlock()
	for k := range p.abCounters {
		if k.siteID == siteID {
			delete(p.abCounters, k)
		}
	}
	for k := range p.abBans {
		if k.siteID == siteID {
			delete(p.abBans, k)
		}
	}
}

// warmAutoBanCache loads the auto-ban settings and site overrides, and on the
// first call the persisted bans so strike history survives a restart.
func (p *Proxy) warmAutoBanCache() error {
	s, err := db.GetAutoBanSettings(p.database)
	if err != nil {
		logger.Error("proxy: failed to load auto-ban settings: %v", err)
		return err
	}
	overrides, err := db.GetAllAutoBanSiteOverrides(p.database)
	if err != nil {
		logger.Error("proxy: failed to load auto-ban overrides: %v", err)
		return err
	}

	m := make(map[int64]db.AutoBanSiteOverride, len(overrides))
	for _, o := range overrides {
		m[o.SiteID] = o
	}
	p.abSettings.Store(&s)
	p.abOverrides.Store(&m)

	// bans are owned in memory once loaded — a rewarm must not roll back
	// strikes whose rows are still being persisted
	if p.abLoaded.Swap(true) {
		return nil
	}

	bans, err := db.GetAllAutoBans(p.database)
	if err != nil {
		p.abLoaded.Store(false)
		logger.Error("proxy: failed to load auto-bans: %v", err)
		return err
	}

	p.abMu.Lock()
	defer p.abMu.Unlock()
	for _, row := range bans {
		addr, err := netip.ParseAddr(row.IP)
		if err != nil {
			continue
		}
		key := abKey{ip: addr.Unmap()}
		if row.SiteID != nil {
			key.siteID = *row.SiteID
		}
		b := &abBan{hits: row.Hits, strikes: row.Strikes, strikesSince: row.StrikesSince, permanent: row.Expires == nil}
		if row.Expires != nil {
			b.expires = *row.Expires
		}
		p.abBans[key] = b
	}

	logger.Debug("proxy: auto-ban cache warmed with %d bans", len(bans))
	return nil
}

// PruneAutoBans drops lapsed counters and bans whose strike window has passed,
// then removes expired rows past the widest strike window from the database.
func (p *Proxy) PruneAutoBans() {
	now := time.Now()
	gs, _ := p.autoBanSettings(0)
	widest := time.Duration(gs.PermWindowSecs) * time.Second

	p.abMu.Lock()
	for k, c := range p.abCounters {
		s, _ := p.autoBanSettings(k.siteID)
		if now.Sub(c.start) > time.Duration(s.WindowSecs)*time.Second && !now.Before(c.cooldownUntil) {
			delete(p.abCounters, k)
		}
	}
	for k, b := range p.abBans {
		s, _ := p.autoBanSettings(k.siteID)
		window := time.Duration(s.PermWindowSecs) * time.Second
		if window > widest {
			widest = window
		}
		if !b.active(now) && now.Sub(b.strikesSince) > window {
			delete(p.abBans, k)
		}
	}
	p.abMu.Unlock()

	if _, err := db.PruneAutoBans(p.database, now.Add(-widest)); err != nil {
		logger.Warn("autoban: prune failed: %v", err)
	}
}
