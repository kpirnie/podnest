package backups

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"podnest/internal/apiutil"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
)

// apiGetBackupRepo returns the backup repo configuration for a site.
func (m Module) apiGetBackupRepo(w http.ResponseWriter, r *http.Request, site *models.Site) {
	repo, err := db.GetBackupRepo(m.DB, site.ID)
	if err != nil {
		logger.Error("apiGetBackupRepo: site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if repo == nil {
		repo = &models.BackupRepo{SiteID: site.ID}
	}
	// never expose the raw repo password to the client
	repo.RepoPassword = ""
	logger.Debug("apiGetBackupRepo: site %d", site.ID)
	apiutil.JSON(w, http.StatusOK, repo)
}

// apiUpdateBackupRepo updates the backup destination flags for a site.
func (m Module) apiUpdateBackupRepo(w http.ResponseWriter, r *http.Request, site *models.Site) {
	var req struct {
		LocalEnabled bool `json:"local_enabled"`
		S3Enabled    bool `json:"s3_enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("apiUpdateBackupRepo: decode: %v", err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}
	repo, err := m.Manager.EnsureRepo(r.Context(), site)
	if err != nil {
		logger.Error("apiUpdateBackupRepo: ensureRepo site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	repo.LocalEnabled = req.LocalEnabled
	repo.S3Enabled = req.S3Enabled
	if err := db.UpsertBackupRepo(m.DB, repo); err != nil {
		logger.Error("apiUpdateBackupRepo: upsert site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	logger.Debug("apiUpdateBackupRepo: updated site %d (local=%v s3=%v)", site.ID, req.LocalEnabled, req.S3Enabled)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// apiListBackups returns all backup records for a site, newest first.
func (m Module) apiListBackups(w http.ResponseWriter, _ *http.Request, site *models.Site) {
	backups, err := db.ListBackups(m.DB, site.ID)
	if err != nil {
		logger.Error("apiListBackups: site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if backups == nil {
		backups = []*models.Backup{}
	}
	logger.Debug("apiListBackups: site %d — %d records", site.ID, len(backups))
	apiutil.JSON(w, http.StatusOK, backups)
}

// apiCreateBackup triggers an immediate backup for a site.
func (m Module) apiCreateBackup(w http.ResponseWriter, r *http.Request, site *models.Site) {
	var req struct {
		Label string `json:"label"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	if req.Label == "" {
		req.Label = "manual"
	}
	go func() {
		ctx := context.Background()
		id, err := m.Manager.Backup(ctx, site, req.Label)
		if err != nil {
			logger.Error("apiCreateBackup: site %d: %v", site.ID, err)
			return
		}
		logger.Info("apiCreateBackup: backup %d complete for site %d", id, site.ID)
	}()
	logger.Debug("apiCreateBackup: queued backup for site %d", site.ID)
	apiutil.JSON(w, http.StatusAccepted, map[string]string{"status": "backup started"})
}

// apiRestoreBackup restores a site from the specified backup record.
func (m Module) apiRestoreBackup(w http.ResponseWriter, r *http.Request, site *models.Site) {
	bid, ok := parseBID(w, r)
	if !ok {
		return
	}
	backup, err := db.GetBackup(m.DB, bid)
	if err != nil {
		logger.Error("apiRestoreBackup: get backup %d: %v", bid, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if backup == nil {
		apiutil.ErrorMsg(w, http.StatusNotFound, "backup not found")
		return
	}
	if backup.SiteID != site.ID {
		apiutil.ErrorMsg(w, http.StatusForbidden, "backup does not belong to this site")
		return
	}
	go func() {
		ctx := context.Background()
		if err := m.Manager.Restore(ctx, site, backup); err != nil {
			logger.Error("apiRestoreBackup: site %d backup %d: %v", site.ID, bid, err)
			return
		}
		logger.Info("apiRestoreBackup: restore complete for site %d from backup %d", site.ID, bid)
	}()
	logger.Debug("apiRestoreBackup: queued restore for site %d from backup %d", site.ID, bid)
	apiutil.JSON(w, http.StatusAccepted, map[string]string{"status": "restore started"})
}

// apiRestoreStatus returns whether a restore is currently in progress for a site.
func (m Module) apiRestoreStatus(w http.ResponseWriter, _ *http.Request, site *models.Site) {
	active := m.Manager.IsRestoring(site.ID)
	apiutil.JSON(w, http.StatusOK, map[string]bool{"active": active})
}

// apiDeleteBackup removes a backup record and its associated restic snapshots.
func (m Module) apiDeleteBackup(w http.ResponseWriter, r *http.Request, site *models.Site) {
	bid, ok := parseBID(w, r)
	if !ok {
		return
	}
	backup, err := db.GetBackup(m.DB, bid)
	if err != nil {
		logger.Error("apiDeleteBackup: get backup %d: %v", bid, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if backup == nil {
		apiutil.ErrorMsg(w, http.StatusNotFound, "backup not found")
		return
	}
	if backup.SiteID != site.ID {
		apiutil.ErrorMsg(w, http.StatusForbidden, "backup does not belong to this site")
		return
	}
	if err := m.Manager.DeleteSnapshot(r.Context(), site, backup); err != nil {
		logger.Error("apiDeleteBackup: delete snapshots for backup %d: %v", bid, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if err := db.DeleteBackup(m.DB, bid); err != nil {
		logger.Error("apiDeleteBackup: delete record %d: %v", bid, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	logger.Debug("apiDeleteBackup: deleted backup %d for site %d", bid, site.ID)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// apiDownloadBackup streams the backup as a gzip-compressed tar archive.
func (m Module) apiDownloadBackup(w http.ResponseWriter, r *http.Request, site *models.Site) {
	bid, ok := parseBID(w, r)
	if !ok {
		return
	}
	backup, err := db.GetBackup(m.DB, bid)
	if err != nil {
		logger.Error("apiDownloadBackup: get backup %d: %v", bid, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if backup == nil {
		apiutil.ErrorMsg(w, http.StatusNotFound, "backup not found")
		return
	}
	if backup.SiteID != site.ID {
		apiutil.ErrorMsg(w, http.StatusForbidden, "backup does not belong to this site")
		return
	}
	filename := fmt.Sprintf("%s-%s-%d.tar.gz",
		site.Name,
		backup.Created.UTC().Format("2006-01-02"),
		backup.ID,
	)
	w.Header().Set("Content-Type", "application/gzip")
	w.Header().Set("Content-Disposition", "attachment; filename=\""+filename+"\"")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Accel-Buffering", "no")
	logger.Info("apiDownloadBackup: streaming backup %d for site %s as %s", bid, site.Name, filename)
	if err := m.Manager.Export(r.Context(), site, backup, w); err != nil {
		logger.Error("apiDownloadBackup: export failed for backup %d: %v", bid, err)
	}
}

// parseBID parses the {bid} path value and writes an error response on failure.
func parseBID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	bidStr := r.PathValue("bid")
	bid, err := strconv.ParseInt(bidStr, 10, 64)
	if err != nil {
		logger.Error("parseBID: invalid backup id '%s'", bidStr)
		apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid backup id")
		return 0, false
	}
	return bid, true
}
