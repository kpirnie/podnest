// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package proxy

import (
	"bufio"
	"context"
	"crypto/tls"
	"database/sql"
	"fmt"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"podnest/internal/auth"
	"podnest/internal/db"
	"podnest/internal/logger"

	"github.com/oschwald/maxminddb-golang"
	"github.com/quic-go/quic-go/http3"
	"golang.org/x/crypto/acme/autocert"
)

// domainEntry holds the routing target for a registered domain
type domainEntry struct {
	port     int
	siteID   int64
	siteName string
	pool     *UpstreamPool // non-nil for reverse_proxy sites; nil for container-based sites
}

// statusWriter wraps http.ResponseWriter to capture the status code and byte
// count written by the upstream handler for access log recording.
type statusWriter struct {
	http.ResponseWriter
	status int
	bytes  int
}

// write the response headers
func (sw *statusWriter) WriteHeader(code int) {
	sw.status = code
	sw.ResponseWriter.WriteHeader(code)
}

// writ the response
func (sw *statusWriter) Write(b []byte) (int, error) {
	n, err := sw.ResponseWriter.Write(b)
	sw.bytes += n
	return n, err
}

// Hijack delegates to the underlying ResponseWriter's Hijacker implementation,
// allowing WebSocket upgrades to succeed through the proxy's status wrapper.
func (sw *statusWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	h, ok := sw.ResponseWriter.(http.Hijacker)
	if !ok {
		return nil, nil, fmt.Errorf("underlying ResponseWriter does not implement http.Hijacker")
	}
	return h.Hijack()
}

