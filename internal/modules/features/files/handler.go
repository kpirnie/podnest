// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package files

import (
	"encoding/json"
	"errors"
	"net/http"
	"path"
	"strings"

	"podnest/internal/apiutil"
	"podnest/internal/fileops"
	"podnest/internal/logger"
	"podnest/internal/models"
)

// worker builds a per-request fileops manager scoped to the given site.
func (m Module) worker(site *models.Site) *fileops.Manager {
	return fileops.New(m.Podman, m.SFTP, site.Name, site.ID)
}

// apiList returns the directory listing at ?path= relative to the html root.
func (m Module) apiList(w http.ResponseWriter, r *http.Request, site *models.Site) {
	entries, err := m.worker(site).List(r.Context(), r.URL.Query().Get("path"))
	if err != nil {
		writeFileErr(w, "list", site, err)
		return
	}
	apiutil.JSON(w, http.StatusOK, entries)
}

// apiRead returns the text contents of ?path= for the editor.
func (m Module) apiRead(w http.ResponseWriter, r *http.Request, site *models.Site) {
	fc, err := m.worker(site).Read(r.Context(), r.URL.Query().Get("path"))
	if err != nil {
		writeFileErr(w, "read", site, err)
		return
	}
	apiutil.JSON(w, http.StatusOK, fc)
}

// apiDownload streams ?path= to the client as an attachment. Headers are set on
// the first byte written, so an early error (missing/non-regular file) yields a
// clean JSON error instead of a 200 with attachment headers.
func (m Module) apiDownload(w http.ResponseWriter, r *http.Request, site *models.Site) {
	rel := r.URL.Query().Get("path")

	lw := &lazyAttachmentWriter{w: w, filename: path.Base(rel)}
	if err := m.worker(site).Download(r.Context(), rel, lw); err != nil {
		if !lw.wrote {
			writeFileErr(w, "download", site, err)
			return
		}
		// headers already flushed mid-stream; nothing left but to log it
		logger.Error("files: download stream failed for site %d path %q: %v", site.ID, rel, err)
	}
}

