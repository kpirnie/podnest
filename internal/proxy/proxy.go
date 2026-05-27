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
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"podnest/internal/db"
	"podnest/internal/logger"

	"github.com/quic-go/quic-go/http3"
	"golang.org/x/crypto/acme/autocert"
)

// domainEntry holds the routing target for a registered domain
type domainEntry struct {
	port   int
	siteID int64
	pool   *UpstreamPool // non-nil for reverse_proxy sites; nil for container-based sites
}

// statusWriter wraps http.ResponseWriter to capture the status code and byte
// count written by the upstream handler for access log recording.
type statusWriter struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (sw *statusWriter) WriteHeader(code int) {
	sw.status = code
	sw.ResponseWriter.WriteHeader(code)
}

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
	database       *sql.DB
	hostGateway    string
	adminDomain    string
	adminPort      int
	appPath        string
	adminMu        sync.RWMutex                                 // guards adminDomain only
	cache          atomic.Pointer[map[string]domainEntry]       // domain → entry; swapped atomically on every change
	secCache       atomic.Pointer[securityCache]                // compiled rule sets; swapped atomically on rule changes
	wafEnabled     atomic.Bool                                  // true when global WAF is on
	wafEngine      atomic.Pointer[WAFEngine]                    // global compiled engine
	wafSiteEngines sync.Map                                     // int64(siteID) → *WAFEngine
	wafOverrides   atomic.Pointer[map[int64]db.WAFSiteOverride] // per-site override map
	trustedProxies atomic.Pointer[[]*net.IPNet]                 // compiled trusted proxy ranges; swapped atomically on refresh
	rpCache        sync.Map                                     // int(port) → *httputil.ReverseProxy; write-rarely, read-heavy
	transport      *http.Transport                              // shared connection pool across all reverse proxies
	accessLog      *os.File                                     // structured access log for Fail2Ban consumption
	wafLog         *os.File                                     // WAF-specific log for Fail2Ban and UI streaming
	manager        *autocert.Manager
	httpSrv        *http.Server
	httpsSrv       *http.Server
	http3Srv       *http3.Server
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
			MaxIdleConns:        500,
			MaxIdleConnsPerHost: 100,
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
			logger.Info("proxy: access log opened at %s", logPath)
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
		Addr:    ":80",
		Handler: p.manager.HTTPHandler(p),
	}

	return p
}

// Start launches HTTP, HTTPS, and HTTP/3 listeners.
func (p *Proxy) Start() error {
	go func() {
		logger.Info("proxy HTTP listener starting on :80")
		if err := p.httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("proxy HTTP listener: %v", err)
		}
	}()

	go func() {
		logger.Info("proxy HTTP/3 listener starting on :443 (UDP)")
		if err := p.http3Srv.ListenAndServeTLS("", ""); err != nil && err != http.ErrServerClosed {
			logger.Error("proxy HTTP/3 listener: %v", err)
		}
	}()

	logger.Info("proxy HTTPS listener starting on :443")
	return p.httpsSrv.ListenAndServeTLS("", "")
}

// Shutdown gracefully stops both listeners and closes the access log
func (p *Proxy) Shutdown(ctx context.Context) {
	_ = p.httpSrv.Shutdown(ctx)
	_ = p.httpsSrv.Shutdown(ctx)
	_ = p.http3Srv.Close()

	// flush and close the access log file
	if p.accessLog != nil {
		p.accessLog.Close()
	}

	// flush and close the waf log file
	if p.wafLog != nil {
		p.wafLog.Close()
	}
}

