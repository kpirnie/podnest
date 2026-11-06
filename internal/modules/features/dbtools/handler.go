// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package dbtools

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"podnest/internal/apiutil"
	"podnest/internal/auth"
	"podnest/internal/backup"
	"podnest/internal/logger"
	"podnest/internal/models"
)

// downloadWriter holds back the attachment response headers until the first
// write, so a dump that fails before producing output can still return a JSON
// error instead of a zero-length 200 with a Content-Disposition attached.
type downloadWriter struct {
	w        http.ResponseWriter
	filename string
	token    string
	secure   bool
	ready    bool
}

// apiDumpDB streams a gzip-compressed dump of the site's database as a download.
func (m Module) apiDumpDB(w http.ResponseWriter, r *http.Request, site *models.Site) {
	if !m.AppliesTo(site.SiteType) {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "this site type has no database")
		return
	}
	filename := fmt.Sprintf("%s-%s.sql.gz", site.Name, time.Now().UTC().Format("2006-01-02-150405"))
	logger.Debug("apiDumpDB: streaming database for site %s as %s", site.Name, filename)
	dw := &downloadWriter{w: w, filename: filename, token: downloadToken(r.URL.Query().Get("dl")), secure: auth.IsSecure(r)}
	if err := m.Manager.DumpDB(r.Context(), site, dw); err != nil {
		logger.Error("apiDumpDB: site %d: %v", site.ID, err)
		if !dw.ready {
			apiutil.Error(w, http.StatusInternalServerError, err)
		}
	}
}

