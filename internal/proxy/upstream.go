package proxy

import (
	"crypto/tls"
	"net/http"
	"net/http/httputil"
	"net/url"
	"sync/atomic"

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
// All request headers are forwarded including X-Forwarded-For and X-Real-IP.
// WebSocket upgrades are passed through. SSL verification of the upstream is skipped.
func newReverseProxy(target *url.URL) *httputil.ReverseProxy {
	transport := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true}, //nolint:gosec — user-defined upstream
	}

	return &httputil.ReverseProxy{
		Transport: transport,
		Rewrite: func(req *httputil.ProxyRequest) {
			req.SetURL(target)
			req.SetXForwarded()
			req.Out.Host = req.In.Host

			// pass through WebSocket upgrade headers
			if req.In.Header.Get("Upgrade") != "" {
				req.Out.Header.Set("Upgrade", req.In.Header.Get("Upgrade"))
				req.Out.Header.Set("Connection", "Upgrade")
			}

			// forward the real client IP
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