// apiWrite saves edited text from JSON {path, content}.
func (m Module) apiWrite(w http.ResponseWriter, r *http.Request, site *models.Site) {
	var body struct {
		Path    string `json:"path"`
		Content string `json:"content"`
	}
	if err := decodeJSON(r, &body); err != nil {
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}
	if err := m.worker(site).Write(r.Context(), body.Path, body.Content); err != nil {
		writeFileErr(w, "write", site, err)
		return
	}
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// apiUpload streams the raw request body to the file at ?path=.
func (m Module) apiUpload(w http.ResponseWriter, r *http.Request, site *models.Site) {
	defer r.Body.Close()

	// bound the stream — Upload writes straight to disk, so an unbounded body
	// fills the site's volume. Anything larger belongs on SFTP.
	const maxBytes = 512 << 20
	r.Body = http.MaxBytesReader(w, r.Body, maxBytes)

	if err := m.worker(site).Upload(r.Context(), r.URL.Query().Get("path"), r.Body); err != nil {
		writeFileErr(w, "upload", site, err)
		return
	}
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// apiMkdir creates a directory from JSON {path}.
func (m Module) apiMkdir(w http.ResponseWriter, r *http.Request, site *models.Site) {
	rel, err := decodePath(r)
	if err != nil {
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}
	if err := m.worker(site).Mkdir(r.Context(), rel); err != nil {
		writeFileErr(w, "mkdir", site, err)
		return
	}
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// apiNewFile creates an empty file from JSON {path}.
func (m Module) apiNewFile(w http.ResponseWriter, r *http.Request, site *models.Site) {
	rel, err := decodePath(r)
	if err != nil {
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}
	if err := m.worker(site).NewFile(r.Context(), rel); err != nil {
		writeFileErr(w, "create", site, err)
		return
	}
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// apiMove renames or moves an entry from JSON {src, dst}.
func (m Module) apiMove(w http.ResponseWriter, r *http.Request, site *models.Site) {
	src, dst, err := decodeSrcDst(r)
	if err != nil {
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}
	if err := m.worker(site).Move(r.Context(), src, dst); err != nil {
		writeFileErr(w, "move", site, err)
		return
	}
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// apiCopy duplicates an entry from JSON {src, dst}.
func (m Module) apiCopy(w http.ResponseWriter, r *http.Request, site *models.Site) {
	src, dst, err := decodeSrcDst(r)
	if err != nil {
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}
	if err := m.worker(site).Copy(r.Context(), src, dst); err != nil {
		writeFileErr(w, "copy", site, err)
		return
	}
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// apiChmod sets permissions from JSON {path, mode}.
func (m Module) apiChmod(w http.ResponseWriter, r *http.Request, site *models.Site) {
	var body struct {
		Path string `json:"path"`
		Mode string `json:"mode"`
	}
	if err := decodeJSON(r, &body); err != nil {
		apiutil.Error(w, http.StatusBadRequest, err)
		return
	}
	if err := m.worker(site).Chmod(r.Context(), body.Path, body.Mode); err != nil {
		writeFileErr(w, "chmod", site, err)
		return
	}
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// apiDelete removes the file or directory at ?path=.
func (m Module) apiDelete(w http.ResponseWriter, r *http.Request, site *models.Site) {
	if err := m.worker(site).Delete(r.Context(), r.URL.Query().Get("path")); err != nil {
		writeFileErr(w, "delete", site, err)
		return
	}
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// decodeJSON reads a JSON request body into v, rejecting unknown fields.
func decodeJSON(r *http.Request, v any) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}

// decodePath reads JSON {path} and returns the path field.
func decodePath(r *http.Request) (string, error) {
	var body struct {
		Path string `json:"path"`
	}
	if err := decodeJSON(r, &body); err != nil {
		return "", err
	}
	return body.Path, nil
}

// decodeSrcDst reads JSON {src, dst} and returns both fields.
func decodeSrcDst(r *http.Request) (string, string, error) {
	var body struct {
		Src string `json:"src"`
		Dst string `json:"dst"`
	}
	if err := decodeJSON(r, &body); err != nil {
		return "", "", err
	}
	return body.Src, body.Dst, nil
}

// writeFileErr maps a fileops error to the appropriate HTTP status and response.
func writeFileErr(w http.ResponseWriter, op string, site *models.Site, err error) {
	logger.Debug("files: %s failed for site %d: %v", op, site.ID, err)

	switch {
	case errors.Is(err, fileops.ErrPathEscape), errors.Is(err, fileops.ErrRootProtected):
		apiutil.Error(w, http.StatusForbidden, err)
	case errors.Is(err, fileops.ErrExists):
		apiutil.Error(w, http.StatusConflict, err)
	case errors.Is(err, fileops.ErrTooLarge):
		apiutil.Error(w, http.StatusRequestEntityTooLarge, err)
	case errors.Is(err, fileops.ErrBinary),
		errors.Is(err, fileops.ErrNotFile),
		errors.Is(err, fileops.ErrBadMode),
		errors.Is(err, fileops.ErrWorldWritable),
		errors.Is(err, fileops.ErrSetuid),
		errors.Is(err, fileops.ErrBelowFloor):
		apiutil.Error(w, http.StatusBadRequest, err)
	case strings.Contains(err.Error(), "No such file"):
		apiutil.Error(w, http.StatusNotFound, err)
	default:
		apiutil.Error(w, http.StatusInternalServerError, err)
	}
}

// lazyAttachmentWriter sets attachment download headers on the first byte written,
// so a pre-stream error can still produce a clean JSON error response. A neutral
// octet-stream content type ensures downloaded content can never execute in the
// panel origin.
type lazyAttachmentWriter struct {
	w        http.ResponseWriter
	filename string
	wrote    bool
}

// Write sets the download headers once, then forwards bytes to the response.
func (l *lazyAttachmentWriter) Write(p []byte) (int, error) {
	if !l.wrote {
		l.wrote = true
		l.w.Header().Set("Content-Type", "application/octet-stream")
		l.w.Header().Set("X-Content-Type-Options", "nosniff")
		l.w.Header().Set("Content-Disposition", "attachment; filename=\""+sanitizeFilename(l.filename)+"\"")
	}
	return l.w.Write(p)
}

// sanitizeFilename strips characters that would break or inject into the
// Content-Disposition header.
func sanitizeFilename(name string) string {
	name = strings.NewReplacer("\"", "", "\\", "", "\r", "", "\n", "").Replace(name)
	if name == "" {
		return "download"
	}
	return name
}
