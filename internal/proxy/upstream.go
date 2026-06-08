package proxy

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httputil"
	"net/url"
	"sync/atomic"

	"podnest/internal/logger"
)

// UpstreamTarget pairs a parsed URL with its PassHost flag.
type UpstreamTarget struct {
	URL      *url.URL
	PassHost bool
}

// UpstreamPool holds a slice of upstream targets and an atomic round-robin counter.
type UpstreamPool struct {
	targets []UpstreamTarget
	counter atomic.Uint64
}

// upstreamEntry is used internally when building a pool from DB routes.
type upstreamEntry struct {
	upstream string
	passHost bool
}

// newUpstreamPool parses a slice of RPRoute into an UpstreamPool.
func newUpstreamPool(routes []upstreamEntry) (*UpstreamPool, error) {
	pool := &UpstreamPool{targets: make([]UpstreamTarget, 0, len(routes))}
	for _, r := range routes {
		parsed, err := url.Parse(r.upstream)
		if err != nil {
			logger.Error("upstream: failed to parse upstream URL '%s': %v", r.upstream, err)
			return nil, err
		}
		pool.targets = append(pool.targets, UpstreamTarget{URL: parsed, PassHost: r.passHost})
	}
	return pool, nil
}

// Next returns the next upstream target via atomic round-robin.
func (p *UpstreamPool) Next() UpstreamTarget {
	n := p.counter.Add(1)
	return p.targets[int(n-1)%len(p.targets)]
}

// NextIndex returns the round-robin start index without advancing the counter.
// Used by TryAll to determine the starting position for the cascade.
func (p *UpstreamPool) NextIndex() int {
	n := p.counter.Add(1)
	return int(n-1) % len(p.targets)
}

// Len returns the number of upstreams in the pool.
func (p *UpstreamPool) Len() int {
	return len(p.targets)
}

// At returns the upstream at the given index.
func (p *UpstreamPool) At(i int) UpstreamTarget {
	return p.targets[i%len(p.targets)]
}

// Targets returns all upstream URLs for connection warming.
func (p *UpstreamPool) Targets() []*url.URL {
	out := make([]*url.URL, len(p.targets))
	for i, t := range p.targets {
		out[i] = t.URL
	}
	return out
}

// tryUpstream attempts to proxy the request to a single upstream target.
// Returns true on success (2xx/3xx), false if the upstream was unreachable or
// returned a 5xx. The response is written to w on success.
func tryUpstream(w http.ResponseWriter, r *http.Request, target UpstreamTarget, transport *http.Transport) bool {

	// buffer the request body so it can be re-read on retry
	var bodyBytes []byte
	if r.Body != nil {
		var err error
		bodyBytes, err = io.ReadAll(r.Body)
		if err != nil {
			logger.Error("upstream: failed to read request body for retry: %v", err)
			return false
		}
		r.Body.Close()
		r.Body = io.NopCloser(bytes.NewReader(bodyBytes))
	}

	// use a response recorder to capture the upstream response before writing to w
	rec := &responseRecorder{header: make(http.Header), code: 200}

	rp := newReverseProxy(target.URL, transport, target.PassHost)

	// override the error handler to signal failure without writing to w
	failed := false
	rp.ErrorHandler = func(rw http.ResponseWriter, req *http.Request, err error) {
		logger.Debug("upstream: target '%s' unavailable: %v", target.URL.Host, err)
		failed = true
	}

	rp.ServeHTTP(rec, r)

	if failed || rec.code >= 500 {
		// restore body for next attempt
		if bodyBytes != nil {
			r.Body = io.NopCloser(bytes.NewReader(bodyBytes))
		}
		return false
	}

	// upstream succeeded — flush the recorded response to the real writer
	for k, vals := range rec.header {
		for _, v := range vals {
			w.Header().Add(k, v)
		}
	}
	w.WriteHeader(rec.code)
	w.Write(rec.body.Bytes())
	return true
}

// responseRecorder captures an upstream response for inspection before committing to the client.
type responseRecorder struct {
	header http.Header
	code   int
	body   bytes.Buffer
}

func (r *responseRecorder) Header() http.Header        { return r.header }
func (r *responseRecorder) WriteHeader(code int)       { r.code = code }
func (r *responseRecorder) Write(b []byte) (int, error) { return r.body.Write(b) }

// newReverseProxy creates a fully transparent httputil.ReverseProxy for the given target.
// transport is the shared pool passed in from Proxy.rpTransport — not created here —
// so idle connections are reused across all RP upstream sites rather than siloed per-URL.
func newReverseProxy(target *url.URL, transport *http.Transport, passHost bool) *httputil.ReverseProxy {

	// return the proxy
	return &httputil.ReverseProxy{
		Transport:     transport,
		FlushInterval: -1, // flush immediately for streaming responses — see getOrCreateProxy
		Rewrite: func(req *httputil.ProxyRequest) {
			req.SetURL(target)

			// passHost forwards the incoming domain as Host; otherwise use the upstream's own hostname
			if passHost {
				req.Out.Host = req.In.Host
			} else {
				req.Out.Host = target.Host
			}

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