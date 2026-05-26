package apiutil

import (
	"encoding/json"
	"net/http"

	"podnest/internal/logger"
)

// JSON writes v as a JSON response with the given HTTP status code.
func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		logger.Error("failed to encode JSON response: %v", err)
	}
	logger.Debug("api json response %d: %v", status, v)
}

// Error writes a JSON error response derived from an error value.
func Error(w http.ResponseWriter, status int, err error) {
	logger.Debug("api error response %d: %v", status, err)
	JSON(w, status, map[string]string{"error": err.Error()})
}

// ErrorMsg writes a JSON error response with a plain message string.
func ErrorMsg(w http.ResponseWriter, status int, msg string) {
	logger.Debug("api error response %d: %s", status, msg)
	JSON(w, status, map[string]string{"error": msg})
}
