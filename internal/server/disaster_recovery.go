// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"mime"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"podnest/internal/apiutil"
	"podnest/internal/backup"
	"podnest/internal/db"
	"podnest/internal/logger"
)

const defaultDRSchedule = "0 4 * * *"

type drSettings struct {
	Disabled bool   `json:"disabled"`
	Schedule string `json:"schedule"`
}

type drStatus struct {
	Result       string                      `json:"result"`
	Started      time.Time                   `json:"started"`
	LastVerified time.Time                   `json:"last_verified"`
	Error        string                      `json:"error,omitempty"`
	Sites        []backup.DRSiteBackupStatus `json:"site_backups,omitempty"`
}

func (s *Server) drSettings() (drSettings, error) {
	settings := drSettings{Schedule: defaultDRSchedule}
	raw, err := db.GetSetting(s.cfg.DB, "dr_configuration")
	if err != nil || raw == "" {
		return settings, err
	}
	err = json.Unmarshal([]byte(raw), &settings)
	return settings, err
}

func (s *Server) drStatus() (drStatus, error) {
	var status drStatus
	raw, err := db.GetSetting(s.cfg.DB, "dr_status")
	if err == nil && raw != "" {
		err = json.Unmarshal([]byte(raw), &status)
	}
	return status, err
}

func (s *Server) writeDRStatus(status drStatus) error {
	raw, err := json.Marshal(status)
	if err != nil {
		return err
	}
	return db.SetSetting(s.cfg.DB, "dr_status", string(raw))
}

func (s *Server) apiDisasterRecovery(w http.ResponseWriter, r *http.Request) {
	settings, err := s.drSettings()
	if err != nil {
		apiutil.ErrorMsg(w, http.StatusInternalServerError, "could not read disaster recovery settings")
		return
	}
	status, err := s.drStatus()
	if err != nil {
		apiutil.ErrorMsg(w, http.StatusInternalServerError, "could not read disaster recovery status")
		return
	}
	configured, enrolled, err := s.backup.DRReadiness(r.Context())
	if err != nil {
		apiutil.ErrorMsg(w, http.StatusInternalServerError, "could not check disaster recovery readiness")
		return
	}
	apiutil.JSON(w, http.StatusOK, struct {
		drSettings
		drStatus
		S3Configured bool `json:"s3_configured"`
		KeyEnrolled  bool `json:"key_enrolled"`
	}{settings, status, configured, enrolled})
}

func (s *Server) apiSetDisasterRecovery(w http.ResponseWriter, r *http.Request) {
	var settings drSettings
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&settings); err != nil {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid disaster recovery configuration")
		return
	}
	settings.Schedule = strings.Join(strings.Fields(settings.Schedule), " ")
	if len(settings.Schedule) > 128 {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "disaster recovery schedule is too long")
		return
	}
	if _, err := backup.NextScheduledRun(settings.Schedule, time.Now()); err != nil {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "enter a valid five-field cron schedule")
		return
	}
	raw, err := json.Marshal(settings)
	if err != nil || db.SetSetting(s.cfg.DB, "dr_configuration", string(raw)) != nil {
		apiutil.ErrorMsg(w, http.StatusInternalServerError, "could not save disaster recovery settings")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) apiRunDisasterRecovery(w http.ResponseWriter, r *http.Request) {
	select {
	case s.drRun <- struct{}{}:
		w.WriteHeader(http.StatusAccepted)
	default:
		apiutil.ErrorMsg(w, http.StatusConflict, "disaster recovery is busy")
	}
}

func (s *Server) disasterRecoveryWorker() {
	if status, err := s.drStatus(); err == nil && status.Result == "running" {
		status.Result = "failed"
		status.Error = "previous disaster recovery run was interrupted"
		s.finishDisasterRecovery(status)
	}
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	last := time.Now().Truncate(time.Minute)
	for {
		select {
		case <-s.ctx.Done():
			return
		case <-s.drRun:
			s.runDisasterRecovery()
		case tick := <-ticker.C:
			minute := tick.Truncate(time.Minute)
			settings, err := s.drSettings()
			if err == nil && !settings.Disabled {
				next, err := backup.NextScheduledRun(settings.Schedule, last)
				if err == nil && !next.After(minute) {
					configured, enrolled, err := s.backup.DRReadiness(s.ctx)
					if err == nil && configured && enrolled {
						s.runDisasterRecovery()
					}
				}
			}
			last = minute
		}
	}
}

