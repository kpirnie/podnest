// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package stats

import (
	"bufio"
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"sort"
	"strconv"
	"strings"
	"time"

	"podnest/internal/apiutil"
	"podnest/internal/auth"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/podman"

	"github.com/gorilla/websocket"
)

// -- types -------------------------------------------------------------------

// TrafficStats is the parsed result from the proxy access log.
type TrafficStats struct {
	HitsPerHour    []HourBucket    `json:"hits_per_hour"`
	StatusCodes    StatusBreakdown `json:"status_codes"`
	TopIPs         []CountedEntry  `json:"top_ips"`
	TopUAs         []CountedEntry  `json:"top_uas"`
	TotalBandwidth int64           `json:"total_bandwidth"`
	TopSites       []CountedEntry  `json:"top_sites,omitempty"` // global only
}

// HourBucket is a single hourly hit count broken down by status category.
type HourBucket struct {
	Hour string `json:"hour"`
	S2xx int    `json:"2xx"`
	S3xx int    `json:"3xx"`
	S4xx int    `json:"4xx"`
	S5xx int    `json:"5xx"`
}

// StatusBreakdown holds response code category counts.
type StatusBreakdown struct {
	S2xx int `json:"2xx"`
	S3xx int `json:"3xx"`
	S4xx int `json:"4xx"`
	S5xx int `json:"5xx"`
}

// CountedEntry is a generic name+count pair used for IPs, UAs, and top sites.
type CountedEntry struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

// DrilldownEntry is a single request record for the 4xx/5xx drilldown modal.
type DrilldownEntry struct {
	Time     string `json:"time"`
	Method   string `json:"method"`
	Path     string `json:"path"`
	Status   int    `json:"status"`
	ClientIP string `json:"client_ip"`
	UA       string `json:"ua"`
	Reason   string `json:"reason,omitempty"`
}

// podStatEntry is a single container's live resource snapshot.
type podStatEntry struct {
	Name       string  `json:"name"`
	CPUPercent float64 `json:"cpu_percent"`
	MemUsed    int64   `json:"mem_used"`
	MemLimit   int64   `json:"mem_limit"`
}

// podStatsResponse is the per-site WebSocket push payload.
type podStatsResponse struct {
	Containers []podStatEntry `json:"containers"`
}

// globalPodResponse is the dashboard aggregate payload.
type globalPodResponse struct {
	TotalCPU float64 `json:"total_cpu"`
	MemUsed  int64   `json:"mem_used"`
	MemLimit int64   `json:"mem_limit"`
}

// diskResponse is the disk usage payload for html/ and db/ directories.
type diskResponse struct {
	HTMLBytes int64 `json:"html_bytes"`
	DBBytes   int64 `json:"db_bytes"`
}

// podmanStatsWrapper is the envelope returned by the Podman stats REST endpoint.
type podmanStatsWrapper struct {
	Error *string            `json:"Error"`
	Stats []podmanStatsEntry `json:"Stats"`
}

// podmanStatsEntry is a single container entry within the stats wrapper.
type podmanStatsEntry struct {
	Name     string  `json:"Name"`
	CPU      float64 `json:"CPU"`
	MemUsage int64   `json:"MemUsage"`
	MemLimit int64   `json:"MemLimit"`
}

// -- handler -----------------------------------------------------------------

// Handler handles all stats routes for the stats feature module.
type Handler struct {
	DB      *sql.DB
	AppPath string
	Podman  *podman.Client
	Resolve modules.SiteResolver
}

var wsUpgrader = websocket.Upgrader{
	ReadBufferSize:  512,
	WriteBufferSize: 4096,
	CheckOrigin:     apiutil.WSSameOrigin,
}

// -- per-site routes ---------------------------------------------------------