// Flush delegates to the underlying ResponseWriter's Flusher implementation,
// allowing chunked/streaming responses to be flushed through the proxy's status wrapper.
func (sw *statusWriter) Flush() {
	if f, ok := sw.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// Proxy is the built-in TLS-terminating reverse proxy
type Proxy struct {
	database          *sql.DB
	hostGateway       string
	adminDomain       string
	adminPort         int
	appPath           string
	adminMu           sync.RWMutex                                 // guards adminDomain only
	cache             atomic.Pointer[map[string]domainEntry]       // domain → entry; swapped atomically on every change
	secCache          atomic.Pointer[securityCache]                // compiled rule sets; swapped atomically on rule changes
	wafEnabled        atomic.Bool                                  // true when global WAF is on
	wafEngine         atomic.Pointer[WAFEngine]                    // global compiled engine
	wafSiteEngines    sync.Map                                     // int64(siteID) → *WAFEngine
	wafOverrides      atomic.Pointer[map[int64]db.WAFSiteOverride] // per-site override map
	trustedProxies    atomic.Pointer[ipTable]                      // compiled trusted proxy ranges; swapped atomically on refresh
	bypassNets        atomic.Pointer[ipTable]                      // compiled bypass IP rules; swapped atomically on change
	geoDB             atomic.Pointer[maxminddb.Reader]             // in-memory country database; swapped atomically on refresh
	asnDB             atomic.Pointer[maxminddb.Reader]             // in-memory ASN database; swapped atomically on refresh
	dropFeed          atomic.Pointer[dropFeed]                     // Spamhaus DROP lists; swapped atomically on refresh
	rpCache           sync.Map                                     // int(port) → *httputil.ReverseProxy for container sites
	rpProxyCache      sync.Map                                     // string(url) → *httputil.ReverseProxy for RP upstream sites
	redirectCache     sync.Map                                     // int64(siteID) → []compiledRedirect; precompiled on store
	basicAuthCache    sync.Map                                     // int64(siteID) → *basicAuthEntry; nil entry means disabled
	transport         *http.Transport                              // shared connection pool across all reverse proxies
	adminTransport    *http.Transport                              // admin-panel pool — no ResponseHeaderTimeout for long ops (site provisioning)
	rpTransport       *http.Transport                              // shared connection pool for all reverse-proxy-type upstream sites
	rpVerifyTransport *http.Transport                              // verifying twin of rpTransport for upstreams whose certs probe as valid
	rpTLSVerified     sync.Map                                     // string(upstream host) → bool; probed cert-verification verdicts
	accessLog         *os.File                                     // structured access log for Fail2Ban consumption
	accessLogCh       chan accessLogEntry                          // async drain channel — request goroutines never block on log writes
	accessLogDone     chan struct{}                                // closed when the drain goroutine has finished
	logCloseCh        chan closeReq                                // rotation asks the drain to close and evict site handles
	wafLog            *os.File                                     // WAF-specific log for Fail2Ban and UI streaming
	siteAccessLogs    sync.Map                                     // int64(siteID) → *os.File for per-site access.log
	siteWAFLogs       sync.Map                                     // int64(siteID) → *os.File for per-site waf.log
	manager           *autocert.Manager
	httpSrv           *http.Server
	httpsSrv          *http.Server
	http3Srv          *http3.Server
}

// Config holds the proxy dependencies
type Config struct {
	DB          *sql.DB
	CertDir     string
	HostGateway string
	AdminDomain string
	AdminPort   int
	AppPath     string
}

// New creates and configures the proxy but does not start listeners
func New(cfg Config) *Proxy {

	// initialize the proxy with its dependencies and default transports
	p := &Proxy{
		database:    cfg.DB,
		hostGateway: cfg.HostGateway,
		adminDomain: cfg.AdminDomain,
		adminPort:   cfg.AdminPort,
		appPath:     cfg.AppPath,
		transport: &http.Transport{
			// dial timeout prevents stalls on first connection to a container that is
			// slow to accept — without this the OS default applies (~130s on Linux),
			DialContext: (&net.Dialer{
				Timeout:   10 * time.Second, // max time to establish TCP connection
				KeepAlive: 30 * time.Second, // keep-alive probe interval
			}).DialContext,
			TLSHandshakeTimeout:   10 * time.Second, // max time for TLS handshake to upstream
			ResponseHeaderTimeout: 60 * time.Second, // max time waiting for first response byte
			MaxIdleConns:          500,
			MaxIdleConnsPerHost:   100,
			IdleConnTimeout:       90 * time.Second,
		},
		// shared transport for all reverse-proxy-type upstream sites — allows idle
		// connection reuse across multiple RP sites rather than each upstream having
		// an isolated pool; TLS verification intentionally skipped for user-defined targets
		rpTransport: &http.Transport{
			DialContext: (&net.Dialer{
				Timeout:   10 * time.Second,
				KeepAlive: 30 * time.Second,
			}).DialContext,
			TLSHandshakeTimeout:   10 * time.Second,
			ResponseHeaderTimeout: 60 * time.Second,
			MaxIdleConns:          200,
			MaxIdleConnsPerHost:   20,
			IdleConnTimeout:       90 * time.Second,
			TLSClientConfig:       &tls.Config{InsecureSkipVerify: true}, //nolint:gosec — user-defined upstream
		},
		// verifying twin of rpTransport for upstreams whose certs probe as valid
		rpVerifyTransport: &http.Transport{
			DialContext: (&net.Dialer{
				Timeout:   10 * time.Second,
				KeepAlive: 30 * time.Second,
			}).DialContext,
			TLSHandshakeTimeout:   10 * time.Second,
			ResponseHeaderTimeout: 60 * time.Second,
			MaxIdleConns:          200,
			MaxIdleConnsPerHost:   20,
			IdleConnTimeout:       90 * time.Second,
		},
		// admin-panel transport mirrors `transport` but omits ResponseHeaderTimeout:
		// the panel is our own trusted upstream and long synchronous operations
		// (site provisioning — image pulls, container starts, MariaDB readiness wait)
		// legitimately take minutes to produce the first response byte
		adminTransport: &http.Transport{
			DialContext: (&net.Dialer{
				Timeout:   10 * time.Second,
				KeepAlive: 30 * time.Second,
			}).DialContext,
			TLSHandshakeTimeout: 10 * time.Second,
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 20,
			IdleConnTimeout:     90 * time.Second,
		},
	}

	// seed empty caches so Load() never returns nil before Warm calls run
	emptyDomain := make(map[string]domainEntry)
	p.cache.Store(&emptyDomain)

	// setup the initial empty security cache with no rules or per-site overrides
	emptySec := securityCache{perSite: make(map[int64]ruleSet)}
	p.secCache.Store(&emptySec)

	// seed an empty WAF cache with no global engine, no site engines, and no overrides
	emptyOverrides := make(map[int64]db.WAFSiteOverride)
	p.wafOverrides.Store(&emptyOverrides)

	// seed an initial empty trusted proxy list so Load() never returns nil
	emptyProxies := ipTable{}
	p.trustedProxies.Store(&emptyProxies)

	// seed an empty DROP feed so Load() never returns nil before the lists load
	emptyDrop := dropFeed{asns: make(map[uint32]struct{})}
	p.dropFeed.Store(&emptyDrop)

	// open or create the structured proxy access log for Fail2Ban to watch
	logDir := cfg.CertDir + "/../logs"
	if err := os.MkdirAll(logDir, 0750); err != nil {
		logger.Error("proxy: failed to create logs directory: %v", err)
	} else {
		logPath := logDir + "/proxy-access.log"
		if f, err := os.OpenFile(logPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0640); err != nil {
			logger.Error("proxy: failed to open access log %s: %v", logPath, err)
		} else {
			p.accessLog = f
			logger.Debug("proxy: access log opened at %s", logPath)
		}
	}

	// start the async access-log drain — a single writer goroutine owns every
	// log handle, which removes the per-request mutex and syscall from the
	// critical path of every request across every site
	p.accessLogCh = make(chan accessLogEntry, 4096)
	p.accessLogDone = make(chan struct{})
	p.logCloseCh = make(chan closeReq)
	go p.drainAccessLogs()

	// setup the waf log
	wafPath := logDir + "/waf.log"
	if f, err := os.OpenFile(wafPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0640); err != nil {
		logger.Warn("proxy: could not open WAF log %s: %v", wafPath, err)
	} else {
		p.wafLog = f
	}

	// setup the SSL cert manager, or the self signed cert manager if necessary
	p.manager = &autocert.Manager{
		Prompt:     autocert.AcceptTOS,
		HostPolicy: p.hostPolicy,
		Cache:      autocert.DirCache(cfg.CertDir),
	}
	selfCert, err := selfSignedCert(cfg.CertDir)
	if err != nil {
		logger.Error("failed to generate self-signed cert: %v", err)
	}

	// SERVE IT - SSL/TLS
	p.httpsSrv = &http.Server{
		Addr:    ":443",
		Handler: p,
		// ReadHeaderTimeout caps the header-send phase — safe for streaming since
		// it only applies before headers complete; guards against slowloris attacks
		ReadHeaderTimeout: 10 * time.Second,
		// IdleTimeout caps keep-alive connection idle time between requests
		IdleTimeout: 120 * time.Second,
		// WriteTimeout intentionally omitted — streaming responses (WP-CLI, chunked
		// uploads) require unlimited write time; set per-handler if needed
		TLSConfig: &tls.Config{
			GetCertificate: func(hello *tls.ClientHelloInfo) (*tls.Certificate, error) {
				cert, err := p.manager.GetCertificate(hello)
				if err != nil && selfCert.Certificate != nil {
					logger.Debug("autocert unavailable for %s, using self-signed", hello.ServerName)
					return &selfCert, nil
				}
				return cert, err
			},
			MinVersion: tls.VersionTLS12,
			// LRU session cache reduces full TLS handshakes for returning clients;
			// 1024 entries covers ~1024 concurrent session tickets in memory
			ClientSessionCache: tls.NewLRUClientSessionCache(1024),
		},
	}

	// SERVE IT - QUIC
	p.http3Srv = &http3.Server{
		Addr:      ":443",
		Handler:   p,
		TLSConfig: p.httpsSrv.TLSConfig,
	}

	// SERVE IT - HTTP
	p.httpSrv = &http.Server{
		Addr:              ":80",
		Handler:           p.manager.HTTPHandler(p),
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	return p
}

// Start launches HTTP, HTTPS, and HTTP/3 listeners.
func (p *Proxy) Start() error {

	// fire up the HTTP listener on :80 for ACME challenges
	go func() {
		logger.Debug("proxy HTTP listener starting on :80")
		if err := p.httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("proxy HTTP listener: %v", err)
		}
	}()

	// fire up the HTTP/3 listener on :443 (UDP) for QUIC support
	go func() {
		logger.Debug("proxy HTTP/3 listener starting on :443 (UDP)")
		if err := p.http3Srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("proxy HTTP/3 listener: %v", err)
		}
	}()

	// fire up the HTTPS listener on :443 for TLS traffic
	logger.Debug("proxy HTTPS listener starting on :443")
	return p.httpsSrv.ListenAndServeTLS("", "")
}

