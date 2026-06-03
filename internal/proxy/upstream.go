package proxy

import (
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

// Targets returns the upstream URL slice for connection warming.
func (p *UpstreamPool) Targets() []*url.URL {
	return p.targets
}

// newReverseProxy creates a fully transparent httputil.ReverseProxy for the given target.
// transport is the shared pool passed in from Proxy.rpTransport — not created here —
// so idle connections are reused across all RP upstream sites rather than siloed per-URL.
func newReverseProxy(target *url.URL, transport *http.Transport) *httputil.ReverseProxy {

	// return the proxy
	return &httputil.ReverseProxy{
		Transport:     transport,
		FlushInterval: -1, // flush immediately for streaming responses — see getOrCreateProxy
		Rewrite: func(req *httputil.ProxyRequest) {
			req.SetURL(target)
			req.Out.Host = req.In.Host

			// explicitly preserve the HTTP method — PUT, DELETE, PATCH, etc.
			req.Out.Method = req.In.Method

			// copy the request body for methods that carry a payload
			req.Out.Body = req.In.Body
			req.Out.ContentLength = req.In.ContentLength

			// clone the inbound header map before modification — see getOrCreateProxy
			// for full explanation of the aliasing issue with Rewrite + SetXForwarded
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
