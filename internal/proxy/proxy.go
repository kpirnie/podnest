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
	trustedProxies    atomic.Pointer[[]*net.IPNet]                 // compiled trusted proxy ranges; swapped atomically on refresh
	bypassNets        atomic.Pointer[[]*compiledIPRule]            // compiled bypass IP rules; swapped atomically on change
	geoDB             atomic.Pointer[maxminddb.Reader]             // in-memory country database; swapped atomically on refresh
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
	accessLogMu       sync.Mutex                                   // guards concurrent writes to accessLog
	wafLog            *os.File                                     // WAF-specific log for Fail2Ban and UI streaming
	wafLogMu          sync.Mutex                                   // guards concurrent writes to wafLog
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
	emptyProxies := make([]*net.IPNet, 0)
	p.trustedProxies.Store(&emptyProxies)

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
		if err := p.http3Srv.ListenAndServeTLS("", ""); err != nil && err != http.ErrServerClosed {
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

	// flush and close the access log file
	if p.accessLog != nil {
		p.accessLogMu.Lock()
		p.accessLog.Close()
		p.accessLogMu.Unlock()
	}

	// flush and close the waf log file
	if p.wafLog != nil {
		p.wafLogMu.Lock()
		p.wafLog.Close()
		p.wafLogMu.Unlock()
	}
}

