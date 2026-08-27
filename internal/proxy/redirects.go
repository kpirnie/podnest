// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package proxy

import (
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"podnest/internal/db"
	"podnest/internal/logger"
)

// compiledRedirect is a redirect rule with its Source pattern pre-compiled.
// re is non-nil when Source compiled as a valid regex; when nil, matching
// falls back to exact/prefix comparison against the request path.
type compiledRedirect struct {
	re     *regexp.Regexp
	source string
	target string
	code   int
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

// safeRedirectTarget checks that capture substitution did not change where a
// redirect points. The rule's literal target is the site owner's intent — an
// off-site redirect is legitimate when they wrote the host into the rule, but a
// host arriving through $1 came from the request path and is attacker-supplied.
func safeRedirectTarget(literal, final string) bool {
	// protocol-relative and backslash forms resolve off-site in browsers
	trimmed := strings.TrimSpace(final)
	if strings.HasPrefix(trimmed, "//") || strings.HasPrefix(trimmed, `/\`) || strings.HasPrefix(trimmed, `\`) {
		return false
	}

	lu, err := url.Parse(literal)
	if err != nil {
		return false
	}
	fu, err := url.Parse(trimmed)
	if err != nil {
		return false
	}

	if fu.Scheme != "" && fu.Scheme != "http" && fu.Scheme != "https" {
		return false
	}

	// a relative rule must stay relative; an absolute one must keep its host
	if lu.Host == "" {
		return fu.Host == ""
	}
	return strings.EqualFold(fu.Host, lu.Host)
}

// applyRedirects checks redirect rules before security enforcement — redirects
// are intentional routing decisions, not subject to IP/UA/WAF filtering.
// Returns true when a redirect was issued and the response has already been written.
func (p *Proxy) applyRedirects(w http.ResponseWriter, r *http.Request, siteID int64, start time.Time, clientIPStr, siteName string) bool {
	rules, ok := p.redirectCache.Load(siteID)
	if !ok {
		return false
	}

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
					if !safeRedirectTarget(rd.target, target) {
						logger.Warn("proxy: siteID=%d redirect rule %q produced an off-site target after substitution, skipping", siteID, rd.source)
						break
					}
					http.Redirect(w, r, target, rd.code)
					dur := time.Since(start)
					p.writeAccessLog(r, rd.code, 0, start, dur, clientIPStr, siteID, siteName)
					return true
				}
			}
		} else {
			if r.URL.Path == rd.source || (rd.source != "/" && strings.HasPrefix(r.URL.Path, rd.source)) {
				http.Redirect(w, r, target, rd.code)
				dur := time.Since(start)
				p.writeAccessLog(r, rd.code, 0, start, dur, clientIPStr, siteID, siteName)
				return true
			}
		}
	}
	return false
}