// apiListImportFiles returns the SQL dumps available in the site's SFTP import
// directory for selection via the UI
func (m Module) apiListImportFiles(w http.ResponseWriter, _ *http.Request, site *models.Site) {
	files, err := m.Manager.ListImportSQLFiles(site.Name)
	if err != nil {
		logger.Error("apiListImportFiles: site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	logger.Debug("apiListImportFiles: site %s — %d files", site.Name, len(files))
	apiutil.JSON(w, http.StatusOK, files)
}

// apiImportUpload accepts a multipart .sql / .sql.gz upload (max 512 MB),
// streams it to the site's import directory, then kicks off an async ImportSQL
func (m Module) apiImportUpload(w http.ResponseWriter, r *http.Request, site *models.Site) {
	if !m.AppliesTo(site.SiteType) {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "this site type has no database")
		return
	}

	// claim before reading the body so concurrent uploads are refused rather
	// than each streaming up to 512 MB to disk
	claim, err := m.Manager.BeginImport(site.ID)
	if err != nil {
		apiutil.ErrorMsg(w, http.StatusConflict, err.Error())
		return
	}
	handedOff := false
	defer func() {
		if !handedOff {
			claim.Release()
		}
	}()

	// enforce the 512 MB hard limit before touching the body
	const maxBytes = 512 << 20
	r.Body = http.MaxBytesReader(w, r.Body, maxBytes)

	if err := r.ParseMultipartForm(32 << 20); err != nil {
		if strings.Contains(err.Error(), "http: request body too large") {
			apiutil.ErrorMsg(w, http.StatusRequestEntityTooLarge,
				"Dump upload too large — upload it via SFTP and use Import From SFTP instead")
			return
		}
		logger.Error("apiImportUpload: parse form site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}

	fh, handler, err := r.FormFile("dump")
	if err != nil {
		logger.Error("apiImportUpload: form file site %d: %v", site.ID, err)
		apiutil.ErrorMsg(w, http.StatusBadRequest, "dump field missing")
		return
	}
	defer fh.Close()

	// validate extension
	name := handler.Filename
	if !backup.IsSQLDumpName(name) {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "unsupported dump format — use .sql or .sql.gz")
		return
	}
	ext := ".sql"
	if strings.HasSuffix(name, ".sql.gz") {
		ext = ".sql.gz"
	}
	wipe := r.FormValue("wipe") == "1"

	// ensure the import directory exists
	importDir := m.Manager.ImportDirFor(site.Name)
	if err := os.MkdirAll(importDir, 0750); err != nil {
		logger.Error("apiImportUpload: mkdir import dir site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	// stream directly to disk — never buffer the whole upload in RAM
	destPath := filepath.Join(importDir, fmt.Sprintf("upload-%d%s", time.Now().UnixNano(), ext))
	out, err := os.OpenFile(destPath, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0640)
	if err != nil {
		logger.Error("apiImportUpload: create dest file site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	if _, err := io.Copy(out, fh); err != nil {
		out.Close()
		os.Remove(destPath)
		logger.Error("apiImportUpload: write dump site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	out.Close()

	// kick off the import asynchronously; the job now owns the claim
	handedOff = true
	m.Manager.Go(func(ctx context.Context) {
		defer claim.Release()
		if err := m.Manager.ImportSQL(ctx, site, destPath, wipe); err != nil {
			logger.Error("apiImportUpload: ImportSQL site %d: %v", site.ID, err)
			return
		}
		logger.Debug("apiImportUpload: import complete for site %s", site.Name)
	})

	logger.Debug("apiImportUpload: queued SQL import for site %d (wipe=%v)", site.ID, wipe)
	apiutil.JSON(w, http.StatusAccepted, map[string]string{"status": "import started"})
}

// apiImportSFTP triggers an ImportSQL from a dump already present in the
// site's SFTP import directory
func (m Module) apiImportSFTP(w http.ResponseWriter, r *http.Request, site *models.Site) {
	if !m.AppliesTo(site.SiteType) {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "this site type has no database")
		return
	}
	if m.Manager.IsRestoring(site.ID) {
		apiutil.ErrorMsg(w, http.StatusConflict, "an import or restore is already running for this site")
		return
	}

	var req struct {
		Filename string `json:"filename"`
		Wipe     bool   `json:"wipe"`
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
	if !backup.IsSQLDumpName(req.Filename) {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "unsupported dump format")
		return
	}
	// reject any path traversal attempts in the filename
	if strings.Contains(req.Filename, "/") || strings.Contains(req.Filename, "..") {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid filename")
		return
	}

	dumpPath := filepath.Join(m.Manager.ImportDirFor(site.Name), req.Filename)
	if fi, err := os.Lstat(dumpPath); err != nil || !fi.Mode().IsRegular() {
		apiutil.ErrorMsg(w, http.StatusNotFound, "file not found in import directory")
		return
	}

	m.Manager.Go(func(ctx context.Context) {
		if err := m.Manager.ImportSQL(ctx, site, dumpPath, req.Wipe); err != nil {
			logger.Error("apiImportSFTP: ImportSQL site %d: %v", site.ID, err)
			return
		}
		logger.Debug("apiImportSFTP: import complete for site %s", site.Name)
	})

	logger.Debug("apiImportSFTP: queued SQL import of %s for site %d (wipe=%v)", req.Filename, site.ID, req.Wipe)
	apiutil.JSON(w, http.StatusAccepted, map[string]string{"status": "import started"})
}

// apiImportStatus returns whether an import is in progress for a site and the
// error from the last one, if it failed.
func (m Module) apiImportStatus(w http.ResponseWriter, _ *http.Request, site *models.Site) {
	apiutil.JSON(w, http.StatusOK, map[string]any{"active": m.Manager.IsRestoring(site.ID), "error": m.Manager.ImportError(site.ID)})
}

// apiSearchReplace runs a serialization-safe search-replace across a WordPress
// site's database via WP-CLI, or reports the replacement count on a dry run.
func (m Module) apiSearchReplace(w http.ResponseWriter, r *http.Request, site *models.Site) {
	if site.SiteType != models.SiteTypeWordPress {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "search-replace is only available for WordPress sites")
		return
	}
	if m.Manager.IsRestoring(site.ID) {
		apiutil.ErrorMsg(w, http.StatusConflict, "an import or restore is running for this site")
		return
	}

	var req struct {
		Search  string `json:"search"`
		Replace string `json:"replace"`
		DryRun  bool   `json:"dry_run"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("apiSearchReplace: decode site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}
	if msg := validateSearchReplace(req.Search, req.Replace); msg != "" {
		apiutil.ErrorMsg(w, http.StatusBadRequest, msg)
		return
	}

	// a live run must finish once started, so a dropped connection never
	// leaves the database half-replaced
	ctx := r.Context()
	if !req.DryRun {
		ctx = context.WithoutCancel(ctx)
	}

	count, err := m.Manager.SearchReplace(ctx, site, req.Search, req.Replace, req.DryRun)
	if err != nil {
		logger.Error("apiSearchReplace: site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("apiSearchReplace: site %d — %d replacements (dry_run=%v)", site.ID, count, req.DryRun)
	apiutil.JSON(w, http.StatusOK, map[string]any{"count": count, "dry_run": req.DryRun})
}

// validateSearchReplace bounds the search-replace terms at the handler edge,
// returning a message for the first problem found, or "" when they are usable
func validateSearchReplace(search, replace string) string {
	if search == "" {
		return "search is required"
	}
	if search == replace {
		return "search and replace are identical"
	}
	if len(search) > 1024 || len(replace) > 1024 {
		return "search and replace are limited to 1024 characters"
	}
	// wp-cli parses a leading dash as an option, so a term could otherwise
	// smuggle in flags such as --export or --url
	if strings.HasPrefix(search, "-") || strings.HasPrefix(replace, "-") {
		return "search and replace cannot start with a dash"
	}
	if strings.ContainsRune(search, 0) || strings.ContainsRune(replace, 0) {
		return "search and replace cannot contain NUL bytes"
	}
	return ""
}

// apiListTables returns the base tables in the site's database for selection
// in the optimize/repair list
func (m Module) apiListTables(w http.ResponseWriter, r *http.Request, site *models.Site) {
	if !m.AppliesTo(site.SiteType) {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "this site type has no database")
		return
	}
	tables, err := m.Manager.ListTables(r.Context(), site)
	if err != nil {
		logger.Error("apiListTables: site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	logger.Debug("apiListTables: site %s — %d tables", site.Name, len(tables))
	apiutil.JSON(w, http.StatusOK, tables)
}

// apiMaintainTables runs an optimize or repair over the selected tables and
// returns the per-table report
func (m Module) apiMaintainTables(w http.ResponseWriter, r *http.Request, site *models.Site) {
	if !m.AppliesTo(site.SiteType) {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "this site type has no database")
		return
	}
	if m.Manager.IsRestoring(site.ID) {
		apiutil.ErrorMsg(w, http.StatusConflict, "an import or restore is running for this site")
		return
	}

	var req struct {
		Action string   `json:"action"`
		Tables []string `json:"tables"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("apiMaintainTables: decode site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}
	if req.Action != "optimize" && req.Action != "repair" {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "action must be optimize or repair")
		return
	}
	if len(req.Tables) == 0 {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "select at least one table")
		return
	}
	if len(req.Tables) > 10000 {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "too many tables selected")
		return
	}

	// once started the tool runs to completion, so a dropped connection never
	// leaves a table mid-rebuild
	output, err := m.Manager.MaintainTables(context.WithoutCancel(r.Context()), site, req.Action, req.Tables)
	if err != nil {
		logger.Error("apiMaintainTables: site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("apiMaintainTables: %s on %d tables for site %d", req.Action, len(req.Tables), site.ID)
	apiutil.JSON(w, http.StatusOK, map[string]string{"output": output})
}

// Write emits the download response headers on first use.
func (d *downloadWriter) Write(p []byte) (int, error) {
	if !d.ready {
		d.ready = true
		h := d.w.Header()

		// the browser cannot signal the client when a download starts, so drop a
		// readable cookie here — the UI polls for it to dismiss its progress modal
		if d.token != "" {
			http.SetCookie(d.w, &http.Cookie{
				Name:     "kp_dl_" + d.token,
				Value:    "1",
				Path:     "/",
				Secure:   d.secure,
				SameSite: http.SameSiteStrictMode,
				MaxAge:   600,
			})
		}

		h.Set("Content-Type", "application/gzip")
		h.Set("Content-Disposition", "attachment; filename=\""+d.filename+"\"")
		h.Set("Cache-Control", "no-store")
		h.Set("X-Accel-Buffering", "no")
		d.w.WriteHeader(http.StatusOK)
	}
	return d.w.Write(p)
}

// downloadToken sanitises the client-supplied download correlation token,
// keeping only short alphanumeric values safe to echo back in a cookie name
func downloadToken(s string) string {
	if len(s) == 0 || len(s) > 32 {
		return ""
	}
	for _, r := range s {
		if (r < '0' || r > '9') && (r < 'a' || r > 'z') && (r < 'A' || r > 'Z') {
			return ""
		}
	}
	return s
}
