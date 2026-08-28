// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package proxy

import (
	"bytes"
	"context"
	"errors"
	"fmt"
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

// the cached ReverseProxy's ModifyResponse can signal without closing over
// per-request state — a captured bool would be shared across every request
// served by the cached proxy.
type commitKey struct{}

// rpMaxReplayBytes bounds how large a request body may be before the cascade
// gives up on failover. Buffering an arbitrarily large upload to make retry
// possible would hand every client a memory lever on the proxy.
const rpMaxReplayBytes = 4 << 20 // 4 MB

// newUpstreamPool parses a slice of RPRoute into an UpstreamPool.
func newUpstreamPool(routes []upstreamEntry) (*UpstreamPool, error) {
	pool := &UpstreamPool{targets: make([]UpstreamTarget, 0, len(routes))}
	for _, r := range routes {
		parsed, err := url.Parse(r.upstream)
		if err != nil {
			// skip the bad upstream but keep the rest of the pool alive
			logger.Error("upstream: skipping unparseable upstream '%s': %v", r.upstream, err)
			continue
		}
		if parsed.Scheme != "http" && parsed.Scheme != "https" {
			logger.Error("upstream: skipping upstream '%s': unsupported scheme '%s'", r.upstream, parsed.Scheme)
			continue
		}
		if parsed.Host == "" {
			logger.Error("upstream: skipping upstream '%s': missing host", r.upstream)
			continue
		}
		pool.targets = append(pool.targets, UpstreamTarget{URL: parsed, PassHost: r.passHost})
	}
	if len(pool.targets) == 0 {
		return nil, fmt.Errorf("no valid upstreams in pool")
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

// errUpstreamStatus signals ModifyResponse rejected the upstream's status code
// so the cascade can fall through to the next target.
var errUpstreamStatus = errors.New("upstream returned failover status")

// shouldFailover reports whether an upstream's response means that upstream
// could not serve the request, as opposed to the app answering. Only the
// gateway statuses qualify, and only for methods that are safe to replay — a
// 500 is an app bug every upstream in the pool will reproduce, and replaying a
// POST body to the rest of the pool delivers it to hosts it was never meant for.
func shouldFailover(method string, status int) bool {
	if !replayableMethod(method) {
		return false
	}
	switch status {
	case http.StatusBadGateway, http.StatusServiceUnavailable, http.StatusGatewayTimeout:
		return true
	}
	return false
}

// tryUpstream proxies to w with no buffering — ModifyResponse inspects the status
// before any bytes reach the client, so a rejected upstream can fall through to
// the next while an accepted one streams straight through.
// Returns true if the response was committed to the client.
func tryUpstream(w http.ResponseWriter, r *http.Request, target UpstreamTarget, rp *httputil.ReverseProxy) bool {
	var committed atomic.Bool
	rp.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), commitKey{}, &committed)))
	return committed.Load()
}

// bufferReplayBody reads the request body into memory so a failed upstream can
// be retried with the same payload, and rewinds r.Body for the first attempt.
// Reports false when the body exceeds rpMaxReplayBytes, in which case r.Body is
// restored as a stream and the caller must not fail over. Methods shouldFailover
// refuses to replay are left streaming — buffering them allocates a copy the
// cascade would never use.
func bufferReplayBody(r *http.Request) (bool, []byte) {
	if r.Body == nil || r.Body == http.NoBody {
		return true, nil
	}

	if !replayableMethod(r.Method) {
		return false, nil
	}

	buf, err := io.ReadAll(io.LimitReader(r.Body, rpMaxReplayBytes+1))
	if err != nil {
		logger.Debug("upstream: buffering request body failed: %v", err)
		r.Body = io.NopCloser(io.MultiReader(bytes.NewReader(buf), r.Body))
		return false, nil
	}

	// over the cap — chain the read prefix back on and stream the rest
	if len(buf) > rpMaxReplayBytes {
		r.Body = io.NopCloser(io.MultiReader(bytes.NewReader(buf), r.Body))
		return false, nil
	}

	r.Body = io.NopCloser(bytes.NewReader(buf))
	return true, buf
}

// resetReplayBody rewinds the buffered body for another cascade attempt.
func resetReplayBody(r *http.Request, body []byte) {
	if body == nil {
		return
	}
	r.Body = io.NopCloser(bytes.NewReader(body))
}

// newReverseProxy creates a fully transparent httputil.ReverseProxy for the given target.
// transport is the shared pool passed in from Proxy.rpTransport — not created here —
// so idle connections are reused across all RP upstream sites rather than siloed per-URL.
func newReverseProxy(target *url.URL, transport *http.Transport, passHost bool, clientIPFor func(*http.Request) string) *httputil.ReverseProxy {

	// return the proxy
	return &httputil.ReverseProxy{
		Transport:     transport,
		FlushInterval: -1, // flush immediately for streaming responses — see getOrCreateProxy
		Rewrite: func(req *httputil.ProxyRequest) {
			req.SetURL(target)

			// SetURL joins the upstream path onto the inbound path, so a root
			// request against a path-bearing upstream picks up a spurious
			// trailing slash (/my_epg/epg.xml + / = /my_epg/epg.xml/) — restore
			// the upstream path verbatim in that case
			if req.In.URL.Path == "/" && target.Path != "" && target.Path != "/" {
				req.Out.URL.Path = target.Path
				req.Out.URL.RawPath = target.RawPath
			}

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

			// set the client IP from the value already resolved against the trusted
			// proxy ranges — passing the inbound header through would let any client
			// dictate what the upstream app sees
			if clientIP := clientIPFor(req.In); clientIP != "" {
				req.Out.Header.Set("X-Real-IP", clientIP)
			} else {
				req.Out.Header.Del("X-Real-IP")
			}

		},
		ModifyResponse: func(resp *http.Response) error {

			// a failover status is not committed — the cascade moves on
			if resp.Request != nil && shouldFailover(resp.Request.Method, resp.StatusCode) {
				return errUpstreamStatus
			}
			if resp.Request != nil {
				if c, ok := resp.Request.Context().Value(commitKey{}).(*atomic.Bool); ok {
					c.Store(true)
				}
			}
			return nil
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			logger.Debug("upstream: target '%s' unavailable: %v", target.Host, err)
		},
	}
}

// replayableMethod reports whether a request body may be sent to a second
// upstream. Mirrors the method set shouldFailover accepts.
func replayableMethod(method string) bool {
	switch method {
	case http.MethodGet, http.MethodHead, http.MethodOptions:
		return true
	}
	return false
}
