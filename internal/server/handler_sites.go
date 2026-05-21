package server

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"podnest/internal/auth"
	"podnest/internal/config"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/podman"
	"podnest/internal/sftp"
)

// wpInitScript is the entrypoint for WordPress containers — copies WP files on
// first run then execs php-fpm directly so siteUID owns everything
const wpInitScript = `#!/bin/sh
set -e
if [ ! -f /var/www/html/index.php ]; then
    echo "Copying WordPress files..."
    cp -r /usr/src/wordpress/. /var/www/html/
fi
exec php-fpm
`

// sitesBase returns the base directory path for all site data on disk
func (s *Server) sitesBase() string {
	return s.cfg.AppPath + "/sites"
}

// -- list --------------------------------------------------------------------

// apiListSites returns all sites for admins, or only the caller's sites for managers
func (s *Server) apiListSites(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())

	// hold the sites and and ay errors that could happen
	var (
		sites []*models.Site
		err   error
	)

	// admins see all sites; managers see only their own
	if user.Role == models.RoleAdmin {
		sites, err = db.GetAllSites(s.cfg.DB)
	} else {
		sites, err = db.GetSitesByUser(s.cfg.DB, user.ID)
	}
	if err != nil {
		logger.Error("failed to retrieve sites for user %d: %v", user.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// we have no sites
	if sites == nil {
		sites = []*models.Site{}
	}

	logger.Debug("retrieved %d sites for user %d", len(sites), user.ID)
	apiJSON(w, http.StatusOK, sites)
}

// apiGetSite returns a site and its associated domains by ID
func (s *Server) apiGetSite(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		logger.Error("failed to resolve site: %v", r)
		return
	}

	// fetch the domains associated with this site
	domains, err := db.GetDomainsBySite(s.cfg.DB, site.ID)
	if err != nil {
		logger.Error("failed to fetch domains for site %d: %v", site.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("retrieved site %d with %d domains", site.ID, len(domains))

	// reverse proxy sites have no SFTP credentials
	var sftpCred *models.SFTPCred
	if site.SiteType != models.SiteTypeReverseProxy {
		sftpCred, err = db.GetSFTPCredBySite(s.cfg.DB, site.ID)
		if err != nil {
			logger.Error("failed to fetch SFTP cred for site %d: %v", site.ID, err)
			apiError(w, http.StatusInternalServerError, err)
			return
		}
	}

	apiJSON(w, http.StatusOK, map[string]any{
		"site":    site,
		"domains": domains,
		"sftp":    sftpCred,
	})
}

// -- create ------------------------------------------------------------------

// apiCreateSite validates the request, creates the DB record, scaffolds the site directory, and provisions the pod
func (s *Server) apiCreateSite(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())

	// decode the request body into the create site request struct
	var req struct {
		Name             string   `json:"name"`
		PHPVersion       int      `json:"php_version"`
		SiteType         int      `json:"site_type"`
		RuntimeVersion   *int     `json:"runtime_version"`
		StartCommand     string   `json:"start_command"`
		Domains          []string `json:"domains"`
		InstallWordPress bool     `json:"install_wordpress"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("failed to decode request body for site creation: %v", err)
		apiError(w, http.StatusBadRequest, err)
		return
	}

	// automatically assign the next available port in the 8081-11000 range
	port, err := db.NextAvailablePort(s.cfg.DB)
	if err != nil {
		logger.Error("failed to find available port for site '%s': %v", req.Name, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// derive the PMA port for non-static sites
	pmaPort := 0
	if req.SiteType != models.SiteTypeStatic && req.SiteType != models.SiteTypeReverseProxy {
		pmaPort = port + 10000
	}

	// validate required fields and sanitize the site name to lowercase alphanumeric
	if req.Name == "" || port == 0 {
		logger.Error("missing required fields for site creation: name=%s port=%d", req.Name, port)
		apiErrorMsg(w, http.StatusBadRequest, "name and port are required")
		return
	}
	req.Name = strings.ToLower(regexp.MustCompile(`[^a-zA-Z0-9_\-]`).ReplaceAllString(req.Name, "-"))
	if req.PHPVersion == 0 {
		req.PHPVersion = 3
	}

	// check that the site name is not already taken
	existing, err := db.GetSiteByName(s.cfg.DB, req.Name)
	if err != nil {
		logger.Error("failed to check site name uniqueness for '%s': %v", req.Name, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	if existing != nil {
		logger.Error("site name '%s' already exists", req.Name)
		apiErrorMsg(w, http.StatusConflict, "site name already exists")
		return
	}

	// create the site record in the database
	site := &models.Site{
		UID:            user.ID,
		Name:           req.Name,
		Port:           port,
		PHPVersion:     req.PHPVersion,
		SiteStatus:     models.StatusStopped,
		SiteType:       req.SiteType,
		RuntimeVersion: req.RuntimeVersion,
		StartCommand:   req.StartCommand,
		PMAPort:        pmaPort,
	}
	if site.SiteType == 0 {
		site.SiteType = models.SiteTypeWordPress
	}
	// "PHP" site type without WordPress → use the plain PHP-FPM image (no auto-install)
	if site.SiteType == models.SiteTypeWordPress && !req.InstallWordPress {
		site.SiteType = models.SiteTypePHP
	}
	if err := db.CreateSite(s.cfg.DB, site); err != nil {
		logger.Error("failed to create site record for '%s': %v", req.Name, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// reverse proxy sites need no pod, SFTP, or configs — return immediately
	if site.SiteType == models.SiteTypeReverseProxy {

		// persist any requested domains and warm the proxy cache
		for _, d := range req.Domains {
			d = strings.TrimSpace(d)
			if d == "" {
				continue
			}
			if err := db.CreateDomain(s.cfg.DB, &models.Domain{SiteID: site.ID, Domain: d}); err != nil {
				logger.Error("saving domain %s for reverse proxy site %s: %v", d, site.Name, err)
			}
			s.proxy.AddDomain(d, site.Port, site.ID)
			s.proxy.ObtainCert(d)
		}
		_ = db.UpdateSiteStatus(s.cfg.DB, site.ID, models.StatusRunning)
		site.SiteStatus = models.StatusRunning
		logger.Debug("reverse proxy site '%s' created", site.Name)
		apiJSON(w, http.StatusCreated, site)
		return
	}

	// create the sftp credentials
	sftpPass, err := auth.GeneratePassword()
	if err != nil {
		logger.Error("failed to generate SFTP password for site %d: %v", site.ID, err)
		_ = db.DeleteSite(s.cfg.DB, site.ID)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	sftpCred := &models.SFTPCred{
		SiteID:   site.ID,
		Username: site.Name,
		Password: sftpPass,
		UID:      sftp.UIDForSite(site.ID),
	}
	if err := db.CreateSFTPCred(s.cfg.DB, sftpCred); err != nil {
		logger.Error("failed to create SFTP cred for site %d: %v", site.ID, err)
		_ = db.DeleteSite(s.cfg.DB, site.ID)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	if err := s.sftp.AddUser(r.Context(), site.Name, sftpPass, sftp.UIDForSite(site.ID)); err != nil {
		logger.Error("failed to add SFTP user for site %d: %v", site.ID, err)
	}

	// seed and persist default configs for the site type
	configs, err := config.SeedSiteConfigs(site.SiteType)
	if err != nil {
		logger.Error("failed to seed configs for site %d: %v", site.ID, err)
		_ = db.DeleteSite(s.cfg.DB, site.ID)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	for t, kv := range configs {
		if err := db.SetConfigs(s.cfg.DB, site.ID, t, kv); err != nil {
			logger.Error("failed to set config type %d for site %s: %v", t, site.Name, err)
			_ = db.DeleteSite(s.cfg.DB, site.ID)
			apiError(w, http.StatusInternalServerError, err)
			return
		}
	}

	// persist the requested domains for the site
	for _, d := range req.Domains {
		d = strings.TrimSpace(d)
		if d == "" {
			continue
		}
		if err := db.CreateDomain(s.cfg.DB, &models.Domain{SiteID: site.ID, Domain: d}); err != nil {
			logger.Error("saving domain %s for site %s: %v", d, site.Name, err)
		}
		// add to proxy cache immediately so ObtainCert and hostPolicy can resolve it
		s.proxy.AddDomain(d, port, site.ID)
	}

	// proactively obtain SSL certificates for all registered domains
	for _, d := range req.Domains {
		d = strings.TrimSpace(d)
		if d == "" {
			continue
		}
		s.proxy.ObtainCert(d)
	}

	// generate unique credentials for the database and Redis instances
	dbUser, err := auth.GeneratePassword()
	if err != nil {
		logger.Error("failed to generate DB user credential for site %d: %v", site.ID, err)
		_ = db.DeleteSite(s.cfg.DB, site.ID)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	dbPass, err := auth.GeneratePassword()
	if err != nil {
		logger.Error("failed to generate DB password for site %d: %v", site.ID, err)
		_ = db.DeleteSite(s.cfg.DB, site.ID)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	dbRootPass, err := auth.GeneratePassword()
	if err != nil {
		logger.Error("failed to generate DB root password for site %d: %v", site.ID, err)
		_ = db.DeleteSite(s.cfg.DB, site.ID)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	redisPass, err := auth.GeneratePassword()
	if err != nil {
		logger.Error("failed to generate Redis password for site %d: %v", site.ID, err)
		_ = db.DeleteSite(s.cfg.DB, site.ID)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// scaffold the site directory structure and write all config files to disk
	siteDir := s.sitesBase() + "/" + site.Name
	hostSiteDir := s.hostSitesBase() + "/" + site.Name

	sftpUID := sftp.UIDForSite(site.ID)
	if err := scaffoldSiteDir(siteDir, site, configs, dbUser, dbPass, dbRootPass, redisPass, sftpUID); err != nil {
		logger.Error("scaffolding site dir for %s: %v", site.Name, err)
		_ = db.DeleteSite(s.cfg.DB, site.ID)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// marshal the varnish KV map to JSON for the pod config
	varnishBlob, _ := json.Marshal(configs[models.ConfigVarnish])
	varnishBlobStr := string(varnishBlob)

	// provision the Podman pod with all required containers
	podCfg := podman.SiteConfig{
		Site:           site,
		SiteUID:        sftpUID,
		SiteDir:        hostSiteDir,
		DBName:         site.Name,
		DBUser:         dbUser,
		DBPass:         dbPass,
		DBRootPass:     dbRootPass,
		RedisPass:      redisPass,
		VarnishEnabled: config.VarnishEnabled(varnishBlobStr),
		VarnishMemory:  config.VarnishMemorySize(varnishBlobStr),
	}
	podCtx, podCancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer podCancel()

	// create the pod
	if err := s.podman.CreateSitePod(podCtx, podCfg); err != nil {
		logger.Error("creating pod for site %s: %v", site.Name, err)
		_ = s.podman.StopPod(context.Background(), podman.PodName(site.Name))
		_ = s.podman.RemoveSitePod(context.Background(), site.Name)
		_ = db.DeleteSite(s.cfg.DB, site.ID)
		_ = os.RemoveAll(siteDir)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("site '%s' created and pod provisioned successfully", site.Name)
	_ = db.UpdateSiteStatus(s.cfg.DB, site.ID, models.StatusRunning)
	site.SiteStatus = models.StatusRunning

	apiJSON(w, http.StatusCreated, site)
}

// apiUpdateSite applies partial updates to mutable site fields
func (s *Server) apiUpdateSite(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		logger.Error("failed to resolve site: %v", r)
		return
	}

	// decode the request body into the update fields struct
	var req struct {
		Name           string `json:"name"`
		PHPVersion     int    `json:"php_version"`
		SiteType       int    `json:"site_type"`
		RuntimeVersion *int   `json:"runtime_version"`
		StartCommand   string `json:"start_command"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("failed to decode request body for site update on site %d: %v", site.ID, err)
		apiError(w, http.StatusBadRequest, err)
		return
	}

	// apply non-zero field updates to the site record
	if req.Name != "" {
		site.Name = req.Name
	}
	if req.PHPVersion != 0 {
		site.PHPVersion = req.PHPVersion
	}
	if req.SiteType != 0 {
		site.SiteType = req.SiteType
	}
	if req.RuntimeVersion != nil {
		site.RuntimeVersion = req.RuntimeVersion
	}
	if req.StartCommand != "" {
		site.StartCommand = req.StartCommand
	}

	// persist the updated site fields to the database
	if err := db.UpdateSite(s.cfg.DB, site); err != nil {
		logger.Error("failed to update site %d: %v", site.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("updated site %d: %s", site.ID, site.Name)
	apiJSON(w, http.StatusOK, site)
}

// apiDeleteSite stops and removes the pod, then deletes the site record from the database
func (s *Server) apiDeleteSite(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		logger.Error("failed to resolve site: %v", r)
		return
	}

	log.Printf("Deleting site %s — stopping and removing pod", site.Name)

	bgCtx := context.Background()
	siteDir := s.sitesBase() + "/" + site.Name

	// reverse proxy sites have no pod or SFTP user to tear down
	if site.SiteType != models.SiteTypeReverseProxy {

		// stop the pod; log warnings but continue regardless of error
		if err := s.podman.StopPod(bgCtx, podman.PodName(site.Name)); err != nil {
			logger.Warn("stop pod %s: %v", site.Name, err)
		}

		// remove the pod; log warnings but continue regardless of error
		if err := s.podman.RemoveSitePod(bgCtx, site.Name); err != nil {
			logger.Warn("remove pod %s: %v", site.Name, err)
		}

		// remove SFTP user before deleting site
		if err := s.sftp.RemoveUser(bgCtx, site.Name); err != nil {
			logger.Warn("failed to remove SFTP user for site %s: %v", site.Name, err)
		}

	}

	// fetch domains before the cascade delete wipes them — needed for cache eviction
	siteDomains, err := db.GetDomainsBySite(s.cfg.DB, site.ID)
	if err != nil {
		logger.Warn("could not fetch domains for cache eviction on site %d: %v", site.ID, err)
	}

	// delete the site record — cascades to domains and configs
	if err := db.DeleteSite(s.cfg.DB, site.ID); err != nil {
		logger.Error("failed to delete site %d: %v", site.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// evict all domains and the reverse proxy instance from the in-memory cache
	if len(siteDomains) > 0 {
		domainStrs := make([]string, 0, len(siteDomains))
		for _, d := range siteDomains {
			domainStrs = append(domainStrs, d.Domain)
		}
		s.proxy.RemoveDomains(domainStrs)
	}
	s.proxy.RemoveSiteProxy(site.Port)

	// remove site files from disk; log but do not fail — the record is already gone
	if err := os.RemoveAll(siteDir); err != nil {
		logger.Warn("failed to remove site directory %s: %v", siteDir, err)
	}

	log.Printf("Site %s deleted successfully", site.Name)
	w.WriteHeader(http.StatusNoContent)
}

// apiSiteStart starts the pod and updates the site status to running
func (s *Server) apiSiteStart(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		logger.Error("failed to resolve site: %v", r)
		return
	}

	// start up the pod
	if err := s.podman.StartPod(r.Context(), podman.PodName(site.Name)); err != nil {
		logger.Error("failed to start pod for site %d: %v", site.ID, err)
		_ = db.UpdateSiteStatus(s.cfg.DB, site.ID, models.StatusError)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	logger.Debug("started pod for site %d", site.ID)
	if !s.confirmPodRunning(r.Context(), podman.PodName(site.Name), site.SiteType) {
		logger.Error("pod for site %d did not reach running state after start", site.ID)
		_ = db.UpdateSiteStatus(s.cfg.DB, site.ID, models.StatusError)
		apiErrorMsg(w, http.StatusInternalServerError, "pod failed to reach running state")
		return
	}
	_ = db.UpdateSiteStatus(s.cfg.DB, site.ID, models.StatusRunning)
	apiJSON(w, http.StatusOK, map[string]string{"status": "running"})
}

// apiSiteStop stops the pod and updates the site status to stopped
func (s *Server) apiSiteStop(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		logger.Error("failed to resolve site: %v", r)
		return
	}
	if err := s.podman.StopPod(r.Context(), podman.PodName(site.Name)); err != nil {
		logger.Error("failed to stop pod for site %d: %v", site.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	logger.Debug("stopped pod for site %d", site.ID)
	_ = db.UpdateSiteStatus(s.cfg.DB, site.ID, models.StatusStopped)
	apiJSON(w, http.StatusOK, map[string]string{"status": "stopped"})
}

// apiSiteRestart restarts the pod and updates the site status accordingly
func (s *Server) apiSiteRestart(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		logger.Error("failed to resolve site: %v", r)
		return
	}
	_ = db.UpdateSiteStatus(s.cfg.DB, site.ID, models.StatusRestarting)

	// stop first so the cache directories are not being written to during clear
	if err := s.podman.StopPod(context.Background(), podman.PodName(site.Name)); err != nil {
		logger.Warn("could not stop pod before cache clear for site %d: %v", site.ID, err)
	}

	// start the pod
	if err := s.podman.StartPod(context.Background(), podman.PodName(site.Name)); err != nil {
		logger.Error("failed to restart pod for site %d: %v", site.ID, err)
		_ = db.UpdateSiteStatus(s.cfg.DB, site.ID, models.StatusError)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	logger.Debug("restarted pod for site %d", site.ID)
	_ = db.UpdateSiteStatus(s.cfg.DB, site.ID, models.StatusRunning)
	apiJSON(w, http.StatusOK, map[string]string{"status": "running"})
}

// apiSiteFlush clears the nginx FastCGI cache, PHP OPcache, and Varnish cache for a site
func (s *Server) apiSiteFlush(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}

	// flush php opcache for php-based site types
	if site.SiteType == models.SiteTypeWordPress || site.SiteType == models.SiteTypePHP {
		if err := s.podman.FlushPHPCache(r.Context(), podman.ContainerName(site.Name, "php")); err != nil {
			logger.Error("failed to flush php opcache for site %d: %v", site.ID, err)
			apiError(w, http.StatusInternalServerError, err)
			return
		}
	}

	// flush redis cache
	if site.SiteType != models.SiteTypeStatic {
		redisPass, err := readEnvValue(s.sitesBase()+"/"+site.Name+"/.env", "REDIS_PASS")
		if err != nil {
			logger.Warn("apiSiteFlush: could not read REDIS_PASS for site %d: %v", site.ID, err)
		} else {
			if err := s.podman.FlushRedisCache(r.Context(), podman.ContainerName(site.Name, "redis"), redisPass); err != nil {
				logger.Warn("redis flush failed for site %d (pod may be stopped): %v", site.ID, err)
			}
		}
	}

	// flush varnish cache if enabled for this site
	varnishKV, _ := db.GetConfigsBySiteAndType(s.cfg.DB, site.ID, models.ConfigVarnish)
	if len(varnishKV) > 0 {
		vb, _ := json.Marshal(varnishKV)
		if config.VarnishEnabled(string(vb)) {
			if err := s.podman.FlushVarnishCache(r.Context(), podman.ContainerName(site.Name, "varnish")); err != nil {
				logger.Error("failed to flush varnish cache for site %d: %v", site.ID, err)
				apiError(w, http.StatusInternalServerError, err)
				return
			}
		}
	}

	logger.Debug("flushed all caches for site %d", site.ID)
	apiJSON(w, http.StatusOK, map[string]string{"status": "flushed"})
}

// apiSiteUpdate pulls the latest container images used by a site
func (s *Server) apiSiteUpdate(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		logger.Error("failed to resolve site: %v", r)
		return
	}

	// build the list of images to pull based on the site type
	images := []string{
		models.ImgNginx,
	}
	switch site.SiteType {
	case models.SiteTypeWordPress:
		// use centralized image constants to avoid hardcoded URLs
		images = append(images, models.PHPImage(site.PHPVersion), models.ImgDB, models.ImgRedis, models.ImgPMA)
	case models.SiteTypePHP:
		images = append(images, models.PHPOnlyImage(site.PHPVersion), models.ImgDB, models.ImgRedis, models.ImgPMA)
	case models.SiteTypeNode, models.SiteTypeDotNet:
		images = append(images, models.RuntimeImage(site), models.ImgDB, models.ImgRedis, models.ImgPMA)
	}

	// pull each image, returning on the first failure
	for _, img := range images {
		if err := s.podman.PullImage(r.Context(), img); err != nil {
			logger.Error("failed to pull image %s for site %d: %v", img, site.ID, err)
			apiError(w, http.StatusInternalServerError, err)
			return
		}
	}

	logger.Debug("updated container images for site %d", site.ID)
	apiJSON(w, http.StatusOK, map[string]string{"status": "images updated"})
}

// apiSiteStatus returns the raw Podman pod inspect payload for a site
func (s *Server) apiSiteStatus(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		logger.Error("failed to resolve site: %v", r)
		return
	}

	inspect, err := s.podman.SiteStatus(r.Context(), site.Name)
	if err != nil {
		logger.Error("failed to inspect pod for site %d: %v", site.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("retrieved pod status for site %d", site.ID)
	apiJSON(w, http.StatusOK, inspect)
}

// resolveSite extracts the site ID from the path, loads the record,
// and enforces ownership for manager-role users
func (s *Server) resolveSite(w http.ResponseWriter, r *http.Request) (*models.Site, bool) {
	user := auth.UserFromContext(r.Context())

	// parse and validate the site ID from the path
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		logger.Error("invalid site id in path: %s", idStr)
		apiErrorMsg(w, http.StatusBadRequest, "invalid site id")
		return nil, false
	}

	// look up the site record by primary key
	site, err := db.GetSiteByID(s.cfg.DB, id)
	if err != nil {
		logger.Error("failed to retrieve site %d: %v", id, err)
		apiError(w, http.StatusInternalServerError, err)
		return nil, false
	}
	if site == nil {
		logger.Error("site %d not found", id)
		apiErrorMsg(w, http.StatusNotFound, "site not found")
		return nil, false
	}

	// managers may only access their own sites
	if user.Role != models.RoleAdmin && site.UID != user.ID {
		logger.Error("user %d does not own site %d", user.ID, site.ID)
		apiErrorMsg(w, http.StatusForbidden, "forbidden")
		return nil, false
	}

	logger.Debug("resolved site %d: %s", site.ID, site.Name)
	return site, true
}

// generateWPConfig renders a wp-config.php for the given site credentials.
// Used instead of the WordPress Docker entrypoint so php-fpm can run as siteUID.
func generateWPConfig(dbName, dbUser, dbPass, redisPass string) string {
	// generate unique salts so each site has its own cryptographic keys
	salt := func() string {
		b := make([]byte, 48)
		rand.Read(b)
		return hex.EncodeToString(b)
	}
	return fmt.Sprintf(`<?php
defined('DB_NAME') || define('DB_NAME',     '%s');
defined('DB_USER') || define('DB_USER',     '%s');
defined('DB_PASSWORD') || define('DB_PASSWORD', '%s');
defined('DB_HOST') || define('DB_HOST',     '127.0.0.1:3306');
defined('DB_CHARSET') || define('DB_CHARSET',  'utf8mb4');
defined('DB_COLLATE') || define('DB_COLLATE',  '');
defined('AUTH_KEY') || define('AUTH_KEY',         '%s');
defined('SECURE_AUTH_KEY') || define('SECURE_AUTH_KEY',  '%s');
defined('LOGGED_IN_KEY') || define('LOGGED_IN_KEY',    '%s');
defined('NONCE_KEY') || define('NONCE_KEY',        '%s');
defined('AUTH_SALT') || define('AUTH_SALT',        '%s');
defined('SECURE_AUTH_SALT') || define('SECURE_AUTH_SALT', '%s');
defined('LOGGED_IN_SALT') || define('LOGGED_IN_SALT',   '%s');
defined('NONCE_SALT') || define('NONCE_SALT',       '%s');
defined('WP_REDIS_HOST') || define('WP_REDIS_HOST',     '127.0.0.1');
defined('WP_REDIS_PORT') || define('WP_REDIS_PORT',     6379);
defined('WP_REDIS_PASSWORD') || define('WP_REDIS_PASSWORD', '%s');
defined('WP_CACHE') || define('WP_CACHE',          true);
defined('WP_DEBUG') || define('WP_DEBUG',          false);
defined('DISALLOW_FILE_EDIT') || define('DISALLOW_FILE_EDIT', true);
defined('FORCE_SSL_ADMIN') || define('FORCE_SSL_ADMIN',   true);
defined('WP_AUTO_UPDATE_CORE') || define('WP_AUTO_UPDATE_CORE', 'minor');
defined('FS_METHOD') || define('FS_METHOD',         'direct');
defined('DISABLE_WP_CRON') || define('DISABLE_WP_CRON',   true);

$table_prefix = 'wp_';
defined('ABSPATH') || define( 'ABSPATH', __DIR__ . '/' );
// tell WordPress it's behind an SSL-terminating reverse proxy
if (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') {
    $_SERVER['HTTPS'] = 'on';
}
require_once ABSPATH . 'wp-settings.php';
`,
		dbName, dbUser, dbPass,
		salt(), salt(), salt(), salt(),
		salt(), salt(), salt(), salt(),
		redisPass,
	)
}

// scaffoldSiteDir writes all config files to disk for a new site.
// siteUID is the numeric SFTP uid — used so PHP-FPM runs as that user.
func scaffoldSiteDir(siteDir string, site *models.Site, configs map[int]map[string]string, dbUser, dbPass, dbRootPass, redisPass string, siteUID int) error {

	// create the required directory structure for the site
	dirs := []string{
		siteDir + "/html",
		siteDir + "/nginx/conf.d",
		siteDir + "/nginx/logs",
		siteDir + "/php-fpm",
		siteDir + "/db",
		siteDir + "/redis",
		siteDir + "/varnish",
	}
	for _, d := range dirs {
		if err := os.MkdirAll(d, 0755); err != nil {
			logger.Error("creating dir %s: %v", d, err)
			return err
		}
		logger.Debug("Created dir: %s", d)
	}

	// backups — root-owned, site group readable for SFTP download access
	if err := os.MkdirAll(filepath.Join(siteDir, "backups"), 0755); err != nil {
		return fmt.Errorf("create backups dir: %w", err)
	}

	// chroot directory must be owned by root for sshd to accept it
	if err := os.Chown(siteDir, 0, 0); err != nil {
		logger.Warn("could not chown site dir to root: %v", err)
	}
	if err := os.Chmod(siteDir, 0755); err != nil {
		logger.Warn("could not chmod site dir: %v", err)
	}

	// set ownership on all content directories to the SFTP user
	if err := os.Chown(siteDir+"/html", 33, siteUID); err != nil {
		logger.Warn("could not chown html to www-data:sftp uid %d: %v", siteUID, err)
	}
	for _, d := range []string{"php-fpm", "redis"} {
		if err := os.Chown(siteDir+"/"+d, siteUID, siteUID); err != nil {
			logger.Warn("could not chown %s to sftp uid %d: %v", d, siteUID, err)
		}
	}

	// db directory must be owned by the mysql user (uid 999) inside the MariaDB container
	if err := os.Chown(siteDir+"/db", 999, 999); err != nil {
		logger.Warn("could not chown db dir to mysql uid: %v", err)
	}

	// html: setgid + group-writable so PHP (running as siteUID) and SFTP share ownership
	if err := os.Chmod(siteDir+"/html", 02775); err != nil {
		logger.Warn("could not chmod html dir: %v", err)
	}

	// nginx config dirs belong to the SFTP user (app writes configs there)
	if err := os.Chown(siteDir+"/nginx", siteUID, siteUID); err != nil {
		logger.Warn("could not chown nginx dir to sftp uid: %v", err)
	}

	// nginx/logs — nginx container user (uid 101) writes access/error logs
	if err := os.Chown(siteDir+"/nginx/logs", 101, 101); err != nil {
		logger.Warn("could not chown nginx/logs to nginx uid: %v", err)
	}
	if err := os.Chmod(siteDir+"/nginx/logs", 0750); err != nil {
		logger.Warn("could not chmod nginx/logs: %v", err)
	}

	// marshal a KV map to a JSON blob for the render functions; returns '{}' on nil
	marshalCfg := func(kv map[string]string) string {
		if kv == nil {
			return "{}"
		}
		b, _ := json.Marshal(kv)
		return string(b)
	}

	// determine if varnish is enabled for this site
	vEnabled := config.VarnishEnabled(marshalCfg(configs[models.ConfigVarnish]))

	// render and write the nginx main config
	nginxMain, err := config.RenderNginxMain(marshalCfg(configs[models.ConfigNginx]))
	if err != nil {
		logger.Error("failed to create nginx config")
		return err
	}
	if err := os.WriteFile(siteDir+"/nginx/nginx.conf", []byte(nginxMain), 0644); err != nil {
		logger.Error("failed to write the nginx.conf")
		return err
	}

	// render and write the nginx site server block
	nginxSite, err := config.RenderNginxSite(marshalCfg(configs[models.ConfigNginx]), site.SiteType, vEnabled)
	if err != nil {
		logger.Error("failed to create nginx site block")
		return err
	}
	if err := os.WriteFile(siteDir+"/nginx/conf.d/site.conf", []byte(nginxSite), 0644); err != nil {
		logger.Error("failed to write site.conf")
		return err
	}

	// render and write PHP configs for WordPress and PHP site types
	if site.SiteType == models.SiteTypeWordPress || site.SiteType == models.SiteTypePHP {
		phpFPM, err := config.RenderPHPFPM(marshalCfg(configs[models.ConfigPHP]), siteUID)
		if err != nil {
			logger.Error("failed to create php config")
			return err
		}
		if err := os.WriteFile(siteDir+"/php-fpm/www.conf", []byte(phpFPM), 0644); err != nil {
			logger.Error("failed to write php config file")
			return err
		}
		phpIni, err := config.RenderPHPIni(marshalCfg(configs[models.ConfigPHP]))
		if err != nil {
			logger.Error("failed to create php ini")
			return err
		}
		if err := os.WriteFile(siteDir+"/php-fpm/php.ini", []byte(phpIni), 0644); err != nil {
			logger.Error("failed to write php ini file")
			return err
		}
	}

	// write the .env file before rendering redis so REDIS_PASS is available
	env := "DB_NAME=" + site.Name + "\n" +
		"DB_USER=" + dbUser + "\n" +
		"DB_PASS=" + dbPass + "\n" +
		"DB_ROOT_PASS=" + dbRootPass + "\n" +
		"REDIS_PASS=" + redisPass + "\n"
	if err := os.WriteFile(siteDir+"/.env", []byte(env), 0600); err != nil {
		logger.Error("failed to write the .env file")
		return err
	}

	// write wp-config.php for WordPress sites so the WP entrypoint can be skipped
	// entirely and php-fpm runs as siteUID without ownership conflicts
	if site.SiteType == models.SiteTypeWordPress {
		wpConfig := generateWPConfig(site.Name, dbUser, dbPass, redisPass)
		if err := os.WriteFile(siteDir+"/html/wp-config.php", []byte(wpConfig), 0640); err != nil {
			logger.Error("failed to write wp-config.php for site %s: %v", site.Name, err)
			return err
		}
		if err := os.Chown(siteDir+"/html/wp-config.php", siteUID, siteUID); err != nil {
			logger.Warn("could not chown wp-config.php: %v", err)
		}

		// write the init script that copies WP files on first run then execs php-fpm as siteUID
		if err := os.WriteFile(siteDir+"/php-fpm/wp-init.sh", []byte(wpInitScript), 0755); err != nil {
			logger.Error("failed to write wp-init.sh for site %s: %v", site.Name, err)
			return err
		}
	}

	// render and write MariaDB and Redis configs for all non-static site types
	if site.SiteType != models.SiteTypeStatic {
		mariaDB, err := config.RenderMariaDB(marshalCfg(configs[models.ConfigMariaDB]))
		if err != nil {
			logger.Error("failed to create mariadb config")
			return err
		}
		if err := os.WriteFile(siteDir+"/db/my.cnf", []byte(mariaDB), 0640); err != nil {
			logger.Error("failed to write mariadb config file")
			return err
		}
		redisPassFromEnv, _ := readEnvValue(siteDir+"/.env", "REDIS_PASS")
		redisCfg, err := config.RenderRedis(marshalCfg(configs[models.ConfigRedis]), redisPassFromEnv)
		if err != nil {
			logger.Error("failed to create redis config")
			return err
		}
		if err := os.WriteFile(siteDir+"/redis/redis.conf", []byte(redisCfg), 0644); err != nil {
			logger.Error("failed to write redis config file")
			return err
		}
	}

	// always write the VCL file so the bind mount target exists on disk;
	// varnish will only be started if enabled in the pod config
	vclContent, err := config.RenderVarnish(marshalCfg(configs[models.ConfigVarnish]))
	if err != nil {
		logger.Error("failed to render varnish VCL")
		return err
	}
	if err := os.WriteFile(siteDir+"/varnish/default.vcl", []byte(vclContent), 0644); err != nil {
		logger.Error("failed to write varnish VCL file")
		return err
	}

	logger.Debug("created and wrote the sites configurations")
	return nil
}

// apiSiteRecreate stops and removes the existing pod, then provisions a fresh one
// using the existing site data and credentials from disk
func (s *Server) apiSiteRecreate(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		logger.Error("failed to resolve site: %v", r)
		return
	}

	var recreateReq struct {
		InstallWordPress *bool `json:"install_wordpress"`
	}
	json.NewDecoder(r.Body).Decode(&recreateReq) //nolint — body is optional

	siteDir := s.sitesBase() + "/" + site.Name
	hostSiteDir := s.hostSitesBase() + "/" + site.Name
	bgCtx := context.Background()

	// stop and remove the existing pod before recreating
	if err := s.podman.StopPod(bgCtx, podman.PodName(site.Name)); err != nil {
		logger.Warn("stop pod %s: %v", site.Name, err)
	}
	if err := s.podman.RemoveSitePod(bgCtx, site.Name); err != nil {
		logger.Warn("remove pod %s: %v", site.Name, err)
	}

	// with the pod stopped (no container writing to html/), clear and switch type if requested
	if site.SiteType == models.SiteTypeWordPress && recreateReq.InstallWordPress != nil && !*recreateReq.InstallWordPress {
		if err := clearDirContents(siteDir + "/html"); err != nil {
			logger.Warn("failed to clear html/ for site %s: %v", site.Name, err)
		}
		site.SiteType = models.SiteTypePHP
		if err := db.UpdateSite(s.cfg.DB, site); err != nil {
			logger.Warn("failed to update site type for %s: %v", site.Name, err)
		}
	}

	// build the image list to pull based on the site type
	images := []string{
		models.ImgNginx,
		models.ImgSFTP,
	}
	switch site.SiteType {
	case models.SiteTypeWordPress:
		// use centralized image constants to avoid hardcoded URLs
		images = append(images, models.PHPImage(site.PHPVersion), models.ImgDB, models.ImgRedis, models.ImgPMA)
	case models.SiteTypePHP:
		images = append(images, models.PHPOnlyImage(site.PHPVersion), models.ImgDB, models.ImgRedis, models.ImgPMA)
	case models.SiteTypeNode, models.SiteTypeDotNet:
		images = append(images, models.RuntimeImage(site), models.ImgDB, models.ImgRedis, models.ImgPMA)
	}

	// create a timeout context for the pod provisioning operation
	podCtx, podCancel := context.WithTimeout(bgCtx, 10*time.Minute)
	defer podCancel()

	// read credentials from the site .env file
	dbUser, _ := readEnvValue(siteDir+"/.env", "DB_USER")
	dbPass, _ := readEnvValue(siteDir+"/.env", "DB_PASS")
	dbRootPass, _ := readEnvValue(siteDir+"/.env", "DB_ROOT_PASS")
	redisPass, _ := readEnvValue(siteDir+"/.env", "REDIS_PASS")

	// fetch the varnish KV map to determine if it should be provisioned
	varnishKV, _ := db.GetConfigsBySiteAndType(s.cfg.DB, site.ID, models.ConfigVarnish)
	var varnishCfgJSON string
	if len(varnishKV) > 0 {
		vb, _ := json.Marshal(varnishKV)
		varnishCfgJSON = string(vb)
	} else {
		// seed default varnish config for sites that predate this feature
		defaults, _ := config.DefaultsForType(models.ConfigVarnish)
		_ = db.SetConfigs(s.cfg.DB, site.ID, models.ConfigVarnish, defaults)
		vb, _ := json.Marshal(defaults)
		varnishCfgJSON = string(vb)
		logger.Debug("seeded default varnish config for pre-existing site %d", site.ID)
	}

	// ensure the varnish directory and VCL file exist on disk for pre-existing sites
	varnishDir := siteDir + "/varnish"
	if err := os.MkdirAll(varnishDir, 0755); err != nil {
		logger.Warn("could not create varnish dir for site %s: %v", site.Name, err)
	}
	if vclContent, err := config.RenderVarnish(varnishCfgJSON); err == nil {
		if err := os.WriteFile(varnishDir+"/default.vcl", []byte(vclContent), 0644); err != nil {
			logger.Warn("could not write varnish VCL for site %s: %v", site.Name, err)
		}
	}

	// write wp-init.sh for WordPress sites if it doesn't already exist
	if site.SiteType == models.SiteTypeWordPress {
		if err := os.WriteFile(siteDir+"/php-fpm/wp-init.sh", []byte(wpInitScript), 0755); err != nil {
			logger.Warn("could not write wp-init.sh for site %s: %v", site.Name, err)
		}
	}

	// build the pod config using the existing credentials and recreate the pod
	podCfg := podman.SiteConfig{
		Site:           site,
		SiteUID:        sftp.UIDForSite(site.ID),
		SiteDir:        hostSiteDir,
		DBName:         site.Name,
		DBUser:         dbUser,
		DBPass:         dbPass,
		DBRootPass:     dbRootPass,
		RedisPass:      redisPass,
		VarnishEnabled: config.VarnishEnabled(varnishCfgJSON),
		VarnishMemory:  config.VarnishMemorySize(varnishCfgJSON),
	}

	// try to create the sites pod
	if err := s.podman.CreateSitePod(podCtx, podCfg); err != nil {
		logger.Error("recreating pod for site %s: %v", site.Name, err)
		_ = s.podman.StopPod(bgCtx, podman.PodName(site.Name))
		_ = s.podman.RemoveSitePod(bgCtx, site.Name)
		_ = db.UpdateSiteStatus(s.cfg.DB, site.ID, models.StatusError)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("recreated pod for site %d: %s", site.ID, site.Name)
	if !s.confirmPodRunning(bgCtx, podman.PodName(site.Name), site.SiteType) {
		logger.Error("pod for site %d did not reach running state after recreate", site.ID)
		_ = db.UpdateSiteStatus(s.cfg.DB, site.ID, models.StatusError)
		apiErrorMsg(w, http.StatusInternalServerError, "pod failed to reach running state")
		return
	}
	_ = db.UpdateSiteStatus(s.cfg.DB, site.ID, models.StatusRunning)
	apiJSON(w, http.StatusOK, map[string]string{"status": "running"})
}

// confirmPodRunning polls the pod status and returns true only when every
// container in the pod reports a running state; timeout is 90s for WordPress
// and PHP sites (PMA + Varnish take time to initialise) and 30s for others.
func (s *Server) confirmPodRunning(ctx context.Context, podName string, siteType int) bool {
	timeout := 30 * time.Second
	switch siteType {
	case models.SiteTypeWordPress, models.SiteTypePHP:
		timeout = 90 * time.Second
	}
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		inspect, err := s.podman.InspectPod(ctx, podName)
		if err == nil && inspect.State == "Running" {
			return true
		}
		select {
		case <-ctx.Done():
			return false
		case <-time.After(2 * time.Second):
		}
	}
	return false
}

// hostSitesBase returns the host-side path for site data, falling back to the container path
func (s *Server) hostSitesBase() string {
	if s.cfg.HostAppPath != "" {
		return s.cfg.HostAppPath + "/sites"
	}
	return s.sitesBase()
}

// clearDirContents removes all entries inside dir without deleting dir itself
func clearDirContents(dir string) error {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	for _, e := range entries {
		if err := os.RemoveAll(dir + "/" + e.Name()); err != nil {
			return err
		}
	}
	return nil
}

// apiSiteClone creates a full copy of a site under a new name, replicating
// all files, database content, and configuration — domains are not carried over
func (s *Server) apiSiteClone(w http.ResponseWriter, r *http.Request) {
	src, ok := s.resolveSite(w, r)
	if !ok {
		return
	}

	// reverse proxy sites have no pod or files to clone
	if src.SiteType == models.SiteTypeReverseProxy {
		apiErrorMsg(w, http.StatusBadRequest, "reverse proxy sites cannot be cloned")
		return
	}

	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apiError(w, http.StatusBadRequest, err)
		return
	}

	// sanitize the clone name
	req.Name = strings.ToLower(regexp.MustCompile(`[^a-zA-Z0-9_\-]`).ReplaceAllString(req.Name, "-"))
	if req.Name == "" {
		apiErrorMsg(w, http.StatusBadRequest, "clone name is required")
		return
	}

	// ensure the name is not already taken
	existing, err := db.GetSiteByName(s.cfg.DB, req.Name)
	if err != nil {
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	if existing != nil {
		apiErrorMsg(w, http.StatusConflict, "site name already exists")
		return
	}

	// assign the next available port
	port, err := db.NextAvailablePort(s.cfg.DB)
	if err != nil {
		logger.Error("apiSiteClone: no available port for clone of site %d: %v", src.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// derive the PMA port for non-static sites
	pmaPort := 0
	if src.SiteType != models.SiteTypeStatic {
		pmaPort = port + 10000
	}

	user := auth.UserFromContext(r.Context())

	// build the clone record — same type/PHP/runtime as source, no domains
	clone := &models.Site{
		UID:            user.ID,
		ParentID:       src.ID,
		Name:           req.Name,
		Port:           port,
		PHPVersion:     src.PHPVersion,
		SiteStatus:     models.StatusStopped,
		SiteType:       src.SiteType,
		RuntimeVersion: src.RuntimeVersion,
		StartCommand:   src.StartCommand,
		PMAPort:        pmaPort,
	}
	if err := db.CreateSite(s.cfg.DB, clone); err != nil {
		logger.Error("apiSiteClone: failed to create clone record '%s': %v", req.Name, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// generate SFTP credentials for the clone
	sftpPass, err := auth.GeneratePassword()
	if err != nil {
		_ = db.DeleteSite(s.cfg.DB, clone.ID)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	sftpUID := sftp.UIDForSite(clone.ID)
	if err := db.CreateSFTPCred(s.cfg.DB, &models.SFTPCred{
		SiteID:   clone.ID,
		Username: clone.Name,
		Password: sftpPass,
		UID:      sftpUID,
	}); err != nil {
		logger.Error("apiSiteClone: failed to create SFTP cred for clone %d: %v", clone.ID, err)
		_ = db.DeleteSite(s.cfg.DB, clone.ID)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	if err := s.sftp.AddUser(r.Context(), clone.Name, sftpPass, sftpUID); err != nil {
		logger.Warn("apiSiteClone: failed to add SFTP user for clone %d: %v", clone.ID, err)
	}

	// copy all configs from the source site verbatim
	srcConfigs, err := db.GetAllConfigsBySite(s.cfg.DB, src.ID)
	if err != nil {
		logger.Error("apiSiteClone: failed to fetch source configs for site %d: %v", src.ID, err)
		_ = db.DeleteSite(s.cfg.DB, clone.ID)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// copy per-site IP and UA security rules from source to clone
	if srcIPRules, err := db.GetIPRules(s.cfg.DB, &src.ID); err == nil && len(srcIPRules) > 0 {
		cloneIPRules := make([]db.IPRule, len(srcIPRules))
		for i, r := range srcIPRules {
			cloneIPRules[i] = db.IPRule{ListType: r.ListType, CIDR: r.CIDR}
		}
		if err := db.ReplaceIPRules(s.cfg.DB, &clone.ID, cloneIPRules); err != nil {
			logger.Warn("apiSiteClone: failed to copy IP rules to clone %d: %v", clone.ID, err)
		}
	}
	if srcUARules, err := db.GetUARules(s.cfg.DB, &src.ID); err == nil && len(srcUARules) > 0 {
		cloneUARules := make([]db.UARule, len(srcUARules))
		for i, r := range srcUARules {
			cloneUARules[i] = db.UARule{ListType: r.ListType, Pattern: r.Pattern}
		}
		if err := db.ReplaceUARules(s.cfg.DB, &clone.ID, cloneUARules); err != nil {
			logger.Warn("apiSiteClone: failed to copy UA rules to clone %d: %v", clone.ID, err)
		}
	}

	// copy WAF site override and plugin selections from source to clone
	if wafOverride, err := db.GetWAFSiteOverride(s.cfg.DB, src.ID); err == nil {
		if wafOverride.Override != 0 || wafOverride.Exclusions != "" {
			if err := db.SaveWAFSiteOverride(s.cfg.DB, db.WAFSiteOverride{
				SiteID:     clone.ID,
				Override:   wafOverride.Override,
				Exclusions: wafOverride.Exclusions,
			}); err != nil {
				logger.Warn("apiSiteClone: failed to copy WAF override to clone %d: %v", clone.ID, err)
			}
		}
	}
	if wafPlugins, err := db.GetSitePlugins(s.cfg.DB, src.ID); err == nil && len(wafPlugins) > 0 {
		if err := db.SetSitePlugins(s.cfg.DB, clone.ID, wafPlugins); err != nil {
			logger.Warn("apiSiteClone: failed to copy WAF plugins to clone %d: %v", clone.ID, err)
		}
	}

	// copy cron jobs from source to clone — last_run, last_output, and last_error are not carried over
	if srcCrons, err := db.ListCrons(s.cfg.DB, src.ID); err == nil {
		for _, c := range srcCrons {
			if _, err := db.CreateCron(s.cfg.DB, &models.SiteCron{
				SiteID:   clone.ID,
				Label:    c.Label,
				Command:  c.Command,
				Schedule: c.Schedule,
				Enabled:  c.Enabled,
			}); err != nil {
				logger.Warn("apiSiteClone: failed to copy cron '%s' to clone %d: %v", c.Label, clone.ID, err)
			}
		}
	}

	// set the cloned configs
	for t, kv := range srcConfigs {
		if err := db.SetConfigs(s.cfg.DB, clone.ID, t, kv); err != nil {
			logger.Error("apiSiteClone: failed to copy config type %d to clone %d: %v", t, clone.ID, err)
			_ = db.DeleteSite(s.cfg.DB, clone.ID)
			apiError(w, http.StatusInternalServerError, err)
			return
		}
	}

	// generate fresh DB and Redis credentials — clone has its own MariaDB instance
	dbUser, err := auth.GeneratePassword()
	if err != nil {
		_ = db.DeleteSite(s.cfg.DB, clone.ID)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	dbPass, err := auth.GeneratePassword()
	if err != nil {
		_ = db.DeleteSite(s.cfg.DB, clone.ID)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	dbRootPass, err := auth.GeneratePassword()
	if err != nil {
		_ = db.DeleteSite(s.cfg.DB, clone.ID)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	redisPass, err := auth.GeneratePassword()
	if err != nil {
		_ = db.DeleteSite(s.cfg.DB, clone.ID)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	cloneSiteDir := s.sitesBase() + "/" + clone.Name
	hostCloneSiteDir := s.hostSitesBase() + "/" + clone.Name
	srcSiteDir := s.sitesBase() + "/" + src.Name

	// scaffold the clone directory using the copied configs and fresh credentials
	if err := scaffoldSiteDir(cloneSiteDir, clone, srcConfigs, dbUser, dbPass, dbRootPass, redisPass, sftpUID); err != nil {
		logger.Error("apiSiteClone: scaffolding clone dir for %s: %v", clone.Name, err)
		_ = db.DeleteSite(s.cfg.DB, clone.ID)
		_ = os.RemoveAll(cloneSiteDir)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// copy html/ from source to clone — preserves all site files and permissions
	if out, err := exec.CommandContext(r.Context(), "cp", "-a",
		srcSiteDir+"/html/.", cloneSiteDir+"/html/",
	).CombinedOutput(); err != nil {
		logger.Error("apiSiteClone: failed to copy html for %s: %v — %s", clone.Name, err, string(out))
		_ = db.DeleteSite(s.cfg.DB, clone.ID)
		_ = os.RemoveAll(cloneSiteDir)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// overwrite wp-config.php so the clone connects to its own MariaDB, not the source
	if clone.SiteType == models.SiteTypeWordPress {
		wpCfgPath := cloneSiteDir + "/html/wp-config.php"
		wpConfig := generateWPConfig(clone.Name, dbUser, dbPass, redisPass)
		if err := os.WriteFile(wpCfgPath, []byte(wpConfig), 0640); err != nil {
			logger.Warn("apiSiteClone: failed to write wp-config.php for clone %s: %v", clone.Name, err)
		}
		if err := os.Chown(wpCfgPath, sftpUID, sftpUID); err != nil {
			logger.Warn("apiSiteClone: could not chown wp-config.php for clone %s: %v", clone.Name, err)
		}
	}

	// resolve varnish config for pod provisioning
	varnishKV := srcConfigs[models.ConfigVarnish]
	varnishBlobStr := "{}"
	if len(varnishKV) > 0 {
		if vb, err := json.Marshal(varnishKV); err == nil {
			varnishBlobStr = string(vb)
		}
	}

	// provision the clone pod
	podCtx, podCancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer podCancel()

	podCfg := podman.SiteConfig{
		Site:           clone,
		SiteUID:        sftpUID,
		SiteDir:        hostCloneSiteDir,
		DBName:         clone.Name,
		DBUser:         dbUser,
		DBPass:         dbPass,
		DBRootPass:     dbRootPass,
		RedisPass:      redisPass,
		VarnishEnabled: config.VarnishEnabled(varnishBlobStr),
		VarnishMemory:  config.VarnishMemorySize(varnishBlobStr),
	}
	if err := s.podman.CreateSitePod(podCtx, podCfg); err != nil {
		logger.Error("apiSiteClone: creating pod for clone %s: %v", clone.Name, err)
		_ = s.podman.StopPod(context.Background(), podman.PodName(clone.Name))
		_ = s.podman.RemoveSitePod(context.Background(), clone.Name)
		_ = db.DeleteSite(s.cfg.DB, clone.ID)
		_ = os.RemoveAll(cloneSiteDir)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// dump and restore the database for all pod-based site types that use MariaDB
	if src.SiteType != models.SiteTypeStatic {
		if err := s.cloneDatabase(podCtx, src, clone); err != nil {
			// non-fatal — the clone pod is running, log and continue
			logger.Error("apiSiteClone: DB clone failed for %s → %s: %v", src.Name, clone.Name, err)
		}
	}

	logger.Debug("apiSiteClone: clone '%s' created from source '%s'", clone.Name, src.Name)
	_ = db.UpdateSiteStatus(s.cfg.DB, clone.ID, models.StatusRunning)
	clone.SiteStatus = models.StatusRunning
	apiJSON(w, http.StatusCreated, clone)
}

// cloneDatabase dumps the source site's MariaDB and restores it into the
// clone's MariaDB container via the podman CLI, reusing the backup manager pattern
func (s *Server) cloneDatabase(ctx context.Context, src, clone *models.Site) error {
	srcSiteDir := s.sitesBase() + "/" + src.Name
	cloneSiteDir := s.sitesBase() + "/" + clone.Name

	// read source root password from disk
	srcRootPass, err := readEnvValue(srcSiteDir+"/.env", "DB_ROOT_PASS")
	if err != nil {
		return fmt.Errorf("cloneDatabase: read src DB_ROOT_PASS: %w", err)
	}

	// read clone root password from the freshly scaffolded .env
	cloneRootPass, err := readEnvValue(cloneSiteDir+"/.env", "DB_ROOT_PASS")
	if err != nil {
		return fmt.Errorf("cloneDatabase: read clone DB_ROOT_PASS: %w", err)
	}

	// write the dump to a host temp file so it can be copied into the clone container
	tmp, err := os.CreateTemp("", "podnest-clone-*.sql")
	if err != nil {
		return fmt.Errorf("cloneDatabase: create temp file: %w", err)
	}
	defer os.Remove(tmp.Name())

	podEnv := append(os.Environ(), "CONTAINER_HOST=unix://"+s.cfg.PodmanSock, "TMPDIR=/var/tmp")
	srcDBContainer := podman.ContainerName(src.Name, "db")

	// dump the source DB to the temp file — try mysqldump first, fall back to mariadb-dump
	var dumpStderr bytes.Buffer
	dumpCmd := exec.CommandContext(ctx, "podman", "exec", srcDBContainer,
		"sh", "-c",
		fmt.Sprintf(
			"mysqldump -uroot -p%s --single-transaction --quick --routines %s 2>/dev/null || "+
				"mariadb-dump -uroot -p%s --single-transaction --quick --routines %s",
			srcRootPass, src.Name, srcRootPass, src.Name,
		),
	)
	dumpCmd.Env = podEnv
	dumpCmd.Stdout = tmp
	dumpCmd.Stderr = &dumpStderr
	if err := dumpCmd.Run(); err != nil {
		tmp.Close()
		return fmt.Errorf("cloneDatabase: mysqldump: %w — %s", err, dumpStderr.String())
	}
	tmp.Close()

	cloneDBContainer := podman.ContainerName(clone.Name, "db")

	// copy the dump file into the clone's MariaDB container
	cpCmd := exec.CommandContext(ctx, "podman", "cp", tmp.Name(), cloneDBContainer+":/tmp/podnest-clone.sql")
	cpCmd.Env = podEnv
	if out, err := cpCmd.CombinedOutput(); err != nil {
		return fmt.Errorf("cloneDatabase: podman cp: %w — %s", err, string(out))
	}

	// restore the dump into the clone's database and clean up the temp file
	var mysqlStderr bytes.Buffer
	mysqlCmd := exec.CommandContext(ctx, "podman", "exec", cloneDBContainer,
		"sh", "-c",
		fmt.Sprintf(
			"mariadb -uroot -p%s %s < /tmp/podnest-clone.sql && rm /tmp/podnest-clone.sql",
			cloneRootPass, clone.Name,
		),
	)
	mysqlCmd.Env = podEnv
	mysqlCmd.Stderr = &mysqlStderr
	if err := mysqlCmd.Run(); err != nil {
		return fmt.Errorf("cloneDatabase: mariadb restore: %w — %s", err, mysqlStderr.String())
	}

	logger.Debug("cloneDatabase: DB cloned from '%s' to '%s'", src.Name, clone.Name)
	return nil
}
