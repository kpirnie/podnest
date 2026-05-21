package server

import (
	"net/http"

	"podnest/internal/auth"
	"podnest/internal/logger"
	"podnest/web"
)

// routes registers all HTTP routes and returns the composed handler
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

	// site management
	api.HandleFunc("GET /sites", s.apiListSites)
	api.HandleFunc("POST /sites", s.apiCreateSite)
	api.HandleFunc("GET /sites/{id}", s.apiGetSite)
	api.HandleFunc("PUT /sites/{id}", s.apiUpdateSite)
	api.HandleFunc("DELETE /sites/{id}", s.apiDeleteSite)

	// site lifecycle actions
	api.HandleFunc("POST /sites/{id}/start", s.apiSiteStart)
	api.HandleFunc("POST /sites/{id}/stop", s.apiSiteStop)
	api.HandleFunc("POST /sites/{id}/restart", s.apiSiteRestart)
	api.HandleFunc("POST /sites/{id}/flush", s.apiSiteFlush)
	api.HandleFunc("POST /sites/{id}/update", s.apiSiteUpdate)
	api.HandleFunc("GET /sites/{id}/status", s.apiSiteStatus)
	api.HandleFunc("POST /sites/{id}/recreate", s.apiSiteRecreate)
	api.HandleFunc("POST /sites/{id}/clone", s.apiSiteClone)
	api.HandleFunc("POST /sites/{id}/pma-token", s.apiIssuePMAToken)
	api.HandleFunc("POST /sites/{id}/sftp-regen", s.apiRegenerateSFTPPassword)

	// domain management
	api.HandleFunc("GET /sites/{id}/domains", s.apiListDomains)
	api.HandleFunc("POST /sites/{id}/domains", s.apiAddDomain)
	api.HandleFunc("DELETE /sites/{id}/domains/{did}", s.apiDeleteDomain)

	// reverse proxy route management
	api.HandleFunc("GET /sites/{id}/rp-routes", s.apiGetRPRoutes)
	api.HandleFunc("PUT /sites/{id}/rp-routes", s.apiUpdateRPRoutes)

	// config management
	api.HandleFunc("GET /sites/{id}/configs", s.apiGetConfigs)
	api.HandleFunc("PUT /sites/{id}/configs/{type}", s.apiUpdateConfig)
	api.HandleFunc("POST /sites/{id}/configs/{type}/reset", s.apiResetConfig)
	api.HandleFunc("GET /sites/{id}/configs/{type}/export", s.apiExportConfig)
	api.HandleFunc("POST /sites/{id}/configs/{type}/import", s.apiImportConfig)

	// user management — admin only
	api.Handle("GET /users", auth.RequireAPIAdmin(http.HandlerFunc(s.apiListUsers)))
	api.Handle("POST /users", auth.RequireAPIAdmin(http.HandlerFunc(s.apiCreateUser)))
	api.Handle("GET /users/{id}", auth.RequireAPIAdmin(http.HandlerFunc(s.apiGetUser)))
	api.Handle("PUT /users/{id}", auth.RequireAPIAdmin(http.HandlerFunc(s.apiUpdateUser)))
	api.Handle("DELETE /users/{id}", auth.RequireAPIAdmin(http.HandlerFunc(s.apiDeleteUser)))

	// TOTP management — admin or self
	api.HandleFunc("POST /users/{id}/totp/setup", s.apiTOTPSetup)
	api.HandleFunc("POST /users/{id}/totp/confirm", s.apiTOTPConfirm)
	api.HandleFunc("DELETE /users/{id}/totp", s.apiTOTPDisable)

	// settings management — admin only
	api.Handle("GET /settings", auth.RequireAPIAdmin(http.HandlerFunc(s.apiGetSettings)))
	api.Handle("PUT /settings", auth.RequireAPIAdmin(http.HandlerFunc(s.apiUpdateSettings)))
	api.Handle("GET /settings/export", auth.RequireAPIAdmin(http.HandlerFunc(s.apiExportSettings)))
	api.Handle("POST /settings/import", auth.RequireAPIAdmin(http.HandlerFunc(s.apiImportSettings)))

	// global security rules — admin only
	api.Handle("GET /security/ip", auth.RequireAPIAdmin(http.HandlerFunc(s.apiGetGlobalIPRules)))
	api.Handle("PUT /security/ip", auth.RequireAPIAdmin(http.HandlerFunc(s.apiSaveGlobalIPRules)))
	api.Handle("GET /security/ua", auth.RequireAPIAdmin(http.HandlerFunc(s.apiGetGlobalUARules)))
	api.Handle("PUT /security/ua", auth.RequireAPIAdmin(http.HandlerFunc(s.apiSaveGlobalUARules)))
	api.Handle("GET /security/ip/export", auth.RequireAPIAdmin(http.HandlerFunc(s.apiExportGlobalIPRules)))
	api.Handle("POST /security/ip/import", auth.RequireAPIAdmin(http.HandlerFunc(s.apiImportGlobalIPRules)))
	api.Handle("GET /security/ua/export", auth.RequireAPIAdmin(http.HandlerFunc(s.apiExportGlobalUARules)))
	api.Handle("POST /security/ua/import", auth.RequireAPIAdmin(http.HandlerFunc(s.apiImportGlobalUARules)))

	// per-site security rules
	api.HandleFunc("GET /sites/{id}/security/ip", s.apiGetSiteIPRules)
	api.HandleFunc("PUT /sites/{id}/security/ip", s.apiSaveSiteIPRules)
	api.HandleFunc("GET /sites/{id}/security/ua", s.apiGetSiteUARules)
	api.HandleFunc("PUT /sites/{id}/security/ua", s.apiSaveSiteUARules)
	api.HandleFunc("GET /sites/{id}/security/ip/export", s.apiExportSiteIPRules)
	api.HandleFunc("POST /sites/{id}/security/ip/import", s.apiImportSiteIPRules)
	api.HandleFunc("GET /sites/{id}/security/ua/export", s.apiExportSiteUARules)
	api.HandleFunc("POST /sites/{id}/security/ua/import", s.apiImportSiteUARules)

	// WAF settings — admin only
	api.Handle("GET /settings/waf/export", auth.RequireAPIAdmin(http.HandlerFunc(s.apiExportWAFSettings)))
	api.Handle("POST /settings/waf/import", auth.RequireAPIAdmin(http.HandlerFunc(s.apiImportWAFSettings)))
	api.Handle("GET /settings/waf", auth.RequireAPIAdmin(http.HandlerFunc(s.apiGetWAFSettings)))
	api.Handle("PUT /settings/waf", auth.RequireAPIAdmin(http.HandlerFunc(s.apiUpdateWAFSettings)))

	// per-site WAF overrides & plugins
	api.HandleFunc("GET /sites/{id}/waf/export", s.apiExportWAFSiteOverride)
	api.HandleFunc("POST /sites/{id}/waf/import", s.apiImportWAFSiteOverride)
	api.HandleFunc("GET /sites/{id}/waf", s.apiGetWAFSiteOverride)
	api.HandleFunc("PUT /sites/{id}/waf", s.apiUpdateWAFSiteOverride)
	api.Handle("GET /settings/waf/plugins", auth.RequireAPIAdmin(http.HandlerFunc(s.apiListAvailablePlugins)))
	api.HandleFunc("GET /sites/{id}/waf/plugins", s.apiGetSitePlugins)
	api.HandleFunc("PUT /sites/{id}/waf/plugins", s.apiSetSitePlugins)

	// backup management
	api.HandleFunc("GET /sites/{id}/backup-repo", s.apiGetBackupRepo)
	api.HandleFunc("PUT /sites/{id}/backup-repo", s.apiUpdateBackupRepo)
	api.HandleFunc("GET /sites/{id}/backups", s.apiListBackups)
	api.HandleFunc("POST /sites/{id}/backups", s.apiCreateBackup)
	api.HandleFunc("POST /sites/{id}/backups/{bid}/restore", s.apiRestoreBackup)
	api.HandleFunc("DELETE /sites/{id}/backups/{bid}", s.apiDeleteBackup)
	api.Handle("GET /settings/backup", auth.RequireAPIAdmin(http.HandlerFunc(s.apiGetBackupSettings)))
	api.Handle("PUT /settings/backup", auth.RequireAPIAdmin(http.HandlerFunc(s.apiUpdateBackupSettings)))
	api.HandleFunc("GET /sites/{id}/backups/restore-status", s.apiRestoreStatus)
	api.HandleFunc("GET /sites/{id}/backups/{bid}/download", s.apiDownloadBackup)

	// trusted proxy settings — admin only
	api.Handle("GET /settings/trusted-proxies", auth.RequireAPIAdmin(http.HandlerFunc(s.apiGetTrustedProxies)))
	api.Handle("PUT /settings/trusted-proxies", auth.RequireAPIAdmin(http.HandlerFunc(s.apiUpdateTrustedProxies)))
	api.Handle("GET /settings/trusted-proxies/export", auth.RequireAPIAdmin(http.HandlerFunc(s.apiExportTrustedProxies)))
	api.Handle("POST /settings/trusted-proxies/import", auth.RequireAPIAdmin(http.HandlerFunc(s.apiImportTrustedProxies)))

	// cron job management
	api.HandleFunc("GET /sites/{id}/crons", s.apiListCrons)
	api.HandleFunc("POST /sites/{id}/crons", s.apiCreateCron)
	api.HandleFunc("PUT /sites/{id}/crons/{cid}", s.apiUpdateCron)
	api.HandleFunc("DELETE /sites/{id}/crons/{cid}", s.apiDeleteCron)
	api.HandleFunc("PATCH /sites/{id}/crons/{cid}/toggle", s.apiToggleCron)
	api.HandleFunc("POST /sites/{id}/crons/{cid}/run", s.apiRunCronNow)

	// WebSockets log tail
	api.HandleFunc("GET /sites/{id}/logs", s.apiSiteLogs)
	api.HandleFunc("GET /sites/{id}/logs/waf", s.apiSiteWAFLog)

	// WP-CLI WebSocket terminal — WordPress sites only
	api.HandleFunc("GET /sites/{id}/wpcli", s.apiWPCLI)

	// ssl status check — available to all authenticated users
	api.HandleFunc("GET /ssl-status", s.apiSSLStatus)

	// mount the API sub-mux under /api/ with auth middleware applied to all routes
	mux.Handle("/api/", http.StripPrefix("/api",
		auth.RequireAPIAuth(s.cfg.DB, api),
	))

	// PMA proxy — validates the one-time token and sets a session cookie before proxying
	mux.Handle("/pma/", http.HandlerFunc(s.handlePMA))

	logger.Debug("routes registered")
	return securityHeaders(mux)
}
