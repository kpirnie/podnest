package server

import (
	"net/http"

	"podnest/internal/auth"
	"podnest/internal/handlers/configs"
	"podnest/internal/handlers/domains"
	"podnest/internal/handlers/logs"
	"podnest/internal/handlers/pma"
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

// routes registers all HTTP routes and returns the composed handler.
func (s *Server) routes() http.Handler {
	mux := http.NewServeMux()

	// serve embedded static assets under /static/
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.FS(web.Static))))

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

	// configs
	configsHandler := &configs.Handler{DB: s.cfg.DB, AppPath: s.cfg.AppPath, Podman: s.podman, Resolve: sitesHandler.ResolveSite}
	configsHandler.RegisterRoutes(api)

	// logs
	logsHandler := &logs.Handler{DB: s.cfg.DB, AppPath: s.cfg.AppPath, Podman: s.podman, Resolve: sitesHandler.ResolveSite}
	logsHandler.RegisterRoutes(api)

	// wpcli
	wpcliHandler := &wpcli.Handler{Podman: s.podman, Resolve: sitesHandler.ResolveSite}
	wpcliHandler.RegisterRoutes(api)

	// pma
	pmaHandler := &pma.Handler{DB: s.cfg.DB, HostGateway: s.cfg.HostGateway, Resolve: sitesHandler.ResolveSite}
	pmaHandler.RegisterAPIRoutes(api)
	pmaHandler.RegisterMuxRoutes(mux)

	// users + TOTP
	usersHandler := &users.Handler{DB: s.cfg.DB}
	usersHandler.RegisterRoutes(api)

	// settings + trusted proxies
	settingsHandler := &settings.Handler{DB: s.cfg.DB, Proxy: s.proxy, Backup: s.backup}
	settingsHandler.RegisterRoutes(api)

	// security rules
	securityHandler := &security.Handler{DB: s.cfg.DB, Proxy: s.proxy, Resolve: sitesHandler.ResolveSite}
	securityHandler.RegisterRoutes(api)

	// ssl status
	sslHandler := &ssl.Handler{}
	sslHandler.RegisterRoutes(api)

	// feature module routes
	for _, f := range modules.AllFeatureModules() {
		f.RegisterRoutes(api, sitesHandler.ResolveSite)
	}

	// mount the API sub-mux under /api/ with auth middleware applied to all routes
	mux.Handle("/api/", http.StripPrefix("/api",
		auth.RequireAPIAuth(s.cfg.DB, api),
	))

	logger.Debug("routes registered")
	return securityHeaders(mux)
}
