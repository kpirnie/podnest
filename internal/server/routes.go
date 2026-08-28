// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package server

import (
	"mime"
	"net/http"
	"os"
	"strings"

	"podnest/internal/auth"
	"podnest/internal/handlers/auditlog"
	"podnest/internal/handlers/configs"
	"podnest/internal/handlers/domains"
	"podnest/internal/handlers/health"
	"podnest/internal/handlers/logs"
	"podnest/internal/handlers/pma"
	"podnest/internal/handlers/redirects"
	"podnest/internal/handlers/rproxy"
	"podnest/internal/handlers/security"
	"podnest/internal/handlers/settings"
	"podnest/internal/handlers/sites"
	"podnest/internal/handlers/ssl"
	"podnest/internal/handlers/users"
	"podnest/internal/handlers/wpcli"
	"podnest/internal/logger"
	"podnest/internal/modules"
	"podnest/web"
)

// apiMaxBodyBytes caps a decoded API request body. Every JSON handler reads
// r.Body without a limit of its own, so the ceiling is applied once at the mux.
// Upload routes carry their own, larger caps and are exempt.
const apiMaxBodyBytes = 16 << 20 // 16 MB

// apiBodyLimitSkipSuffixes are route suffixes that stream a payload and set
// their own limit — capping them here would truncate a legitimate upload.
var apiBodyLimitSkipSuffixes = []string{
	"/files/upload",
	"/backups/import/upload",
}

// limitAPIBody bounds the request body for every API route that does not
// declare its own cap. MaxBytesReader errors the read rather than buffering, so
// an oversized body never reaches a decoder.
func limitAPIBody(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Body == nil || r.Body == http.NoBody {
			next.ServeHTTP(w, r)
			return
		}
		for _, s := range apiBodyLimitSkipSuffixes {
			if strings.HasSuffix(r.URL.Path, s) {
				next.ServeHTTP(w, r)
				return
			}
		}
		r.Body = http.MaxBytesReader(w, r.Body, apiMaxBodyBytes)
		next.ServeHTTP(w, r)
	})
}

