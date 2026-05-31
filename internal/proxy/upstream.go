package proxy

import (
	"crypto/tls"
	"net/http"
	"net/http/httputil"
	"net/url"
	"sync/atomic"
	"time"

	"podnest/internal/logger"
)

// UpstreamPool holds a slice of upstream URLs and an atomic round-robin counter
type UpstreamPool struct {
	targets []*url.URL
	counter atomic.Uint64
}

// newUpstreamPool parses a slice of raw upstream URL strings into an UpstreamPool
func newUpstreamPool(upstreams []string) (*UpstreamPool, error) {
	pool := &UpstreamPool{targets: make([]*url.URL, 0, len(upstreams))}
	for _, u := range upstreams {
		parsed, err := url.Parse(u)
		if err != nil {
			logger.Error("upstream: failed to parse upstream URL '%s': %v", u, err)
			return nil, err
		}
		pool.targets = append(pool.targets, parsed)
	}
	return pool, nil
}

// Next returns the next upstream URL via atomic increment + modulo, providing round-robin balancing
func (p *UpstreamPool) Next() *url.URL {
	n := p.counter.Add(1)
	return p.targets[int(n-1)%len(p.targets)]
}

// newReverseProxy creates a fully transparent httputil.ReverseProxy for the given target.
// All request headers — including method, body, and X-Forwarded-For — are forwarded.
// WebSocket upgrades and all HTTP methods (PUT, DELETE, PATCH, etc.) are passed through.
// SSL verification of the upstream is skipped for user-defined upstreams.
func newReverseProxy(target *url.URL) *httputil.ReverseProxy {
	// shared transport per proxy instance — reuses connections across requests
	transport := &http.Transport{
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 20,
		IdleConnTimeout:     90 * time.Second,
		TLSClientConfig:     &tls.Config{InsecureSkipVerify: true}, //nolint:gosec — user-defined upstream
	}

	return &httputil.ReverseProxy{
		Transport: transport,
		Rewrite: func(req *httputil.ProxyRequest) {
			req.SetURL(target)
			req.Out.Host = req.In.Host

			// explicitly preserve the HTTP method — PUT, DELETE, PATCH, etc.
			req.Out.Method = req.In.Method

			// copy the request body for methods that carry a payload
			req.Out.Body = req.In.Body
			req.Out.ContentLength = req.In.ContentLength

			// forward all inbound headers verbatim before setting X-Forwarded-* values
			for key, vals := range req.In.Header {
				req.Out.Header[key] = vals
			}

			// set X-Forwarded-* headers after copying to avoid duplication
			req.SetXForwarded()

			// pass through WebSocket upgrade headers
			if upgrade := req.In.Header.Get("Upgrade"); upgrade != "" {
				req.Out.Header.Set("Upgrade", upgrade)
				req.Out.Header.Set("Connection", "Upgrade")
			}

			// forward the real client IP when already set by a trusted upstream proxy
			if clientIP := req.In.Header.Get("X-Real-IP"); clientIP != "" {
				req.Out.Header.Set("X-Real-IP", clientIP)
			}
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			logger.Error("upstream: reverse proxy error for target '%s': %v", target.Host, err)
			http.Error(w, "upstream unavailable", http.StatusBadGateway)
		},
	}
}