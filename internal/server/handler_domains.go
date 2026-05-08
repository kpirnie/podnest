package server

import (
	"encoding/json"
	"net/http"
	"strconv"

	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
)

// list domains for a site
func (s *Server) apiListDomains(w http.ResponseWriter, r *http.Request) {

	// grab the site from the request path
	site, ok := s.resolveSite(w, r)
	if !ok {
		logger.Error("failed to resolve site for request to list domains: %v", r)
		return
	}

	// get the domains by site
	domains, err := db.GetDomainsBySite(s.cfg.DB, site.ID)
	if err != nil {
		logger.Error("could not retrieve sites domains: %v", err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// return the json list of domains
	logger.Debug("retrieved the list of domains for site: %d", site.ID)
	apiJSON(w, http.StatusOK, domains)
}

// add a domain to a site after validating it is not already registered
func (s *Server) apiAddDomain(w http.ResponseWriter, r *http.Request) {

	// resolve the site from the request path
	site, ok := s.resolveSite(w, r)
	if !ok {
		logger.Error("failed to resolve site for request to add domains: %v", r)
		return
	}

	// decode the request body into the domain request struct
	var req struct {
		Domain string `json:"domain"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("failed to decode request body for domain add on site %d: %v", site.ID, err)
		apiError(w, http.StatusBadRequest, err)
		return
	}

	// validate the domain field is not empty
	if req.Domain == "" {
		logger.Error("domain field is required for site %d", site.ID)
		apiErrorMsg(w, http.StatusBadRequest, "domain is required")
		return
	}

	// check uniqueness before inserting
	exists, err := db.DomainExists(s.cfg.DB, req.Domain)
	if err != nil {
		logger.Error("failed to check domain existence for site %d: %v", site.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	if exists {
		logger.Error("domain '%s' is already registered for site %d", req.Domain, site.ID)
		apiErrorMsg(w, http.StatusConflict, "domain already registered")
		return
	}

	// build the domain record and associate it with the site
	domain := &models.Domain{
		SiteID: site.ID,
		Domain: req.Domain,
	}

	// insert the domain into the database and return the created record
	if err := db.CreateDomain(s.cfg.DB, domain); err != nil {
		logger.Error("failed to create domain '%s' for site %d: %v", req.Domain, site.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// proactively obtain SSL certificate for the newly added domain
	s.proxy.ObtainCert(req.Domain)

	// update the in-memory domain cache so the proxy routes immediately
	s.proxy.AddDomain(req.Domain, site.Port, site.ID)

	// add the domain and log it
	logger.Debug("added domain '%s' for site %d", req.Domain, site.ID)
	apiJSON(w, http.StatusCreated, domain)
}

// delete a domain by ID after verifying the caller has access to the owning site
func (s *Server) apiDeleteDomain(w http.ResponseWriter, r *http.Request) {

	// verify the caller has access to the site before deleting the domain
	_, ok := s.resolveSite(w, r)
	if !ok {
		logger.Error("failed to resolve site for request to delete domains: %v", r)
		return
	}

	// parse and validate the domain ID from the path
	didStr := r.PathValue("did")
	did, err := strconv.ParseInt(didStr, 10, 64)
	if err != nil {
		logger.Error("invalid domain id in path: %s", didStr)
		apiErrorMsg(w, http.StatusBadRequest, "invalid domain id")
		return
	}

	// fetch the domain record before deleting so we have the string for cache eviction
	domainRecord, err := db.GetDomainByID(s.cfg.DB, did)
	if err != nil {
		logger.Error("failed to fetch domain %d: %v", did, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// delete the domain record from the database
	if err := db.DeleteDomain(s.cfg.DB, did); err != nil {
		logger.Error("failed to delete domain %d: %v", did, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// evict from the in-memory proxy cache
	if domainRecord != nil {
		s.proxy.RemoveDomain(domainRecord.Domain)
	}

	// delete the domain
	logger.Debug("deleted domain %d", did)
	w.WriteHeader(http.StatusNoContent)
}
