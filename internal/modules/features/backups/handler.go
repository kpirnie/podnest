package backups

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

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
		logger.Debug("apiCreateBackup: backup %d complete for site %d", id, site.ID)
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
		logger.Debug("apiRestoreBackup: restore complete for site %d from backup %d", site.ID, bid)
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
	logger.Debug("apiDownloadBackup: streaming backup %d for site %s as %s", bid, site.Name, filename)
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

// apiListImportFiles returns the list of archive files available in the
// site's SFTP import directory for selection via the UI
func (m Module) apiListImportFiles(w http.ResponseWriter, r *http.Request, site *models.Site) {
	files, err := m.Manager.ListImportFiles(site.Name)
	if err != nil {
		logger.Error("apiListImportFiles: site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	logger.Debug("apiListImportFiles: site %s — %d files", site.Name, len(files))
	apiutil.JSON(w, http.StatusOK, files)
}

// apiImportUpload accepts a multipart archive upload (max 512 MB), streams it
// to the site's import directory, then kicks off an async ImportRestore
func (m Module) apiImportUpload(w http.ResponseWriter, r *http.Request, site *models.Site) {
	// enforce the 512 MB hard limit before touching the body
	const maxBytes = 512 << 20
	r.Body = http.MaxBytesReader(w, r.Body, maxBytes)

	if err := r.ParseMultipartForm(32 << 20); err != nil {
		if strings.Contains(err.Error(), "http: request body too large") {
			apiutil.ErrorMsg(w, http.StatusRequestEntityTooLarge,
				"Import upload too large — upload it via SFTP and use Import From SFTP instead")
			return
		}
		logger.Error("apiImportUpload: parse form site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	// resolve the target site from the form field; defaults to the current site
	targetSite, ok := m.resolveImportTarget(w, r, site)
	if !ok {
		return
	}

	fh, handler, err := r.FormFile("archive")
	if err != nil {
		logger.Error("apiImportUpload: form file site %d: %v", site.ID, err)
		apiutil.ErrorMsg(w, http.StatusBadRequest, "archive field missing")
		return
	}
	defer fh.Close()

	// validate extension
	name := handler.Filename
	if !validArchiveName(name) {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "unsupported archive format — use .tar.gz, .tar.xz, or .zip")
		return
	}

	// ensure the import directory exists
	importDir := m.Manager.ImportDirFor(site.Name)
	if err := os.MkdirAll(importDir, 0750); err != nil {
		logger.Error("apiImportUpload: mkdir import dir site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// stream directly to disk — never buffer the whole upload in RAM
	destPath := filepath.Join(importDir, fmt.Sprintf("upload-%d%s", time.Now().UnixNano(), archiveExt(name)))
	out, err := os.OpenFile(destPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0640)
	if err != nil {
		logger.Error("apiImportUpload: create dest file site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if _, err := io.Copy(out, fh); err != nil {
		out.Close()
		os.Remove(destPath)
		logger.Error("apiImportUpload: write archive site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	out.Close()

	// kick off the restore asynchronously
	go func() {
		ctx := context.Background()
		if err := m.Manager.ImportRestore(ctx, targetSite, destPath); err != nil {
			logger.Error("apiImportUpload: ImportRestore site %d: %v", targetSite.ID, err)
			return
		}
		logger.Debug("apiImportUpload: import complete for site %s", targetSite.Name)
	}()

	logger.Debug("apiImportUpload: queued import restore for site %d → target %d", site.ID, targetSite.ID)
	apiutil.JSON(w, http.StatusAccepted, map[string]string{"status": "import started"})
}

// apiImportSFTP triggers an ImportRestore from a file already present in the
// site's SFTP import directory
func (m Module) apiImportSFTP(w http.ResponseWriter, r *http.Request, site *models.Site) {
	var req struct {
		Filename string `json:"filename"`
		TargetID int64  `json:"target_site_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("apiImportSFTP: decode site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}
	if req.Filename == "" {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "filename is required")
		return
	}
	if !validArchiveName(req.Filename) {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "unsupported archive format")
		return
	}
	// reject any path traversal attempts in the filename
	if strings.Contains(req.Filename, "/") || strings.Contains(req.Filename, "..") {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid filename")
		return
	}

	archivePath := filepath.Join(m.Manager.ImportDirFor(site.Name), req.Filename)
	if _, err := os.Stat(archivePath); err != nil {
		apiutil.ErrorMsg(w, http.StatusNotFound, "file not found in import directory")
		return
	}

	// resolve target site
	targetSite := site
	if req.TargetID != 0 && req.TargetID != site.ID {
		var err error
		targetSite, err = db.GetSiteByID(m.DB, req.TargetID)
		if err != nil || targetSite == nil {
			apiutil.ErrorMsg(w, http.StatusBadRequest, "target site not found")
			return
		}
	}

	go func() {
		ctx := context.Background()
		if err := m.Manager.ImportRestore(ctx, targetSite, archivePath); err != nil {
			logger.Error("apiImportSFTP: ImportRestore site %d: %v", targetSite.ID, err)
			return
		}
		logger.Debug("apiImportSFTP: import complete for site %s", targetSite.Name)
	}()

	logger.Debug("apiImportSFTP: queued SFTP import for site %d → target %d", site.ID, targetSite.ID)
	apiutil.JSON(w, http.StatusAccepted, map[string]string{"status": "import started"})
}

// resolveImportTarget returns the target site for an import operation.
// If target_site_id is present in the form and differs from the current site,
// it loads and returns that site instead.
func (m Module) resolveImportTarget(w http.ResponseWriter, r *http.Request, current *models.Site) (*models.Site, bool) {
	idStr := r.FormValue("target_site_id")
	if idStr == "" {
		return current, true
	}
	targetID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil || targetID == current.ID {
		return current, true
	}
	target, err := db.GetSiteByID(m.DB, targetID)
	if err != nil || target == nil {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "target site not found")
		return nil, false
	}
	return target, true
}

// validArchiveName reports whether the filename has a supported archive extension
func validArchiveName(name string) bool {
	return strings.HasSuffix(name, ".tar.gz") ||
		strings.HasSuffix(name, ".tar.xz") ||
		strings.HasSuffix(name, ".zip")
}

// archiveExt returns the full compound extension for an archive filename
func archiveExt(name string) string {
	switch {
	case strings.HasSuffix(name, ".tar.gz"):
		return ".tar.gz"
	case strings.HasSuffix(name, ".tar.xz"):
		return ".tar.xz"
	default:
		return ".zip"
	}
}
