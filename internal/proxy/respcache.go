// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package proxy

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"podnest/internal/cache"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
)

// respCapture wraps the response writer to tee a cacheable upstream response
// into a cache entry while it streams to the client; headers are inspected after
// the reverse proxy has finalised them, and the body is never buffered ahead of
// the client
type respCapture struct {
	http.ResponseWriter
	store   *cache.Store
	set     cache.Settings
	primary string
	req     http.Header
	names   []string
	hdr     http.Header
	status  int
	ttl     time.Duration
	body    cache.Builder
	wrote   bool
	active  bool
}

// respCacheBypassCookies are lowercase substrings of a Cookie header that mark a
// request as personalised; the list matches the Varnish bypass_cookies default
var respCacheBypassCookies = []string{
	"wordpress_logged_in", "wordpress_sec", "woocommerce_", "wp_woocommerce",
	"phpsessid", "laravel_session", "ci_session", "symfony", "sess",
	"sessionid", "connect.sid",
}

// WriteHeader decides whether the response is cacheable before passing it on;
// informational 1xx responses are passed through untouched
func (c *respCapture) WriteHeader(code int) {
	if !c.wrote && code >= 200 {
		c.wrote = true
		c.decide(code)
	}
	c.ResponseWriter.WriteHeader(code)
}

// Write forwards the body to the client first, then copies what was written into
// the entry; capture is abandoned on a write error or once the body is too large
func (c *respCapture) Write(b []byte) (int, error) {
	if !c.wrote {
		c.WriteHeader(http.StatusOK)
	}
	n, err := c.ResponseWriter.Write(b)
	if c.active && (err != nil || !c.body.Write(b[:n])) {
		c.active = false
	}
	return n, err
}

// Flush delegates to the underlying ResponseWriter's Flusher implementation
func (c *respCapture) Flush() {
	if f, ok := c.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// Unwrap exposes the underlying ResponseWriter to http.ResponseController
func (c *respCapture) Unwrap() http.ResponseWriter {
	return c.ResponseWriter
}

// decide applies the response-side cacheability rules to the final headers
func (c *respCapture) decide(code int) {
	if code != http.StatusOK && code != http.StatusMovedPermanently {
		return
	}

	h := c.ResponseWriter.Header()
	if h.Get("Set-Cookie") != "" || h.Get("Trailer") != "" {
		return
	}
	if strings.HasPrefix(strings.ToLower(h.Get("Content-Type")), "text/event-stream") {
		return
	}
	if strings.Contains(strings.ToLower(h.Get("Pragma")), "no-cache") {
		return
	}
	if cl := h.Get("Content-Length"); cl != "" {
		if n, err := strconv.ParseInt(cl, 10, 64); err != nil || n > models.ProxyCacheMaxObject {
			return
		}
	}

	names, ok := cache.VaryNames(h)
	if !ok {
		return
	}
	ttl, ok := responseTTL(h, c.set)
	if !ok {
		return
	}

	c.hdr = h.Clone()
	c.hdr.Del("Date")
	c.names = names
	c.status = code
	c.ttl = ttl
	c.active = true
}

// finish stores the captured response; call it only after the upstream response
// completed normally — an aborted copy must never reach the cache
func (c *respCapture) finish() {
	if !c.active {
		return
	}
	chunks, length, ok := c.body.Chunks()
	if !ok {
		return
	}
	if cl := c.hdr.Get("Content-Length"); cl != "" {
		if n, err := strconv.ParseInt(cl, 10, 64); err != nil || n != length {
			return
		}
	}
	c.store.Put(c.primary, c.names, c.req, &cache.Entry{
		Status:  c.status,
		Header:  c.hdr,
		Chunks:  chunks,
		Length:  length,
		Expires: time.Now().Add(c.ttl),
	}, c.set.Memory)
}

// respCacheBegin serves a cache hit when one exists, reporting served=true. On a
// miss it returns the writer to proxy through — a capturing wrapper when the
// response may be stored — and a done func to call once the upstream response
// completed normally.
func (p *Proxy) respCacheBegin(w http.ResponseWriter, r *http.Request, siteID int64) (served bool, out http.ResponseWriter, done func()) {
	noop := func() {}
	if siteID <= 0 {
		return false, w, noop
	}

	set := p.respCache.Settings(siteID)
	if !set.Enabled || !respCacheableRequest(r) {
		return false, w, noop
	}

	primary := p.respCacheKey(r)
	store := p.respCache.Store(siteID)
	if e, ok := store.Get(primary, r.Header, time.Now()); ok {
		serveCached(w, r, e)
		return true, w, noop
	}
	if r.Method != http.MethodGet {
		return false, w, noop
	}

	c := &respCapture{ResponseWriter: w, store: store, set: set, primary: primary, req: r.Header}
	return false, c, c.finish
}

// respCacheableRequest applies the request-side cacheability rules; the path
// bypass mirrors the nginx FastCGI cache's $pn_skip_cache
func respCacheableRequest(r *http.Request) bool {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		return false
	}
	if r.Body != nil && r.Body != http.NoBody {
		return false
	}
	if r.Header.Get("Authorization") != "" || r.Header.Get("Range") != "" || r.Header.Get("Upgrade") != "" {
		return false
	}
	if strings.HasPrefix(strings.ToLower(r.URL.RequestURI()), "/wp-admin/") {
		return false
	}
	ck := strings.ToLower(strings.Join(r.Header.Values("Cookie"), "; "))
	for _, name := range respCacheBypassCookies {
		if strings.Contains(ck, name) {
			return false
		}
	}
	return true
}

