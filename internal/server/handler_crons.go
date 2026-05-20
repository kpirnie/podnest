package server

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
)

// -- list / create -----------------------------------------------------------

// apiListCrons returns all cron jobs for a site
func (s *Server) apiListCrons(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}

	crons, err := db.ListCrons(s.cfg.DB, site.ID)
	if err != nil {
		logger.Error("apiListCrons: site %d: %v", site.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// return an empty slice rather than null
	if crons == nil {
		crons = []*models.SiteCron{}
	}

	logger.Debug("apiListCrons: site %d — %d records", site.ID, len(crons))
	apiJSON(w, http.StatusOK, crons)
}

// apiCreateCron creates a new cron job for a site
func (s *Server) apiCreateCron(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}

	// reject site types with no execable runtime
	if !hasCronSupport(site.SiteType) {
		apiErrorMsg(w, http.StatusBadRequest, "cron jobs are not supported for this site type")
		return
	}

	var req struct {
		Label    string `json:"label"`
		Command  string `json:"command"`
		Schedule string `json:"schedule"`
		Enabled  bool   `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("apiCreateCron: decode: %v", err)
		apiError(w, http.StatusBadRequest, err)
		return
	}

	req.Command = strings.TrimSpace(req.Command)
	req.Schedule = strings.TrimSpace(req.Schedule)
	if req.Command == "" || req.Schedule == "" {
		apiErrorMsg(w, http.StatusBadRequest, "command and schedule are required")
		return
	}

	job := &models.SiteCron{
		SiteID:   site.ID,
		Label:    strings.TrimSpace(req.Label),
		Command:  req.Command,
		Schedule: req.Schedule,
		Enabled:  req.Enabled,
	}

	id, err := db.CreateCron(s.cfg.DB, job)
	if err != nil {
		logger.Error("apiCreateCron: site %d: %v", site.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	s.cron.Reload()

	logger.Debug("apiCreateCron: created cron %d for site %d", id, site.ID)
	apiJSON(w, http.StatusCreated, map[string]int64{"id": id})
}

// -- update / delete ---------------------------------------------------------

// apiUpdateCron updates the label, command, schedule, and enabled state of a cron job
func (s *Server) apiUpdateCron(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}

	cid, ok := parseCronID(w, r)
	if !ok {
		return
	}

	job, err := db.GetCron(s.cfg.DB, cid)
	if err != nil {
		logger.Error("apiUpdateCron: get cron %d: %v", cid, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	if job == nil {
		apiErrorMsg(w, http.StatusNotFound, "cron job not found")
		return
	}
	if job.SiteID != site.ID {
		apiErrorMsg(w, http.StatusForbidden, "cron job does not belong to this site")
		return
	}

	var req struct {
		Label    string `json:"label"`
		Command  string `json:"command"`
		Schedule string `json:"schedule"`
		Enabled  bool   `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("apiUpdateCron: decode: %v", err)
		apiError(w, http.StatusBadRequest, err)
		return
	}

	req.Command = strings.TrimSpace(req.Command)
	req.Schedule = strings.TrimSpace(req.Schedule)
	if req.Command == "" || req.Schedule == "" {
		apiErrorMsg(w, http.StatusBadRequest, "command and schedule are required")
		return
	}

	job.Label = strings.TrimSpace(req.Label)
	job.Command = req.Command
	job.Schedule = req.Schedule
	job.Enabled = req.Enabled

	if err := db.UpdateCron(s.cfg.DB, job); err != nil {
		logger.Error("apiUpdateCron: update cron %d: %v", cid, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	s.cron.Reload()

	logger.Debug("apiUpdateCron: updated cron %d for site %d", cid, site.ID)
	apiJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// apiDeleteCron removes a cron job
func (s *Server) apiDeleteCron(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}

	cid, ok := parseCronID(w, r)
	if !ok {
		return
	}

	job, err := db.GetCron(s.cfg.DB, cid)
	if err != nil {
		logger.Error("apiDeleteCron: get cron %d: %v", cid, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	if job == nil {
		apiErrorMsg(w, http.StatusNotFound, "cron job not found")
		return
	}
	if job.SiteID != site.ID {
		apiErrorMsg(w, http.StatusForbidden, "cron job does not belong to this site")
		return
	}

	if err := db.DeleteCron(s.cfg.DB, cid); err != nil {
		logger.Error("apiDeleteCron: cron %d: %v", cid, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	s.cron.Reload()

	logger.Debug("apiDeleteCron: deleted cron %d for site %d", cid, site.ID)
	apiJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// -- toggle ------------------------------------------------------------------

// apiToggleCron enables or disables a cron job without a full update
func (s *Server) apiToggleCron(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}

	cid, ok := parseCronID(w, r)
	if !ok {
		return
	}

	job, err := db.GetCron(s.cfg.DB, cid)
	if err != nil {
		logger.Error("apiToggleCron: get cron %d: %v", cid, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	if job == nil {
		apiErrorMsg(w, http.StatusNotFound, "cron job not found")
		return
	}
	if job.SiteID != site.ID {
		apiErrorMsg(w, http.StatusForbidden, "cron job does not belong to this site")
		return
	}

	var req struct {
		Enabled bool `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("apiToggleCron: decode: %v", err)
		apiError(w, http.StatusBadRequest, err)
		return
	}

	if err := db.SetCronEnabled(s.cfg.DB, cid, req.Enabled); err != nil {
		logger.Error("apiToggleCron: cron %d: %v", cid, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	s.cron.Reload()

	logger.Debug("apiToggleCron: cron %d enabled=%v for site %d", cid, req.Enabled, site.ID)
	apiJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// -- run now -----------------------------------------------------------------

// apiRunCronNow fires a cron job immediately outside of its schedule
func (s *Server) apiRunCronNow(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}

	cid, ok := parseCronID(w, r)
	if !ok {
		return
	}

	job, err := db.GetCron(s.cfg.DB, cid)
	if err != nil {
		logger.Error("apiRunCronNow: get cron %d: %v", cid, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	if job == nil {
		apiErrorMsg(w, http.StatusNotFound, "cron job not found")
		return
	}
	if job.SiteID != site.ID {
		apiErrorMsg(w, http.StatusForbidden, "cron job does not belong to this site")
		return
	}

	// run in a detached goroutine; result is persisted to last_output/last_error
	go func() {
		if err := s.cron.RunNow(context.Background(), cid); err != nil {
			logger.Error("apiRunCronNow: cron %d site %d: %v", cid, site.ID, err)
		}
	}()

	logger.Debug("apiRunCronNow: queued cron %d for site %d", cid, site.ID)
	apiJSON(w, http.StatusAccepted, map[string]string{"status": "started"})
}

// -- helpers -----------------------------------------------------------------

// parseCronID extracts and validates the {cid} path value
func parseCronID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	cid, err := strconv.ParseInt(r.PathValue("cid"), 10, 64)
	if err != nil {
		apiErrorMsg(w, http.StatusBadRequest, "invalid cron job id")
		return 0, false
	}
	return cid, true
}

// hasCronSupport returns true for site types that have an execable runtime container
func hasCronSupport(siteType int) bool {
	switch siteType {
	case models.SiteTypeWordPress, models.SiteTypePHP, models.SiteTypeNode, models.SiteTypeDotNet:
		return true
	}
	return false
}
