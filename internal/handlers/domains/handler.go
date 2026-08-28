// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package domains

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"podnest/internal/apiutil"
	"podnest/internal/audit"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/modules"
)

// ProxyDomains is the subset of proxy.Proxy consumed by this handler.
type ProxyDomains interface {
	ObtainCert(domain string)
	AddDomain(domain string, port int, siteID int64, siteName string)
	RemoveDomain(domain string)
}

// Handler handles domain management API routes.
type Handler struct {
	DB      *sql.DB
	Proxy   ProxyDomains
	Resolve modules.SiteResolver
}

// RegisterRoutes mounts domain management routes onto api.
func (h *Handler) RegisterRoutes(api *http.ServeMux) {
	api.HandleFunc("GET /sites/{id}/domains", h.apiListDomains)
	api.HandleFunc("POST /sites/{id}/domains", h.apiAddDomain)
	api.HandleFunc("DELETE /sites/{id}/domains/{did}", h.apiDeleteDomain)
}

func (h *Handler) apiListDomains(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		logger.Error("failed to resolve site for request to list domains: %v", r)
		return
	}

	domains, err := db.GetDomainsBySite(h.DB, site.ID)
	if err != nil {
		logger.Error("could not retrieve sites domains: %v", err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("retrieved the list of domains for site: %d", site.ID)
	apiutil.JSON(w, http.StatusOK, domains)
}

func (h *Handler) apiAddDomain(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		logger.Error("failed to resolve site for request to add domains: %v", r)
		return
	}

	var req struct {
		Domain string `json:"domain"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("failed to decode request body for domain add on site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	if req.Domain == "" {
		logger.Error("domain field is required for site %d", site.ID)
		apiutil.ErrorMsg(w, http.StatusBadRequest, "domain is required")
		return
	}

	exists, err := db.DomainExists(h.DB, req.Domain)
	if err != nil {
		logger.Error("failed to check domain existence for site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if exists {
		logger.Error("domain '%s' is already registered for site %d", req.Domain, site.ID)
		apiutil.ErrorMsg(w, http.StatusConflict, "domain already registered")
		return
	}

	domain := &models.Domain{
		SiteID: site.ID,
		Domain: req.Domain,
	}

	if err := db.CreateDomain(h.DB, domain); err != nil {
		logger.Error("failed to create domain '%s' for site %d: %v", req.Domain, site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	h.Proxy.ObtainCert(req.Domain)
	h.Proxy.AddDomain(req.Domain, site.Port, site.ID, site.Name)

	logger.Debug("added domain '%s' for site %d", req.Domain, site.ID)
	apiutil.JSON(w, http.StatusCreated, domain)
}

func (h *Handler) apiDeleteDomain(w http.ResponseWriter, r *http.Request) {
	site, ok := h.Resolve(w, r)
	if !ok {
		logger.Error("failed to resolve site for request to delete domains: %v", r)
		return
	}

	didStr := r.PathValue("did")
	did, err := strconv.ParseInt(didStr, 10, 64)
	if err != nil {
		logger.Error("invalid domain id in path: %s", didStr)
		apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid domain id")
		return
	}

	domainRecord, err := db.GetDomainByID(h.DB, did)
	if err != nil {
		logger.Error("failed to fetch domain %d: %v", did, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	if domainRecord == nil {
		apiutil.ErrorMsg(w, http.StatusNotFound, "domain not found")
		return
	}
	if domainRecord.SiteID != site.ID {
		logger.Error("domain %d does not belong to site %d", did, site.ID)
		apiutil.ErrorMsg(w, http.StatusForbidden, "domain does not belong to this site")
		return
	}

	// capture domain state before deletion for the audit trail
	*r = *r.WithContext(audit.WithStateContext(r.Context(), db.SnapshotAny(domainRecord), ""))

	if err := db.DeleteDomain(h.DB, did); err != nil {
		logger.Error("failed to delete domain %d: %v", did, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	h.Proxy.RemoveDomain(domainRecord.Domain)

	logger.Debug("deleted domain %d", did)
	w.WriteHeader(http.StatusNoContent)
}
