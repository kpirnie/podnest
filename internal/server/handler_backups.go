package server

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"

	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
)

// -- repo config -------------------------------------------------------------

// apiGetBackupRepo returns the backup repo configuration for a site
func (s *Server) apiGetBackupRepo(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}

	repo, err := db.GetBackupRepo(s.cfg.DB, site.ID)
	if err != nil {
		logger.Error("apiGetBackupRepo: site %d: %v", site.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// return an empty-but-valid struct if no repo has been configured yet
	if repo == nil {
		repo = &models.BackupRepo{SiteID: site.ID}
	}

	// never expose the raw repo password to the client
	repo.RepoPassword = ""

	logger.Debug("apiGetBackupRepo: site %d", site.ID)
	apiJSON(w, http.StatusOK, repo)
}

// apiUpdateBackupRepo updates the backup destination flags for a site
func (s *Server) apiUpdateBackupRepo(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}

	var req struct {
		LocalEnabled bool `json:"local_enabled"`
		S3Enabled    bool `json:"s3_enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("apiUpdateBackupRepo: decode: %v", err)
		apiError(w, http.StatusBadRequest, err)
		return
	}

	// load or initialise the repo record — ensureRepo handles password generation
	repo, err := s.backup.EnsureRepo(r.Context(), site)
	if err != nil {
		logger.Error("apiUpdateBackupRepo: ensureRepo site %d: %v", site.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	repo.LocalEnabled = req.LocalEnabled
	repo.S3Enabled = req.S3Enabled

	if err := db.UpsertBackupRepo(s.cfg.DB, repo); err != nil {
		logger.Error("apiUpdateBackupRepo: upsert site %d: %v", site.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("apiUpdateBackupRepo: updated site %d (local=%v s3=%v)", site.ID, req.LocalEnabled, req.S3Enabled)
	apiJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// -- backup list / create ----------------------------------------------------

// apiListBackups returns all backup records for a site, newest first
func (s *Server) apiListBackups(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}

	backups, err := db.ListBackups(s.cfg.DB, site.ID)
	if err != nil {
		logger.Error("apiListBackups: site %d: %v", site.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// return an empty slice rather than null
	if backups == nil {
		backups = []*models.Backup{}
	}

	logger.Debug("apiListBackups: site %d — %d records", site.ID, len(backups))
	apiJSON(w, http.StatusOK, backups)
}

// apiCreateBackup triggers an immediate backup for a site
func (s *Server) apiCreateBackup(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}

	var req struct {
		Label string `json:"label"`
	}
	// label is optional — decode only if a body was sent
	_ = json.NewDecoder(r.Body).Decode(&req)
	if req.Label == "" {
		req.Label = "manual"
	}

	// run the backup in a detached goroutine so the HTTP response returns
	// immediately; the client can poll the backup list for completion
	go func() {
		ctx := context.Background()
		id, err := s.backup.Backup(ctx, site, req.Label)
		if err != nil {
			logger.Error("apiCreateBackup: site %d: %v", site.ID, err)
			return
		}
		logger.Info("apiCreateBackup: backup %d complete for site %d", id, site.ID)
	}()

	logger.Debug("apiCreateBackup: queued backup for site %d", site.ID)
	apiJSON(w, http.StatusAccepted, map[string]string{"status": "backup started"})
}

// -- restore -----------------------------------------------------------------

// apiRestoreBackup restores a site from the specified backup record
func (s *Server) apiRestoreBackup(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}

	// parse the backup ID from the path
	bidStr := r.PathValue("bid")
	bid, err := strconv.ParseInt(bidStr, 10, 64)
	if err != nil {
		logger.Error("apiRestoreBackup: invalid backup id '%s'", bidStr)
		apiErrorMsg(w, http.StatusBadRequest, "invalid backup id")
		return
	}

	backup, err := db.GetBackup(s.cfg.DB, bid)
	if err != nil {
		logger.Error("apiRestoreBackup: get backup %d: %v", bid, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	if backup == nil {
		apiErrorMsg(w, http.StatusNotFound, "backup not found")
		return
	}

	// ensure the backup belongs to the requested site
	if backup.SiteID != site.ID {
		apiErrorMsg(w, http.StatusForbidden, "backup does not belong to this site")
		return
	}

	// run the restore in a detached goroutine; maintenance mode is managed
	// internally by the backup manager
	go func() {
		ctx := context.Background()
		if err := s.backup.Restore(ctx, site, backup); err != nil {
			logger.Error("apiRestoreBackup: site %d backup %d: %v", site.ID, bid, err)
			return
		}
		logger.Info("apiRestoreBackup: restore complete for site %d from backup %d", site.ID, bid)
	}()

	logger.Debug("apiRestoreBackup: queued restore for site %d from backup %d", site.ID, bid)
	apiJSON(w, http.StatusAccepted, map[string]string{"status": "restore started"})
}

// apiRestoreStatus returns whether a restore is currently in progress for a site
func (s *Server) apiRestoreStatus(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}
	active := s.backup.IsRestoring(site.ID)
	apiJSON(w, http.StatusOK, map[string]bool{"active": active})
}

// -- delete ------------------------------------------------------------------

// apiDeleteBackup removes a backup record and its associated restic snapshots
func (s *Server) apiDeleteBackup(w http.ResponseWriter, r *http.Request) {
	site, ok := s.resolveSite(w, r)
	if !ok {
		return
	}

	bidStr := r.PathValue("bid")
	bid, err := strconv.ParseInt(bidStr, 10, 64)
	if err != nil {
		logger.Error("apiDeleteBackup: invalid backup id '%s'", bidStr)
		apiErrorMsg(w, http.StatusBadRequest, "invalid backup id")
		return
	}

	backup, err := db.GetBackup(s.cfg.DB, bid)
	if err != nil {
		logger.Error("apiDeleteBackup: get backup %d: %v", bid, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}
	if backup == nil {
		apiErrorMsg(w, http.StatusNotFound, "backup not found")
		return
	}
	if backup.SiteID != site.ID {
		apiErrorMsg(w, http.StatusForbidden, "backup does not belong to this site")
		return
	}

	// delete the restic snapshots from all repos before removing the DB record
	if err := s.backup.DeleteSnapshot(r.Context(), site, backup); err != nil {
		logger.Error("apiDeleteBackup: delete snapshots for backup %d: %v", bid, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	if err := db.DeleteBackup(s.cfg.DB, bid); err != nil {
		logger.Error("apiDeleteBackup: delete record %d: %v", bid, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("apiDeleteBackup: deleted backup %d for site %d", bid, site.ID)
	apiJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
