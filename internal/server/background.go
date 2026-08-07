// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package server

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"context"
	"database/sql"
	"encoding/csv"
	"fmt"
	"io"
	"math/rand"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"podnest/internal/auth"
	"podnest/internal/db"
	"podnest/internal/fileutil"
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
		_ = db.DeleteExpiredPMASessions(s.cfg.DB)
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

// geoUpdater checks for an updated DB-IP Lite country database daily and
// reloads the proxy's in-memory copy when a new release is downloaded.
func (s *Server) geoUpdater() {
	run := func() {
		if err := proxy.UpdateGeoDB(s.cfg.AppPath); err != nil {
			logger.Warn("geoip: update check failed: %v", err)
			return
		}
		if s.proxy != nil {
			if err := s.proxy.LoadGeoDB(); err != nil {
				logger.Error("geoip: reload after update failed: %v", err)
			}
		}
		if err := proxy.UpdateASNDB(s.cfg.AppPath); err != nil {
			logger.Warn("asndb: update check failed: %v", err)
			return
		}
		if s.proxy != nil {
			if err := s.proxy.LoadASNDB(); err != nil {
				logger.Error("asndb: reload after update failed: %v", err)
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

// dropUpdater keeps the Spamhaus DROP feed current. The cached lists are
// loaded from disk first so the feed is live before any network call; a fetch
// only happens when a list is missing or older than a day. Spamhaus permits
// one fetch per list per day and firewalls abusers, so the ticker is jittered
// to keep a fleet of installs from hitting them in lockstep.
func (s *Server) dropUpdater() {
	if s.proxy == nil {
		return
	}

	if s.proxy.LoadSpamhausDrop() {
		logger.Debug("drop: cached lists are current — skipping fetch")
	} else if err := proxy.UpdateSpamhausDrop(s.cfg.AppPath); err != nil {
		logger.Warn("drop: initial update failed: %v", err)
	} else {
		s.proxy.LoadSpamhausDrop()
	}

	for {
		jitter := time.Duration(rand.Int63n(int64(2 * time.Hour)))
		timer := time.NewTimer(24*time.Hour + jitter)
		<-timer.C
		timer.Stop()

		if err := proxy.UpdateSpamhausDrop(s.cfg.AppPath); err != nil {
			logger.Warn("drop: update check failed: %v", err)
			continue
		}
		s.proxy.LoadSpamhausDrop()
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
// directories — fires immediately on startup then every 5 minutes. The recursive
// html tree walk runs on its own 6-hour ticker: drift beneath html only occurs
// after a restore, clone, or import, each of which now corrects its own tree, so
// the walk is a safety net rather than the primary mechanism.
func (s *Server) permissionReaper() {
	fix := func() {
		sites, err := db.GetAllSites(s.cfg.DB)
		if err != nil {
			logger.Error("permissionReaper: failed to load sites: %v", err)
			return
		}

		// loop over all sites and ensure ownership and permissions are correct
		for _, site := range sites {
			siteDir := s.sitesBase() + "/" + site.Name
			sftpUID := sftp.UIDForSite(site.ID)

			os.Chown(siteDir, 0, 0)
			os.Chmod(siteDir, 0755)
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

	sweep := func() {
		sites, err := db.GetAllSites(s.cfg.DB)
		if err != nil {
			logger.Error("permissionReaper: sweep: failed to load sites: %v", err)
			return
		}
		for _, site := range sites {
			fileutil.ChownTree(s.sitesBase()+"/"+site.Name+"/html", sftp.UIDForSite(site.ID))
		}
	}

	fix()
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	sweepTicker := time.NewTicker(6 * time.Hour)
	defer sweepTicker.Stop()
	for {
		select {
		case <-ticker.C:
			fix()
		case <-sweepTicker.C:
			sweep()
		}
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

	// loop over all sites and attempt to start any that were running at last shutdown
	for _, site := range sites {
		if site.SiteStatus != models.StatusRunning {
			continue
		}

		// pod-less site types (reverse proxies) have nothing to restore
		if !modules.TypeModule(site.SiteType).HasPod() {
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
		// collect all log directories to rotate, pairing each site's directory
		// with the ID whose cached handles have to be released first
		type rotateTarget struct {
			dir    string
			siteID int64
		}
		targets := []rotateTarget{{dir: s.cfg.AppPath + "/logs"}}

		sites, err := db.GetAllSites(s.cfg.DB)
		if err != nil {
			logger.Error("rotateLogs: failed to load sites: %v", err)
		} else {
			for _, site := range sites {
				targets = append(targets, rotateTarget{
					dir:    fmt.Sprintf("%s/sites/%s/logs", s.cfg.AppPath, site.Name),
					siteID: site.ID,
				})
			}
		}

		for _, t := range targets {
			if _, err := os.Stat(t.dir); os.IsNotExist(err) {
				continue
			}
			siteID := t.siteID
			rotateLogDir(t.dir, func() {
				s.proxy.CloseSiteLogs(siteID)
			})
		}
	}

	run()
	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()
	for range ticker.C {
		run()
	}
}

// rotateLogDir compresses and prunes log files in a directory. onRotate, when
// non-nil, is called after compression and before the original is unlinked so
// the proxy can release its cached handle — otherwise it keeps writing to a
// dead inode.
func rotateLogDir(dir string, onRotate func()) {
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
			// release any cached handle before the inode goes away
			if onRotate != nil {
				onRotate()
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

// auditMaintenance archives yesterday's audit rows to a daily csv.tar.gz and
// prunes rows older than 30 days. Waits until just after midnight then ticks every 24h.
func (s *Server) auditMaintenance() {
	// wait until next midnight to start, then tick every 24h
	now := time.Now()
	next := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 1, 0, 0, now.Location())
	time.Sleep(time.Until(next))

	run := func() {
		// archive yesterday's completed day
		yesterday := time.Now().UTC().AddDate(0, 0, -1)
		if err := archiveAuditDay(s.cfg.DB, s.cfg.AppPath, yesterday); err != nil {
			logger.Error("auditMaintenance: archive failed: %v", err)
		}
		// prune rows older than 30 days
		if err := db.PruneAuditLog(s.cfg.DB); err != nil {
			logger.Error("auditMaintenance: prune failed: %v", err)
		}
	}

	run()
	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()
	for range ticker.C {
		run()
	}
}

// archiveAuditDay exports all audit rows for the given UTC day to
// {AppPath}/logs/audit/audit-YYYY-MM-DD.csv.tar.gz.
func archiveAuditDay(database *sql.DB, appPath string, day time.Time) error {
	rows, err := db.ExportAuditRowsForDate(database, day)
	if err != nil {
		return err
	}
	if len(rows) == 0 {
		logger.Debug("archiveAuditDay: no rows for %s, skipping", day.Format("2006-01-02"))
		return nil
	}

	// ensure the audit log directory exists
	dir := appPath + "/logs/audit"
	if err := os.MkdirAll(dir, 0750); err != nil {
		return fmt.Errorf("archiveAuditDay: mkdir %s: %w", dir, err)
	}

	archivePath := fmt.Sprintf("%s/audit-%s.csv.tar.gz", dir, day.Format("2006-01-02"))

	// write the csv into a buffer so we have its size for the tar header
	var csvBuf bytes.Buffer
	w := csv.NewWriter(&csvBuf)
	// header row
	_ = w.Write([]string{
		"id", "ts", "uid", "username", "ip", "ua", "method", "action",
		"target_type", "target_id", "status", "details", "prior_state", "new_state",
	})
	for _, e := range rows {
		uid := ""
		if e.UID != nil {
			uid = strconv.FormatInt(*e.UID, 10)
		}
		_ = w.Write([]string{
			strconv.FormatInt(e.ID, 10),
			e.TS.UTC().Format(time.RFC3339),
			uid,
			e.Username,
			e.IP,
			e.UA,
			e.Method,
			e.Action,
			e.TargetType,
			e.TargetID,
			strconv.Itoa(e.Status),
			e.Details,
			e.PriorState,
			e.NewState,
		})
	}
	w.Flush()
	if err := w.Error(); err != nil {
		return fmt.Errorf("archiveAuditDay: csv flush: %w", err)
	}

	// write the tar.gz archive
	out, err := os.Create(archivePath)
	if err != nil {
		return fmt.Errorf("archiveAuditDay: create archive: %w", err)
	}
	defer out.Close()

	gz := gzip.NewWriter(out)
	defer gz.Close()
	tw := tar.NewWriter(gz)
	defer tw.Close()

	csvName := fmt.Sprintf("audit-%s.csv", day.Format("2006-01-02"))
	if err := tw.WriteHeader(&tar.Header{
		Name:    csvName,
		Size:    int64(csvBuf.Len()),
		Mode:    0640,
		ModTime: time.Now(),
	}); err != nil {
		return fmt.Errorf("archiveAuditDay: tar header: %w", err)
	}
	if _, err := io.Copy(tw, &csvBuf); err != nil {
		return fmt.Errorf("archiveAuditDay: tar write: %w", err)
	}

	logger.Debug("archiveAuditDay: archived %d rows → %s", len(rows), archivePath)
	return nil
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

// readEnvFile reads a KEY=VALUE .env file and returns the value for the given key.
func readEnvFile(path, key string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	prefix := key + "="
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimRight(line, "\r")
		if strings.HasPrefix(line, prefix) {
			return strings.TrimPrefix(line, prefix), nil
		}
	}
	return "", fmt.Errorf("key %q not found in %s", key, path)
}

// mariadbUpgradeChecker probes each running DB site for a mysql.proc column-count
// mismatch (container upgraded without mariadb-upgrade) and fixes it automatically.
// Fires once at startup then every 24 hours.
func (s *Server) mariadbUpgradeChecker() {
	run := func() {
		ctx := context.Background()

		sites, err := db.GetAllSites(s.cfg.DB)
		if err != nil {
			logger.Error("mariadbUpgradeChecker: load sites: %v", err)
			return
		}

		for _, site := range sites {
			if !modules.TypeModule(site.SiteType).HasDatabase() {
				continue
			}
			if site.SiteStatus != models.StatusRunning {
				continue
			}

			envPath := filepath.Join(s.cfg.AppPath, "sites", site.Name, ".env")
			rootPass, err := readEnvFile(envPath, "DB_ROOT_PASS")
			if err != nil || rootPass == "" {
				logger.Warn("mariadbUpgradeChecker: site %s: DB_ROOT_PASS missing", site.Name)
				continue
			}

			dbContainer := podman.ContainerName(site.Name, "db")

			// base env for both execs — password is passed by name only, never in argv
			podEnv := append(os.Environ(), "CONTAINER_HOST=unix://"+s.cfg.PodmanSock)

			// probe for the mismatch — SHOW FUNCTION STATUS triggers the error
			probeCmd := exec.CommandContext(ctx, "podman",
				"exec", "-e", "MYSQL_PWD", dbContainer,
				"mariadb", "-uroot",
				"-e", "SHOW FUNCTION STATUS LIMIT 1;",
			)

			// capped append forces a new backing array so probe/upgrade envs don't alias
			probeCmd.Env = append(podEnv[:len(podEnv):len(podEnv)], "MYSQL_PWD="+rootPass)
			probeOut, probeErr := probeCmd.CombinedOutput()
			if probeErr == nil {
				continue // no mismatch
			}
			if !strings.Contains(string(probeOut), "Column count of mysql.proc is wrong") {
				continue // different error, not ours to fix
			}

			logger.Warn("mariadbUpgradeChecker: mysql.proc mismatch on site %s — running mariadb-upgrade", site.Name)
			upgradeCmd := exec.CommandContext(ctx, "podman",
				"exec", "-e", "MYSQL_PWD", dbContainer,
				"mariadb-upgrade", "-uroot",
			)
			upgradeCmd.Env = append(podEnv[:len(podEnv):len(podEnv)], "MYSQL_PWD="+rootPass)
			if out, err := upgradeCmd.CombinedOutput(); err != nil {
				logger.Error("mariadbUpgradeChecker: mariadb-upgrade failed for site %s: %v — %s", site.Name, err, string(out))
			} else {
				logger.Debug("mariadbUpgradeChecker: mariadb-upgrade complete for site %s", site.Name)
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