// ServeHTTP routes requests by domain, enforcing IP and UA security rules
// before any traffic reaches a site pod. All requests are recorded in the
// structured access log regardless of outcome.
func (p *Proxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	clientIP := parseClientIP(r.RemoteAddr, r.Header.Get("X-Forwarded-For"), *p.trustedProxies.Load())

	// convert clientIP to string once — net.IP.String() allocates a new string on
	// every call; caching here avoids up to 6 redundant allocations per request
	clientIPStr := "<unknown>"
	if clientIP != nil {
		clientIPStr = clientIP.String()
	}

	// extract the host without port for routing and admin domain checks; the port is not relevant since
	host := r.Host
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}

	// match hosts case-insensitively against stored (lowercased) domains
	host = strings.ToLower(host)

	// check if the request is for the admin domain before any cache lookups
	p.adminMu.RLock()
	adminDomain := p.adminDomain
	p.adminMu.RUnlock()

	var (
		port   int
		siteID int64
		rpPool *UpstreamPool
		entry  domainEntry
	)

	// route admin domain traffic to the admin port, otherwise look up the domain in the cache
	if adminDomain != "" && host == adminDomain {
		port = p.adminPort
	} else {

		// look up the domain in the cache — if not found, return 404
		var ok bool
		entry, ok = p.lookupEntry(host)

		if !ok || (entry.port == 0 && entry.pool == nil) {
			http.Error(w, "domain not registered", http.StatusNotFound)
			dur := time.Since(start)
			p.writeAccessLog(r, http.StatusNotFound, 0, start, dur, clientIPStr, 0, "")
			return
		}
		port = entry.port
		siteID = entry.siteID
		rpPool = entry.pool
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

	// load the compiled security cache — single atomic load, no lock
	sec := p.secCache.Load()

	// retrieve the per-site rule set when we have a known site ID
	siteRules := ruleSet{}
	if siteID > 0 {
		if rs, ok := sec.perSite[siteID]; ok {
			siteRules = rs
		}
	}

	// bypass list — matching IPs skip all IP, UA, and WAF enforcement
	bypassed := clientIP != nil && isIPBypassed(clientIP, *p.bypassNets.Load())
	if !bypassed {

		// enforce IP rules — blacklist always beats whitelist
		if clientIP != nil && !checkIP(clientIP, sec.global, siteRules) {
			http.Error(w, "forbidden", http.StatusForbidden)
			dur := time.Since(start)
			// log the block with a distinct reason token for stats drilldown
			p.writeAccessLog(r, http.StatusForbidden, 0, start, dur, clientIPStr, siteID, siteName, "ip")
			return
		}

		// enforce UA rules — blacklist always beats whitelist
		if !checkUA(r.UserAgent(), sec.global, siteRules) {
			http.Error(w, "forbidden", http.StatusForbidden)
			dur := time.Since(start)
			// log the block with a distinct reason token for stats drilldown
			p.writeAccessLog(r, http.StatusForbidden, 0, start, dur, clientIPStr, siteID, siteName, "ua")
			return
		}

		// enforce country rules — geo lookup is skipped entirely when no
		// country rules are configured in either scope
		if clientIP != nil && hasCountryRules(sec.global, siteRules) {
			code := p.countryCode(clientIP)
			if !checkCountry(code, sec.global, siteRules) {
				http.Error(w, "forbidden", http.StatusForbidden)
				dur := time.Since(start)
				// log the block with the resolved country for stats drilldown
				p.writeAccessLog(r, http.StatusForbidden, 0, start, dur, clientIPStr, siteID, siteName, "geo:"+code)
				return
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
			if !wafEngine.Inspect(w, r, clientIPStr, p.wafLog, &p.wafLogMu, siteID, siteName, p.appPath) {
				// WAF wrote the 403; record it in the access log for Fail2Ban
				dur := time.Since(start)
				// log the block with a distinct reason token for stats drilldown;
				// the triggering rule ID is already recorded in waf.log by writeWAFLog
				p.writeAccessLog(r, http.StatusForbidden, 0, start, dur, clientIPStr, siteID, siteName, "waf")
				return
			}
		}

	}

	// wrap the writer to capture status + byte count for the access log
	sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}

	// advertise HTTP/3 support — only on routed requests, not on proxy-level error
	// responses (404 domain-not-found, 403 IP/UA/WAF blocks already returned above)
	sw.Header().Set("Alt-Svc", `h3=":443"; ma=86400`)

	// reverse proxy sites — try first upstream directly for streaming compatibility,
	// then cascade through remaining upstreams with buffered retry on failure
	if rpPool != nil {
		startIdx := rpPool.NextIndex()

		// first attempt — direct passthrough, no buffering
		first := rpPool.At(startIdx)
		if tryUpstreamDirect(sw, r, first, p.rpTransportForTarget(first)) {
			p.writeAccessLog(r, sw.status, sw.bytes, start, time.Since(start), clientIPStr, siteID, siteName)
			return
		}

		// a verified upstream may have a newly-broken cert — flip it back and retry once unverified
		if p.markTLSUnverified(first) && tryUpstream(sw, r, first, p.rpTransport) {
			p.writeAccessLog(r, sw.status, sw.bytes, start, time.Since(start), clientIPStr, siteID, siteName)
			return
		}

		// first upstream failed — try remaining upstreams with buffered recorder
		for i := 1; i < rpPool.Len(); i++ {
			target := rpPool.At(startIdx + i)
			if tryUpstream(sw, r, target, p.rpTransportForTarget(target)) {
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

// getOrCreateRPProxy returns a cached *httputil.ReverseProxy for the given upstream URL,
// creating one if needed. Keyed by the full upstream URL string so connection pools are
// reused across requests rather than allocated per-request.
func (p *Proxy) getOrCreateRPProxy(target *url.URL, passHost bool) *httputil.ReverseProxy {
	key := target.String() + fmt.Sprintf("|ph=%v", passHost)
	if rp, ok := p.rpProxyCache.Load(key); ok {
		return rp.(*httputil.ReverseProxy)
	}
	rp := newReverseProxy(target, p.rpTransport, passHost)
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
		// the user has already passed login; blocking their API calls is wrong
		if sessionID := auth.SessionFromRequest(r); sessionID != "" {
			if user, err := auth.SessionUser(p.database, sessionID); err == nil && user != nil {
				next.ServeHTTP(w, r)
				return
			}
		}

		// resolve client IP using the same trusted proxy logic as proxied sites
		clientIP := parseClientIP(r.RemoteAddr, r.Header.Get("X-Forwarded-For"), *p.trustedProxies.Load())

		clientIPStr := "<unknown>"
		if clientIP != nil {
			clientIPStr = clientIP.String()
		}

		sec := p.secCache.Load()

		// enforce global IP rules — no per-site rules apply to the panel
		if clientIP != nil && !checkIP(clientIP, sec.global, ruleSet{}) {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}

		// enforce global UA rules
		if !checkUA(r.UserAgent(), sec.global, ruleSet{}) {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}

		// enforce global WAF — siteID 0, siteName "panel" for log attribution
		if p.wafEnabled.Load() {
			if engine := p.wafEngine.Load(); engine != nil {
				if !engine.Inspect(w, r, clientIPStr, p.wafLog, &p.wafLogMu, 0, "PODNEST", p.appPath) {
					return
				}
			}
		}

		next.ServeHTTP(w, r)
	})
}

// isIPBypassed returns true when the client IP matches any entry in the
// bypass list — bypassed requests skip IP, UA, and WAF enforcement entirely.
func isIPBypassed(ip net.IP, bypass []*compiledIPRule) bool {
	for _, r := range bypass {
		if r.matchesIP(ip) {
			if logger.IsDebug() {
				logger.Debug("isIPBypassed: %s matched bypass rule %s", ip, r.raw)
			}
			return true
		}
	}
	return false
}

// ClientIP resolves the real client IP for a request using the proxy's
// trusted-proxy ranges — the same spoof-resistant logic applied to proxied
// site traffic. Use this anywhere the client IP must not be forgeable via
// X-Forwarded-For (e.g. login rate limiting) instead of reading the header.
func (p *Proxy) ClientIP(r *http.Request) string {
	ip := parseClientIP(r.RemoteAddr, r.Header.Get("X-Forwarded-For"), *p.trustedProxies.Load())
	if ip == nil {
		return ""
	}
	return ip.String()
}