// apiSiteTraffic returns cached traffic stats for a single site.
func (h *Handler) apiSiteTraffic(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}

	if cached := globalCache.get(site.ID); cached != nil {
		apiutil.JSON(w, http.StatusOK, cached)
		return
	}

	// RP sites write to a per-site log with no domain filtering needed;
	// non-RP sites still require at least one domain to be registered
	if site.SiteType != models.SiteTypeReverseProxy {
		domains, err := h.siteDomainsFor(site)
		if err != nil || len(domains) == 0 {
			apiutil.ErrorMsg(w, http.StatusNotFound, "no domains found for site")
			return
		}
	}

	// per-site log is already filtered — no domain matching needed
	stats, err := parseTrafficLog(fmt.Sprintf("%s/sites/%s/logs/access.log", h.AppPath, site.Name), nil, false)
	if err != nil {
		logger.Error("stats: traffic parse for site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	globalCache.set(site.ID, stats)
	apiutil.JSON(w, http.StatusOK, stats)
}

// apiSiteDrilldown returns individual request records for a given hour and
// status class (4xx or 5xx). Used by the stats tab drilldown modal.
func (h *Handler) apiSiteDrilldown(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}

	hour := r.URL.Query().Get("hour")
	statusClass := r.URL.Query().Get("status")

	// validate status class — only 4xx and 5xx are supported
	if statusClass != "4xx" && statusClass != "5xx" {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "status must be 4xx or 5xx")
		return
	}
	if hour == "" {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "hour param required")
		return
	}

	logPath := fmt.Sprintf("%s/sites/%s/logs/access.log", h.AppPath, site.Name)
	entries, err := parseDrilldown(logPath, hour, statusClass, nil)
	if err != nil {
		logger.Error("stats: drilldown parse for site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	apiutil.JSON(w, http.StatusOK, entries)
}

// apiSitePodStats upgrades to WebSocket and pushes container stats every 2s.
func (h *Handler) apiSitePodStats(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}

	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Error("stats: ws upgrade for site %d: %v", site.ID, err)
		return
	}
	defer conn.Close()

	// roles included in pod stats (app container excluded per spec)
	roles := statsRoles(site.SiteType)
	names := make([]string, len(roles))
	for i, role := range roles {
		names[i] = modules.ContainerName(site.Name, role)
	}

	ctx := r.Context()
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	// consecutive fetch failures — used to close the stream when the pod is
	// gone (deleted/stopped) so the ticker does not loop forever logging 404s
	fails := 0

	logger.Debug("stats: ws pod stream opened for site %d", site.ID)

	for {
		select {
		case <-ctx.Done():
			logger.Debug("stats: ws pod stream closed for site %d", site.ID)
			return
		case <-ticker.C:
			payload, err := h.fetchPodStats(ctx, names)
			if err != nil {
				// tolerate transient failures while a pod is still starting, but
				// stop the stream once failures persist (pod deleted or stopped)
				fails++
				if fails >= 3 {
					logger.Debug("stats: closing pod stream for site %d after %d consecutive failures: %v", site.ID, fails, err)
					return
				}
				continue
			}
			fails = 0
			if err := conn.WriteJSON(payload); err != nil {
				logger.Debug("stats: ws write failed for site %d: %v", site.ID, err)
				return
			}
		}
	}
}

// apiSiteDisk returns disk usage for a site's html/ and db/ directories.
func (h *Handler) apiSiteDisk(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		return
	}

	base := fmt.Sprintf("%s/sites/%s", h.AppPath, site.Name)
	resp := diskResponse{
		HTMLBytes: duBytes(base + "/html"),
		DBBytes:   duBytes(base + "/db"),
	}
	apiutil.JSON(w, http.StatusOK, resp)
}

// -- global routes -----------------------------------------------------------

