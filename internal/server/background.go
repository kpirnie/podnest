package server

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
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
			if err := s.proxy.WarmCaches(false); err != nil {
				logger.Error("crs: cache refresh after update failed: %v", err)
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

		// warm the caches
		go s.proxy.WarmCaches(false)

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

// rotateLogs compresses access and WAF logs older than 2 days and deletes
// archives older than 7 days. Runs daily at midnight.
func (s *Server) rotateLogs() {
	// wait until next midnight to start, then tick every 24h
	now := time.Now()
	next := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
	time.Sleep(time.Until(next))

	run := func() {
		// collect all log directories to rotate: global + per-site
		dirs := []string{s.cfg.AppPath + "/logs"}

		sites, err := db.GetAllSites(s.cfg.DB)
		if err != nil {
			logger.Error("rotateLogs: failed to load sites: %v", err)
		} else {
			for _, site := range sites {
				dirs = append(dirs, fmt.Sprintf("%s/sites/%s/logs", s.cfg.AppPath, site.Name))
			}
		}

		for _, dir := range dirs {
			if _, err := os.Stat(dir); os.IsNotExist(err) {
				continue
			}
			rotateLogDir(dir)
		}
	}

	run()
	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()
	for range ticker.C {
		run()
	}
}

// rotateLogDir rotates access.log and waf.log in a single log directory.
// Files older than 2 days are compressed; archives older than 7 days are deleted.
func rotateLogDir(dir string) {
	cutoffRotate := time.Now().AddDate(0, 0, -2)
	cutoffDelete := time.Now().AddDate(0, 0, -7)

	for _, name := range []string{"access.log", "waf.log"} {
		path := dir + "/" + name
		info, err := os.Stat(path)
		if err != nil {
			continue // file does not exist yet
		}

		// rotate if the file is older than 2 days
		if info.ModTime().Before(cutoffRotate) {
			dateSuffix := info.ModTime().Format("2006-01-02")
			base := strings.TrimSuffix(name, ".log")
			archivePath := fmt.Sprintf("%s/%s-%s.tar.gz", dir, base, dateSuffix)

			if err := compressLogFile(path, archivePath); err != nil {
				logger.Error("rotateLogs: compress %s: %v", path, err)
				continue
			}
			if err := os.Remove(path); err != nil {
				logger.Error("rotateLogs: remove %s after compress: %v", path, err)
			}
			logger.Debug("rotateLogs: rotated %s → %s", path, archivePath)
		}
	}

	// delete archives older than 7 days
	entries, err := os.ReadDir(dir)
	if err != nil {
		logger.Error("rotateLogs: readdir %s: %v", dir, err)
		return
	}
	for _, entry := range entries {
		if !strings.HasSuffix(entry.Name(), ".tar.gz") {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		if info.ModTime().Before(cutoffDelete) {
			p := dir + "/" + entry.Name()
			if err := os.Remove(p); err != nil {
				logger.Error("rotateLogs: delete old archive %s: %v", p, err)
				continue
			}
			logger.Debug("rotateLogs: deleted old archive %s", p)
		}
	}
}

// compressLogFile writes src into a .tar.gz archive at dst.
func compressLogFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	gz := gzip.NewWriter(out)
	defer gz.Close()

	tw := tar.NewWriter(gz)
	defer tw.Close()

	info, err := in.Stat()
	if err != nil {
		return err
	}

	hdr := &tar.Header{
		Name:    filepath.Base(src),
		Size:    info.Size(),
		Mode:    int64(info.Mode()),
		ModTime: info.ModTime(),
	}
	if err := tw.WriteHeader(hdr); err != nil {
		return err
	}
	_, err = io.Copy(tw, in)
	return err
}

// pollStats periodically samples container health states and resource usage for
// all running sites and writes results into the shared statsCache.
// Fires immediately on startup then every 10 seconds.
func (s *Server) pollStats() {
	poll := func() {
		ctx := context.Background()

		sites, err := db.GetAllSites(s.cfg.DB)
		if err != nil {
			logger.Error("pollStats: failed to load sites: %v", err)
			return
		}

		for _, site := range sites {
			// skip site types that have no pod
			if !modules.TypeModule(site.SiteType).HasPod() {
				continue
			}
			if site.SiteStatus != models.StatusRunning {
				continue
			}

			podName := podman.PodName(site.Name)

			// --- health states ---
			inspect, err := s.podman.InspectPod(ctx, podName)
			if err != nil {
				continue
			}
			var healthEntries []models.ContainerHealth
			for _, c := range inspect.Containers {
				status, err := s.podman.ContainerHealthState(ctx, c.Name)
				if err != nil {
					status = "none"
				}
				healthEntries = append(healthEntries, models.ContainerHealth{
					Name:   c.Name,
					Status: status,
				})
			}
			s.stats.setHealth(podName, healthEntries)

			// --- resource stats ---
			cstats, err := s.podman.PodStats(ctx, podName)
			if err != nil {
				logger.Debug("pollStats: stats unavailable for pod %s: %v", podName, err)
				continue
			}
			s.stats.setStats(podName, cstats)
		}
	}

	poll()
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		poll()
	}
}