// Shutdown gracefully stops both listeners and closes the access log
func (p *Proxy) Shutdown(ctx context.Context) {

	// shutdown the HTTP, HTTPS, and HTTP/3 servers — errors are logged but not fatal
	_ = p.httpSrv.Shutdown(ctx)
	_ = p.httpsSrv.Shutdown(ctx)
	_ = p.http3Srv.Close()

	// stop accepting log lines and wait for the drain to flush what is queued
	// before the file handles are closed underneath it
	if p.accessLogCh != nil {
		close(p.accessLogCh)
		<-p.accessLogDone
	}

	// close the access log file
	if p.accessLog != nil {
		p.accessLog.Close()
	}

	// close the WAF log file — the drain has already stopped above
	if p.wafLog != nil {
		p.wafLog.Close()
	}
}

// ServeHTTP routes requests by domain, enforcing IP and UA security rules
// before any traffic reaches a site pod. All requests are recorded in the
// structured access log regardless of outcome.
func (p *Proxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	start := time.Now()

	// resolve the client IP once — string form is cached to avoid redundant allocations
	clientIP, clientIPStr := p.resolveClientIP(r)

	// normalize the host for routing and admin domain checks
	host := normalizeHost(r)

	// enforce global security rules before any host matching
	if p.enforceGlobalSecurity(w, r, clientIP, clientIPStr, start) {
		return
	}

	// route the host — if not registered anywhere, return 404
	entry, port, siteID, rpPool, ok := p.routeHost(host)
	if !ok {
		http.Error(w, "domain not registered", http.StatusNotFound)
		p.writeAccessLog(r, http.StatusNotFound, 0, start, time.Since(start), clientIPStr, 0, "")
		return
	}

	// resolve site name for per-site log routing — looked up once and reused
	// by writeAccessLog and WAF inspect; empty string for admin/unmatched traffic
	siteName := ""
	if siteID > 0 {
		siteName = entry.siteName
		logger.Debug("proxy: siteID=%d siteName=%q", siteID, siteName)
	}

	// check redirect rules before security enforcement — redirects are intentional
	// routing decisions, not subject to IP/UA/WAF filtering
	if siteID > 0 && p.applyRedirects(w, r, siteID, start, clientIPStr, siteName) {
		return
	}

	// enforce per-site basic auth — checked before IP/UA/WAF so 401 is returned cleanly
	if siteID > 0 && p.enforceBasicAuth(w, r, siteID, start, clientIPStr, siteName) {
		return
	}

	// enforce the combined global and per-site security rules plus the WAF
	if p.enforceSiteSecurity(w, r, clientIP, clientIPStr, start, siteID, siteName) {
		return
	}

	// wrap the writer to capture status + byte count for the access log
	sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}

	// advertise HTTP/3 support — only on routed requests, not on proxy-level error
	// responses (404 domain-not-found, 403 IP/UA/WAF blocks already returned above)
	sw.Header().Set(`Alt-Svc`, `h3=":443"; ma=86400`)

	// reverse proxy sites — cascade through the pool, first response that isn't
	// a transport error or >= 400 streams through unbuffered
	if rpPool != nil {
		startIdx := rpPool.NextIndex()

		// a failed first attempt has already consumed r.Body, so the cascade
		// replays from a buffer. Over the cap the body is left streaming and
		// no failover is attempted — a single try is better than sending a
		// truncated payload to a second upstream.
		replayable, body := bufferReplayBody(r)

		// first attempt
		first := rpPool.At(startIdx)
		firstTransport := p.rpTransportForTarget(first)
		if tryUpstream(sw, r, first, p.getOrCreateRPProxy(first.URL, first.PassHost, firstTransport)) {
			p.writeAccessLog(r, sw.status, sw.bytes, start, time.Since(start), clientIPStr, siteID, siteName)
			return
		}

		if !replayable {
			http.Error(sw, "upstream unavailable", http.StatusBadGateway)
			p.writeAccessLog(r, http.StatusBadGateway, 0, start, time.Since(start), clientIPStr, siteID, siteName)
			return
		}

		// a verified upstream may have a newly-broken cert — flip it back and retry once unverified
		if p.markTLSUnverified(first) {
			resetReplayBody(r, body)
			if tryUpstream(sw, r, first, p.getOrCreateRPProxy(first.URL, first.PassHost, p.rpTransport)) {
				p.writeAccessLog(r, sw.status, sw.bytes, start, time.Since(start), clientIPStr, siteID, siteName)
				return
			}
		}

		// first upstream failed — try the remaining upstreams
		for i := 1; i < rpPool.Len(); i++ {
			target := rpPool.At(startIdx + i)
			resetReplayBody(r, body)
			if tryUpstream(sw, r, target, p.getOrCreateRPProxy(target.URL, target.PassHost, p.rpTransportForTarget(target))) {
				p.writeAccessLog(r, sw.status, sw.bytes, start, time.Since(start), clientIPStr, siteID, siteName)
				return
			}
			logger.Debug("proxy: upstream %d failed, trying next", i)
		}

		http.Error(sw, "all upstreams unavailable", http.StatusBadGateway)
		p.writeAccessLog(r, http.StatusBadGateway, 0, start, time.Since(start), clientIPStr, siteID, siteName)
		return
	}

	// container-based sites — route to the container's port via cached reverse proxy
	p.siteProxy(sw, r, port)
	p.writeAccessLog(r, sw.status, sw.bytes, start, time.Since(start), clientIPStr, siteID, siteName)
}

