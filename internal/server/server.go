package server

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"time"

	"podnest/internal/auth"
	"podnest/internal/db"
	"podnest/internal/fail2ban"
	"podnest/internal/logger"
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
}

// Server is the main HTTP server
type Server struct {
	cfg      Config
	podman   *podman.Client
	sftp     *sftp.Manager
	fail2ban *fail2ban.Manager
	http     *http.Server
	proxy    *proxy.Proxy
}

// New initialises the server and registers all routes
func New(cfg Config) *Server {
	s := &Server{
		cfg:      cfg,
		podman:   podman.New(cfg.PodmanSock),
		sftp:     cfg.SFTPManager,
		fail2ban: cfg.Fail2BanManager,
	}

	s.http = &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      s.routes(),
		ReadTimeout:  120 * time.Second,
		WriteTimeout: 300 * time.Second,
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

	// ensure the global SFTP container is running
	if err := s.sftp.Ensure(context.Background()); err != nil {
		logger.Error("failed to ensure global SFTP container: %v", err)
	}

	// ensure the global Fail2Ban container is running
	if err := s.fail2ban.Ensure(context.Background()); err != nil {
		logger.Error("failed to ensure global Fail2Ban container: %v", err)
	}

	// clean up orphaned pods from previous failed runs
	if err := s.podman.PruneOrphanedPods(context.Background()); err != nil {
		logger.Warn("orphan cleanup: %v", err)
	}

	// background session cleanup
	go s.sessionReaper()

	// background permission fixer
	go s.permissionReaper()

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
	})
	s.proxy = px

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

	// run the proxy
	go func() {
		if err := px.Start(); err != nil && err != http.ErrServerClosed {
			logger.Error("proxy: %v", err)
		}
	}()

	logger.Debug("PodNest server is started")
	return s.http.ListenAndServe()
}

// sessionReaper purges expired sessions and PMA tokens every hour
func (s *Server) sessionReaper() {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()
	for range ticker.C {
		_ = auth.PurgeExpiredSessions(s.cfg.DB)
		_ = db.DeleteExpiredPMATokens(s.cfg.DB)
	}
}

// shutdown gracefully drains connections
func (s *Server) shutdown(ctx context.Context) error {
	return s.http.Shutdown(ctx)
}

// detectHostAppPath inspects the running container's mounts to resolve the host-side path
// for the app data directory, falling back to the configured app path if unavailable
func (s *Server) detectHostAppPath() string {
	hostname, err := os.Hostname()
	if err != nil {
		logger.Error("could not get the hostname %v", err)
		return s.cfg.AppPath
	}

	// try by hostname first, then by container name
	for _, name := range []string{hostname, "podnest"} {
		var inspect struct {
			Mounts []struct {
				Source      string `json:"Source"`
				Destination string `json:"Destination"`
			} `json:"Mounts"`
		}

		if err := s.podman.GetJSON(context.Background(),
			"/v4.0.0/libpod/containers/"+name+"/json",
			&inspect,
		); err != nil {
			logger.Error("could not get the hostname from the container %v", err)
			continue
		}

		for _, m := range inspect.Mounts {
			if m.Destination == s.cfg.AppPath {
				return m.Source
			}
		}
	}

	logger.Debug("retrieved the app path")
	return s.cfg.AppPath
}

// detectHostGateway uses the Podman API to find the bridge gateway for the default podman network
func (s *Server) detectHostGateway() string {

	// query the podman network inspect endpoint for the default network
	var network struct {
		Subnets []struct {
			Gateway string `json:"gateway"`
		} `json:"subnets"`
	}

	if err := s.podman.GetJSON(context.Background(),
		"/v4.0.0/libpod/networks/podman/json",
		&network,
	); err != nil {
		logger.Error("detectHostGateway: failed to inspect podman network: %v", err)
		return "127.0.0.1"
	}

	if len(network.Subnets) > 0 && network.Subnets[0].Gateway != "" {
		gw := network.Subnets[0].Gateway
		logger.Info("detected host gateway from podman network: %s", gw)
		return gw
	}

	logger.Error("detectHostGateway: no gateway found in podman network, falling back to 127.0.0.1")
	return "127.0.0.1"
}

// permissionReaper periodically corrects ownership and permissions on all site
// directories — fires immediately on startup then every 30 seconds. This ensures
// permissions are always correct after pod recreates, container restarts, or any
// other event that may cause drift.
func (s *Server) permissionReaper() {
	fix := func() {
		sites, err := db.GetAllSites(s.cfg.DB)
		if err != nil {
			logger.Error("permissionReaper: failed to load sites: %v", err)
			return
		}

		for _, site := range sites {
			siteDir := s.sitesBase() + "/" + site.Name
			sftpUID := sftp.UIDForSite(site.ID)

			// site root — must be owned by root for sshd chroot
			os.Chown(siteDir, 0, 0)
			os.Chmod(siteDir, 0755)

			// html — setgid so PHP (siteUID) and SFTP uploads share group ownership
			os.Chown(siteDir+"/html", sftpUID, sftpUID)
			os.Chmod(siteDir+"/html", 02775)

			// nginx dir — sftp user owns config files
			os.Chown(siteDir+"/nginx", sftpUID, sftpUID)
			os.Chmod(siteDir+"/nginx", 0755)

			// nginx/cache — root-owned so the nginx master (no DAC_OVERRIDE) can create subdirs
			os.Chown(siteDir+"/nginx/cache", 0, 0)
			os.Chmod(siteDir+"/nginx/cache", 0755)
			// nginx/cache/wp — nginx workers write cache files here
			os.Chown(siteDir+"/nginx/cache/wp", 101, 101)
			os.Chmod(siteDir+"/nginx/cache/wp", 0750)
			// nginx/logs — nginx container user writes logs
			os.Chown(siteDir+"/nginx/logs", 101, 101)
			os.Chmod(siteDir+"/nginx/logs", 0750)

			// php-fpm, redis, db — sftp user
			for _, d := range []string{"php-fpm", "redis", "db"} {
				os.Chown(siteDir+"/"+d, sftpUID, sftpUID)
				os.Chmod(siteDir+"/"+d, 0755)
			}
		}
	}

	// run immediately on startup, then every 30 seconds
	fix()
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		fix()
	}
}