// apiGlobalTraffic returns cached traffic stats aggregated across all sites for
// admins, or scoped to the requesting user's own sites for managers.
func (h *Handler) apiGlobalTraffic(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		apiutil.ErrorMsg(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	// admins aggregate every site (cache key 0); any non-admin is scoped to
	// their own sites and cached under their uid so one role's data can never
	// be served from another's cached entry
	var (
		cacheKey int64 = 0
		domains  []string
	)
	if user.Role != models.RoleAdmin {
		cacheKey = user.ID

		// gather every domain across the manager's own sites
		sites, err := db.GetSitesByUser(h.DB, user.ID)
		if err != nil {
			logger.Error("stats: global traffic — GetSitesByUser(%d): %v", user.ID, err)
			apiutil.Error(w, http.StatusInternalServerError, err)
			return
		}
		for _, s := range sites {
			ds, err := h.siteDomainsFor(s)
			if err != nil {
				logger.Error("stats: global traffic — siteDomainsFor(%d): %v", s.ID, err)
				continue
			}
			domains = append(domains, ds...)
		}

		// a manager with no domains must see zero traffic, not the full log —
		// seed a sentinel host that matches nothing so the filter stays active
		if len(domains) == 0 {
			domains = []string{"\x00"}
		}
	}

	if cached := globalCache.get(cacheKey); cached != nil {
		apiutil.JSON(w, http.StatusOK, cached)
		return
	}

	stats, err := parseTrafficLog(h.AppPath+"/logs/proxy-access.log", domains, true)
	if err != nil {
		logger.Error("stats: global traffic parse: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	globalCache.set(cacheKey, stats)
	apiutil.JSON(w, http.StatusOK, stats)
}

// apiGlobalPod returns aggregate CPU and memory across all running containers
// for admins, or only the requesting user's own sites for managers.
func (h *Handler) apiGlobalPod(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		apiutil.ErrorMsg(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	// admins aggregate every site; any non-admin is scoped to their own sites
	var (
		sites []*models.Site
		err   error
	)
	if user.Role == models.RoleAdmin {
		sites, err = db.GetAllSites(h.DB)
	} else {
		sites, err = db.GetSitesByUser(h.DB, user.ID)
	}
	if err != nil {
		logger.Error("stats: global pod — load sites: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// collect names for all pod-based running sites
	var names []string
	for _, s := range sites {
		roles := statsRoles(s.SiteType)
		if s.SiteType == models.SiteTypeReverseProxy || s.SiteStatus != 1 {
			continue
		}
		for _, role := range roles {
			names = append(names, modules.ContainerName(s.Name, role))
		}
	}

	if len(names) == 0 {
		apiutil.JSON(w, http.StatusOK, globalPodResponse{})
		return
	}

	entries, err := h.fetchPodStats(r.Context(), names)
	if err != nil {
		logger.Error("stats: global pod fetch: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	var resp globalPodResponse
	for _, c := range entries.Containers {
		resp.TotalCPU += c.CPUPercent
		resp.MemUsed += c.MemUsed
		resp.MemLimit += c.MemLimit
	}
	apiutil.JSON(w, http.StatusOK, resp)
}

// apiGlobalDrilldown returns individual request records for a given hour and
// status class across all sites for admins, or scoped to the requesting
// user's own sites for managers. Used by the dashboard drilldown modal.
func (h *Handler) apiGlobalDrilldown(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		apiutil.ErrorMsg(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	hour := r.URL.Query().Get("hour")
	statusClass := r.URL.Query().Get("status")

	// validate status class — only 4xx and 5xx are supported
	if statusClass != "4xx" && statusClass != "5xx" {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "status must be 4xx or 5xx")
		return
	}
	if hour == "" {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "hour param required")
		return
	}

	// admins see the full log; any non-admin is scoped to their own sites
	var domains []string
	if user.Role != models.RoleAdmin {
		sites, err := db.GetSitesByUser(h.DB, user.ID)
		if err != nil {
			logger.Error("stats: global drilldown — GetSitesByUser(%d): %v", user.ID, err)
			apiutil.Error(w, http.StatusInternalServerError, err)
			return
		}
		for _, s := range sites {
			ds, err := h.siteDomainsFor(s)
			if err != nil {
				logger.Error("stats: global drilldown — siteDomainsFor(%d): %v", s.ID, err)
				continue
			}
			domains = append(domains, ds...)
		}

		// a manager with no domains must see zero entries, not the full log —
		// seed a sentinel host that matches nothing so the filter stays active
		if len(domains) == 0 {
			domains = []string{"\x00"}
		}
	}

	entries, err := parseDrilldown(h.AppPath+"/logs/proxy-access.log", hour, statusClass, domains)
	if err != nil {
		logger.Error("stats: global drilldown parse: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	apiutil.JSON(w, http.StatusOK, entries)
}

// -- helpers -----------------------------------------------------------------

// siteDomainsFor returns the registered domain strings for any site type.
func (h *Handler) siteDomainsFor(site *models.Site) ([]string, error) {
	if site.SiteType == models.SiteTypeReverseProxy {
		routes, err := db.GetRPRoutesBySite(h.DB, site.ID)
		if err != nil {
			return nil, err
		}
		out := make([]string, len(routes))
		for i, r := range routes {
			out[i] = r.Domain
		}
		return out, nil
	}

	domains, err := db.GetDomainsBySite(h.DB, site.ID)
	if err != nil {
		return nil, err
	}
	out := make([]string, len(domains))
	for i, d := range domains {
		out[i] = d.Domain
	}
	return out, nil
}

// fetchPodStats calls the Podman stats REST endpoint for the given container
// names and returns a podStatsResponse with only the containers that responded.
func (h *Handler) fetchPodStats(ctx context.Context, names []string) (*podStatsResponse, error) {
	path := "/v4.0.0/libpod/containers/stats?stream=false"
	for _, n := range names {
		path += "&containers=" + n
	}

	var raw podmanStatsWrapper
	if err := h.Podman.GetJSON(ctx, path, &raw); err != nil {
		return nil, err
	}

	resp := &podStatsResponse{Containers: make([]podStatEntry, 0, len(raw.Stats))}
	for _, e := range raw.Stats {
		resp.Containers = append(resp.Containers, podStatEntry{
			Name:       e.Name,
			CPUPercent: e.CPU,
			MemUsed:    e.MemUsage,
			MemLimit:   e.MemLimit,
		})
	}
	return resp, nil
}

// parseTrafficLog reads the proxy-access.log and computes TrafficStats.
// Pass a non-nil domains slice to filter to a single site; pass nil + global=true
// for the full-log aggregate (which also populates TopSites).
func parseTrafficLog(logPath string, domains []string, global bool) (*TrafficStats, error) {
	f, err := os.Open(logPath)
	if err != nil {
		if os.IsNotExist(err) {
			return &TrafficStats{HitsPerHour: []HourBucket{}}, nil
		}
		return nil, err
	}
	defer f.Close()

	now := time.Now().UTC()
	cutoff := now.Add(-24 * time.Hour)

	domainSet := make(map[string]struct{}, len(domains))
	for _, d := range domains {
		domainSet[d] = struct{}{}
	}

	type hourData struct{ s2xx, s3xx, s4xx, s5xx int }
	hourCounts := make(map[string]*hourData)
	ipCounts := make(map[string]int)
	uaCounts := make(map[string]int)
	siteCounts := make(map[string]int) // global only
	var stats TrafficStats

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}

		fields := strings.Fields(line)
		// format: timestamp method host path status bytes duration clientIP "ua"
		// minimum 8 fields; WAF lines begin with a WAF action, not a timestamp
		if len(fields) < 8 {
			continue
		}

		// skip WAF log lines — they don't start with an RFC3339 timestamp
		ts, err := time.Parse(time.RFC3339, fields[0])
		if err != nil {
			continue
		}

		// skip PodNest-blocked requests — they carry a trailing "reason=" token
		// after the quoted UA; only non-blocked traffic counts toward stats
		if last := fields[len(fields)-1]; strings.HasPrefix(last, "reason=") && !strings.HasSuffix(last, "\"") {
			continue
		}

		host := fields[2]
		// filter to matching domains whenever a domain set is provided —
		// applies to per-site calls and to the manager-scoped global aggregate;
		// when domainSet is empty the log is already the correct scope (a
		// site-specific file, or the full merged log for an admin)
		if len(domainSet) > 0 {
			if _, ok := domainSet[host]; !ok {
				continue
			}
		}

		// skip static asset requests
		if isStaticAsset(fields[3]) {
			continue
		}

		statusCode, err := strconv.Atoi(fields[4])
		if err != nil {
			continue
		}
		bytes, err := strconv.ParseInt(fields[5], 10, 64)
		if err != nil {
			continue
		}

		clientIP := fields[7]
		ua := ""
		if len(fields) >= 9 {
			// ua field is quoted; join remaining fields and strip quotes
			raw := strings.Join(fields[8:], " ")
			ua = strings.Trim(raw, "\"")
		}

		// skip anything outside the 24h window
		if !ts.After(cutoff) {
			continue
		}

		// status code buckets
		switch {
		case statusCode >= 200 && statusCode < 300:
			stats.StatusCodes.S2xx++
		case statusCode >= 300 && statusCode < 400:
			stats.StatusCodes.S3xx++
		case statusCode >= 400 && statusCode < 500:
			stats.StatusCodes.S4xx++
		case statusCode >= 500:
			stats.StatusCodes.S5xx++
		}

		stats.TotalBandwidth += bytes
		ipCounts[clientIP]++
		if ua != "" {
			uaCounts[ua]++
		}
		if global {
			siteCounts[host]++
		}

		// hits per hour bucketing
		hourKey := ts.UTC().Truncate(time.Hour).Format(time.RFC3339)
		if hourCounts[hourKey] == nil {
			hourCounts[hourKey] = &hourData{}
		}
		switch {
		case statusCode >= 200 && statusCode < 300:
			hourCounts[hourKey].s2xx++
		case statusCode >= 300 && statusCode < 400:
			hourCounts[hourKey].s3xx++
		case statusCode >= 400 && statusCode < 500:
			hourCounts[hourKey].s4xx++
		case statusCode >= 500:
			hourCounts[hourKey].s5xx++
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	// build ordered 24-hour buckets (all 24 slots, zero-filled)
	stats.HitsPerHour = make([]HourBucket, 24)
	for i := 23; i >= 0; i-- {
		slot := now.Add(-time.Duration(i) * time.Hour).Truncate(time.Hour)
		key := slot.UTC().Format(time.RFC3339)
		d := hourCounts[key]
		if d == nil {
			d = &hourData{}
		}
		stats.HitsPerHour[23-i] = HourBucket{
			Hour: key,
			S2xx: d.s2xx,
			S3xx: d.s3xx,
			S4xx: d.s4xx,
			S5xx: d.s5xx,
		}
	}

	stats.TopIPs = topN(ipCounts, 10)
	stats.TopUAs = topN(uaCounts, 10)

	if global {
		stats.TopSites = topN(siteCounts, 10)
	}

	return &stats, nil
}

// parseDrilldown reads an access log and returns up to 500 entries matching
// the given hour and status class ("4xx" or "5xx"). Pass a non-nil domains
// slice to filter to matching hosts (manager-scoped global drilldown); pass
// nil when the log is already the correct scope (a per-site file, or the
// full merged log for an admin).
func parseDrilldown(logPath, hour, statusClass string, domains []string) ([]DrilldownEntry, error) {
	f, err := os.Open(logPath)
	if err != nil {
		if os.IsNotExist(err) {
			return []DrilldownEntry{}, nil
		}
		return nil, err
	}
	defer f.Close()

	// parse the hour boundary once
	hourTime, err := time.Parse(time.RFC3339, hour)
	if err != nil {
		return nil, fmt.Errorf("invalid hour param: %w", err)
	}
	hourEnd := hourTime.Add(time.Hour)

	domainSet := make(map[string]struct{}, len(domains))
	for _, d := range domains {
		domainSet[d] = struct{}{}
	}

	var results []DrilldownEntry
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}

		fields := strings.Fields(line)
		// format: timestamp method host path status bytes duration clientIP "ua"
		if len(fields) < 8 {
			continue
		}

		ts, err := time.Parse(time.RFC3339, fields[0])
		if err != nil {
			continue
		}

		// filter to matching domains when a domain set is provided
		if len(domainSet) > 0 {
			if _, ok := domainSet[fields[2]]; !ok {
				continue
			}
		}

		// filter to the requested hour window
		if ts.Before(hourTime) || !ts.Before(hourEnd) {
			continue
		}

		statusCode, err := strconv.Atoi(fields[4])
		if err != nil {
			continue
		}

		// filter to the requested status class
		match := (statusClass == "4xx" && statusCode >= 400 && statusCode < 500) ||
			(statusClass == "5xx" && statusCode >= 500)
		if !match {
			continue
		}

		// PodNest-blocked requests carry a trailing "reason=<value>" token after
		// the quoted UA — exclude them from the drilldown entirely
		last := len(fields)
		if strings.HasPrefix(fields[last-1], "reason=") && !strings.HasSuffix(fields[last-1], "\"") {
			continue
		}

		ua := ""
		if last >= 9 {
			ua = strings.Trim(strings.Join(fields[8:last], " "), "\"")
		}

		results = append(results, DrilldownEntry{
			Time:     ts.UTC().Format(time.RFC3339),
			Method:   fields[1],
			Path:     fields[3],
			Status:   statusCode,
			ClientIP: fields[7],
			UA:       ua,
		})

		if len(results) >= 500 {
			break
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	return results, nil
}

// topN returns the top n entries from a count map, sorted descending.
func topN(counts map[string]int, n int) []CountedEntry {
	entries := make([]CountedEntry, 0, len(counts))
	for k, v := range counts {
		entries = append(entries, CountedEntry{Name: k, Count: v})
	}
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Count > entries[j].Count
	})
	if len(entries) > n {
		entries = entries[:n]
	}
	return entries
}

// duBytes runs du -sb on a path and returns the byte count, or 0 on error.
func duBytes(path string) int64 {
	out, err := exec.Command("du", "-sb", path).Output()
	if err != nil {
		return 0
	}
	parts := strings.Fields(string(out))
	if len(parts) == 0 {
		return 0
	}
	n, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return 0
	}
	return n
}

// isStaticAsset reports whether a request path should be excluded from traffic stats.
func isStaticAsset(path string) bool {
	static := []string{
		".css", ".js", ".mjs",
		".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".ico", ".svg",
		".woff", ".woff2", ".ttf", ".eot", ".otf",
		".xml", ".xsl",
		".map",
	}
	lower := strings.ToLower(path)
	// strip query string before checking extension
	if i := strings.IndexByte(lower, '?'); i != -1 {
		lower = lower[:i]
	}
	for _, ext := range static {
		if strings.HasSuffix(lower, ext) {
			return true
		}
	}
	return false
}

// statsRoles returns the resource-consuming container roles to poll for a
// given site type. The app container is excluded per spec, and only roles
// that actually exist for the type are returned so stats does not 404 on
// containers that were never created (e.g. php/db/redis on a static site).
func statsRoles(siteType int) []string {
	switch siteType {
	case models.SiteTypeWordPress, models.SiteTypePHP:
		return []string{"nginx", "php", "db", "redis"}
	case models.SiteTypeNode, models.SiteTypeDotNet:
		return []string{"nginx", "db", "redis"}
	case models.SiteTypeStatic:
		return []string{"nginx"}
	default: // reverse proxy and anything else — no pod containers
		return nil
	}
}