// resolveClientIP extracts the real client IP from the request and caches its
// string form — net.IP.String() allocates a new string on every call, so
// converting once here avoids redundant allocations per request.
func (p *Proxy) resolveClientIP(r *http.Request) (net.IP, string) {
	ip := parseClientIP(r.RemoteAddr, r.Header.Get("X-Forwarded-For"), p.trustedProxies.Load())
	ipStr := "<unknown>"
	if ip != nil {
		ipStr = ip.String()
	}
	return ip, ipStr
}

// realClientIP returns the trusted-proxy-resolved client IP for use as X-Real-IP,
// or an empty string when it cannot be determined so the header is dropped rather
// than forwarded with a placeholder.
func (p *Proxy) realClientIP(r *http.Request) string {
	ip, ipStr := p.resolveClientIP(r)
	if ip == nil {
		return ""
	}
	return ipStr
}

// normalizeHost strips any port from the request host and lowercases it so
// routing matches case-insensitively against stored (lowercased) domains.
func normalizeHost(r *http.Request) string {
	host := r.Host
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}
	return strings.ToLower(host)
}

// blockRequest writes the 403 and records the block in the access log with a
// distinct reason token for stats drilldown.
func (p *Proxy) blockRequest(w http.ResponseWriter, r *http.Request, clientIPStr string, start time.Time, siteID int64, siteName, reason string) {
	http.Error(w, "forbidden", http.StatusForbidden)
	p.writeAccessLog(r, http.StatusForbidden, 0, start, time.Since(start), clientIPStr, siteID, siteName, reason)
}

