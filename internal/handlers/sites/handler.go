// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package sites

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"podnest/internal/apiutil"
	"podnest/internal/audit"
	"podnest/internal/auth"
	"podnest/internal/backup"
	"podnest/internal/config"
	"podnest/internal/db"
	"podnest/internal/fileutil"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/modules/types/wordpress"
	"podnest/internal/podman"
	"podnest/internal/sftp"
)

// SitesPodman is the subset of podman.Client consumed by this handler.
type SitesPodman interface {
	StartPod(ctx context.Context, name string) error
	StopPod(ctx context.Context, name string) error
	RemoveSitePod(ctx context.Context, siteName string) error
	InspectPod(ctx context.Context, name string) (*podman.PodInspect, error)
	PullImage(ctx context.Context, image string) error
	SiteStatus(ctx context.Context, siteName string) (*podman.PodInspect, error)
	FlushPHPCache(ctx context.Context, containerName string) error
	FlushRedisCache(ctx context.Context, containerName, password string) error
	PruneImages(ctx context.Context) (int, error)
}

// SitesProxy is the subset of proxy.Proxy consumed by this handler.
type SitesProxy interface {
	AddDomain(domain string, port int, siteID int64, siteName string)
	ObtainCert(domain string)
	RemoveDomains(domains []string)
	RemoveSiteProxy(port int)
	WarmCaches(justTrustedProxies bool) error
}

// SFTPManager is the subset of sftp.Manager consumed by this handler.
type SFTPManager interface {
	AddUser(ctx context.Context, siteName, password string, uid int) error
	RemoveUser(ctx context.Context, siteName string) error
}

// Handler handles site CRUD, lifecycle, and clone API routes.
type Handler struct {
	DB           *sql.DB
	AppPath      string
	HostAppPath  string
	PodmanSock   string
	Podman       SitesPodman
	Proxy        SitesProxy
	SFTP         SFTPManager
	PodmanClient *podman.Client
	Backup       *backup.Manager
}

// RegisterRoutes mounts all site routes onto api.
func (h *Handler) RegisterRoutes(api *http.ServeMux) {
	api.HandleFunc("GET /sites", h.apiListSites)
	api.HandleFunc("POST /sites", h.apiCreateSite)
	api.HandleFunc("GET /sites/{id}", h.apiGetSite)
	api.HandleFunc("PUT /sites/{id}", h.apiUpdateSite)
	api.HandleFunc("DELETE /sites/{id}", h.apiDeleteSite)
	api.HandleFunc("POST /sites/{id}/start", h.apiSiteStart)
	api.HandleFunc("POST /sites/{id}/stop", h.apiSiteStop)
	api.HandleFunc("POST /sites/{id}/restart", h.apiSiteRestart)
	api.HandleFunc("POST /sites/{id}/flush", h.apiSiteFlush)
	api.HandleFunc("GET /sites/{id}/status", h.apiSiteStatus)
	api.HandleFunc("POST /sites/{id}/recreate", h.apiSiteRecreate)
	api.HandleFunc("POST /sites/prune-images", h.apiPruneImages)
	api.HandleFunc("POST /sites/{id}/clone", h.apiSiteClone)
}

// sitesBase returns the base path for site directories on the host.
func (h *Handler) sitesBase() string { return h.AppPath + "/sites" }

// hostSitesBase returns the base path for site directories on the host
// which may differ from sitesBase if the app is running in a container.
func (h *Handler) hostSitesBase() string {
	if h.HostAppPath != "" {
		return h.HostAppPath + "/sites"
	}
	return h.sitesBase()
}

// ResolveSite is exported so routes.go can pass it as a modules.SiteResolver.
func (h *Handler) ResolveSite(w http.ResponseWriter, r *http.Request) (*models.Site, bool) {

	// retrieve the authenticated user from the request context
	user := auth.UserFromContext(r.Context())

	// parse the site ID from the request path and validate it
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		logger.Error("invalid site id in path: %s", idStr)
		apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid site id")
		return nil, false
	}

	// retrieve the site from the database
	site, err := db.GetSiteByID(h.DB, id)
	if err != nil {
		logger.Error("failed to retrieve site %d: %v", id, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return nil, false
	}
	if site == nil {
		logger.Error("site %d not found", id)
		apiutil.ErrorMsg(w, http.StatusNotFound, "site not found")
		return nil, false
	}

	// enforce ownership: only admins or the site owner can access this site
	if user.Role != models.RoleAdmin && site.UID != user.ID {
		logger.Error("user %d does not own site %d", user.ID, site.ID)
		apiutil.ErrorMsg(w, http.StatusForbidden, "forbidden")
		return nil, false
	}

	// log the resolved site for debugging purposes and return it
	logger.Debug("resolved site %d: %s", site.ID, site.Name)
	return site, true
}

