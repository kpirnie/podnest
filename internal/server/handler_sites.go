package server

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"

	"podnest/internal/auth"
	"podnest/internal/config"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/modules/types/wordpress"
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

	// reverse proxy sites have no SFTP credentials
	var sftpCred *models.SFTPCred
	if modules.TypeModule(site.SiteType).HasSFTP() {
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
	if modules.TypeModule(req.SiteType).HasDatabase() {
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
	m := modules.TypeModule(site.SiteType)
	configs := m.SeedConfigs()
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
	if err := m.ScaffoldDir(siteDir, modules.ScaffoldConfig{
		Site:       site,
		Configs:    configs,
		SiteUID:    sftpUID,
		DBUser:     dbUser,
		DBPass:     dbPass,
		DBRootPass: dbRootPass,
		RedisPass:  redisPass,
	}); err != nil {
		logger.Error("scaffolding site dir for %s: %v", site.Name, err)
		_ = db.DeleteSite(s.cfg.DB, site.ID)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// provision the Podman pod with all required containers
	podCfg := modules.PodConfig{
		Site:       site,
		SiteUID:    sftpUID,
		SiteDir:    hostSiteDir,
		Configs:    configs,
		DBUser:     dbUser,
		DBPass:     dbPass,
		DBRootPass: dbRootPass,
		RedisPass:  redisPass,
	}
	podCtx, podCancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer podCancel()

	if err := m.Create(podCtx, &modules.PodmanClientAdapter{Client: s.podman}, podCfg); err != nil {
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
	if modules.TypeModule(site.SiteType).HasPod() {

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
	if modules.TypeModule(site.SiteType).HasPHPFPM() {
		if err := s.podman.FlushPHPCache(r.Context(), podman.ContainerName(site.Name, "php")); err != nil {
			logger.Error("failed to flush php opcache for site %d: %v", site.ID, err)
			apiError(w, http.StatusInternalServerError, err)
			return
		}
	}

	// flush redis cache
	if modules.TypeModule(site.SiteType).HasRedis() {
		redisPass, err := readEnvValue(s.sitesBase()+"/"+site.Name+"/.env", "REDIS_PASS")
		if err != nil {
			logger.Warn("apiSiteFlush: could not read REDIS_PASS for site %d: %v", site.ID, err)
		} else {
			if err := s.podman.FlushRedisCache(r.Context(), podman.ContainerName(site.Name, "redis"), redisPass); err != nil {
				logger.Warn("redis flush failed for site %d (pod may be stopped): %v", site.ID, err)
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

	// rebuild the pods with new images from the models
	for _, img := range modules.TypeModule(site.SiteType).Images(site) {
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

	// download wordpress
	if site.SiteType == models.SiteTypeWordPress {
		if err := wordpress.DownloadWordPress(siteDir+"/html", int(site.UID)); err != nil {
			logger.Error("failed to download WordPress for site %s: %v", site.Name, err)
		}
	}

	// build the pod config using the existing credentials and recreate the pod
	allConfigs, _ := db.GetAllConfigsBySite(s.cfg.DB, site.ID)
	rm := modules.TypeModule(site.SiteType)
	if err := rm.Create(podCtx, &modules.PodmanClientAdapter{Client: s.podman}, modules.PodConfig{
		Site:       site,
		SiteUID:    sftp.UIDForSite(site.ID),
		SiteDir:    hostSiteDir,
		Configs:    allConfigs,
		DBUser:     dbUser,
		DBPass:     dbPass,
		DBRootPass: dbRootPass,
		RedisPass:  redisPass,
	}); err != nil {
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
	if m := modules.TypeModule(siteType); m != nil {
		timeout = m.StartupTimeout()
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
	if modules.TypeModule(src.SiteType).HasDatabase() {
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
	cm := modules.TypeModule(clone.SiteType)
	if err := cm.ScaffoldDir(cloneSiteDir, modules.ScaffoldConfig{
		Site:       clone,
		Configs:    srcConfigs,
		SiteUID:    sftpUID,
		DBUser:     dbUser,
		DBPass:     dbPass,
		DBRootPass: dbRootPass,
		RedisPass:  redisPass,
	}); err != nil {
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
		wpConfig := wordpress.GenerateWPConfig(clone.Name, dbUser, dbPass, redisPass)
		if err := os.WriteFile(wpCfgPath, []byte(wpConfig), 0640); err != nil {
			logger.Warn("apiSiteClone: failed to write wp-config.php for clone %s: %v", clone.Name, err)
		}
		if err := os.Chown(wpCfgPath, sftpUID, sftpUID); err != nil {
			logger.Warn("apiSiteClone: could not chown wp-config.php for clone %s: %v", clone.Name, err)
		}
	}

	// provision the clone pod
	podCtx, podCancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer podCancel()

	if err := cm.Create(podCtx, &modules.PodmanClientAdapter{Client: s.podman}, modules.PodConfig{
		Site:       clone,
		SiteUID:    sftpUID,
		SiteDir:    hostCloneSiteDir,
		Configs:    srcConfigs,
		DBUser:     dbUser,
		DBPass:     dbPass,
		DBRootPass: dbRootPass,
		RedisPass:  redisPass,
	}); err != nil {
		logger.Error("apiSiteClone: creating pod for clone %s: %v", clone.Name, err)
		_ = s.podman.StopPod(context.Background(), podman.PodName(clone.Name))
		_ = s.podman.RemoveSitePod(context.Background(), clone.Name)
		_ = db.DeleteSite(s.cfg.DB, clone.ID)
		_ = os.RemoveAll(cloneSiteDir)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// dump and restore the database for all pod-based site types that use MariaDB
	if modules.TypeModule(src.SiteType).HasDatabase() {
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