// enforceGlobalSecurity applies the global IP, UA, country, and ASN rules
// before any host matching — unmatched hosts and probe traffic must not slip
// past the blacklists just because no site claims the domain. Per-site rules
// still run after routing. Bypass-listed IPs skip enforcement entirely.
// Returns true when the request was blocked and handled.
func (p *Proxy) enforceGlobalSecurity(w http.ResponseWriter, r *http.Request, clientIP net.IP, clientIPStr string, start time.Time) bool {

	// bypass list — matching IPs skip all enforcement
	if clientIP != nil && isIPBypassed(clientIP, p.bypassNets.Load()) {
		return false
	}

	sec := p.secCache.Load()

	// enforce global IP rules
	if clientIP != nil {
		if ok, reason := checkIP(clientIP, sec.global, ruleSet{}, p.dropFeed.Load(), false); !ok {
			p.blockRequest(w, r, clientIPStr, start, 0, "", reason)
			return true
		}
	}

	// enforce global UA rules
	if !checkUA(r.UserAgent(), sec.global, ruleSet{}) {
		p.blockRequest(w, r, clientIPStr, start, 0, "", "ua")
		return true
	}

	// enforce global country rules — geo lookup skipped when unconfigured
	if clientIP != nil && hasCountryRules(sec.global, ruleSet{}) {
		code := p.countryCode(clientIP)
		if !checkCountry(code, sec.global, ruleSet{}) {
			p.blockRequest(w, r, clientIPStr, start, 0, "", "geo:"+code)
			return true
		}
	}

	// enforce global ASN rules — ASN lookup skipped when unconfigured
	if clientIP != nil && hasASNRules(sec.global, ruleSet{}, p.dropFeed.Load()) {
		asn := p.asnNumber(clientIP)
		if ok, reason := checkASN(asn, sec.global, ruleSet{}, p.dropFeed.Load()); !ok {
			p.blockRequest(w, r, clientIPStr, start, 0, "", fmt.Sprintf("%s:AS%d", reason, asn))
			return true
		}
	}

	return false
}

