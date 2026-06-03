package sites

import (
	"bytes"
	"context"
	"database/sql"
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

	"podnest/internal/apiutil"
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
}

// SitesProxy is the subset of proxy.Proxy consumed by this handler.
type SitesProxy interface {
	AddDomain(domain string, port int, siteID int64)
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
	api.HandleFunc("POST /sites/{id}/clone", h.apiSiteClone)
}

func (h *Handler) sitesBase() string { return h.AppPath + "/sites" }
func (h *Handler) hostSitesBase() string {
	if h.HostAppPath != "" {
		return h.HostAppPath + "/sites"
	}
	return h.sitesBase()
}

// ResolveSite is exported so routes.go can pass it as a modules.SiteResolver.
func (h *Handler) ResolveSite(w http.ResponseWriter, r *http.Request) (*models.Site, bool) {
	user := auth.UserFromContext(r.Context())

	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		logger.Error("invalid site id in path: %s", idStr)
		apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid site id")
		return nil, false
	}

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

	if user.Role != models.RoleAdmin && site.UID != user.ID {
		logger.Error("user %d does not own site %d", user.ID, site.ID)
		apiutil.ErrorMsg(w, http.StatusForbidden, "forbidden")
		return nil, false
	}

	logger.Debug("resolved site %d: %s", site.ID, site.Name)
	return site, true
}

func (h *Handler) apiListSites(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())

	var (
		sites []*models.Site
		err   error
	)
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
	if sites == nil {
		sites = []*models.Site{}
	}

	domainMap, err := db.GetAllDomainsGrouped(h.DB)
	if err != nil {
		logger.Error("failed to retrieve domains for site list: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	type siteWithDomains struct {
		*models.Site
		Domains []string `json:"Domains"`
	}
	out := make([]siteWithDomains, 0, len(sites))
	for _, s := range sites {
		domains := domainMap[s.ID]
		if domains == nil {
			domains = []string{}
		}
		out = append(out, siteWithDomains{Site: s, Domains: domains})
	}

	logger.Debug("retrieved %d sites for user %d", len(sites), user.ID)
	apiutil.JSON(w, http.StatusOK, out)
}

