// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package server

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"podnest/internal/audit"
	"podnest/internal/auth"
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

// shutdownDrainTimeout bounds the panel, proxy, and background goroutine drain
const shutdownDrainTimeout = 30 * time.Second

// bounds for the shutdown_job_timeout setting, in minutes
const (
	shutdownJobTimeoutDefault = 5
	shutdownJobTimeoutMin     = 1
	shutdownJobTimeoutMax     = 60
)

// Config holds server dependencies
type Config struct {
	DB              *sql.DB
	Port            int
	PodmanSock      string
	Podman          *podman.Client
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
	audit    *audit.Recorder
	ctx      context.Context
	cancel   context.CancelFunc
	wg       sync.WaitGroup
}

// New initialises the server and registers all routes
func New(cfg Config) *Server {
	ctx, cancel := context.WithCancel(context.Background())
	s := &Server{
		cfg:      cfg,
		podman:   podman.New(cfg.PodmanSock),
		podman:   cfg.Podman,
		sftp:     cfg.SFTPManager,
		fail2ban: cfg.Fail2BanManager,
		backup:   cfg.BackupManager,
		cron:     cfg.CronManager,
		stats:    newStatsCache(),
		resource: newResourceState(),
		audit:    audit.New(cfg.DB),
		ctx:      ctx,
		cancel:   cancel,
	}

	s.http = &http.Server{
		Addr: fmt.Sprintf(":%d", cfg.Port),
		// ReadHeaderTimeout caps the header-send phase on its own so a stalled
		// peer cannot hold a connection for the full ReadTimeout
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       120 * time.Second,
		WriteTimeout:      0,
		IdleTimeout:       120 * time.Second,
	}

	return s
}

// Start begins serving and blocks until the server exits
func (s *Server) Start() error {

	// resolve host paths before anything else that depends on them
	s.cfg.HostAppPath = s.detectHostAppPath()
	s.cfg.HostGateway = s.detectHostGateway()
	logger.Debug("host gateway detected: %s", s.cfg.HostGateway)

	// set the published host IP
	podman.SetPublishHostIP(s.cfg.HostGateway)

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
	s.goTracked(s.ensureGlobalContainers)

	// clean up orphaned pods from previous failed runs
	if err := s.podman.PruneOrphanedPods(context.Background()); err != nil {
		logger.Warn("orphan cleanup: %v", err)
	}

	// restore pods that were running before the last shutdown or host reboot,
	// then start the status checker so it cannot flip restorable sites to stopped first
	s.goTracked(func() {
		s.startupRestore()
		s.syncPodStatuses()
	})

	// background session cleanup
	s.goTracked(s.sessionReaper)

	// truncate the write-ahead log every six hours
	s.goTracked(s.walCheckpointer)

	// rotate logs daily at midnight
	s.goTracked(s.rotateLogs)

	// archive yesterday's audit rows and prune the live table daily just after midnight
	s.goTracked(s.auditMaintenance)

	// background permission fixer
	s.goTracked(s.permissionReaper)

	// poll container health and resource stats every 10 seconds
	s.goTracked(s.pollStats)

	// monitor host resource usage and throttle offending pods when threshold is breached
	s.goTracked(s.resourceWatcher)

	// check for and auto-fix mariadb-upgrade requirement on all DB sites
	s.goTracked(s.mariadbUpgradeChecker)

	// start the backup scheduler
	s.backup.StartScheduler(s.ctx)

	// start the per-site cron scheduler
	s.cron.Start(s.ctx)
	
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

	// let the auth and pma cookie paths gate X-Forwarded-Proto on the proxy's
	// own trusted-peer check
	auth.SetTrustedPeerFunc(px.PeerTrusted)

	// set the handler to our routes
	s.http.Handler = s.routes()

	// nightly CRS rule update — runs immediately on startup then every 24 hours
	s.goTracked(s.crsUpdater)

	// nightly GEO-IP rule update — runs immediately on startup then every 24 hours
	s.goTracked(s.geoUpdater)

	// Spamhaus DROP feed — loads from disk on startup, refreshes daily
	s.goTracked(s.dropUpdater)

	// try to grab a cert
	if adminDomain != "" {
		px.ObtainCert(adminDomain)
	}

	// warm all proxy caches — domain routes, WAF, security rules, trusted proxies,
	// TLS certs, and backend connections; non-fatal on partial failure
	if err := px.WarmCaches(false); err != nil {
		logger.Warn("proxy: cache warm failed: %v", err)
	}

	// start the daily trusted proxy CIDR auto-refresh
	s.goTracked(func() {
		proxy.RunTrustedProxyRefresher(s.ctx, px, 24*time.Hour)
	})

	// run the proxy
	s.goTracked(func() {
		if err := px.Start(); err != nil && err != http.ErrServerClosed {
			logger.Error("proxy: %v", err)
		}
	})

	logger.Debug("PodNest server is started")
	return s.http.ListenAndServe()
}

// ensureGlobalContainers retries SFTP and Fail2Ban Ensure until both are running.
// It backs off to a 30-second tick after the first attempt so startup failures
// do not spin — it stops once both report running.
func (s *Server) ensureGlobalContainers() {
	ctx := s.ctx

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

	for s.tick(ticker) {
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

// Stop drains the panel and proxy, waits for every tracked background
// goroutine, then waits out in-flight backup and import jobs.
func (s *Server) Stop() {
	s.cancel()

	ctx, cancel := context.WithTimeout(context.Background(), shutdownDrainTimeout)
	defer cancel()

	if err := s.shutdown(ctx); err != nil {
		logger.Warn("shutdown: panel drain: %v", err)
	}

	if s.proxy != nil {
		s.proxy.Shutdown(ctx)
	}

	done := make(chan struct{})
	go func() {
		s.wg.Wait()
		close(done)
	}()
	select {
	case <-done:
	case <-ctx.Done():
		logger.Warn("shutdown: background goroutines did not exit within %s", shutdownDrainTimeout)
	}

	if s.backup != nil {
		d := s.jobDrainTimeout()
		logger.Info("shutdown: waiting up to %s for in-flight backup and import jobs", d)
		if !s.backup.WaitJobs(d) {
			logger.Warn("shutdown: jobs still running after %s — cancelling", d)
		}
	}
}

// jobDrainTimeout resolves the shutdown_job_timeout setting
func (s *Server) jobDrainTimeout() time.Duration {
	mins := shutdownJobTimeoutDefault
	if v, err := db.GetSetting(s.cfg.DB, "shutdown_job_timeout"); err == nil && v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= shutdownJobTimeoutMin && n <= shutdownJobTimeoutMax {
			mins = n
		}
	}
	return time.Duration(mins) * time.Minute
}

// goTracked launches fn as a background goroutine Stop can wait on
func (s *Server) goTracked(fn func()) {
	s.wg.Add(1)
	go func() {
		defer s.wg.Done()
		fn()
	}()
}

// tick blocks until the next tick, reporting false once shutdown is signalled
func (s *Server) tick(t *time.Ticker) bool {
	select {
	case <-s.ctx.Done():
		return false
	case <-t.C:
		return true
	}
}

// sleep waits out d, reporting false if shutdown is signalled first
func (s *Server) sleep(d time.Duration) bool {
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-s.ctx.Done():
		return false
	case <-t.C:
		return true
	}
}

// WarmCaches triggers a full proxy cache rewarm via the proxy.
func (s *Server) WarmCaches() error {
	return s.proxy.WarmCaches(false)
}

// sitesBase returns the base directory path for all site data on disk.
func (s *Server) sitesBase() string { return s.cfg.AppPath + "/sites" }