// enforceSiteSecurity applies the combined global and per-site IP, UA,
// country, and ASN rules plus the WAF to a routed request. Bypass-listed IPs
// skip all enforcement. Returns true when the request was blocked and handled.
func (p *Proxy) enforceSiteSecurity(w http.ResponseWriter, r *http.Request, clientIP net.IP, clientIPStr string, start time.Time, siteID int64, siteName string) bool {

	// bypass list — matching IPs skip all IP, UA, and WAF enforcement
	if clientIP != nil && isIPBypassed(clientIP, p.bypassNets.Load()) {
		return false
	}

	// load the compiled security cache — single atomic load, no lock
	sec := p.secCache.Load()

	// retrieve the per-site rule set when we have a known site ID
	siteRules := ruleSet{}
	if siteID > 0 {
		if rs, ok := sec.perSite[siteID]; ok {
			siteRules = rs
		}
	}

	// enforce IP rules — whitelist match wins, otherwise blacklists decide
	if clientIP != nil {
		if ok, reason := checkIP(clientIP, sec.global, siteRules, p.dropFeed.Load(), true); !ok {
			p.blockRequest(w, r, clientIPStr, start, siteID, siteName, reason)
			return true
		}
	}

	// enforce UA rules — blacklist always beats whitelist
	if !checkUA(r.UserAgent(), sec.global, siteRules) {
		p.blockRequest(w, r, clientIPStr, start, siteID, siteName, "ua")
		return true
	}

	// enforce country rules — geo lookup is skipped entirely when no
	// country rules are configured in either scope
	if clientIP != nil && hasCountryRules(sec.global, siteRules) {
		code := p.countryCode(clientIP)
		if !checkCountry(code, sec.global, siteRules) {
			p.blockRequest(w, r, clientIPStr, start, siteID, siteName, "geo:"+code)
			return true
		}
	}

	// enforce ASN rules — the ASN lookup is skipped entirely when no
	// ASN rules are configured in either scope and the feed carries none
	if clientIP != nil && hasASNRules(sec.global, siteRules, p.dropFeed.Load()) {
		asn := p.asnNumber(clientIP)
		if ok, reason := checkASN(asn, sec.global, siteRules, p.dropFeed.Load()); !ok {
			p.blockRequest(w, r, clientIPStr, start, siteID, siteName, fmt.Sprintf("%s:AS%d", reason, asn))
			return true
		}
	}

	// resolve the WAF engine once — used for both the debug log and enforcement
	// to avoid calling resolveWAFEngine twice on every WAF-enabled request
	var wafEngine *WAFEngine
	if siteID > 0 {
		wafEngine = p.resolveWAFEngine(siteID)
	}

	// guard the debug log behind IsDebug() so resolveWAFEngine is not called
	// purely for log formatting when debug logging is disabled
	if logger.IsDebug() {
		logger.Debug("WAF check: siteID=%d enabled=%v engine=%v", siteID, p.wafEnabled.Load(), wafEngine != nil)
	}

	// enforce WAF — admin domain traffic (siteID == 0) bypasses inspection
	if wafEngine != nil {
		if !wafEngine.Inspect(w, r, clientIPStr, p.enqueueWAFLog, siteID, siteName) {
			// WAF wrote the 403; record it in the access log for Fail2Ban
			// the triggering rule ID is already recorded in waf.log by writeWAFLog
			p.writeAccessLog(r, http.StatusForbidden, 0, start, time.Since(start), clientIPStr, siteID, siteName, "waf")
			return true
		}
	}

	return false
}

// routeHost resolves a normalized host to its routing target — the admin
// domain routes to the admin port, registered domains resolve through the
// cache. ok is false when the host is not registered anywhere.
func (p *Proxy) routeHost(host string) (entry domainEntry, port int, siteID int64, rpPool *UpstreamPool, ok bool) {

	// check if the request is for the admin domain before any cache lookups
	p.adminMu.RLock()
	adminDomain := p.adminDomain
	p.adminMu.RUnlock()

	if adminDomain != "" && host == adminDomain {
		return domainEntry{}, p.adminPort, 0, nil, true
	}

	// look up the domain in the cache
	entry, found := p.lookupEntry(host)
	if !found || (entry.port == 0 && entry.pool == nil) {
		return domainEntry{}, 0, 0, nil, false
	}
	return entry, entry.port, entry.siteID, entry.pool, true
}

// hostPolicy restricts certificate issuance to registered domains only.
func (p *Proxy) hostPolicy(_ context.Context, host string) error {

	// allow the admin domain to be issued a cert even if not registered in the site cache
	p.adminMu.RLock()
	adminDomain := p.adminDomain
	p.adminMu.RUnlock()
	if adminDomain != "" && host == adminDomain {
		return nil
	}
	if _, ok := p.lookupEntry(host); !ok {
		return fmt.Errorf("host %q not registered", host)
	}

	// default return
	return nil
}

// lookupEntry returns the full domainEntry for a domain, and whether it was found.
func (p *Proxy) lookupEntry(domain string) (domainEntry, bool) {
	ptr := p.cache.Load()
	if ptr == nil {
		return domainEntry{}, false
	}
	e, ok := (*ptr)[domain]
	return e, ok
}