// respCacheKey builds the primary cache key — scheme, host and full request URI.
// The scheme honours X-Forwarded-Proto only from a trusted peer, so HTTP and
// HTTPS never share an entry. The method is not part of the key: HEAD is
// answered from a GET entry.
func (p *Proxy) respCacheKey(r *http.Request) string {
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	if p.peerTrusted(r) {
		xfp, _, _ := strings.Cut(r.Header.Get("X-Forwarded-Proto"), ",")
		xfp = strings.ToLower(strings.TrimSpace(xfp))
		if xfp == "https" || xfp == "http" {
			scheme = xfp
		}
	}
	return scheme + "|" + normalizeHost(r) + "|" + r.URL.RequestURI()
}

// serveCached writes a cached entry to the client chunk by chunk
func serveCached(w http.ResponseWriter, r *http.Request, e *cache.Entry) {
	h := w.Header()
	for k, vs := range e.Header {
		h[k] = append([]string(nil), vs...)
	}
	w.WriteHeader(e.Status)
	if r.Method == http.MethodHead {
		return
	}
	for _, chunk := range e.Chunks {
		if _, err := w.Write(chunk); err != nil {
			return
		}
	}
}

// responseTTL applies the response Cache-Control rules and returns how long the
// response may be cached, or false when it must not be cached
func responseTTL(h http.Header, set cache.Settings) (time.Duration, bool) {
	cc := make(map[string]string)
	for _, v := range h.Values("Cache-Control") {
		for _, d := range strings.Split(v, ",") {
			name, val, _ := strings.Cut(strings.TrimSpace(d), "=")
			cc[strings.ToLower(strings.TrimSpace(name))] = strings.Trim(strings.TrimSpace(val), `"`)
		}
	}
	for _, deny := range []string{"private", "no-store", "no-cache"} {
		if _, ok := cc[deny]; ok {
			return 0, false
		}
	}

	ttl := set.TTL
	if set.TTLMode == "upstream" {
		for _, key := range []string{"s-maxage", "max-age"} {
			secs, err := strconv.ParseInt(cc[key], 10, 64)
			if err != nil || secs < 0 {
				continue
			}
			if d := time.Duration(secs) * time.Second; d < ttl {
				ttl = d
			}
			break
		}
	}
	return ttl, ttl > 0
}

// warmRespCache loads every site's proxy cache settings and refreshes the
// response cache in place; stores are kept unless their site was disabled,
// shrunk or removed. On a read error the previous settings stay in force.
func (p *Proxy) warmRespCache() {
	all, err := db.GetAllConfigsByType(p.database, models.ConfigProxyCache)
	if err != nil {
		logger.Error("proxy: warmRespCache: %v", err)
		return
	}
	p.respCache.Refresh(all)
	logger.Debug("proxy: response cache settings warmed — %d sites", len(all))
}

// PurgeRespCache drops every cached response for a site
func (p *Proxy) PurgeRespCache(siteID int64) {
	p.respCache.Purge(siteID)
}

// UpdateRespCache installs one site's proxy cache settings without a full warm,
// purging or shrinking its cache when it was disabled or its memory cap lowered
func (p *Proxy) UpdateRespCache(siteID int64, kv map[string]string) error {
	return p.respCache.Update(siteID, kv)
}
