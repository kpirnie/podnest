package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
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

	// get the sftp credentials to be sent with the response
	sftpCred, err := db.GetSFTPCredBySite(s.cfg.DB, site.ID)
	if err != nil {
		logger.Error("failed to fetch SFTP cred for site %d: %v", site.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
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
	if req.SiteType != models.SiteTypeStatic {
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
	configs, err := config.SeedSiteConfigs(site.ID, site.SiteType)
	if err != nil {
		logger.Error("failed to seed configs for site %d: %v", site.ID, err)
		_ = db.DeleteSite(s.cfg.DB, site.ID)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	for _, c := range configs {
		if err := db.UpsertConfig(s.cfg.DB, c); err != nil {
			log.Printf("ERROR upserting config type %d for site %s: %v", c.Type, site.Name, err)
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

	// build a config map to extract varnish settings for the pod config
	cfgMapForPod := make(map[int]string)
	for _, c := range configs {
		cfgMapForPod[c.Type] = c.Config
	}

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
		VarnishEnabled: config.VarnishEnabled(cfgMapForPod[models.ConfigVarnish]),
		VarnishMemory:  config.VarnishMemorySize(cfgMapForPod[models.ConfigVarnish]),
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
	if err := s.podman.RestartPod(context.Background(), podman.PodName(site.Name)); err != nil {
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

	// determine the nginx cache path based on site type
	var cachePath string
	switch site.SiteType {
	case models.SiteTypeWordPress, models.SiteTypePHP:
		cachePath = "/var/cache/nginx/wp"
	case models.SiteTypeNode, models.SiteTypeDotNet:
		cachePath = "/var/cache/nginx/proxy"
	default:
		// static sites have no fastcgi/proxy cache to flush
		cachePath = ""
	}

	// flush nginx fastcgi cache
	if cachePath != "" {
		if err := s.podman.FlushCache(r.Context(), podman.ContainerName(site.Name, "nginx"), cachePath); err != nil {
			logger.Error("failed to flush nginx cache for site %d: %v", site.ID, err)
			apiError(w, http.StatusInternalServerError, err)
			return
		}
	}

	// flush php opcache for php-based site types
	if site.SiteType == models.SiteTypeWordPress || site.SiteType == models.SiteTypePHP {
		if err := s.podman.FlushPHPCache(r.Context(), podman.ContainerName(site.Name, "php")); err != nil {
			logger.Error("failed to flush php opcache for site %d: %v", site.ID, err)
			apiError(w, http.StatusInternalServerError, err)
			return
		}
	}

	// flush varnish cache if enabled for this site
	varnishCfg, _ := db.GetConfigBySiteAndType(s.cfg.DB, site.ID, models.ConfigVarnish)
	if varnishCfg != nil && config.VarnishEnabled(varnishCfg.Config) {
		if err := s.podman.FlushVarnishCache(r.Context(), podman.ContainerName(site.Name, "varnish")); err != nil {
			logger.Error("failed to flush varnish cache for site %d: %v", site.ID, err)
			apiError(w, http.StatusInternalServerError, err)
			return
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

// scaffoldSiteDir writes all config files to disk for a new site.
// siteUID is the numeric SFTP uid — used so PHP-FPM runs as that user.
func scaffoldSiteDir(siteDir string, site *models.Site, configs []*models.Config, dbUser, dbPass, dbRootPass, redisPass string, siteUID int) error {

	// create the required directory structure for the site
	dirs := []string{
		siteDir + "/html",
		siteDir + "/nginx/conf.d",
		siteDir + "/nginx/logs",
		siteDir + "/nginx/cache",
		siteDir + "/nginx/cache/wp",
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

	// nginx/cache must be owned by root so the nginx master (root, no DAC_OVERRIDE) can
	// create the wp subdirectory; nginx/logs stays nginx-owned for log writes
	if err := os.Chown(siteDir+"/nginx/cache", 0, 0); err != nil {
		logger.Warn("could not chown nginx/cache to root: %v", err)
	}
	if err := os.Chmod(siteDir+"/nginx/cache", 0755); err != nil {
		logger.Warn("could not chmod nginx/cache: %v", err)
	}
	// nginx/cache/wp — pre-created so nginx master never needs to mkdir it;
	// workers (uid 101) write cache files here
	if err := os.Chown(siteDir+"/nginx/cache/wp", 101, 101); err != nil {
		logger.Warn("could not chown nginx/cache/wp to nginx uid: %v", err)
	}
	if err := os.Chmod(siteDir+"/nginx/cache/wp", 0750); err != nil {
		logger.Warn("could not chmod nginx/cache/wp: %v", err)
	}
	// nginx/logs — nginx container user (uid 101) writes access/error logs
	if err := os.Chown(siteDir+"/nginx/logs", 101, 101); err != nil {
		logger.Warn("could not chown nginx/logs to nginx uid: %v", err)
	}
	if err := os.Chmod(siteDir+"/nginx/logs", 0750); err != nil {
		logger.Warn("could not chmod nginx/logs: %v", err)
	}

	// build a map of config type to JSON blob for easy lookup
	cfgMap := make(map[int]string)
	for _, c := range configs {
		cfgMap[c.Type] = c.Config
	}

	// determine if varnish is enabled for this site
	vEnabled := config.VarnishEnabled(cfgMap[models.ConfigVarnish])

	// render and write the nginx main config
	nginxMain, err := config.RenderNginxMain(cfgMap[models.ConfigNginx])
	if err != nil {
		logger.Error("failed to create nginx config")
		return err
	}
	if err := os.WriteFile(siteDir+"/nginx/nginx.conf", []byte(nginxMain), 0644); err != nil {
		logger.Error("failed to write the nginx.conf")
		return err
	}

	// render and write the nginx site server block
	nginxSite, err := config.RenderNginxSite(cfgMap[models.ConfigNginx], site.SiteType, vEnabled)
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
		phpFPM, err := config.RenderPHPFPM(cfgMap[models.ConfigPHP])
		if err != nil {
			logger.Error("failed to create php config")
			return err
		}
		if err := os.WriteFile(siteDir+"/php-fpm/www.conf", []byte(phpFPM), 0644); err != nil {
			logger.Error("failed to write php config file")
			return err
		}
		phpIni, err := config.RenderPHPIni(cfgMap[models.ConfigPHP])
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

	// render and write MariaDB and Redis configs for all non-static site types
	if site.SiteType != models.SiteTypeStatic {
		mariaDB, err := config.RenderMariaDB(cfgMap[models.ConfigMariaDB])
		if err != nil {
			logger.Error("failed to create mariadb config")
			return err
		}
		if err := os.WriteFile(siteDir+"/db/my.cnf", []byte(mariaDB), 0640); err != nil {
			logger.Error("failed to write mariadb config file")
			return err
		}
		redisPassFromEnv, _ := readEnvValue(siteDir+"/.env", "REDIS_PASS")
		redisCfg, err := config.RenderRedis(cfgMap[models.ConfigRedis], redisPassFromEnv)
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
	vclContent, err := config.RenderVarnish(cfgMap[models.ConfigVarnish])
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

	// clear nginx fastcgi cache before recreate — stale subdirectory permissions
	// from the previous pod run cause nginx workers to get permission denied on startup
	if err := clearDirContents(siteDir + "/nginx/cache/wp"); err != nil {
		logger.Warn("could not clear nginx cache for site %s: %v", site.Name, err)
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

	// fetch the varnish config to determine if it should be provisioned
	varnishCfg, _ := db.GetConfigBySiteAndType(s.cfg.DB, site.ID, models.ConfigVarnish)
	var varnishCfgJSON string
	if varnishCfg != nil {
		varnishCfgJSON = varnishCfg.Config
	} else {
		// seed default varnish config for sites that predate this feature
		blob, _ := config.MarshalDefaults(models.ConfigVarnish)
		_ = db.UpsertConfig(s.cfg.DB, &models.Config{
			SiteID: site.ID,
			Type:   models.ConfigVarnish,
			Config: blob,
		})
		varnishCfgJSON = blob
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