// siteProxy routes a request to the given host port using a cached reverse proxy instance.
func (p *Proxy) siteProxy(w http.ResponseWriter, r *http.Request, port int) {
	rp := p.getOrCreateProxy(port)
	rp.ServeHTTP(w, r)
}

// getOrCreateProxy returns a cached *httputil.ReverseProxy for port, creating
// one if needed. Uses LoadOrStore so only one instance is installed per port.
func (p *Proxy) getOrCreateProxy(port int) *httputil.ReverseProxy {
	if rp, ok := p.rpCache.Load(port); ok {
		return rp.(*httputil.ReverseProxy)
	}
	target, _ := url.Parse(fmt.Sprintf("http://%s:%d", p.hostGateway, port))

	// the admin panel is a trusted local upstream whose requests can run long
	// (synchronous site provisioning); use the transport without a response-header
	// timeout so the proxy does not abort those requests at the 60s site cap
	tr := p.transport
	if port == p.adminPort {
		tr = p.adminTransport
	}

	// fire up the proxy
	rp := &httputil.ReverseProxy{
		Transport: tr,
		// FlushInterval of -1 enables immediate flush for streaming/chunked responses;
		// without this the proxy buffers until upstream closes, adding perceived latency
		FlushInterval: -1,
		Rewrite: func(req *httputil.ProxyRequest) {
			req.SetURL(target)
			req.Out.Host = req.In.Host

			// explicitly preserve the HTTP method — PUT, DELETE, PATCH, etc.
			req.Out.Method = req.In.Method

			// copy the request body for methods that carry a payload
			req.Out.Body = req.In.Body
			req.Out.ContentLength = req.In.ContentLength

			// clone the inbound header map before modification — with Rewrite, req.Out is a
			// shallow copy of req.In so Out.Header aliases In.Header; SetXForwarded() would
			// otherwise mutate the original inbound request headers
			outHeader := make(http.Header, len(req.In.Header))
			for key, vals := range req.In.Header {
				outHeader[key] = vals
			}
			req.Out.Header = outHeader

			// set X-Forwarded-* on the cloned map — In.Header is now unaffected
			req.SetXForwarded()

			// pass through WebSocket upgrade headers
			if upgrade := req.In.Header.Get("Upgrade"); upgrade != "" {
				req.Out.Header.Set("Upgrade", upgrade)
				req.Out.Header.Set("Connection", "Upgrade")
			}

			// trust X-Forwarded-Proto from upstream proxy if present,
			// otherwise derive it from the TLS state of this connection
			if proto := req.In.Header.Get("X-Forwarded-Proto"); proto != "" {
				req.Out.Header.Set("X-Forwarded-Proto", proto)
			} else if req.In.TLS != nil {
				req.Out.Header.Set("X-Forwarded-Proto", "https")
			} else {
				req.Out.Header.Set("X-Forwarded-Proto", "http")
			}
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			logger.Error("proxy upstream error for port %d: %v", port, err)
			http.Error(w, "upstream unavailable", http.StatusBadGateway)
		},
		// rewrite Location headers on upstream redirects — without this the internal
		// container port (e.g. :8082) leaks through to the browser as thedomain:8082/path
		ModifyResponse: func(resp *http.Response) error {
			if loc := resp.Header.Get("Location"); loc != "" {
				if parsed, err := url.Parse(loc); err == nil && parsed.Port() == fmt.Sprintf("%d", port) {
					parsed.Host = parsed.Hostname() // strip the port
					resp.Header.Set("Location", parsed.String())
				}
			}
			return nil
		},
	}
	actual, _ := p.rpCache.LoadOrStore(port, rp)
	return actual.(*httputil.ReverseProxy)
}

// getOrCreateRPProxy returns the cached ReverseProxy for an upstream, building
// it on first use. The key carries the transport identity because
// rpTransportForTarget selects the verifying or non-verifying pool per target
// and the markTLSUnverified retry deliberately forces the non-verifying one —
// a proxy built against one transport must never be reused for the other.
func (p *Proxy) getOrCreateRPProxy(target *url.URL, passHost bool, transport *http.Transport) *httputil.ReverseProxy {
	verify := transport == p.rpVerifyTransport
	key := target.String() + fmt.Sprintf("|ph=%v|v=%v", passHost, verify)
	if rp, ok := p.rpProxyCache.Load(key); ok {
		return rp.(*httputil.ReverseProxy)
	}

	rp := newReverseProxy(target, transport, passHost, p.realClientIP)
	actual, _ := p.rpProxyCache.LoadOrStore(key, rp)
	return actual.(*httputil.ReverseProxy)
}

