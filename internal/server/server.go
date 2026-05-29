package server

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"time"

	"podnest/internal/backup"
	"podnest/internal/cron"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/modules/platform/fail2ban"
	"podnest/internal/podman"
	"podnest/internal/proxy"
	"podnest/internal/sftp"
)

// Config holds server dependencies
type Config struct {
	DB              *sql.DB
	Port            int
	PodmanSock      string
	AppPath         string
	HostAppPath     string
	HostGateway     string
	SFTPManager     *sftp.Manager
	Fail2BanManager *fail2ban.Manager
	CertDir         string
	AdminDomain     string
	BackupManager   *backup.Manager
	CronManager     *cron.Manager
}

// Server is the main HTTP server
type Server struct {
	cfg      Config
	podman   *podman.Client
	sftp     *sftp.Manager
	fail2ban *fail2ban.Manager
	http     *http.Server
	proxy    *proxy.Proxy
	backup   *backup.Manager
	cron     *cron.Manager
}

// New initialises the server and registers all routes
func New(cfg Config) *Server {
	s := &Server{
		cfg:      cfg,
		podman:   podman.New(cfg.PodmanSock),
		sftp:     cfg.SFTPManager,
		fail2ban: cfg.Fail2BanManager,
		backup:   cfg.BackupManager,
		cron:     cfg.CronManager,
	}

	s.http = &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		ReadTimeout:  120 * time.Second,
		WriteTimeout: 0,
		IdleTimeout:  120 * time.Second,
	}

	return s
}

// Start begins serving and blocks until the server exits
func (s *Server) Start() error {

	// resolve host paths before anything else that depends on them
	s.cfg.HostAppPath = s.detectHostAppPath()
	s.cfg.HostGateway = s.detectHostGateway()
	logger.Info("host gateway detected: %s", s.cfg.HostGateway)

	// push the resolved host path into the SFTP manager & fail2ban manager before Ensure runs
	s.sftp.SetHostAppPath(s.cfg.HostAppPath)
	s.fail2ban.SetHostAppPath(s.cfg.HostAppPath)

	// ensure the sites directory exists before the SFTP container tries to mount it
	if err := os.MkdirAll(s.cfg.AppPath+"/sites", 0755); err != nil {
		logger.Error("failed to create sites directory: %v", err)
	}

	// ensure fail2ban and sftp log directories exist before containers start
	for _, dir := range []string{
		s.cfg.AppPath + "/logs",
		s.cfg.AppPath + "/fail2ban",
		s.cfg.AppPath + "/sftp/logs",
	} {
		if err := os.MkdirAll(dir, 0750); err != nil {
			logger.Error("failed to create directory %s: %v", dir, err)
		}
	}

	// start background goroutine that retries until both global containers are running
	go s.ensureGlobalContainers()

	// clean up orphaned pods from previous failed runs
	if err := s.podman.PruneOrphanedPods(context.Background()); err != nil {
		logger.Warn("orphan cleanup: %v", err)
	}

	// restore pods that were running before the last shutdown or host reboot
	go s.startupRestore()

	// background session cleanup
	go s.sessionReaper()

	// background permission fixer
	go s.permissionReaper()

	// fire up the status checker
	go s.syncPodStatuses()

	// start the backup scheduler
	s.backup.StartScheduler(context.Background())

	// start the per-site cron scheduler
	s.cron.Start(context.Background())

	// read the admin domain from the database, falling back to the flag value
	adminDomain := s.cfg.AdminDomain
	if dbDomain, err := db.GetSetting(s.cfg.DB, "admin_domain"); err == nil && dbDomain != "" {
		adminDomain = dbDomain
	}

	// fire up proxy and configure it
	px := proxy.New(proxy.Config{
		DB:          s.cfg.DB,
		CertDir:     s.cfg.CertDir,
		HostGateway: s.cfg.HostGateway,
		AdminDomain: adminDomain,
		AdminPort:   s.cfg.Port,
		AppPath:     s.cfg.AppPath,
	})
	s.proxy = px

	// make sure we have a podnest network
	if err := s.podman.EnsurePodmanNetwork(context.Background(), "pn_network"); err != nil {
		logger.Error("failed to ensure pn_network: %v", err)
	} else {
		logger.Debug("pn_network ensured successfully")
	}

	// set the handler to our routes
	s.http.Handler = s.routes()

	// nightly CRS rule update — runs immediately on startup then every 24 hours
	go s.crsUpdater()

	// try to grab a cert
	if adminDomain != "" {
		px.ObtainCert(adminDomain)
	}

	// warm the domain→port cache from the database before the proxy starts serving
	if err := px.WarmCache(); err != nil {
		logger.Warn("proxy cache warm failed, falling back to DB lookups: %v", err)
	}

	// warm the security rule cache from the database
	ipRules, err := db.GetAllIPRules(s.cfg.DB)
	if err != nil {
		logger.Warn("security cache: failed to load IP rules: %v", err)
	}
	uaRules, err := db.GetAllUARules(s.cfg.DB)
	if err != nil {
		logger.Warn("security cache: failed to load UA rules: %v", err)
	}
	px.WarmSecurityCache(ipRules, uaRules)

	// warm the WAF engine — compiles CRS rules; non-fatal on failure so a
	// misconfigured exclusion does not prevent the proxy from starting
	if err := px.WarmWAFCache(); err != nil {
		logger.Warn("WAF cache warm failed, WAF will be inactive: %v", err)
	}

	// warm the trusted proxy ranges and start the weekly auto-refresh goroutine
	if cidrs, err := db.GetTrustedProxies(s.cfg.DB); err != nil {
		logger.Warn("trusted proxy warm failed: %v", err)
	} else {
		px.WarmTrustedProxies(cidrs)
	}
	proxy.StartTrustedProxyRefresher(s.cfg.DB, 7*24*time.Hour)

	// run the proxy
	go func() {
		if err := px.Start(); err != nil && err != http.ErrServerClosed {
			logger.Error("proxy: %v", err)
		}
	}()

	logger.Debug("PodNest server is started")
	return s.http.ListenAndServe()
}

// ensureGlobalContainers retries SFTP and Fail2Ban Ensure until both are running.
// It backs off to a 30-second tick after the first attempt so startup failures
// do not spin — it stops once both report running.
func (s *Server) ensureGlobalContainers() {
	ctx := context.Background()

	attempt := func() (sftpOK, f2bOK bool) {
		if err := s.sftp.Ensure(ctx); err != nil {
			logger.Error("ensureGlobalContainers: SFTP: %v", err)
		} else {
			sftpOK = true
		}
		if err := s.fail2ban.Ensure(ctx); err != nil {
			logger.Error("ensureGlobalContainers: fail2ban: %v", err)
		} else {
			f2bOK = true
		}
		return
	}

	// first attempt immediately
	sftpOK, f2bOK := attempt()
	if sftpOK && f2bOK {
		return
	}

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		sftpOK, f2bOK = attempt()
		if sftpOK && f2bOK {
			logger.Info("ensureGlobalContainers: both global containers confirmed running")
			return
		}
	}
}

// shutdown gracefully drains connections
func (s *Server) shutdown(ctx context.Context) error {
	return s.http.Shutdown(ctx)
}

// WarmWAFCache triggers a WAF engine recompile via the proxy.
func (s *Server) WarmWAFCache() error {
	return s.proxy.WarmWAFCache()
}

// sitesBase returns the base directory path for all site data on disk.
func (s *Server) sitesBase() string { return s.cfg.AppPath + "/sites" }