func (h *Handler) apiGetSite(w http.ResponseWriter, r *http.Request) {
	site, ok := h.ResolveSite(w, r)
	if !ok {
		return
	}

	domains, err := db.GetDomainsBySite(h.DB, site.ID)
	if err != nil {
		logger.Error("failed to fetch domains for site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	var sftpCred *models.SFTPCred
	if modules.TypeModule(site.SiteType).HasSFTP() {
		sftpCred, err = db.GetSFTPCredBySite(h.DB, site.ID)
		if err != nil {
			logger.Error("failed to fetch SFTP cred for site %d: %v", site.ID, err)
			apiutil.Error(w, http.StatusInternalServerError, err)
			return
		}
	}

	logger.Debug("retrieved site %d with %d domains", site.ID, len(domains))
	apiutil.JSON(w, http.StatusOK, map[string]any{
		"site":    site,
		"domains": domains,
		"sftp":    sftpCred,
	})
}

func (h *Handler) apiCreateSite(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())

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
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	port, err := db.NextAvailablePort(h.DB)
	if err != nil {
		logger.Error("failed to find available port for site '%s': %v", req.Name, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	pmaPort := 0
	if modules.TypeModule(req.SiteType).HasDatabase() {
		pmaPort = port + 10000
	}

	if req.Name == "" || port == 0 {
		logger.Error("missing required fields for site creation: name=%s port=%d", req.Name, port)
		apiutil.ErrorMsg(w, http.StatusBadRequest, "name and port are required")
		return
	}
	req.Name = strings.ToLower(regexp.MustCompile(`[^a-zA-Z0-9_\-]`).ReplaceAllString(req.Name, "-"))
	if req.PHPVersion == 0 {
		req.PHPVersion = 3
	}

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
	if err := db.CreateSite(h.DB, site); err != nil {
		logger.Error("failed to create site record for '%s': %v", req.Name, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	if site.SiteType == models.SiteTypeReverseProxy {
		for _, d := range req.Domains {
			d = strings.TrimSpace(d)
			if d == "" {
				continue
			}
			if err := db.CreateDomain(h.DB, &models.Domain{SiteID: site.ID, Domain: d}); err != nil {
				logger.Error("saving domain %s for reverse proxy site %s: %v", d, site.Name, err)
			}
			h.Proxy.AddDomain(d, site.Port, site.ID)
			h.Proxy.ObtainCert(d)
		}
		_ = db.UpdateSiteStatus(h.DB, site.ID, models.StatusRunning)
		site.SiteStatus = models.StatusRunning
		logger.Debug("reverse proxy site '%s' created", site.Name)
		apiutil.JSON(w, http.StatusCreated, site)
		return
	}

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
	if err := db.CreateSFTPCred(h.DB, sftpCred); err != nil {
		logger.Error("failed to create SFTP cred for site %d: %v", site.ID, err)
		_ = db.DeleteSite(h.DB, site.ID)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if err := h.SFTP.AddUser(r.Context(), site.Name, sftpPass, sftp.UIDForSite(site.ID)); err != nil {
		logger.Error("failed to add SFTP user for site %d: %v", site.ID, err)
	}

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

	for _, d := range req.Domains {
		d = strings.TrimSpace(d)
		if d == "" {
			continue
		}
		if err := db.CreateDomain(h.DB, &models.Domain{SiteID: site.ID, Domain: d}); err != nil {
			logger.Error("saving domain %s for site %s: %v", d, site.Name, err)
		}
		h.Proxy.AddDomain(d, port, site.ID)
	}
	for _, d := range req.Domains {
		d = strings.TrimSpace(d)
		if d == "" {
			continue
		}
		h.Proxy.ObtainCert(d)
	}

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
	redisPass, err := auth.GeneratePassword()
	if err != nil {
		_ = db.DeleteSite(h.DB, site.ID)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	siteDir := h.sitesBase() + "/" + site.Name
	hostSiteDir := h.hostSitesBase() + "/" + site.Name
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
		_ = db.DeleteSite(h.DB, site.ID)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	podCtx, podCancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer podCancel()

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
		logger.Error("creating pod for site %s: %v", site.Name, err)
		_ = h.Podman.StopPod(context.Background(), podman.PodName(site.Name))
		_ = h.Podman.RemoveSitePod(context.Background(), site.Name)
		_ = db.DeleteSite(h.DB, site.ID)
		_ = os.RemoveAll(siteDir)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	for _, f := range modules.FeaturesFor(site.SiteType) {
		if err := f.OnSiteCreate(r.Context(), site); err != nil {
			logger.Warn("OnSiteCreate feature %s for site %s: %v", f.FeatureID(), site.Name, err)
		}
	}

	logger.Debug("site '%s' created and pod provisioned successfully", site.Name)
	_ = db.UpdateSiteStatus(h.DB, site.ID, models.StatusRunning)
	site.SiteStatus = models.StatusRunning
	apiutil.JSON(w, http.StatusCreated, site)
}

func (h *Handler) apiUpdateSite(w http.ResponseWriter, r *http.Request) {
	site, ok := h.ResolveSite(w, r)
	if !ok {
		return
	}

	var req struct {
		Name           string `json:"name"`
		PHPVersion     int    `json:"php_version"`
		SiteType       int    `json:"site_type"`
		RuntimeVersion *int   `json:"runtime_version"`
		StartCommand   string `json:"start_command"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("failed to decode request body for site update on site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

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

	if err := db.UpdateSite(h.DB, site); err != nil {
		logger.Error("failed to update site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("updated site %d: %s", site.ID, site.Name)
	apiutil.JSON(w, http.StatusOK, site)
}

func (h *Handler) apiDeleteSite(w http.ResponseWriter, r *http.Request) {
	site, ok := h.ResolveSite(w, r)
	if !ok {
		return
	}

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

	siteDomains, err := db.GetDomainsBySite(h.DB, site.ID)
	if err != nil {
		logger.Warn("could not fetch domains for cache eviction on site %d: %v", site.ID, err)
	}

	for _, f := range modules.FeaturesFor(site.SiteType) {
		if err := f.OnSiteDelete(bgCtx, site); err != nil {
			logger.Warn("OnSiteDelete feature %s for site %s: %v", f.FeatureID(), site.Name, err)
		}
	}

	if err := db.DeleteSite(h.DB, site.ID); err != nil {
		logger.Error("failed to delete site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	if len(siteDomains) > 0 {
		domainStrs := make([]string, 0, len(siteDomains))
		for _, d := range siteDomains {
			domainStrs = append(domainStrs, d.Domain)
		}
		h.Proxy.RemoveDomains(domainStrs)
	}
	h.Proxy.RemoveSiteProxy(site.Port)

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

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) apiSiteStart(w http.ResponseWriter, r *http.Request) {
	site, ok := h.ResolveSite(w, r)
	if !ok {
		return
	}

	if err := h.Podman.StartPod(r.Context(), podman.PodName(site.Name)); err != nil {
		logger.Error("failed to start pod for site %d: %v", site.ID, err)
		_ = db.UpdateSiteStatus(h.DB, site.ID, models.StatusError)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if !h.confirmPodRunning(r.Context(), podman.PodName(site.Name), site.SiteType) {
		logger.Error("pod for site %d did not reach running state after start", site.ID)
		_ = db.UpdateSiteStatus(h.DB, site.ID, models.StatusError)
		apiutil.ErrorMsg(w, http.StatusInternalServerError, "pod failed to reach running state")
		return
	}

	// rewarm connections so this pod's port is pre-dialed for the first visitor
	go h.Proxy.WarmCaches(false)

	// run mariadb-upgrade if the DB version has changed
	go h.maybeUpgradeMariaDB(r.Context(), site)

	_ = db.UpdateSiteStatus(h.DB, site.ID, models.StatusRunning)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "running"})
}

func (h *Handler) apiSiteStop(w http.ResponseWriter, r *http.Request) {
	site, ok := h.ResolveSite(w, r)
	if !ok {
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

func (h *Handler) apiSiteRestart(w http.ResponseWriter, r *http.Request) {
	site, ok := h.ResolveSite(w, r)
	if !ok {
		return
	}
	_ = db.UpdateSiteStatus(h.DB, site.ID, models.StatusRestarting)

	if err := h.Podman.StopPod(context.Background(), podman.PodName(site.Name)); err != nil {
		logger.Warn("could not stop pod before restart for site %d: %v", site.ID, err)
	}
	if err := h.Podman.StartPod(context.Background(), podman.PodName(site.Name)); err != nil {
		logger.Error("failed to restart pod for site %d: %v", site.ID, err)
		_ = db.UpdateSiteStatus(h.DB, site.ID, models.StatusError)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// rewarm connections so this pod's port is pre-dialed for the first visitor
	go h.Proxy.WarmCaches(false)

	_ = db.UpdateSiteStatus(h.DB, site.ID, models.StatusRunning)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "running"})
}

func (h *Handler) apiSiteFlush(w http.ResponseWriter, r *http.Request) {
	site, ok := h.ResolveSite(w, r)
	if !ok {
		return
	}

	if modules.TypeModule(site.SiteType).HasPHPFPM() {
		if err := h.Podman.FlushPHPCache(r.Context(), podman.ContainerName(site.Name, "php")); err != nil {
			logger.Error("failed to flush php opcache for site %d: %v", site.ID, err)
			apiutil.Error(w, http.StatusInternalServerError, err)
			return
		}
	}

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

	logger.Debug("flushed all caches for site %d", site.ID)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "flushed"})
}

func (h *Handler) apiSiteStatus(w http.ResponseWriter, r *http.Request) {
	site, ok := h.ResolveSite(w, r)
	if !ok {
		return
	}

	inspect, err := h.Podman.SiteStatus(r.Context(), site.Name)
	if err != nil {
		logger.Error("failed to inspect pod for site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("retrieved pod status for site %d", site.ID)
	apiutil.JSON(w, http.StatusOK, inspect)
}

func (h *Handler) apiSiteRecreate(w http.ResponseWriter, r *http.Request) {
	site, ok := h.ResolveSite(w, r)
	if !ok {
		return
	}

	var recreateReq struct {
		InstallWordPress *bool `json:"install_wordpress"`
	}
	json.NewDecoder(r.Body).Decode(&recreateReq) //nolint — body is optional

	siteDir := h.sitesBase() + "/" + site.Name
	hostSiteDir := h.hostSitesBase() + "/" + site.Name
	bgCtx := context.Background()

	if err := h.Podman.StopPod(bgCtx, podman.PodName(site.Name)); err != nil {
		logger.Warn("stop pod %s: %v", site.Name, err)
	}
	if err := h.Podman.RemoveSitePod(bgCtx, site.Name); err != nil {
		logger.Warn("remove pod %s: %v", site.Name, err)
	}

	// pull fresh images — skips if already up to date
	for _, img := range modules.TypeModule(site.SiteType).Images(site) {
		if err := h.Podman.PullImage(bgCtx, img); err != nil {
			logger.Warn("recreate: failed to pull image %s for site %d: %v", img, site.ID, err)
		}
	}

	if site.SiteType == models.SiteTypeWordPress && recreateReq.InstallWordPress != nil && !*recreateReq.InstallWordPress {
		if err := clearDirContents(siteDir + "/html"); err != nil {
			logger.Warn("failed to clear html/ for site %s: %v", site.Name, err)
		}
		site.SiteType = models.SiteTypePHP
		if err := db.UpdateSite(h.DB, site); err != nil {
			logger.Warn("failed to update site type for %s: %v", site.Name, err)
		}
	}

	podCtx, podCancel := context.WithTimeout(bgCtx, 10*time.Minute)
	defer podCancel()

	dbUser, _ := fileutil.ReadEnvValue(siteDir+"/.env", "DB_USER")
	dbPass, _ := fileutil.ReadEnvValue(siteDir+"/.env", "DB_PASS")
	dbRootPass, _ := fileutil.ReadEnvValue(siteDir+"/.env", "DB_ROOT_PASS")
	redisPass, _ := fileutil.ReadEnvValue(siteDir+"/.env", "REDIS_PASS")

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

	varnishDir := siteDir + "/varnish"
	if err := os.MkdirAll(varnishDir, 0755); err != nil {
		logger.Warn("could not create varnish dir for site %s: %v", site.Name, err)
	}
	if vclContent, err := config.RenderVarnish(varnishCfgJSON); err == nil {
		if err := os.WriteFile(varnishDir+"/default.vcl", []byte(vclContent), 0644); err != nil {
			logger.Warn("could not write varnish VCL for site %s: %v", site.Name, err)
		}
	}

	if site.SiteType == models.SiteTypeWordPress {
		if err := wordpress.DownloadWordPress(siteDir+"/html", int(site.UID)); err != nil {
			logger.Error("failed to download WordPress for site %s: %v", site.Name, err)
		}
	}

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

	if !h.confirmPodRunning(bgCtx, podman.PodName(site.Name), site.SiteType) {
		logger.Error("pod for site %d did not reach running state after recreate", site.ID)
		_ = db.UpdateSiteStatus(h.DB, site.ID, models.StatusError)
		apiutil.ErrorMsg(w, http.StatusInternalServerError, "pod failed to reach running state")
		return
	}

	// run mariadb-upgrade if the DB version has changed
	go h.maybeUpgradeMariaDB(r.Context(), site)

	_ = db.UpdateSiteStatus(h.DB, site.ID, models.StatusRunning)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "running"})
}

func (h *Handler) apiSiteClone(w http.ResponseWriter, r *http.Request) {
	src, ok := h.ResolveSite(w, r)
	if !ok {
		return
	}

	if src.SiteType == models.SiteTypeReverseProxy {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "reverse proxy sites cannot be cloned")
		return
	}

	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	req.Name = strings.ToLower(regexp.MustCompile(`[^a-zA-Z0-9_\-]`).ReplaceAllString(req.Name, "-"))
	if req.Name == "" {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "clone name is required")
		return
	}

	existing, err := db.GetSiteByName(h.DB, req.Name)
	if err != nil {
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if existing != nil {
		apiutil.ErrorMsg(w, http.StatusConflict, "site name already exists")
		return
	}

	port, err := db.NextAvailablePort(h.DB)
	if err != nil {
		logger.Error("apiSiteClone: no available port for clone of site %d: %v", src.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	pmaPort := 0
	if modules.TypeModule(src.SiteType).HasDatabase() {
		pmaPort = port + 10000
	}

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
	if err := db.CreateSite(h.DB, clone); err != nil {
		logger.Error("apiSiteClone: failed to create clone record '%s': %v", req.Name, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

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

	srcConfigs, err := db.GetAllConfigsBySite(h.DB, src.ID)
	if err != nil {
		logger.Error("apiSiteClone: failed to fetch source configs for site %d: %v", src.ID, err)
		_ = db.DeleteSite(h.DB, clone.ID)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	if srcIPRules, err := db.GetIPRules(h.DB, &src.ID); err == nil && len(srcIPRules) > 0 {
		cloneIPRules := make([]db.IPRule, len(srcIPRules))
		for i, r := range srcIPRules {
			cloneIPRules[i] = db.IPRule{ListType: r.ListType, CIDR: r.CIDR}
		}
		if err := db.ReplaceIPRules(h.DB, &clone.ID, cloneIPRules); err != nil {
			logger.Warn("apiSiteClone: failed to copy IP rules to clone %d: %v", clone.ID, err)
		}
	}
	if srcUARules, err := db.GetUARules(h.DB, &src.ID); err == nil && len(srcUARules) > 0 {
		cloneUARules := make([]db.UARule, len(srcUARules))
		for i, r := range srcUARules {
			cloneUARules[i] = db.UARule{ListType: r.ListType, Pattern: r.Pattern}
		}
		if err := db.ReplaceUARules(h.DB, &clone.ID, cloneUARules); err != nil {
			logger.Warn("apiSiteClone: failed to copy UA rules to clone %d: %v", clone.ID, err)
		}
	}

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

	for t, kv := range srcConfigs {
		if err := db.SetConfigs(h.DB, clone.ID, t, kv); err != nil {
			logger.Error("apiSiteClone: failed to copy config type %d to clone %d: %v", t, clone.ID, err)
			_ = db.DeleteSite(h.DB, clone.ID)
			apiutil.Error(w, http.StatusInternalServerError, err)
			return
		}
	}

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

	cloneSiteDir := h.sitesBase() + "/" + clone.Name
	hostCloneSiteDir := h.hostSitesBase() + "/" + clone.Name
	srcSiteDir := h.sitesBase() + "/" + src.Name

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

	if out, err := exec.CommandContext(r.Context(), "cp", "-a",
		srcSiteDir+"/html/.", cloneSiteDir+"/html/",
	).CombinedOutput(); err != nil {
		logger.Error("apiSiteClone: failed to copy html for %s: %v — %s", clone.Name, err, string(out))
		_ = db.DeleteSite(h.DB, clone.ID)
		_ = os.RemoveAll(cloneSiteDir)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

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

	go func() {
		podCtx, podCancel := context.WithTimeout(context.Background(), 10*time.Minute)
		defer podCancel()

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

		if modules.TypeModule(src.SiteType).HasDatabase() {
			if err := h.cloneDatabase(podCtx, src, clone); err != nil {
				logger.Error("apiSiteClone: DB clone failed for %s → %s: %v", src.Name, clone.Name, err)
			}
		}

		logger.Debug("apiSiteClone: clone '%s' created from source '%s'", clone.Name, src.Name)
		_ = db.UpdateSiteStatus(h.DB, clone.ID, models.StatusRunning)
	}()
}

func (h *Handler) cloneDatabase(ctx context.Context, src, clone *models.Site) error {
	srcSiteDir := h.sitesBase() + "/" + src.Name
	cloneSiteDir := h.sitesBase() + "/" + clone.Name

	srcRootPass, err := fileutil.ReadEnvValue(srcSiteDir+"/.env", "DB_ROOT_PASS")
	if err != nil {
		return fmt.Errorf("cloneDatabase: read src DB_ROOT_PASS: %w", err)
	}
	cloneRootPass, err := fileutil.ReadEnvValue(cloneSiteDir+"/.env", "DB_ROOT_PASS")
	if err != nil {
		return fmt.Errorf("cloneDatabase: read clone DB_ROOT_PASS: %w", err)
	}

	tmp, err := os.CreateTemp("", "podnest-clone-*.sql")
	if err != nil {
		return fmt.Errorf("cloneDatabase: create temp file: %w", err)
	}
	defer os.Remove(tmp.Name())

	podEnv := append(os.Environ(), "CONTAINER_HOST=unix://"+h.PodmanSock, "TMPDIR=/var/tmp")
	srcDBContainer := podman.ContainerName(src.Name, "db")

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
	cpCmd := exec.CommandContext(ctx, "podman", "cp", tmp.Name(), cloneDBContainer+":/tmp/podnest-clone.sql")
	cpCmd.Env = podEnv
	if out, err := cpCmd.CombinedOutput(); err != nil {
		return fmt.Errorf("cloneDatabase: podman cp: %w — %s", err, string(out))
	}

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

func (h *Handler) confirmPodRunning(ctx context.Context, podName string, siteType int) bool {
	timeout := 30 * time.Second
	if m := modules.TypeModule(siteType); m != nil {
		timeout = m.StartupTimeout()
	}
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		inspect, err := h.Podman.InspectPod(ctx, podName)
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

// maybeUpgradeMariaDB runs mariadb-upgrade inside the DB container if the
// MariaDB version has changed since the data directory was last initialised.
// It is a no-op for site types without a database.
// maybeUpgradeMariaDB runs mariadb-upgrade inside the DB container if the
// MariaDB version has changed since the data directory was last initialised.
// It is a no-op for site types without a database.
func (h *Handler) maybeUpgradeMariaDB(ctx context.Context, site *models.Site) {
	if !modules.TypeModule(site.SiteType).HasDatabase() {
		return
	}

	rootPass, err := fileutil.ReadEnvValue(
		filepath.Join(h.sitesBase(), site.Name, ".env"), "DB_ROOT_PASS",
	)
	if err != nil {
		logger.Warn("maybeUpgradeMariaDB: site %s: read DB_ROOT_PASS: %v", site.Name, err)
		return
	}

	dbContainer := modules.ContainerName(site.Name, "db")
	cmd := exec.CommandContext(ctx, "podman",
		"exec", "--user=mysql", dbContainer,
		"mariadb-upgrade", "-uroot", "-p"+rootPass,
	)
	if out, err := cmd.CombinedOutput(); err != nil {
		logger.Warn("maybeUpgradeMariaDB: site %s: %v — %s", site.Name, err, string(out))
		return
	}

	logger.Debug("maybeUpgradeMariaDB: upgrade check complete for site %s", site.Name)
}
