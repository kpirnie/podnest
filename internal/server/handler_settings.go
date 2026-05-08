package server

import (
	"encoding/json"
	"net/http"

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
		switch k {
		case "admin_domain":
			s.proxy.SetAdminDomain(v)
			if v != "" {
				s.proxy.ObtainCert(v)
			}
		}
	}

	logger.Debug("updated settings")
	apiJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