// WarmCache loads all registered domain→port+siteID mappings from the database
// and atomically installs them. Called once on startup.
func (p *Proxy) WarmCache() error {
	entries, err := db.GetAllDomainEntries(p.database)
	if err != nil {
		logger.Error("proxy: failed to warm domain cache: %v", err)
		return err
	}
	m := make(map[string]domainEntry, len(entries))
	for domain, e := range entries {
		m[domain] = domainEntry{port: e.Port, siteID: e.SiteID}
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
	poolMap := make(map[string][]string)
	siteIDs := make(map[string]int64)
	for _, r := range routes {
		poolMap[r.Domain] = append(poolMap[r.Domain], r.Upstream)
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
				// RP-only domain — not in kppn_domains; synthesise a zero-port entry
				next[domain] = domainEntry{port: 0, siteID: siteIDs[domain], pool: pool}
			}
		}

		// atomically install the updated cache with attached pools
		p.cache.Store(&next)
		logger.Info("proxy: RP routes loaded — %d domains with upstream pools", len(poolMap))
	}

	logger.Info("proxy: domain cache warmed with %d entries", len(m))
	return nil
}

// WarmSecurityCache compiles all IP and UA rules from the database and
// atomically installs the result. Called once on startup and after any rule change.
func (p *Proxy) WarmSecurityCache(ipRules []*db.IPRule, uaRules []*db.UARule) {
	cache := buildSecurityCache(ipRules, uaRules)
	p.secCache.Store(&cache)
	logger.Info("proxy: security cache warmed — %d IP rules, %d UA rules", len(ipRules), len(uaRules))
}

// WarmTrustedProxies loads trusted proxy CIDRs from the database, compiles them
// into net.IPNet ranges, and atomically installs the result. Called on startup,
// after a settings change, and by StartTrustedProxyRefresher after each fetch.
func (p *Proxy) WarmTrustedProxies(cidrs []string) {
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
	logger.Info("proxy: trusted proxies warmed — %d ranges", len(nets))
}

// WarmWAFCache loads WAF settings and per-site overrides from the database,
// compiles the Coraza engine(s), and installs them atomically.
// Called once on startup and after any WAF settings change.
func (p *Proxy) WarmWAFCache() error {
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
		logger.Info("proxy: WAF disabled")
		return nil
	}

	// prefer locally downloaded CRS rules over the embedded coraza-coreruleset;
	// fall back to the embedded ruleset only when no local install is present
	crsDir := ""
	localCRS := CRSDir(p.appPath)
	if _, err := os.Stat(filepath.Join(localCRS, ".version")); err == nil {
		crsDir = localCRS
		logger.Info("proxy: using local CRS rules from %s", crsDir)
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
	logger.Info("proxy: WAF cache warmed — %d site overrides", len(siteOverrides))
	return nil
}

