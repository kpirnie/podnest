package server

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"podnest/internal/db"
	"podnest/internal/logger"
)

// apiGetSettings returns all known settings as a key/value JSON object
func (s *Server) apiGetSettings(w http.ResponseWriter, r *http.Request) {

	// hold the known setting keys we expose through the API
	keys := []string{
		"admin_domain",
	}

	// build the output map by fetching each key from the database
	out := make(map[string]string, len(keys))
	for _, k := range keys {
		val, err := db.GetSetting(s.cfg.DB, k)
		if err != nil {
			logger.Error("apiGetSettings: failed to retrieve setting '%s': %v", k, err)
			apiError(w, http.StatusInternalServerError, err)
			return
		}
		out[k] = val
	}

	logger.Debug("retrieved settings")
	apiJSON(w, http.StatusOK, out)
}

// apiUpdateSettings accepts a JSON key/value map and persists each known setting
func (s *Server) apiUpdateSettings(w http.ResponseWriter, r *http.Request) {

	// decode the incoming key/value map from the request body
	var incoming map[string]string
	if err := json.NewDecoder(r.Body).Decode(&incoming); err != nil {
		logger.Error("apiUpdateSettings: failed to decode request body: %v", err)
		apiError(w, http.StatusBadRequest, err)
		return
	}

	// hold the set of keys we allow to be updated through this endpoint
	allowed := map[string]bool{
		"admin_domain": true,
	}

	// iterate over the incoming map and persist only the allowed keys
	for k, v := range incoming {
		if !allowed[k] {
			logger.Warn("apiUpdateSettings: rejected unknown setting key '%s'", k)
			continue
		}
		if err := db.SetSetting(s.cfg.DB, k, v); err != nil {
			logger.Error("apiUpdateSettings: failed to persist setting '%s': %v", k, err)
			apiError(w, http.StatusInternalServerError, err)
			return
		}

		// apply live changes for settings that affect running components
		s.applySettingLive(k, v)
	}

	logger.Debug("updated settings")
	apiJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// apiExportSettings streams all known settings as a CSV download
func (s *Server) apiExportSettings(w http.ResponseWriter, r *http.Request) {

	// hold the known setting keys we expose through the API
	keys := []string{
		"admin_domain",
	}

	// build the output map by fetching each key from the database
	out := make(map[string]string, len(keys))
	for _, k := range keys {
		val, err := db.GetSetting(s.cfg.DB, k)
		if err != nil {
			logger.Error("apiExportSettings: failed to retrieve setting '%s': %v", k, err)
			apiError(w, http.StatusInternalServerError, err)
			return
		}
		out[k] = val
	}

	// stream as a CSV attachment
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, "podnest-settings.csv"))

	cw := csv.NewWriter(w)
	_ = cw.Write([]string{"key", "value"})
	for k, v := range out {
		_ = cw.Write([]string{k, v})
	}
	cw.Flush()

	logger.Debug("apiExportSettings: exported settings as CSV")
}

// apiImportSettings reads a CSV file upload and upserts each known setting
func (s *Server) apiImportSettings(w http.ResponseWriter, r *http.Request) {

	// parse the multipart form — limit to 1MB
	if err := r.ParseMultipartForm(1 << 20); err != nil {
		logger.Error("apiImportSettings: failed to parse multipart form: %v", err)
		apiError(w, http.StatusBadRequest, err)
		return
	}

	// pull the uploaded file from the "file" field
	f, _, err := r.FormFile("file")
	if err != nil {
		logger.Error("apiImportSettings: missing file field: %v", err)
		apiErrorMsg(w, http.StatusBadRequest, "file field is required")
		return
	}
	defer f.Close()

	// hold the set of keys we allow to be updated through this endpoint
	allowed := map[string]bool{
		"admin_domain": true,
	}

	// parse the CSV rows
	cr := csv.NewReader(io.LimitReader(f, 1<<20))
	cr.FieldsPerRecord = 2
	cr.Comment = '#'

	// read and discard the header row if present
	header, err := cr.Read()
	if err != nil {
		logger.Error("apiImportSettings: failed to read CSV: %v", err)
		apiErrorMsg(w, http.StatusBadRequest, "invalid CSV")
		return
	}
	if strings.ToLower(header[0]) != "key" {
		// not a header row — treat as data
		if allowed[header[0]] {
			if err := db.SetSetting(s.cfg.DB, header[0], header[1]); err != nil {
				logger.Error("apiImportSettings: failed to set '%s': %v", header[0], err)
				apiError(w, http.StatusInternalServerError, err)
				return
			}
			s.applySettingLive(header[0], header[1])
		}
	}

	// process remaining rows
	for {
		rec, err := cr.Read()
		if err != nil {
			break
		}
		if !allowed[rec[0]] {
			logger.Warn("apiImportSettings: skipping unknown key '%s'", rec[0])
			continue
		}
		if err := db.SetSetting(s.cfg.DB, rec[0], rec[1]); err != nil {
			logger.Error("apiImportSettings: failed to set '%s': %v", rec[0], err)
			apiError(w, http.StatusInternalServerError, err)
			return
		}
		s.applySettingLive(rec[0], rec[1])
	}

	logger.Debug("apiImportSettings: imported settings from CSV")
	apiJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// applySettingLive applies live side-effects for a setting key/value pair
func (s *Server) applySettingLive(k, v string) {
	switch k {
	case "admin_domain":
		s.proxy.SetAdminDomain(v)
		if v != "" {
			s.proxy.ObtainCert(v)
		}
	}
}