// routes registers all HTTP routes and returns the composed handler.
func (s *Server) routes() http.Handler {
	mux := http.NewServeMux()

	// register JS/CSS mime types so static assets get a valid Content-Type —
	// without this a minimal host can serve them with an empty type, which
	// X-Content-Type-Options: nosniff then blocks
	_ = mime.AddExtensionType(".js", "text/javascript; charset=utf-8")
	_ = mime.AddExtensionType(".css", "text/css; charset=utf-8")

	// serve embedded static assets under /static/
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.FS(web.Static))))

	// serve an optional operator theme override from the on-disk app dir
	// (e.g. /opt/podnest/custom.css) — lets deployments retheme the panel by
	// mounting a stylesheet without rebuilding the embedded assets. Absent file
	// 404s quietly, so the <link> in the templates is a harmless no-op.
	mux.HandleFunc("/static/css/custom.css", func(w http.ResponseWriter, r *http.Request) {
		p := s.cfg.AppPath + "/custom.css"
		if _, err := os.Stat(p); err != nil {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "text/css; charset=utf-8")
		http.ServeFile(w, r, p)
	})

	// serve /favicon.ico from the embedded brand images so the browser's
	// automatic root-level request resolves instead of 404ing
	mux.HandleFunc("/favicon.ico", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFileFS(w, r, web.Static, "images/favicon.ico")
	})

	// serve the PWA manifest dynamically so its name reflects the host — an
	// exact path so it wins over the /static/ subtree handler above
	mux.HandleFunc("/static/manifest.json", s.handleManifest)

	// serve the service worker from the site root so its scope is "/" and it
	// controls the start_url — a worker served from /static/ only gets /static/
	// scope, which makes Chrome treat the panel as non-installable (no prompt)
	mux.HandleFunc("/sw.js", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/javascript; charset=utf-8")
		w.Header().Set("Service-Worker-Allowed", "/")
		http.ServeFileFS(w, r, web.Static, "sw.js")
	})

	// public auth routes — no session required
	mux.HandleFunc("/login", s.handleLogin)
	mux.HandleFunc("/login/totp", s.handleLoginTOTP)
	mux.HandleFunc("/logout", s.handleLogout)

	// UI routes — require a valid session; the admin route additionally requires the admin role
	protected := auth.RequireAuth(s.cfg.DB, http.HandlerFunc(s.handleUI))
	mux.Handle("/", protected)
	mux.Handle("/dashboard", protected)
	mux.Handle("/sites/", protected)
	mux.Handle("/admin", auth.RequireAuth(s.cfg.DB,
		auth.RequireAdmin(http.HandlerFunc(s.handleUI)),
	))

	// API sub-mux — all routes require a valid session via RequireAPIAuth
	api := http.NewServeMux()

	// sites — CRUD, lifecycle, clone
	sitesHandler := &sites.Handler{
		DB:           s.cfg.DB,
		AppPath:      s.cfg.AppPath,
		HostAppPath:  s.cfg.HostAppPath,
		PodmanSock:   s.cfg.PodmanSock,
		Podman:       s.podman,
		PodmanClient: s.podman,
		Proxy:        s.proxy,
		SFTP:         s.sftp,
		Backup:       s.backup,
	}
	sitesHandler.RegisterRoutes(api)

	// domains
	domainsHandler := &domains.Handler{DB: s.cfg.DB, Proxy: s.proxy, Resolve: sitesHandler.ResolveSite}
	domainsHandler.RegisterRoutes(api)

	// reverse proxy routes
	rproxyHandler := &rproxy.Handler{DB: s.cfg.DB, Proxy: s.proxy, Resolve: sitesHandler.ResolveSite}
	rproxyHandler.RegisterRoutes(api)

	// redirects
	redirectsHandler := &redirects.Handler{DB: s.cfg.DB, Proxy: s.proxy, Resolve: sitesHandler.ResolveSite}
	redirectsHandler.RegisterRoutes(api)

	// configs
	configsHandler := &configs.Handler{DB: s.cfg.DB, AppPath: s.cfg.AppPath, Podman: s.podman, Resolve: sitesHandler.ResolveSite}
	configsHandler.RegisterRoutes(api)

	// logs
	logsHandler := &logs.Handler{DB: s.cfg.DB, AppPath: s.cfg.AppPath, Podman: s.podman, Resolve: sitesHandler.ResolveSite}
	logsHandler.RegisterRoutes(api)

	// container health streaming + per-container restart
	healthHandler := &health.Handler{Cache: s.stats, Podman: s.podman, Resolve: sitesHandler.ResolveSite}
	healthHandler.RegisterRoutes(api)

	// wpcli
	wpcliHandler := &wpcli.Handler{Podman: s.podman, Resolve: sitesHandler.ResolveSite}
	wpcliHandler.RegisterRoutes(api)

	// pma
	pmaHandler := &pma.Handler{DB: s.cfg.DB, HostGateway: s.cfg.HostGateway, Resolve: sitesHandler.ResolveSite}
	pmaHandler.RegisterAPIRoutes(api)
	pmaHandler.RegisterMuxRoutes(mux)

	// admin-gated Scalar API reference (page + spec served privately)
	s.registerAPIDocs(mux)

	// users + TOTP
	usersHandler := &users.Handler{DB: s.cfg.DB}
	usersHandler.RegisterRoutes(api)

	// settings + trusted proxies
	settingsHandler := &settings.Handler{DB: s.cfg.DB, Proxy: s.proxy, Backup: s.backup, Warning: s.resource}
	settingsHandler.RegisterRoutes(api)

	// security rules
	securityHandler := &security.Handler{DB: s.cfg.DB, Proxy: s.proxy, Resolve: sitesHandler.ResolveSite}
	securityHandler.RegisterRoutes(api)

	// ssl status
	sslHandler := &ssl.Handler{DB: s.cfg.DB}
	sslHandler.RegisterRoutes(api)

	// audit log — admin-only read endpoint
	auditHandler := &auditlog.Handler{DB: s.cfg.DB}
	auditHandler.RegisterRoutes(api)

	// feature module routes
	for _, f := range modules.AllFeatureModules() {
		f.RegisterRoutes(api, sitesHandler.ResolveSite)
	}

	// auth middleware is inner so identity is resolved independently by each layer.
	// the body limit is outermost so no layer buffers an unbounded payload.
	mux.Handle("/api/", http.StripPrefix("/api",
		limitAPIBody(s.auditMiddleware(auth.RequireAPIAuth(s.cfg.DB, api))),
	))

	logger.Debug("routes registered")
	return securityHeaders(s.proxy.PanelSecurityMiddleware(mux))
}