func (s *Server) runDisasterRecovery() {
	if s.ctx.Err() != nil {
		return
	}
	status, err := s.drStatus()
	if err != nil {
		logger.Error("disaster recovery status: %v", err)
		return
	}
	status.Result, status.Error, status.Started = "running", "", time.Now().UTC()
	status.Sites = nil
	if err := s.writeDRStatus(status); err != nil {
		logger.Error("write disaster recovery status: %v", err)
		return
	}

	ctx, cancel := context.WithTimeout(s.ctx, 12*time.Hour)
	defer cancel()
	siteIndex := make(map[int64]int)
	id, err := s.backup.SnapshotDisasterRecovery(ctx, func(progress backup.DRSiteBackupStatus) {
		if index, ok := siteIndex[progress.ID]; ok {
			status.Sites[index] = progress
		} else {
			siteIndex[progress.ID] = len(status.Sites)
			status.Sites = append(status.Sites, progress)
		}
		if err := s.writeDRStatus(status); err != nil {
			logger.Error("write site disaster recovery progress: %v", err)
		}
	})
	if id != "" {
		status.LastVerified = time.Now().UTC()
	}
	if err != nil {
		status.Result, status.Error = "failed", err.Error()
	} else {
		status.Result = "succeeded"
	}
	s.finishDisasterRecovery(status)
}

func (s *Server) finishDisasterRecovery(status drStatus) {
	if err := s.writeDRStatus(status); err != nil {
		logger.Error("write disaster recovery result: %v", err)
	}
	if status.Result == "failed" {
		logger.Error("disaster recovery: %s", status.Error)
		hostname, _ := os.Hostname()
		s.notifyAdmins("PodNest disaster recovery failed",
			fmt.Sprintf("Server: %s\n\n%s", hostname, status.Error),
			"PodNest disaster recovery failed. Check the recovery status for details.")
	}
}

func (s *Server) apiDRSiteArchives(w http.ResponseWriter, r *http.Request) {
	archives, err := s.backup.ListDRSiteArchives(r.Context())
	if err != nil {
		apiutil.ErrorMsg(w, http.StatusServiceUnavailable, "could not read the latest recovery manifest")
		return
	}
	apiutil.JSON(w, http.StatusOK, archives)
}

type drDownloadWriter struct {
	http.ResponseWriter
	filename string
	started  bool
}

func (w *drDownloadWriter) ExportReady() {
	w.Header().Set("Content-Type", "application/gzip")
	w.Header().Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": w.filename}))
	w.Header().Set("Cache-Control", "no-store")
	w.started = true
}

func (s *Server) apiDRDownload(w http.ResponseWriter, r *http.Request) {
	download := &drDownloadWriter{ResponseWriter: w, filename: "podnest-application.tar.gz"}
	var err error
	if raw := r.PathValue("site"); raw != "" {
		id, parseErr := strconv.ParseInt(raw, 10, 64)
		if parseErr != nil || id <= 0 {
			apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid site ID")
			return
		}
		download.filename = fmt.Sprintf("podnest-site-%d.tar.gz", id)
		err = s.backup.ExportDRSite(r.Context(), id, download)
	} else {
		err = s.backup.ExportDRApplication(r.Context(), download)
	}
	if err != nil {
		logger.Warn("disaster recovery archive export: %v", err)
		if download.started {
			panic(http.ErrAbortHandler)
		}
		apiutil.ErrorMsg(w, http.StatusServiceUnavailable, "the recovery archive could not be prepared")
	}
}

func (s *Server) apiEnrollDisasterRecovery(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Passphrase string `json:"passphrase"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&input); err != nil {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid recovery enrollment request")
		return
	}
	if !s.drEnrollMu.TryLock() {
		apiutil.ErrorMsg(w, http.StatusConflict, "recovery key enrollment is already running")
		return
	}
	defer s.drEnrollMu.Unlock()

	if _, err := s.backup.EnrollDRKey(r.Context(), input.Passphrase); err != nil {
		if errors.Is(err, backup.ErrDRPassphraseLength) || errors.Is(err, backup.ErrDRKeyUnlock) {
			apiutil.ErrorMsg(w, http.StatusBadRequest, err.Error())
			return
		}
		logger.Warn("disaster recovery key enrollment failed: %v", err)
		apiutil.ErrorMsg(w, http.StatusServiceUnavailable, "Could not enroll the recovery key. Check the S3 settings and server log.")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