// resolveWAFEngine returns the WAFEngine to use for a given site, accounting
// for per-site overrides. Returns nil when the site should bypass WAF.
func (p *Proxy) resolveWAFEngine(siteID int64) *WAFEngine {
	override := db.WAFOverrideInherit
	if overrides := p.wafOverrides.Load(); overrides != nil {
		if o, ok := (*overrides)[siteID]; ok {
			override = o.Override
		}
	}

	switch override {
	case db.WAFOverrideOff:
		return nil
	case db.WAFOverrideOn:
		// site-specific engine if compiled, otherwise fall back to global
		if e, ok := p.wafSiteEngines.Load(siteID); ok {
			return e.(*WAFEngine)
		}
		return p.wafEngine.Load()
	default: // WAFOverrideInherit — respect global enabled state
		if !p.wafEnabled.Load() {
			return nil
		}
		if e, ok := p.wafSiteEngines.Load(siteID); ok {
			return e.(*WAFEngine)
		}
		return p.wafEngine.Load()
	}
}

// PanelSecurityMiddleware returns an http.Handler middleware that applies the
// global WAF engine, IP rules, and UA rules to admin panel requests.
// Requests carrying a valid session cookie bypass all security checks —
// authenticated users are trusted by definition.
func (p *Proxy) PanelSecurityMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		// authenticated sessions bypass WAF, IP, and UA checks entirely —
		// the user has already passed login; blocking their API calls is wrong.
		// The resolved pair rides the context so the audit and auth layers
		// beneath do not repeat the same two queries.
		if sessionID := auth.SessionFromRequest(r); sessionID != "" {
			if session, user, err := auth.SessionAndUser(p.database, sessionID); err == nil && session != nil && user != nil {
				next.ServeHTTP(w, r.WithContext(auth.WithSession(r.Context(), session, user)))
				return
			}
		}

		// resolve client IP using the same trusted proxy logic as proxied sites
		clientIP := parseClientIP(r.RemoteAddr, r.Header.Get("X-Forwarded-For"), p.trustedProxies.Load())

		clientIPStr := "<unknown>"
		if clientIP != nil {
			clientIPStr = clientIP.String()
		}

		// the bypass list is the break-glass path for an admin whose IP has landed
		// in a global blacklist or the DROP feed — without this the panel, and so
		// the login page, stays unreachable no matter what CIDR is bypassed
		if clientIP != nil && isIPBypassed(clientIP, p.bypassNets.Load()) {
			next.ServeHTTP(w, r)
			return
		}

		sec := p.secCache.Load()

		// enforce global IP rules — no per-site rules apply to the panel
		if clientIP != nil {
			if ok, _ := checkIP(clientIP, sec.global, ruleSet{}, p.dropFeed.Load(), false); !ok {
				http.Error(w, "forbidden", http.StatusForbidden)
				return
			}
		}

		// enforce global UA rules
		if !checkUA(r.UserAgent(), sec.global, ruleSet{}) {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}

		// enforce global WAF — siteID 0, siteName "panel" for log attribution
		if p.wafEnabled.Load() {
			if engine := p.wafEngine.Load(); engine != nil {
				if !engine.Inspect(w, r, clientIPStr, p.enqueueWAFLog, 0, "PODNEST") {
					return
				}
			}
		}

		next.ServeHTTP(w, r)
	})
}

// isIPBypassed reports whether the address matches a bypass rule.
func isIPBypassed(ip net.IP, bypass *ipTable) bool {
	addr, ok := toAddr(ip)
	if !ok {
		return false
	}
	raw, hit := bypass.lookup(addr)
	if hit && logger.IsDebug() {
		logger.Debug("isIPBypassed: %s matched bypass rule %s", ip, raw)
	}
	return hit
}

// ClientIP resolves the real client IP for a request using the proxy's
// trusted-proxy ranges — the same spoof-resistant logic applied to proxied
// site traffic. Use this anywhere the client IP must not be forgeable via
// X-Forwarded-For (e.g. login rate limiting) instead of reading the header.
func (p *Proxy) ClientIP(r *http.Request) string {
	ip := parseClientIP(r.RemoteAddr, r.Header.Get("X-Forwarded-For"), p.trustedProxies.Load())
	if ip == nil {
		return ""
	}
	return ip.String()
}
