package server

import (
	"net/http"

	"podnest/internal/auth"
	"podnest/internal/db"
	"podnest/internal/logger"
)

// apiRegenerateSFTPPassword generates a new SFTP password for a site with zero downtime
func (s *Server) apiRegenerateSFTPPassword(w http.ResponseWriter, r *http.Request) {

	// resolve the site from the request path
	site, ok := s.resolveSite(w, r)
	if !ok {
		logger.Error("failed to resolve site: %v", r)
		return
	}

	// generate a new password
	newPassword, err := auth.GeneratePassword()
	if err != nil {
		logger.Error("failed to generate SFTP password for site %d: %v", site.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// update the password in the running container
	if err := s.sftp.RegeneratePassword(r.Context(), site.Name, newPassword); err != nil {
		logger.Error("failed to regenerate SFTP password for site %d: %v", site.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	// persist the new password to the database
	if err := db.UpdateSFTPPassword(s.cfg.DB, site.ID, newPassword); err != nil {
		logger.Error("failed to persist new SFTP password for site %d: %v", site.ID, err)
		apiError(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("SFTP password regenerated for site %d", site.ID)
	apiJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
