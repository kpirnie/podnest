package server

import (
	"context"
	"os"
	"strings"
	"time"

	"podnest/internal/auth"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/podman"
	"podnest/internal/proxy"
	"podnest/internal/sftp"
)

// sessionReaper purges expired sessions and PMA tokens hourly.
func (s *Server) sessionReaper() {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()
	for range ticker.C {
		_ = auth.PurgeExpiredSessions(s.cfg.DB)
		_ = db.DeleteExpiredPMATokens(s.cfg.DB)
	}
}

// crsUpdater checks for updated OWASP CRS rules nightly and recompiles the
// WAF engine if a new version is downloaded.
func (s *Server) crsUpdater() {
	run := func() {
		if err := proxy.UpdateCRS(s.cfg.AppPath); err != nil {
			logger.Warn("crs: update check failed: %v", err)
			return
		}
		if s.proxy != nil {
			if err := s.proxy.WarmWAFCache(); err != nil {
				logger.Error("crs: WAF cache refresh after update failed: %v", err)
			}
		}
	}

	run()
	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()
	for range ticker.C {
		run()
	}
}

// detectHostAppPath inspects the running container's mounts to resolve the
// host-side path for the app data directory, falling back to the configured
// app path if unavailable.
func (s *Server) detectHostAppPath() string {
	hostname, err := os.Hostname()
	if err != nil {
		logger.Error("could not get the hostname %v", err)
		return s.cfg.AppPath
	}

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

// detectHostGateway uses the Podman API to find the bridge gateway for the
// default podman network.
func (s *Server) detectHostGateway() string {
	hostname, err := os.Hostname()
	if err != nil {
		logger.Error("detectHostGateway: could not get hostname: %v", err)
		return "127.0.0.1"
	}

	for _, name := range []string{hostname, "podnest"} {
		var inspect struct {
			NetworkSettings struct {
				Networks map[string]struct {
					Gateway string `json:"Gateway"`
				} `json:"Networks"`
			} `json:"NetworkSettings"`
		}

		if err := s.podman.GetJSON(context.Background(),
			"/v4.0.0/libpod/containers/"+name+"/json",
			&inspect,
		); err != nil {
			logger.Error("detectHostGateway: failed to inspect container %s: %v", name, err)
			continue
		}

		for netName, netInfo := range inspect.NetworkSettings.Networks {
			if netInfo.Gateway != "" {
				logger.Debug("detected host gateway %s from container network %s", netInfo.Gateway, netName)
				return netInfo.Gateway
			}
		}
	}

	logger.Error("detectHostGateway: could not detect gateway, falling back to 127.0.0.1")
	return "127.0.0.1"
}

// permissionReaper periodically corrects ownership and permissions on all site
// directories — fires immediately on startup then every 30 seconds.
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

			os.Chown(siteDir, 0, 0)
			os.Chmod(siteDir, 0755)
			os.Chown(siteDir+"/html", sftpUID, sftpUID)
			os.Chmod(siteDir+"/html", 02775)
			os.Chown(siteDir+"/nginx", sftpUID, sftpUID)
			os.Chmod(siteDir+"/nginx", 0755)
			os.Chown(siteDir+"/nginx/logs", 101, 101)
			os.Chmod(siteDir+"/nginx/logs", 0750)

			for _, d := range []string{"php-fpm", "redis"} {
				os.Chown(siteDir+"/"+d, sftpUID, sftpUID)
				os.Chmod(siteDir+"/"+d, 0755)
			}

			os.Chown(siteDir+"/db", 999, 999)
			os.Chmod(siteDir+"/db", 0755)
			os.Chown(siteDir+"/backups", 0, sftpUID)
			os.Chmod(siteDir+"/backups", 0750)
		}
	}

	fix()
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		fix()
	}
}

// startupRestore queries the database for all sites that were running at last
// shutdown and attempts to restart their pods.
func (s *Server) startupRestore() {
	time.Sleep(5 * time.Second)

	sites, err := db.GetAllSites(s.cfg.DB)
	if err != nil {
		logger.Error("startupRestore: failed to load sites: %v", err)
		return
	}

	for _, site := range sites {
		if site.SiteStatus != models.StatusRunning {
			continue
		}

		podName := podman.PodName(site.Name)
		exists, err := s.podman.PodExists(context.Background(), podName)
		if err != nil {
			logger.Error("startupRestore: could not check pod existence for site %s: %v", site.Name, err)
			continue
		}

		if !exists {
			logger.Warn("startupRestore: pod for site %s no longer exists, marking stopped", site.Name)
			_ = db.UpdateSiteStatus(s.cfg.DB, site.ID, models.StatusStopped)
			continue
		}

		if err := s.podman.StartPod(context.Background(), podName); err != nil {
			if strings.Contains(err.Error(), "304") {
				logger.Debug("startupRestore: pod %s already running", podName)
				_ = db.UpdateSiteStatus(s.cfg.DB, site.ID, models.StatusRunning)
				continue
			}
			logger.Error("startupRestore: failed to start pod for site %s: %v", site.Name, err)
			_ = db.UpdateSiteStatus(s.cfg.DB, site.ID, models.StatusStopped)
			continue
		}

		logger.Debug("startupRestore: pod for site %s restored successfully", site.Name)
	}
}

// syncPodStatuses periodically reconciles DB site statuses against actual
// Podman pod states, correcting any drift caused by crashes or manual intervention.
func (s *Server) syncPodStatuses() {
	fix := func() {
		sites, err := db.GetAllSites(s.cfg.DB)
		if err != nil {
			logger.Error("syncPodStatuses: failed to load sites: %v", err)
			return
		}
		for _, site := range sites {
			if !modules.TypeModule(site.SiteType).HasPod() {
				continue
			}

			podName := podman.PodName(site.Name)
			inspect, err := s.podman.InspectPod(context.Background(), podName)
			if err != nil {
				if site.SiteStatus != models.StatusStopped {
					_ = db.UpdateSiteStatus(s.cfg.DB, site.ID, models.StatusStopped)
				}
				continue
			}
			if inspect.State == "Running" && site.SiteStatus != models.StatusRunning {
				logger.Debug("syncPodStatuses: correcting site %d status to running", site.ID)
				_ = db.UpdateSiteStatus(s.cfg.DB, site.ID, models.StatusRunning)
			} else if inspect.State != "Running" && site.SiteStatus == models.StatusRunning {
				logger.Debug("syncPodStatuses: correcting site %d status to stopped", site.ID)
				_ = db.UpdateSiteStatus(s.cfg.DB, site.ID, models.StatusStopped)
			}
		}
	}

	fix()
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		fix()
	}
}