// AddDomain inserts a domain→port+siteID mapping into the cache atomically.
func (p *Proxy) AddDomain(domain string, port int, siteID int64) {
	p.swapCache(func(cur map[string]domainEntry) map[string]domainEntry {
		next := make(map[string]domainEntry, len(cur)+1)
		for k, v := range cur {
			next[k] = v
		}
		next[domain] = domainEntry{port: port, siteID: siteID}
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
	logger.Info("proxy admin domain updated to '%s'", domain)
}

// ServeHTTP routes requests by domain, enforcing IP and UA security rules
// before any traffic reaches a site pod. All requests are recorded in the
// structured access log regardless of outcome.
func (p *Proxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	clientIP := parseClientIP(r.RemoteAddr, r.Header.Get("X-Forwarded-For"), *p.trustedProxies.Load())

	// extract the host without port for routing and admin domain checks; the port is not relevant since
	host := r.Host
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}

	// check if the request is for the admin domain before any cache lookups
	p.adminMu.RLock()
	adminDomain := p.adminDomain
	p.adminMu.RUnlock()

	// resolve the site port — admin domain routes to the management UI
	var (
		port   int
		siteID int64
		rpPool *UpstreamPool
	)

	// admin domain bypasses the cache and routes directly to the admin port; all other domains require a cache lookup
	if adminDomain != "" && host == adminDomain {
		port = p.adminPort
	} else {
		entry, ok := p.lookupEntry(host)
		// allow RP sites through even when port is 0; they route via pool, not port
		if !ok || (entry.port == 0 && entry.pool == nil) {
			http.Error(w, "domain not registered", http.StatusNotFound)
			p.writeAccessLog(r, http.StatusNotFound, 0, time.Since(start), clientIP.String())
			return
		}
		port = entry.port
		siteID = entry.siteID
		rpPool = entry.pool
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

	// enforce IP rules — blacklist always beats whitelist
	if clientIP != nil && !checkIP(clientIP, sec.global, siteRules) {
		http.Error(w, "forbidden", http.StatusForbidden)
		p.writeAccessLog(r, http.StatusForbidden, 0, time.Since(start), clientIP.String())
		return
	}

	// enforce UA rules — blacklist always beats whitelist
	if !checkUA(r.UserAgent(), sec.global, siteRules) {
		http.Error(w, "forbidden", http.StatusForbidden)
		p.writeAccessLog(r, http.StatusForbidden, 0, time.Since(start), clientIP.String())
		return
	}

	logger.Debug("WAF check: siteID=%d enabled=%v engine=%v", siteID, p.wafEnabled.Load(), p.resolveWAFEngine(siteID) != nil)
	// enforce WAF — admin domain traffic (siteID == 0) bypasses inspection
	if siteID > 0 {
		if engine := p.resolveWAFEngine(siteID); engine != nil {
			if !engine.Inspect(w, r, clientIP.String(), p.wafLog) {
				// WAF wrote the 403; record it in the access log for Fail2Ban
				p.writeAccessLog(r, http.StatusForbidden, 0, time.Since(start), clientIP.String())
				return
			}
		}
	}

	// make sure browsers know we support QUIC
	w.Header().Set("Alt-Svc", `h3=":443"; ma=86400`)

	// wrap the writer to capture status + byte count for the access log
	sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}

	// reverse proxy sites bypass container routing — proxy directly to the upstream pool
	if rpPool != nil {
		newReverseProxy(rpPool.Next()).ServeHTTP(sw, r)
		p.writeAccessLog(r, sw.status, sw.bytes, time.Since(start), clientIP.String())
		return
	}

	p.siteProxy(sw, r, port)
	p.writeAccessLog(r, sw.status, sw.bytes, time.Since(start), clientIP.String())
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
		logger.Info("proactively obtaining certificate for domain '%s'", domain)
		hello := &tls.ClientHelloInfo{ServerName: domain}
		if _, err := p.manager.GetCertificate(hello); err != nil {
			logger.Error("failed to obtain certificate for '%s': %v", domain, err)
			return
		}
		logger.Info("certificate obtained successfully for '%s'", domain)
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
	rp := &httputil.ReverseProxy{
		Transport: p.transport,
		Rewrite: func(req *httputil.ProxyRequest) {
			req.SetURL(target)
			req.SetXForwarded()
			req.Out.Host = req.In.Host

			// forward WebSocket upgrade headers so WS connections are proxied correctly
			if req.In.Header.Get("Upgrade") != "" {
				req.Out.Header.Set("Upgrade", req.In.Header.Get("Upgrade"))
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
	}
	actual, _ := p.rpCache.LoadOrStore(port, rp)
	return actual.(*httputil.ReverseProxy)
}

// writeAccessLog writes a single structured line to the proxy access log.
// Format: timestamp method host path status bytes duration remoteIP "ua"
func (p *Proxy) writeAccessLog(r *http.Request, status, bytes int, dur time.Duration, clientIP string) {
	if p.accessLog == nil {
		return
	}

	line := fmt.Sprintf("%s %s %s %s %d %d %s %s %q\n",
		time.Now().UTC().Format(time.RFC3339),
		r.Method,
		r.Host,
		r.URL.Path,
		status,
		bytes,
		dur.Round(time.Millisecond).String(),
		clientIP,
		r.UserAgent(),
	)

	if _, err := p.accessLog.WriteString(line); err != nil {
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
