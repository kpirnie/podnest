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
	"podnest/internal/notifications"
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
	stats    *statsCache
	resource *resourceState
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
		stats:    newStatsCache(),
		resource: newResourceState(),
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
	logger.Debug("host gateway detected: %s", s.cfg.HostGateway)

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

	// rotate logs daily at midnight
	go s.rotateLogs()

	// background permission fixer
	go s.permissionReaper()

	// poll container health and resource stats every 10 seconds
	go s.pollStats()

	// monitor host resource usage and throttle offending pods when threshold is breached
	go s.resourceWatcher()

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

	// warm all proxy caches — domain routes, WAF, security rules, trusted proxies,
	// TLS certs, and backend connections; non-fatal on partial failure
	if err := px.WarmCaches(false); err != nil {
		logger.Warn("proxy: cache warm failed: %v", err)
	}

	// start the weekly trusted proxy CIDR auto-refresh
	proxy.StartTrustedProxyRefresher(px, 7*24*time.Hour)

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
			logger.Debug("ensureGlobalContainers: both global containers confirmed running")
			return
		}
	}
}

// notify loads all users and notification configs from the database and dispatches
// email and SMS alerts to every user with the corresponding notification flag enabled.
// subject/body are used for email; message is the SMS payload (keep under 160 chars).
func (s *Server) notify(subject, body, message string) {
	users, err := db.GetAllUsers(s.cfg.DB)
	if err != nil {
		logger.Error("notify: failed to load users: %v", err)
		return
	}

	smtpMap, err := db.GetSMTPConfig(s.cfg.DB)
	if err != nil {
		logger.Error("notify: failed to load SMTP config: %v", err)
		return
	}

	snsMap, err := db.GetSNSConfig(s.cfg.DB)
	if err != nil {
		logger.Error("notify: failed to load SNS config: %v", err)
		return
	}

	smtpCfg := notifications.SMTPConfigFromMap(smtpMap)
	snsCfg := notifications.SNSConfigFromMap(snsMap)

	notifications.Dispatch(users, smtpCfg, snsCfg, subject, body, message)
}

// shutdown gracefully drains connections
func (s *Server) shutdown(ctx context.Context) error {
	return s.http.Shutdown(ctx)
}

// WarmCaches triggers a full proxy cache rewarm via the proxy.
func (s *Server) WarmCaches() error {
	return s.proxy.WarmCaches(false)
}

// sitesBase returns the base directory path for all site data on disk.
func (s *Server) sitesBase() string { return s.cfg.AppPath + "/sites" }
