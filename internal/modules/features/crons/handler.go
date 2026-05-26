package crons

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"podnest/internal/apiutil"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/modules"
)

// apiListCrons returns all cron jobs for a site.
func (m Module) apiListCrons(w http.ResponseWriter, _ *http.Request, site *models.Site) {
	crons, err := db.ListCrons(m.DB, site.ID)
	if err != nil {
		logger.Error("apiListCrons: site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if crons == nil {
		crons = []*models.SiteCron{}
	}
	logger.Debug("apiListCrons: site %d — %d records", site.ID, len(crons))
	apiutil.JSON(w, http.StatusOK, crons)
}

// apiCreateCron creates a new cron job for a site.
func (m Module) apiCreateCron(w http.ResponseWriter, r *http.Request, site *models.Site) {
	if !modules.TypeModule(site.SiteType).HasCronSupport() {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "cron jobs are not supported for this site type")
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
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	req.Command = strings.TrimSpace(req.Command)
	req.Schedule = strings.TrimSpace(req.Schedule)
	if req.Command == "" || req.Schedule == "" {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "command and schedule are required")
		return
	}

	job := &models.SiteCron{
		SiteID:   site.ID,
		Label:    strings.TrimSpace(req.Label),
		Command:  req.Command,
		Schedule: req.Schedule,
		Enabled:  req.Enabled,
	}

	id, err := db.CreateCron(m.DB, job)
	if err != nil {
		logger.Error("apiCreateCron: site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	m.Manager.Reload()
	logger.Debug("apiCreateCron: created cron %d for site %d", id, site.ID)
	apiutil.JSON(w, http.StatusCreated, map[string]int64{"id": id})
}

// apiUpdateCron updates the label, command, schedule, and enabled state of a cron job.
func (m Module) apiUpdateCron(w http.ResponseWriter, r *http.Request, site *models.Site) {
	cid, ok := parseCronID(w, r)
	if !ok {
		return
	}

	job, err := db.GetCron(m.DB, cid)
	if err != nil {
		logger.Error("apiUpdateCron: get cron %d: %v", cid, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if job == nil {
		apiutil.ErrorMsg(w, http.StatusNotFound, "cron job not found")
		return
	}
	if job.SiteID != site.ID {
		apiutil.ErrorMsg(w, http.StatusForbidden, "cron job does not belong to this site")
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
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	req.Command = strings.TrimSpace(req.Command)
	req.Schedule = strings.TrimSpace(req.Schedule)
	if req.Command == "" || req.Schedule == "" {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "command and schedule are required")
		return
	}

	job.Label = strings.TrimSpace(req.Label)
	job.Command = req.Command
	job.Schedule = req.Schedule
	job.Enabled = req.Enabled

	if err := db.UpdateCron(m.DB, job); err != nil {
		logger.Error("apiUpdateCron: update cron %d: %v", cid, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	m.Manager.Reload()
	logger.Debug("apiUpdateCron: updated cron %d for site %d", cid, site.ID)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// apiDeleteCron removes a cron job.
func (m Module) apiDeleteCron(w http.ResponseWriter, r *http.Request, site *models.Site) {
	cid, ok := parseCronID(w, r)
	if !ok {
		return
	}

	job, err := db.GetCron(m.DB, cid)
	if err != nil {
		logger.Error("apiDeleteCron: get cron %d: %v", cid, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if job == nil {
		apiutil.ErrorMsg(w, http.StatusNotFound, "cron job not found")
		return
	}
	if job.SiteID != site.ID {
		apiutil.ErrorMsg(w, http.StatusForbidden, "cron job does not belong to this site")
		return
	}

	if err := db.DeleteCron(m.DB, cid); err != nil {
		logger.Error("apiDeleteCron: cron %d: %v", cid, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	m.Manager.Reload()
	logger.Debug("apiDeleteCron: deleted cron %d for site %d", cid, site.ID)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// apiToggleCron enables or disables a cron job without a full update.
func (m Module) apiToggleCron(w http.ResponseWriter, r *http.Request, site *models.Site) {
	cid, ok := parseCronID(w, r)
	if !ok {
		return
	}

	job, err := db.GetCron(m.DB, cid)
	if err != nil {
		logger.Error("apiToggleCron: get cron %d: %v", cid, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if job == nil {
		apiutil.ErrorMsg(w, http.StatusNotFound, "cron job not found")
		return
	}
	if job.SiteID != site.ID {
		apiutil.ErrorMsg(w, http.StatusForbidden, "cron job does not belong to this site")
		return
	}

	var req struct {
		Enabled bool `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("apiToggleCron: decode: %v", err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	if err := db.SetCronEnabled(m.DB, cid, req.Enabled); err != nil {
		logger.Error("apiToggleCron: cron %d: %v", cid, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	m.Manager.Reload()
	logger.Debug("apiToggleCron: cron %d enabled=%v for site %d", cid, req.Enabled, site.ID)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// apiRunCronNow fires a cron job immediately outside of its schedule.
func (m Module) apiRunCronNow(w http.ResponseWriter, r *http.Request, site *models.Site) {
	cid, ok := parseCronID(w, r)
	if !ok {
		return
	}

	job, err := db.GetCron(m.DB, cid)
	if err != nil {
		logger.Error("apiRunCronNow: get cron %d: %v", cid, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if job == nil {
		apiutil.ErrorMsg(w, http.StatusNotFound, "cron job not found")
		return
	}
	if job.SiteID != site.ID {
		apiutil.ErrorMsg(w, http.StatusForbidden, "cron job does not belong to this site")
		return
	}

	go func() {
		if err := m.Manager.RunNow(context.Background(), cid); err != nil {
			logger.Error("apiRunCronNow: cron %d site %d: %v", cid, site.ID, err)
		}
	}()

	logger.Debug("apiRunCronNow: queued cron %d for site %d", cid, site.ID)
	apiutil.JSON(w, http.StatusAccepted, map[string]string{"status": "started"})
}

// parseCronID extracts and validates the {cid} path value.
func parseCronID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	cid, err := strconv.ParseInt(r.PathValue("cid"), 10, 64)
	if err != nil {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid cron job id")
		return 0, false
	}
	return cid, true
}