// apiListSites returns a list of sites accessible to the authenticated user.
func (h *Handler) apiListSites(w http.ResponseWriter, r *http.Request) {

	// retrieve the authenticated user from the request context
	user := auth.UserFromContext(r.Context())

	// declare variables for the list of sites and any potential error
	var (
		sites []*models.Site
		err   error
	)

	// fetch sites based on the user's role: admins get all sites, others get only their own
	if user.Role == models.RoleAdmin {
		sites, err = db.GetAllSites(h.DB)
	} else {
		sites, err = db.GetSitesByUser(h.DB, user.ID)
	}
	if err != nil {
		logger.Error("failed to retrieve sites for user %d: %v", user.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// ensure that the sites slice is not nil to avoid JSON marshalling issues
	if sites == nil {
		sites = []*models.Site{}
	}

	// fetch all domains grouped by site ID to include in the response
	domainMap, err := db.GetAllDomainsGrouped(h.DB)
	if err != nil {
		logger.Error("failed to retrieve domains for site list: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// define a struct to combine site data with its associated domains for the API response
	type siteWithDomains struct {
		*models.Site
		Domains []string `json:"Domains"`
	}

	// construct the response by combining each site with its corresponding domains
	out := make([]siteWithDomains, 0, len(sites))
	for _, s := range sites {
		domains := domainMap[s.ID]
		if domains == nil {
			domains = []string{}
		}
		out = append(out, siteWithDomains{Site: s, Domains: domains})
	}

	// log the number of sites retrieved for the user and return the JSON response
	logger.Debug("retrieved %d sites for user %d", len(sites), user.ID)
	apiutil.JSON(w, http.StatusOK, out)
}

// apiGetSite returns detailed information about a specific site, including its domains and SFTP credentials if applicable.
func (h *Handler) apiGetSite(w http.ResponseWriter, r *http.Request) {

	// resolve the site from the request path and ensure the user has access to it
	site, ok := h.ResolveSite(w, r)
	if !ok {
		return
	}

	// fetch all domains associated with the site from the database
	domains, err := db.GetDomainsBySite(h.DB, site.ID)
	if err != nil {
		logger.Error("failed to fetch domains for site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// if the site type supports SFTP, fetch the SFTP credentials for the site
	var sftpCred *models.SFTPCred
	if modules.TypeModule(site.SiteType).HasSFTP() {
		sftpCred, err = db.GetSFTPCredBySite(h.DB, site.ID)
		if err != nil {
			logger.Error("failed to fetch SFTP cred for site %d: %v", site.ID, err)
			apiutil.Error(w, http.StatusInternalServerError, err)
			return
		}
	}

	// log the number of domains retrieved for the site and return the JSON response with site details, domains, and SFTP credentials
	logger.Debug("retrieved site %d with %d domains", site.ID, len(domains))
	apiutil.JSON(w, http.StatusOK, map[string]any{
		"site":    site,
		"domains": domains,
		"sftp":    sftpCred,
	})
}

// apiCreateSite handles the creation of a new site, including database record creation, directory scaffolding, pod provisioning, and domain configuration.
func (h *Handler) apiCreateSite(w http.ResponseWriter, r *http.Request) {

	// retrieve the authenticated user from the request context
	user := auth.UserFromContext(r.Context())

	// define a struct to capture the expected JSON payload for site creation
	var req struct {
		Name             string   `json:"name"`
		PHPVersion       int      `json:"php_version"`
		SiteType         int      `json:"site_type"`
		RuntimeVersion   *int     `json:"runtime_version"`
		StartCommand     string   `json:"start_command"`
		Domains          []string `json:"domains"`
		InstallWordPress bool     `json:"install_wordpress"`
	}

	// decode the JSON request body into the req struct and handle any decoding errors
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("failed to decode request body for site creation: %v", err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	// find the next available port for the new site and handle any errors in port allocation
	port, err := db.NextAvailablePort(h.DB)
	if err != nil {
		logger.Error("failed to find available port for site '%s': %v", req.Name, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// if the site type supports a database, assign a PMA port offset by 10000 from the main site port
	pmaPort := 0
	if modules.TypeModule(req.SiteType).HasDatabase() {
		pmaPort = port + 10000
	}

	// validate required fields for site creation and return a bad request error if missing
	if req.Name == "" || port == 0 {
		logger.Error("missing required fields for site creation: name=%s port=%d", req.Name, port)
		apiutil.ErrorMsg(w, http.StatusBadRequest, "name and port are required")
		return
	}
	name, err := NormalizeSiteName(req.Name)
	if err != nil {
		logger.Error("invalid site name for creation: %v", err)
		apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid site name")
		return
	}
	req.Name = name
	if req.PHPVersion == 0 {
		req.PHPVersion = 3
	}

	// check if a site with the same name already exists in the database to enforce uniqueness
	existing, err := db.GetSiteByName(h.DB, req.Name)
	if err != nil {
		logger.Error("failed to check site name uniqueness for '%s': %v", req.Name, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if existing != nil {
		logger.Error("site name '%s' already exists", req.Name)
		apiutil.ErrorMsg(w, http.StatusConflict, "site name already exists")
		return
	}

	//
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
	if site.SiteType == models.SiteTypeWordPress && !req.InstallWordPress {
		site.SiteType = models.SiteTypePHP
	}

	// create the site record in the database and handle any errors during creation
	if err := db.CreateSite(h.DB, site); err != nil {
		logger.Error("failed to create site record for '%s': %v", req.Name, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// if the site type is a reverse proxy, handle domain creation and certificate obtaining
	if site.SiteType == models.SiteTypeReverseProxy {

		// create domains in the database and add them to the proxy configuration
		for _, d := range req.Domains {
			d = strings.TrimSpace(d)
			if d == "" {
				continue
			}

			// create the domain record in the database and log any errors encountered, try to get a cert also
			if err := db.CreateDomain(h.DB, &models.Domain{SiteID: site.ID, Domain: d}); err != nil {
				logger.Error("saving domain %s for reverse proxy site %s: %v", d, site.Name, err)
			}
			h.Proxy.AddDomain(d, site.Port, site.ID, site.Name)
			h.Proxy.ObtainCert(d)
		}

		// update the site status to running since reverse proxy sites do not require pod creation
		_ = db.UpdateSiteStatus(h.DB, site.ID, models.StatusRunning)
		site.SiteStatus = models.StatusRunning

		// log the successful creation of the reverse proxy site and return the site details in the response
		logger.Debug("reverse proxy site '%s' created", site.Name)
		apiutil.JSON(w, http.StatusCreated, site)
		return
	}

	// generate a random password for the SFTP user associated with the site and handle any errors
	sftpPass, err := auth.GeneratePassword()
	if err != nil {
		logger.Error("failed to generate SFTP password for site %d: %v", site.ID, err)
		_ = db.DeleteSite(h.DB, site.ID)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	sftpCred := &models.SFTPCred{
		SiteID:   site.ID,
		Username: site.Name,
		Password: sftpPass,
		UID:      sftp.UIDForSite(site.ID),
	}

	// create the SFTP credentials in the database and handle any errors, rolling back site creation if necessary
	if err := db.CreateSFTPCred(h.DB, sftpCred); err != nil {
		logger.Error("failed to create SFTP cred for site %d: %v", site.ID, err)
		_ = db.DeleteSite(h.DB, site.ID)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if err := h.SFTP.AddUser(r.Context(), site.Name, sftpPass, sftp.UIDForSite(site.ID)); err != nil {
		logger.Error("failed to add SFTP user for site %d: %v", site.ID, err)
		_ = db.DeleteSFTPCred(h.DB, site.ID)
		_ = db.DeleteSite(h.DB, site.ID)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// seed default configuration values for the site based on its type and handle any errors during configuration
	m := modules.TypeModule(site.SiteType)
	configs := m.SeedConfigs()
	for t, kv := range configs {
		if err := db.SetConfigs(h.DB, site.ID, t, kv); err != nil {
			logger.Error("failed to set config type %d for site %s: %v", t, site.Name, err)
			_ = db.DeleteSite(h.DB, site.ID)
			apiutil.Error(w, http.StatusInternalServerError, err)
			return
		}
	}

	// create domain records in the database and add them to the proxy configuration, logging any errors encountered
	for _, d := range req.Domains {
		d = strings.TrimSpace(d)
		if d == "" {
			continue
		}
		if err := db.CreateDomain(h.DB, &models.Domain{SiteID: site.ID, Domain: d}); err != nil {
			logger.Error("saving domain %s for site %s: %v", d, site.Name, err)
		}
		h.Proxy.AddDomain(d, port, site.ID, site.Name)
	}

	// obtain SSL certificates for the specified domains using the proxy's certificate management functionality
	for _, d := range req.Domains {
		d = strings.TrimSpace(d)
		if d == "" {
			continue
		}
		h.Proxy.ObtainCert(d)
	}

	// generate random passwords for the database user, password, and database root user
	dbUser, err := auth.GeneratePassword()
	if err != nil {
		_ = db.DeleteSite(h.DB, site.ID)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	dbPass, err := auth.GeneratePassword()
	if err != nil {
		_ = db.DeleteSite(h.DB, site.ID)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	dbRootPass, err := auth.GeneratePassword()
	if err != nil {
		_ = db.DeleteSite(h.DB, site.ID)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// generate a random password for the Redis user associated with the site and handle any errors during generation
	redisPass, err := auth.GeneratePassword()
	if err != nil {
		_ = db.DeleteSite(h.DB, site.ID)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// define the site directory paths for scaffolding and pod creation, and retrieve the SFTP UID for the site
	siteDir := h.sitesBase() + "/" + site.Name
	hostSiteDir := h.hostSitesBase() + "/" + site.Name
	sftpUID := sftp.UIDForSite(site.ID)

	// scaffold the site directory structure and configuration files based on the site type and handle any errors during scaffolding
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
		_ = db.DeleteSite(h.DB, site.ID)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// create a context with a timeout for pod creation to ensure it does not hang indefinitely
	podCtx, podCancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer podCancel()

	// create the pod for the site using the Podman client adapter and handle any errors during pod creation
	if err := m.Create(podCtx, &modules.PodmanClientAdapter{Client: h.PodmanClient}, modules.PodConfig{
		Site:       site,
		SiteUID:    sftpUID,
		SiteDir:    hostSiteDir,
		Configs:    configs,
		DBUser:     dbUser,
		DBPass:     dbPass,
		DBRootPass: dbRootPass,
		RedisPass:  redisPass,
	}); err != nil {

		// if pod creation fails, log the error, stop and remove the pod, delete the site record from the database, remove the site directory, and return an internal server error response
		logger.Error("creating pod for site %s: %v", site.Name, err)
		_ = h.Podman.StopPod(context.Background(), podman.PodName(site.Name))
		_ = h.Podman.RemoveSitePod(context.Background(), site.Name)
		_ = db.DeleteSite(h.DB, site.ID)
		_ = os.RemoveAll(siteDir)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// invoke any registered feature hooks for site creation, logging warnings for any errors encountered during feature execution
	for _, f := range modules.FeaturesFor(site.SiteType) {
		if err := f.OnSiteCreate(r.Context(), site); err != nil {
			logger.Warn("OnSiteCreate feature %s for site %s: %v", f.FeatureID(), site.Name, err)
		}
	}

	// log the successful creation of the site and its associated pod, update the site status to running in the database, and return the site details in the response
	logger.Debug("site '%s' created and pod provisioned successfully", site.Name)
	_ = db.UpdateSiteStatus(h.DB, site.ID, models.StatusRunning)
	site.SiteStatus = models.StatusRunning
	apiutil.JSON(w, http.StatusCreated, site)
}

// apiUpdateSite handles updates to an existing site's properties, including name, PHP version, site type, runtime version, and start command.
func (h *Handler) apiUpdateSite(w http.ResponseWriter, r *http.Request) {

	// resolve the site from the request path and ensure the user has access to it
	site, ok := h.ResolveSite(w, r)
	if !ok {
		return
	}

	// define a struct to capture the expected JSON payload for site updates
	var req struct {
		Name           string `json:"name"`
		PHPVersion     int    `json:"php_version"`
		SiteType       int    `json:"site_type"`
		RuntimeVersion *int   `json:"runtime_version"`
		StartCommand   string `json:"start_command"`
	}

	// decode the JSON request body into the req struct and handle any decoding errors
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("failed to decode request body for site update on site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	// update the site's properties based on the request payload, only modifying fields that are provided
	if req.Name != "" {
		name, err := NormalizeSiteName(req.Name)
		if err != nil {
			logger.Error("invalid site name for update on site %d: %v", site.ID, err)
			apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid site name")
			return
		}

		// a rename must not collide with another site's directory, pod, or logs
		if name != site.Name {
			existing, err := db.GetSiteByName(h.DB, name)
			if err != nil {
				logger.Error("failed to check site name uniqueness for '%s': %v", name, err)
				apiutil.Error(w, http.StatusInternalServerError, err)
				return
			}
			if existing != nil {
				logger.Error("site name '%s' already exists", name)
				apiutil.ErrorMsg(w, http.StatusConflict, "site name already exists")
				return
			}
		}
		site.Name = name
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

	// capture prior state before mutating
	prior := db.SnapshotSite(h.DB, site.ID)

	// update the site record in the database and handle any errors during the update
	if err := db.UpdateSite(h.DB, site); err != nil {
		logger.Error("failed to update site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// attach state snapshots for the audit middleware
	*r = *r.WithContext(audit.WithStateContext(r.Context(), prior, db.SnapshotSite(h.DB, site.ID)))

	// log the successful update of the site and return the updated site details in the response
	logger.Debug("updated site %d: %s", site.ID, site.Name)
	apiutil.JSON(w, http.StatusOK, site)
}

// apiDeleteSite handles the deletion of a site, including stopping and removing its pod, creating a final backup if configured, removing associated resources, and cleaning up the site directory.
func (h *Handler) apiDeleteSite(w http.ResponseWriter, r *http.Request) {

	// resolve the site from the request path and ensure the user has access to it
	site, ok := h.ResolveSite(w, r)
	if !ok {
		return
	}

	// log the deletion action and prepare the context and site directory path for cleanup operations
	log.Printf("Deleting site %s — stopping and removing pod", site.Name)
	bgCtx := context.Background()
	siteDir := h.sitesBase() + "/" + site.Name

	// create the final backup while the pod is still running
	var archiveBytes []byte
	var backupDest string
	if h.Backup != nil {
		var berr error
		backupDest, archiveBytes, berr = h.Backup.CreateFinalBackup(bgCtx, site)
		if berr != nil {
			logger.Warn("apiDeleteSite: final backup failed for site %s (deletion continues): %v", site.Name, berr)
		}
	}

	// stop the pod after the backup is complete
	if modules.TypeModule(site.SiteType).HasPod() {
		if err := h.Podman.StopPod(bgCtx, podman.PodName(site.Name)); err != nil {
			logger.Warn("stop pod %s: %v", site.Name, err)
		}
	}

	// remove the pod and associated resources
	if modules.TypeModule(site.SiteType).HasPod() {
		if err := h.Podman.RemoveSitePod(bgCtx, site.Name); err != nil {
			logger.Warn("remove pod %s: %v", site.Name, err)
		}
		if err := h.SFTP.RemoveUser(bgCtx, site.Name); err != nil {
			logger.Warn("failed to remove SFTP user for site %s: %v", site.Name, err)
		}
	}

	// fetch all domains associated with the site for cache eviction and log any errors encountered during retrieval
	siteDomains, err := db.GetDomainsBySite(h.DB, site.ID)
	if err != nil {
		logger.Warn("could not fetch domains for cache eviction on site %d: %v", site.ID, err)
	}

	// invoke any registered feature hooks for site deletion, logging warnings for any errors encountered during feature execution
	for _, f := range modules.FeaturesFor(site.SiteType) {
		if err := f.OnSiteDelete(bgCtx, site); err != nil {
			logger.Warn("OnSiteDelete feature %s for site %s: %v", f.FeatureID(), site.Name, err)
		}
	}

	// capture full site state before deletion for the audit trail
	*r = *r.WithContext(audit.WithStateContext(r.Context(), db.SnapshotSite(h.DB, site.ID), ""))

	// delete the site record from the database and handle any errors during deletion
	if err := db.DeleteSite(h.DB, site.ID); err != nil {
		logger.Error("failed to delete site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// remove the site's domains from the proxy configuration and log any warnings for errors encountered during domain removal
	if len(siteDomains) > 0 {
		domainStrs := make([]string, 0, len(siteDomains))
		for _, d := range siteDomains {
			domainStrs = append(domainStrs, d.Domain)
		}
		h.Proxy.RemoveDomains(domainStrs)
	}

	// remove the site's proxy configuration from the proxy and log any warnings for errors encountered during removal
	h.Proxy.RemoveSiteProxy(site.Port)

	// remove the site directory from the filesystem and log any warnings for errors encountered during removal
	if err := os.RemoveAll(siteDir); err != nil {
		logger.Warn("failed to remove site directory %s: %v", siteDir, err)
	}

	log.Printf("Site %s deleted successfully", site.Name)

	// if S3 is not configured, stream the archive as a one-time browser download
	if archiveBytes != nil {
		filename := strings.TrimPrefix(backupDest, "browser:")
		w.Header().Set("Content-Type", "application/gzip")
		w.Header().Set("Content-Disposition", "attachment; filename=\""+filename+"\"")
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Accel-Buffering", "no")
		w.WriteHeader(http.StatusOK)
		if _, err := w.Write(archiveBytes); err != nil {
			logger.Warn("apiDeleteSite: write final backup to browser for site %s: %v", site.Name, err)
		}
		return
	}

	// write a 204 No Content response to indicate successful deletion without returning any content
	w.WriteHeader(http.StatusNoContent)
}

// requirePod rejects pod actions for site types that do not provision a pod (reverse proxies).
func requirePod(w http.ResponseWriter, site *models.Site) bool {
	if !modules.TypeModule(site.SiteType).HasPod() {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "site type has no pod")
		return false
	}
	return true
}

// apiSiteStart handles the starting of a site's pod, ensuring it reaches a running state and warming proxy caches for optimal performance.
func (h *Handler) apiSiteStart(w http.ResponseWriter, r *http.Request) {

	// resolve the site from the request path and ensure the user has access to it
	site, ok := h.ResolveSite(w, r)
	if !ok {
		return
	}

	if !requirePod(w, site) {
		return
	}

	// update the site status to restarting in the database to reflect the start operation
	if err := h.Podman.StartPod(r.Context(), podman.PodName(site.Name)); err != nil {
		logger.Error("failed to start pod for site %d: %v", site.ID, err)
		_ = db.UpdateSiteStatus(h.DB, site.ID, models.StatusError)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// update the site status to restarting in the database to reflect the start operation
	if !h.confirmPodRunning(r.Context(), podman.PodName(site.Name), site.SiteType) {
		logger.Error("pod for site %d did not reach running state after start", site.ID)
		_ = db.UpdateSiteStatus(h.DB, site.ID, models.StatusError)
		apiutil.ErrorMsg(w, http.StatusInternalServerError, "pod failed to reach running state")
		return
	}

	// rewarm connections so this pod's port is pre-dialed for the first visitor
	go h.Proxy.WarmCaches(false)

	// run mariadb-upgrade if the DB version has changed
	go h.maybeUpgradeMariaDB(context.Background(), site)

	// update the site status to running in the database and return a JSON response indicating the running status
	_ = db.UpdateSiteStatus(h.DB, site.ID, models.StatusRunning)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "running"})
}

func (h *Handler) apiSiteStop(w http.ResponseWriter, r *http.Request) {
	site, ok := h.ResolveSite(w, r)
	if !ok {
		return
	}
	if !requirePod(w, site) {
		return
	}
	if err := h.Podman.StopPod(r.Context(), podman.PodName(site.Name)); err != nil {
		logger.Error("failed to stop pod for site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	_ = db.UpdateSiteStatus(h.DB, site.ID, models.StatusStopped)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "stopped"})
}

// apiSiteRestart handles the restarting of a site's pod, ensuring it is stopped and started cleanly, and warming proxy caches for optimal performance.
func (h *Handler) apiSiteRestart(w http.ResponseWriter, r *http.Request) {

	// resolve the site from the request path and ensure the user has access to it
	site, ok := h.ResolveSite(w, r)
	if !ok {
		return
	}

	if !requirePod(w, site) {
		return
	}

	// update the site status to restarting in the database to reflect the restart operation
	_ = db.UpdateSiteStatus(h.DB, site.ID, models.StatusRestarting)

	// stop the pod before restarting, logging a warning if stopping fails but continuing with the restart process
	if err := h.Podman.StopPod(context.Background(), podman.PodName(site.Name)); err != nil {
		logger.Warn("could not stop pod before restart for site %d: %v", site.ID, err)
	}

	// start the pod after stopping, logging an error and returning an internal server error response if starting fails
	if err := h.Podman.StartPod(context.Background(), podman.PodName(site.Name)); err != nil {
		logger.Error("failed to restart pod for site %d: %v", site.ID, err)
		_ = db.UpdateSiteStatus(h.DB, site.ID, models.StatusError)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// rewarm connections so this pod's port is pre-dialed for the first visitor
	go h.Proxy.WarmCaches(false)

	// update the site status to running in the database and return a JSON response indicating the running status
	_ = db.UpdateSiteStatus(h.DB, site.ID, models.StatusRunning)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "running"})
}

// apiSiteFlush handles the flushing of caches for a specific site, including PHP opcache and Redis cache if applicable.
func (h *Handler) apiSiteFlush(w http.ResponseWriter, r *http.Request) {

	// resolve the site from the request path and ensure the user has access to it
	site, ok := h.ResolveSite(w, r)
	if !ok {
		return
	}

	// flush PHP opcache if the site type supports PHP-FPM, logging an error and returning an internal server error response if flushing fails
	if modules.TypeModule(site.SiteType).HasPHPFPM() {
		if err := h.Podman.FlushPHPCache(r.Context(), podman.ContainerName(site.Name, "php")); err != nil {
			logger.Error("failed to flush php opcache for site %d: %v", site.ID, err)
			apiutil.Error(w, http.StatusInternalServerError, err)
			return
		}
	}

	// flush Redis cache if the site type supports Redis, reading the REDIS_PASS from the site's .env file and logging warnings for any errors encountered during flushing
	if modules.TypeModule(site.SiteType).HasRedis() {
		redisPass, err := fileutil.ReadEnvValue(h.sitesBase()+"/"+site.Name+"/.env", "REDIS_PASS")
		if err != nil {
			logger.Warn("apiSiteFlush: could not read REDIS_PASS for site %d: %v", site.ID, err)
		} else {
			if err := h.Podman.FlushRedisCache(r.Context(), podman.ContainerName(site.Name, "redis"), redisPass); err != nil {
				logger.Warn("redis flush failed for site %d (pod may be stopped): %v", site.ID, err)
			}
		}
	}

	// log the successful flushing of caches for the site and return a JSON response indicating the flushed status
	logger.Debug("flushed all caches for site %d", site.ID)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "flushed"})
}

// apiSiteStatus retrieves the current status of a site's pod, including its running state and any relevant inspection details.
func (h *Handler) apiSiteStatus(w http.ResponseWriter, r *http.Request) {

	// resolve the site from the request path and ensure the user has access to it
	site, ok := h.ResolveSite(w, r)
	if !ok {
		return
	}

	// inspect the pod for the site using the Podman client and handle any errors during inspection
	inspect, err := h.Podman.SiteStatus(r.Context(), site.Name)
	if err != nil {
		logger.Error("failed to inspect pod for site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// log the successful retrieval of the pod status for the site and return the inspection details in the JSON response
	logger.Debug("retrieved pod status for site %d", site.ID)
	apiutil.JSON(w, http.StatusOK, inspect)
}

// apiSiteRecreate handles the recreation of a site's pod, including pulling fresh images, scaffolding directories, and re-provisioning the pod with updated configurations.
func (h *Handler) apiSiteRecreate(w http.ResponseWriter, r *http.Request) {

	// resolve the site from the request path and ensure the user has access to it
	site, ok := h.ResolveSite(w, r)
	if !ok {
		return
	}

	if !requirePod(w, site) {
		return
	}

	// define a struct to capture the expected JSON payload for site recreation, including options for WordPress installation and image pruning
	var recreateReq struct {
		InstallWordPress *bool `json:"install_wordpress"`
		Prune            bool  `json:"prune"`
	}
	json.NewDecoder(r.Body).Decode(&recreateReq) //nolint — body is optional

	// define the site directory paths for scaffolding and pod recreation, and create a background context for operations
	siteDir := h.sitesBase() + "/" + site.Name
	hostSiteDir := h.hostSitesBase() + "/" + site.Name
	bgCtx := context.Background()

	// pull fresh images — skips if already up to date
	for _, img := range modules.TypeModule(site.SiteType).Images(site) {
		if err := h.Podman.PullImage(bgCtx, img); err != nil {
			logger.Warn("recreate: failed to pull image %s for site %d: %v", img, site.ID, err)
		}
	}

	// if the site type is WordPress and the request specifies not to install WordPress, clear the html directory and update the site type to PHP
	if site.SiteType == models.SiteTypeWordPress && recreateReq.InstallWordPress != nil && !*recreateReq.InstallWordPress {
		if err := clearDirContents(siteDir + "/html"); err != nil {
			logger.Warn("failed to clear html/ for site %s: %v", site.Name, err)
		}
		site.SiteType = models.SiteTypePHP
		if err := db.UpdateSite(h.DB, site); err != nil {
			logger.Warn("failed to update site type for %s: %v", site.Name, err)
		}
	}

	// create a context with a timeout for pod recreation to ensure it does not hang indefinitely
	podCtx, podCancel := context.WithTimeout(bgCtx, 10*time.Minute)
	defer podCancel()

	// read database and Redis credentials from the site's .env file for use in pod recreation
	dbUser, _ := fileutil.ReadEnvValue(siteDir+"/.env", "DB_USER")
	dbPass, _ := fileutil.ReadEnvValue(siteDir+"/.env", "DB_PASS")
	dbRootPass, _ := fileutil.ReadEnvValue(siteDir+"/.env", "DB_ROOT_PASS")
	redisPass, _ := fileutil.ReadEnvValue(siteDir+"/.env", "REDIS_PASS")

	// fetch the Varnish configuration for the site from the database, and if not present, seed default values and write the VCL file
	varnishKV, _ := db.GetConfigsBySiteAndType(h.DB, site.ID, models.ConfigVarnish)
	var varnishCfgJSON string
	if len(varnishKV) > 0 {
		vb, _ := json.Marshal(varnishKV)
		varnishCfgJSON = string(vb)
	} else {
		defaults, _ := config.DefaultsForType(models.ConfigVarnish)
		_ = db.SetConfigs(h.DB, site.ID, models.ConfigVarnish, defaults)
		vb, _ := json.Marshal(defaults)
		varnishCfgJSON = string(vb)
		logger.Debug("seeded default varnish config for pre-existing site %d", site.ID)
	}

	// create the varnish directory and write the default VCL file based on the configuration, logging warnings for any errors encountered
	varnishDir := siteDir + "/varnish"
	if err := os.MkdirAll(varnishDir, 0755); err != nil {
		logger.Warn("could not create varnish dir for site %s: %v", site.Name, err)
	}

	// render the VCL content from the configuration and write it to the default.vcl file, logging warnings for any errors encountered
	if vclContent, err := config.RenderVarnish(varnishCfgJSON); err == nil {
		if err := os.WriteFile(varnishDir+"/default.vcl", []byte(vclContent), 0644); err != nil {
			logger.Warn("could not write varnish VCL for site %s: %v", site.Name, err)
		}
	}

	// if the site type is WordPress, download the latest WordPress files into the html directory, logging errors if the download fails
	if site.SiteType == models.SiteTypeWordPress {
		if err := wordpress.DownloadWordPress(siteDir+"/html", int(site.UID)); err != nil {
			logger.Error("failed to download WordPress for site %s: %v", site.Name, err)
		}
	}

	// fetch all configuration key-value pairs for the site from the database to be used in pod recreation
	allConfigs, _ := db.GetAllConfigsBySite(h.DB, site.ID)
	rm := modules.TypeModule(site.SiteType)
	if err := rm.Create(podCtx, &modules.PodmanClientAdapter{Client: h.PodmanClient}, modules.PodConfig{
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
		_ = h.Podman.StopPod(bgCtx, podman.PodName(site.Name))
		_ = h.Podman.RemoveSitePod(bgCtx, site.Name)
		_ = db.UpdateSiteStatus(h.DB, site.ID, models.StatusError)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// confirm the pod is running after recreation, logging an error and returning an internal server error response if the pod does not reach a running state
	if !h.confirmPodRunning(bgCtx, podman.PodName(site.Name), site.SiteType) {
		logger.Error("pod for site %d did not reach running state after recreate", site.ID)
		_ = db.UpdateSiteStatus(h.DB, site.ID, models.StatusError)
		apiutil.ErrorMsg(w, http.StatusInternalServerError, "pod failed to reach running state")
		return
	}

	// run mariadb-upgrade if the DB version has changed
	go h.maybeUpgradeMariaDB(context.Background(), site)

	// prune dangling images left behind by the refreshed pod — runs only when the
	// caller opted in (bulk recreate) and only here, after the pod is confirmed
	// running, so cleanup can never race ahead of the rebuild even if the client
	// connection has already dropped
	if recreateReq.Prune {
		if _, err := h.Podman.PruneImages(bgCtx); err != nil {
			logger.Warn("recreate: image prune failed for site %s: %v", site.Name, err)
		}
	}

	// update the site status to running in the database and return a JSON response indicating the running status
	_ = db.UpdateSiteStatus(h.DB, site.ID, models.StatusRunning)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "running"})
}

// apiPruneImages removes dangling images from the host store — the cleanup
// step run after a bulk recreate so superseded image layers don't accumulate.
func (h *Handler) apiPruneImages(w http.ResponseWriter, r *http.Request) {

	// run the prune against a bounded background context so a client
	// disconnect mid-request can't cancel the cleanup partway through
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	// prune dangling images and surface any failure to the caller, otherwise return the count of reclaimed images
	count, err := h.Podman.PruneImages(ctx)
	if err != nil {
		logger.Error("failed to prune dangling images: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// log and return the number of images reclaimed
	logger.Debug("pruned %d dangling image(s) via api", count)
	apiutil.JSON(w, http.StatusOK, map[string]int{"pruned": count})
}

// apiSiteClone handles the cloning of an existing site, creating a new site record with a unique name and port, copying configurations, and setting up SFTP credentials for the clone.
func (h *Handler) apiSiteClone(w http.ResponseWriter, r *http.Request) {

	// resolve the source site from the request path and ensure the user has access to it
	src, ok := h.ResolveSite(w, r)
	if !ok {
		return
	}

	// disallow cloning of reverse proxy sites, returning a bad request response if the source site is of that type
	if src.SiteType == models.SiteTypeReverseProxy {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "reverse proxy sites cannot be cloned")
		return
	}

	// define a struct to capture the expected JSON payload for the clone request, specifically the desired name for the cloned site
	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	// normalize and validate the requested clone name before it reaches any filesystem path, podman object name, or shell command string
	name, err := NormalizeSiteName(req.Name)
	if err != nil {
		logger.Error("apiSiteClone: invalid clone name: %v", err)
		apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid clone name")
		return
	}
	req.Name = name

	// check if a site with the requested clone name already exists in the database, returning a conflict response if it does
	existing, err := db.GetSiteByName(h.DB, req.Name)
	if err != nil {
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if existing != nil {
		apiutil.ErrorMsg(w, http.StatusConflict, "site name already exists")
		return
	}

	// obtain the next available port for the cloned site from the database, returning an internal server error response if no available port is found
	port, err := db.NextAvailablePort(h.DB)
	if err != nil {
		logger.Error("apiSiteClone: no available port for clone of site %d: %v", src.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// determine the PMA port for the cloned site based on whether the source site type has a database, adding 10000 to the assigned port if it does
	pmaPort := 0
	if modules.TypeModule(src.SiteType).HasDatabase() {
		pmaPort = port + 10000
	}

	// retrieve the authenticated user from the request context to associate the cloned site with the correct user ID
	user := auth.UserFromContext(r.Context())
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

	// create the new site record in the database for the clone, returning an internal server error response if the creation fails
	if err := db.CreateSite(h.DB, clone); err != nil {
		logger.Error("apiSiteClone: failed to create clone record '%s': %v", req.Name, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// generate a random password for the SFTP user associated with the cloned site and handle any errors during password generation
	sftpPass, err := auth.GeneratePassword()
	if err != nil {
		_ = db.DeleteSite(h.DB, clone.ID)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	sftpUID := sftp.UIDForSite(clone.ID)
	if err := db.CreateSFTPCred(h.DB, &models.SFTPCred{
		SiteID:   clone.ID,
		Username: clone.Name,
		Password: sftpPass,
		UID:      sftpUID,
	}); err != nil {
		logger.Error("apiSiteClone: failed to create SFTP cred for clone %d: %v", clone.ID, err)
		_ = db.DeleteSite(h.DB, clone.ID)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if err := h.SFTP.AddUser(r.Context(), clone.Name, sftpPass, sftpUID); err != nil {
		logger.Warn("apiSiteClone: failed to add SFTP user for clone %d: %v", clone.ID, err)
	}

	// fetch all configuration key-value pairs for the source site from the database to be copied to the cloned site, returning an internal server error response if fetching fails
	srcConfigs, err := db.GetAllConfigsBySite(h.DB, src.ID)
	if err != nil {
		logger.Error("apiSiteClone: failed to fetch source configs for site %d: %v", src.ID, err)
		_ = db.DeleteSite(h.DB, clone.ID)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// copy IP rules and UA rules from the source site to the cloned site, logging warnings for any errors encountered during the copying process
	if srcIPRules, err := db.GetIPRules(h.DB, &src.ID); err == nil && len(srcIPRules) > 0 {
		cloneIPRules := make([]db.IPRule, len(srcIPRules))
		for i, r := range srcIPRules {
			cloneIPRules[i] = db.IPRule{ListType: r.ListType, CIDR: r.CIDR}
		}
		if err := db.ReplaceIPRules(h.DB, &clone.ID, cloneIPRules); err != nil {
			logger.Warn("apiSiteClone: failed to copy IP rules to clone %d: %v", clone.ID, err)
		}
	}

	// copy UA rules from the source site to the cloned site, logging warnings for any errors encountered during the copying process
	if srcUARules, err := db.GetUARules(h.DB, &src.ID); err == nil && len(srcUARules) > 0 {
		cloneUARules := make([]db.UARule, len(srcUARules))
		for i, r := range srcUARules {
			cloneUARules[i] = db.UARule{ListType: r.ListType, Pattern: r.Pattern}
		}
		if err := db.ReplaceUARules(h.DB, &clone.ID, cloneUARules); err != nil {
			logger.Warn("apiSiteClone: failed to copy UA rules to clone %d: %v", clone.ID, err)
		}
	}

	// copy WAF site override and plugins from the source site to the cloned site, logging warnings for any errors encountered during the copying process
	if wafOverride, err := db.GetWAFSiteOverride(h.DB, src.ID); err == nil {
		if wafOverride.Override != 0 || wafOverride.Exclusions != "" {
			if err := db.SaveWAFSiteOverride(h.DB, db.WAFSiteOverride{
				SiteID:     clone.ID,
				Override:   wafOverride.Override,
				Exclusions: wafOverride.Exclusions,
			}); err != nil {
				logger.Warn("apiSiteClone: failed to copy WAF override to clone %d: %v", clone.ID, err)
			}
		}
	}
	if wafPlugins, err := db.GetSitePlugins(h.DB, src.ID); err == nil && len(wafPlugins) > 0 {
		if err := db.SetSitePlugins(h.DB, clone.ID, wafPlugins); err != nil {
			logger.Warn("apiSiteClone: failed to copy WAF plugins to clone %d: %v", clone.ID, err)
		}
	}

	// copy crons from the source site to the cloned site, logging warnings for any errors encountered during the copying process
	if srcCrons, err := db.ListCrons(h.DB, src.ID); err == nil {
		for _, c := range srcCrons {
			if _, err := db.CreateCron(h.DB, &models.SiteCron{
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

	// copy all configuration key-value pairs from the source site to the cloned site, returning an internal server error response if any copying fails
	for t, kv := range srcConfigs {
		if err := db.SetConfigs(h.DB, clone.ID, t, kv); err != nil {
			logger.Error("apiSiteClone: failed to copy config type %d to clone %d: %v", t, clone.ID, err)
			_ = db.DeleteSite(h.DB, clone.ID)
			apiutil.Error(w, http.StatusInternalServerError, err)
			return
		}
	}

	// generate random passwords for the database user, database password, root password, and Redis password for the cloned site, handling any errors during password generation and cleaning up the clone record if necessary
	dbUser, err := auth.GeneratePassword()
	if err != nil {
		_ = db.DeleteSite(h.DB, clone.ID)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	dbPass, err := auth.GeneratePassword()
	if err != nil {
		_ = db.DeleteSite(h.DB, clone.ID)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	dbRootPass, err := auth.GeneratePassword()
	if err != nil {
		_ = db.DeleteSite(h.DB, clone.ID)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	redisPass, err := auth.GeneratePassword()
	if err != nil {
		_ = db.DeleteSite(h.DB, clone.ID)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// scaffold the clone site directory using the appropriate module for the site type, passing in the necessary configurations and credentials, and handle any errors during scaffolding by cleaning up the clone record and directory
	cloneSiteDir := h.sitesBase() + "/" + clone.Name
	hostCloneSiteDir := h.hostSitesBase() + "/" + clone.Name
	srcSiteDir := h.sitesBase() + "/" + src.Name

	// scaffold the clone site directory using the appropriate module for the site type, passing in the necessary configurations and credentials, and handle any errors during scaffolding by cleaning up the clone record and directory
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
		_ = db.DeleteSite(h.DB, clone.ID)
		_ = os.RemoveAll(cloneSiteDir)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// copy the html directory from the source site to the cloned site using the 'cp' command, handling any errors during the copy process by cleaning up the clone record and directory
	if out, err := exec.CommandContext(r.Context(), "cp", "-a",
		srcSiteDir+"/html/.", cloneSiteDir+"/html/",
	).CombinedOutput(); err != nil {
		logger.Error("apiSiteClone: failed to copy html for %s: %v — %s", clone.Name, err, string(out))
		_ = db.DeleteSite(h.DB, clone.ID)
		_ = os.RemoveAll(cloneSiteDir)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// if the cloned site is of type WordPress, generate a wp-config.php file with the appropriate database and Redis credentials, write it to the cloned site's html directory, and handle any errors during writing or changing ownership
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

	// respond immediately — pod creation and DB clone run in the background
	apiutil.JSON(w, http.StatusAccepted, map[string]any{"id": clone.ID, "name": clone.Name})

	// create the pod for the cloned site in a separate goroutine, ensuring it is created with the appropriate configurations and credentials, and handle any errors during pod creation by cleaning up the clone record and directory
	go func() {
		podCtx, podCancel := context.WithTimeout(context.Background(), 10*time.Minute)
		defer podCancel()

		// create the pod for the cloned site using the appropriate module for the site type, passing in the necessary configurations and credentials, and handle any errors during pod creation by cleaning up the clone record and directory
		if err := cm.Create(podCtx, &modules.PodmanClientAdapter{Client: h.PodmanClient}, modules.PodConfig{
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
			_ = h.Podman.StopPod(context.Background(), podman.PodName(clone.Name))
			_ = h.Podman.RemoveSitePod(context.Background(), clone.Name)
			_ = db.DeleteSite(h.DB, clone.ID)
			_ = os.RemoveAll(cloneSiteDir)
			return
		}

		// confirm the pod is running after creation, logging an error and cleaning up the clone record and directory if the pod does not reach a running state
		if modules.TypeModule(src.SiteType).HasDatabase() {
			if err := h.cloneDatabase(podCtx, src, clone); err != nil {
				logger.Error("apiSiteClone: DB clone failed for %s → %s: %v", src.Name, clone.Name, err)
			}
		}

		// confirm the pod is running after creation, logging an error and cleaning up the clone record and directory if the pod does not reach a running state
		logger.Debug("apiSiteClone: clone '%s' created from source '%s'", clone.Name, src.Name)
		_ = db.UpdateSiteStatus(h.DB, clone.ID, models.StatusRunning)
	}()
}
