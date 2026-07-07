// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package proxy

import (
	"bufio"
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"database/sql"
	"encoding/pem"
	"fmt"
	"math/big"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"podnest/internal/auth"
	"podnest/internal/db"
	"podnest/internal/logger"

	"github.com/quic-go/quic-go/http3"
	"golang.org/x/crypto/acme/autocert"
	"golang.org/x/crypto/bcrypt"
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

// compiledRedirect is a redirect rule with its Source pattern pre-compiled.
// re is non-nil when Source compiled as a valid regex; when nil, matching
// falls back to exact/prefix comparison against the request path.
type compiledRedirect struct {
	re     *regexp.Regexp
	source string
	target string
	code   int
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

// dummyBcryptHash is compared against when a basic-auth username is unknown, so
// an unknown user costs the same time as a known user with a wrong password —
// removing the username-enumeration timing oracle. Cost (12) must match the
// basic-auth module's hashing cost so the comparison time is equivalent.
var dummyBcryptHash, _ = bcrypt.GenerateFromPassword([]byte("podnest-basic-auth-timing-equalizer"), 12)

// basicAuthEntry holds the cached config and pre-hashed credentials for a site.
type basicAuthEntry struct {
	realm string
	users map[string]string // username → bcrypt hash
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
	go func() {
		logger.Debug("proxy HTTP listener starting on :80")
		if err := p.httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("proxy HTTP listener: %v", err)
		}
	}()

	go func() {
		logger.Debug("proxy HTTP/3 listener starting on :443 (UDP)")
		if err := p.http3Srv.ListenAndServeTLS("", ""); err != nil && err != http.ErrServerClosed {
			logger.Error("proxy HTTP/3 listener: %v", err)
		}
	}()

	logger.Debug("proxy HTTPS listener starting on :443")
	return p.httpsSrv.ListenAndServeTLS("", "")
}

// Shutdown gracefully stops both listeners and closes the access log
func (p *Proxy) Shutdown(ctx context.Context) {
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

// WarmCaches warms all proxy caches and connections in the correct order.
// Pass justTrustedProxies=true to only refresh the trusted proxy ranges —
// used by StartTrustedProxyRefresher to avoid unnecessary full rewarming.
func (p *Proxy) WarmCaches(justTrustedProxies bool) error {

	// get the data we'll need for the others
	cidrs, err := db.GetTrustedProxies(p.database)
	if err != nil {
		return err
	}
	ipRules, err := db.GetAllIPRules(p.database)
	if err != nil {
		return err
	}
	uaRules, err := db.GetAllUARules(p.database)
	if err != nil {
		return err
	}
	bypassRules, err := db.GetAllBypassRules(p.database)
	if err != nil {
		return err
	}
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

	p.warmSecurityCache(ipRules, uaRules)
	p.warmBypassCache(bypassRules)
	p.warmBasicAuthCache()
	p.warmTrustedProxies(cidrs)
	p.warmTLSCache()
	p.warmConnections()
	return nil
}

// WarmRedirectCache atomically replaces the redirect rules for a single site.
// Called immediately after a redirect save so the proxy reflects changes without
// a full cache reload.
func (p *Proxy) WarmRedirectCache(siteID int64, redirects []db.Redirect) {
	if len(redirects) == 0 {
		p.redirectCache.Delete(siteID)
	} else {
		p.redirectCache.Store(siteID, compileRedirects(redirects))
	}
	logger.Debug("proxy: redirect cache updated for siteID=%d (%d rules)", siteID, len(redirects))
}

// WarmBasicAuthCache loads all enabled basic auth configs and credentials
// from the database and atomically replaces the in-memory cache.
// Called on startup and after any basic auth change.
func (p *Proxy) warmBasicAuthCache() {
	cfgs, users, err := db.GetAllBasicAuthData(p.database)
	if err != nil {
		logger.Error("proxy: WarmBasicAuthCache: %v", err)
		return
	}

	// clear existing entries before repopulating
	p.basicAuthCache.Range(func(k, _ any) bool {
		p.basicAuthCache.Delete(k)
		return true
	})

	for siteID, cfg := range cfgs {
		entry := &basicAuthEntry{
			realm: cfg.Realm,
			users: make(map[string]string, len(users[siteID])),
		}
		for _, u := range users[siteID] {
			entry.users[u.Username] = u.PasswordHash
		}
		p.basicAuthCache.Store(siteID, entry)
	}
	logger.Debug("proxy: basic auth cache warmed — %d sites", len(cfgs))
}

// warmRedirectCache loads all redirect rules from the database and populates
// the in-memory cache. Called during full cache warm on startup and settings changes.
func (p *Proxy) warmRedirectCache() error {
	redirects, err := db.GetAllRedirects(p.database)
	if err != nil {
		logger.Error("proxy: failed to warm redirect cache: %v", err)
		return err
	}

	// clear existing entries
	p.redirectCache.Range(func(k, _ any) bool {
		p.redirectCache.Delete(k)
		return true
	})

	// group by site and store
	grouped := make(map[int64][]db.Redirect)
	for _, rd := range redirects {
		grouped[rd.SiteID] = append(grouped[rd.SiteID], rd)
	}
	for siteID, rules := range grouped {
		p.redirectCache.Store(siteID, compileRedirects(rules))
	}

	logger.Debug("proxy: redirect cache warmed — %d total rules across %d sites", len(redirects), len(grouped))
	return nil
}

// WarmCache loads all registered domain→port+siteID mappings from the database
// and atomically installs them. Called once on startup.
func (p *Proxy) warmCache() error {
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
		for domain, upstreams := range poolMap {
			pool, err := newUpstreamPool(upstreams)
			if err != nil {
				logger.Error("proxy: failed to build upstream pool for '%s': %v", domain, err)
				continue
			}
			if e, ok := next[domain]; ok {
				// domain is in kppn_domains — attach pool to existing entry
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

	logger.Debug("proxy: domain cache warmed with %d entries", len(m))
	return nil
}

// WarmTLSCache proactively loads certificates for all registered domains into
// the autocert in-memory cache to prevent disk reads on the first TLS handshake
// after a restart. Runs in a goroutine so it does not block proxy startup.
func (p *Proxy) warmTLSCache() {
	go func() {
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
	go func() {
		ptr := p.cache.Load()
		if ptr == nil {
			return
		}

		client := &http.Client{
			Transport: p.transport,
			// short timeout — we only want to establish the connection, not wait
			// for a full response; failures are expected for stopped pods
			Timeout: 5 * time.Second,
		}

		rpClient := &http.Client{
			Transport: p.rpTransport,
			Timeout:   5 * time.Second,
		}

		seenPorts := make(map[int]struct{})

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

			url := fmt.Sprintf("http://%s:%d/", p.hostGateway, entry.port)
			resp, err := client.Head(url)
			if err != nil {
				logger.Debug("WarmConnections: port %d: %v", entry.port, err)
				continue
			}
			resp.Body.Close()
			logger.Debug("WarmConnections: warmed port %d", entry.port)
		}

		logger.Debug("WarmConnections: completed warmup for %d unique ports", len(seenPorts))
	}()
}

// WarmSecurityCache compiles all IP and UA rules from the database and
// atomically installs the result. Called once on startup and after any rule change.
func (p *Proxy) warmSecurityCache(ipRules []*db.IPRule, uaRules []*db.UARule) {
	cache := buildSecurityCache(ipRules, uaRules)
	p.secCache.Store(&cache)
	logger.Debug("proxy: security cache warmed — %d IP rules, %d UA rules", len(ipRules), len(uaRules))
}

// WarmTrustedProxies loads trusted proxy CIDRs from the database, compiles them
// into net.IPNet ranges, and atomically installs the result. Called on startup,
// after a settings change, and by StartTrustedProxyRefresher after each fetch.
func (p *Proxy) warmTrustedProxies(cidrs []string) {
	nets := make([]*net.IPNet, 0, len(cidrs))
	for _, cidr := range cidrs {
		_, network, err := net.ParseCIDR(cidr)
		if err != nil {
			// bare IPs are not valid proxy ranges — log and skip
			logger.Warn("WarmTrustedProxies: skipping invalid CIDR '%s': %v", cidr, err)
			continue
		}
		nets = append(nets, network)
	}
	p.trustedProxies.Store(&nets)
	logger.Debug("proxy: trusted proxies warmed — %d ranges", len(nets))
}

// warmBypassCache compiles bypass CIDRs/IPs and atomically installs the result.
// Called on startup and after any bypass rule change.
func (p *Proxy) warmBypassCache(rules []*db.BypassRule) {
	compiled := make([]*compiledIPRule, 0, len(rules))
	for _, r := range rules {
		c, err := compileIPRule(r.CIDR)
		if err != nil {
			logger.Warn("warmBypassCache: skipping invalid entry '%s': %v", r.CIDR, err)
			continue
		}
		compiled = append(compiled, c)
	}
	p.bypassNets.Store(&compiled)
	logger.Debug("proxy: bypass cache warmed — %d entries", len(compiled))
}

// WarmWAFCache loads WAF settings and per-site overrides from the database,
// compiles the Coraza engine(s), and installs them atomically.
// Called once on startup and after any WAF settings change.
func (p *Proxy) warmWAFCache() error {
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

	sitePlugins, err := db.GetAllSitePlugins(p.database)
	if err != nil {
		logger.Error("proxy: failed to load WAF site plugins: %v", err)
		return err
	}

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

	p.wafEngine.Store(engine)
	p.wafOverrides.Store(&overrideMap)
	p.wafEnabled.Store(true)
	logger.Debug("proxy: WAF cache warmed — %d site overrides", len(siteOverrides))
	return nil
}

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

// RemoveSiteProxy evicts the cached reverse proxy for a port — called on site deletion.
func (p *Proxy) RemoveSiteProxy(port int) {
	p.rpCache.Delete(port)
}

// SetAdminDomain updates the admin domain on the running proxy without a restart.
func (p *Proxy) SetAdminDomain(domain string) {
	p.adminMu.Lock()
	defer p.adminMu.Unlock()
	p.adminDomain = domain
	logger.Debug("proxy admin domain updated to '%s'", domain)
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

	if adminDomain != "" && host == adminDomain {
		port = p.adminPort
	} else {
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
	if siteID > 0 {
		if rules, ok := p.redirectCache.Load(siteID); ok {
			for _, rd := range rules.([]compiledRedirect) {
				target := rd.target
				if rd.re != nil {
					// match the path first, then host+path — lets host-aware
					// rules (canonical-domain redirects) work without breaking
					// existing path-only patterns. Host has no port on 80/443.
					for _, candidate := range []string{r.URL.Path, r.Host + r.URL.Path} {
						if matches := rd.re.FindStringSubmatch(candidate); matches != nil {
							for i, m := range matches[1:] {
								target = strings.ReplaceAll(target, fmt.Sprintf("$%d", i+1), m)
							}
							http.Redirect(w, r, target, rd.code)
							dur := time.Since(start)
							p.writeAccessLog(r, rd.code, 0, start, dur, clientIPStr, siteID, siteName)
							return
						}
					}
				} else {
					if r.URL.Path == rd.source || (rd.source != "/" && strings.HasPrefix(r.URL.Path, rd.source)) {
						http.Redirect(w, r, target, rd.code)
						dur := time.Since(start)
						p.writeAccessLog(r, rd.code, 0, start, dur, clientIPStr, siteID, siteName)
						return
					}
				}
			}
		}
	}

	// enforce per-site basic auth — checked before IP/UA/WAF so 401 is returned cleanly
	if siteID > 0 {
		if v, ok := p.basicAuthCache.Load(siteID); ok {
			entry := v.(*basicAuthEntry)
			user, pass, hasAuth := r.BasicAuth()
			if !hasAuth {
				w.Header().Set("WWW-Authenticate", `Basic realm="`+entry.realm+`"`)
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				dur := time.Since(start)
				p.writeAccessLog(r, http.StatusUnauthorized, 0, start, dur, clientIPStr, siteID, siteName)
				return
			}
			hash, known := entry.users[user]
			if !known {
				// compare against a fixed dummy hash so an unknown user takes the
				// same time as a wrong password for a known user (no timing oracle)
				hash = string(dummyBcryptHash)
			}
			if bcrypt.CompareHashAndPassword([]byte(hash), []byte(pass)) != nil || !known {
				w.Header().Set("WWW-Authenticate", `Basic realm="`+entry.realm+`"`)
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				dur := time.Since(start)
				p.writeAccessLog(r, http.StatusUnauthorized, 0, start, dur, clientIPStr, siteID, siteName)
				return
			}
		}
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
			p.writeAccessLog(r, http.StatusForbidden, 0, start, dur, clientIPStr, siteID, siteName)
			return
		}

		// enforce UA rules — blacklist always beats whitelist
		if !checkUA(r.UserAgent(), sec.global, siteRules) {
			http.Error(w, "forbidden", http.StatusForbidden)
			dur := time.Since(start)
			p.writeAccessLog(r, http.StatusForbidden, 0, start, dur, clientIPStr, siteID, siteName)
			return
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
				p.writeAccessLog(r, http.StatusForbidden, 0, start, dur, clientIPStr, siteID, siteName)
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

	p.siteProxy(sw, r, port)
	p.writeAccessLog(r, sw.status, sw.bytes, start, time.Since(start), clientIPStr, siteID, siteName)
}

// hostPolicy restricts certificate issuance to registered domains only.
func (p *Proxy) hostPolicy(_ context.Context, host string) error {
	p.adminMu.RLock()
	adminDomain := p.adminDomain
	p.adminMu.RUnlock()
	if adminDomain != "" && host == adminDomain {
		return nil
	}
	if _, ok := p.lookupEntry(host); !ok {
		return fmt.Errorf("host %q not registered", host)
	}
	return nil
}

// ObtainCert proactively triggers Let's Encrypt certificate issuance for a domain.
func (p *Proxy) ObtainCert(domain string) {
	go func() {
		logger.Debug("proactively obtaining certificate for domain '%s'", domain)
		hello := &tls.ClientHelloInfo{ServerName: domain}
		if _, err := p.manager.GetCertificate(hello); err != nil {
			logger.Error("failed to obtain certificate for '%s': %v", domain, err)
			return
		}
		logger.Debug("certificate obtained successfully for '%s'", domain)
	}()
}

// -- internal ----------------------------------------------------------------

// lookupEntry returns the full domainEntry for a domain, and whether it was found.
func (p *Proxy) lookupEntry(domain string) (domainEntry, bool) {
	ptr := p.cache.Load()
	if ptr == nil {
		return domainEntry{}, false
	}
	e, ok := (*ptr)[domain]
	return e, ok
}

// swapCache applies fn to a shallow copy of the current domain map and
// atomically installs the result. The CAS loop handles concurrent writers.
func (p *Proxy) swapCache(fn func(map[string]domainEntry) map[string]domainEntry) {
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

// probeUpstreamTLS records whether an https upstream presents a verifiable certificate,
// so serving can pick the verifying transport without a per-route setting
func (p *Proxy) probeUpstreamTLS(u *url.URL) {
	if u.Scheme != "https" {
		return
	}
	host := u.Host
	if u.Port() == "" {
		host = net.JoinHostPort(u.Hostname(), "443")
	}
	d := &net.Dialer{Timeout: 5 * time.Second}
	conn, err := tls.DialWithDialer(d, "tcp", host, &tls.Config{ServerName: u.Hostname()})
	if err != nil {
		p.rpTLSVerified.Store(u.Host, false)
		return
	}
	conn.Close()
	p.rpTLSVerified.Store(u.Host, true)
	logger.Debug("proxy: upstream %s presents a verifiable certificate", u.Host)
}

// rpTransportForTarget returns the verifying transport when the upstream's cert probed as valid
func (p *Proxy) rpTransportForTarget(t UpstreamTarget) *http.Transport {
	if v, ok := p.rpTLSVerified.Load(t.URL.Host); ok && v.(bool) {
		return p.rpVerifyTransport
	}
	return p.rpTransport
}

// markTLSUnverified flips a probed-verified host back to skip-verify; returns true if flipped
func (p *Proxy) markTLSUnverified(t UpstreamTarget) bool {
	if v, ok := p.rpTLSVerified.Load(t.URL.Host); ok && v.(bool) {
		p.rpTLSVerified.Store(t.URL.Host, false)
		return true
	}
	return false
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

// siteLogFile returns the open *os.File for a per-site log, creating the file
// and its parent logs/ directory on first access. The result is cached in the
// appropriate sync.Map (cache) so the file is opened at most once per site.
// logType must be "access" or "waf"; the corresponding filename is derived from it.
func (p *Proxy) siteLogFile(cache *sync.Map, siteID int64, siteName, logType string) *os.File {
	// fast path — already open
	if v, ok := cache.Load(siteID); ok {
		return v.(*os.File)
	}

	// slow path — create directory and open file
	dir := fmt.Sprintf("%s/sites/%s/logs", p.appPath, siteName)
	if err := os.MkdirAll(dir, 0750); err != nil {
		logger.Error("proxy: siteLogFile: mkdir %s: %v", dir, err)
		return nil
	}

	filename := "access.log"
	if logType == "waf" {
		filename = "waf.log"
	}

	path := dir + "/" + filename
	f, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0640)
	if err != nil {
		logger.Error("proxy: siteLogFile: open %s: %v", path, err)
		return nil
	}
	logger.Debug("proxy: siteLogFile: opened %s for siteID=%d", path, siteID)

	// store; if another goroutine raced us, close the duplicate and use theirs
	actual, loaded := cache.LoadOrStore(siteID, f)
	if loaded {
		f.Close()
		return actual.(*os.File)
	}
	return f
}

// writeAccessLog writes a single structured line to the correct access log.
// siteID 0 (admin/unmatched traffic) routes to the global proxy-access.log;
// all other sites route to {appPath}/sites/{siteName}/logs/access.log.
// siteName is only required when siteID > 0.
func (p *Proxy) writeAccessLog(r *http.Request, status, bytes int, start time.Time, dur time.Duration, clientIP string, siteID int64, siteName string) {
	line := fmt.Sprintf("%s %s %s %s %d %d %s %s %q\n",
		start.UTC().Format(time.RFC3339),
		r.Method,
		r.Host,
		r.URL.Path,
		status,
		bytes,
		dur.Round(time.Millisecond).String(),
		clientIP,
		r.UserAgent(),
	)

	if siteID > 0 {
		// per-site log
		f := p.siteLogFile(&p.siteAccessLogs, siteID, siteName, "access")
		if f == nil {
			return
		}
		p.accessLogMu.Lock()
		_, err := f.WriteString(line)
		p.accessLogMu.Unlock()
		if err != nil {
			logger.Error("proxy: site access log write failed siteID=%d: %v", siteID, err)
		}
		return
	}

	// global log — siteID 0 (admin domain, unmatched)
	if p.accessLog == nil {
		return
	}
	p.accessLogMu.Lock()
	_, err := p.accessLog.WriteString(line)
	p.accessLogMu.Unlock()
	if err != nil {
		logger.Error("proxy: access log write failed: %v", err)
	}
}

// selfSignedCert generates or loads a persistent self-signed cert from the cert directory.
func selfSignedCert(certDir string) (tls.Certificate, error) {
	certFile := certDir + "/self-signed.crt"
	keyFile := certDir + "/self-signed.key"

	if _, err := os.Stat(certFile); err == nil {
		return tls.LoadX509KeyPair(certFile, keyFile)
	}

	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return tls.Certificate{}, err
	}

	tmpl := &x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject:      pkix.Name{CommonName: "podnest-self-signed"},
		NotBefore:    time.Now(),
		NotAfter:     time.Now().Add(10 * 365 * 24 * time.Hour),
		KeyUsage:     x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
	}

	der, err := x509.CreateCertificate(rand.Reader, tmpl, tmpl, &key.PublicKey, key)
	if err != nil {
		return tls.Certificate{}, err
	}

	if err := os.MkdirAll(certDir, 0750); err != nil {
		return tls.Certificate{}, err
	}
	cf, _ := os.Create(certFile)
	pem.Encode(cf, &pem.Block{Type: "CERTIFICATE", Bytes: der})
	cf.Close()

	kb, _ := x509.MarshalECPrivateKey(key)
	kf, _ := os.Create(keyFile)
	pem.Encode(kf, &pem.Block{Type: "EC PRIVATE KEY", Bytes: kb})
	kf.Close()

	return tls.LoadX509KeyPair(certFile, keyFile)
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

// WarmBypassCache is the exported wrapper called by the security handler after a bypass rule change.
func (p *Proxy) WarmBypassCache(rules []*db.BypassRule) {
	p.warmBypassCache(rules)
}

// compileRedirects pre-compiles a slice of redirect rules so the request hot
// path never calls regexp.Compile — removing both the per-request compile cost
// and a per-request ReDoS surface on the user-supplied Source pattern.
func compileRedirects(redirects []db.Redirect) []compiledRedirect {
	out := make([]compiledRedirect, 0, len(redirects))
	for _, rd := range redirects {
		cr := compiledRedirect{source: rd.Source, target: rd.Target, code: rd.Code}
		// a Source that fails to compile is matched literally at request time
		if re, err := regexp.Compile(rd.Source); err == nil {
			cr.re = re
		}
		out = append(out, cr)
	}
	return out
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
