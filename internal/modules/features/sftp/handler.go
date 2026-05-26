package sftp

import (
	"net/http"

	"podnest/internal/apiutil"
	"podnest/internal/auth"
	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
)

// apiRegenerateSFTPPassword generates a new SFTP password for a site with zero downtime.
func (m Module) apiRegenerateSFTPPassword(w http.ResponseWriter, r *http.Request, site *models.Site) {
	newPassword, err := auth.GeneratePassword()
	if err != nil {
		logger.Error("failed to generate SFTP password for site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	if err := m.Manager.RegeneratePassword(r.Context(), site.Name, newPassword); err != nil {
		logger.Error("failed to regenerate SFTP password for site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	if err := db.UpdateSFTPPassword(m.DB, site.ID, newPassword); err != nil {
		logger.Error("failed to persist new SFTP password for site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("SFTP password regenerated for site %d", site.ID)
	apiutil.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
