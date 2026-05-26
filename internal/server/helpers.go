package server

import (
	"net/http"

	"podnest/internal/apiutil"
)

// apiJSON writes v as a JSON response body with the given HTTP status code.
func apiJSON(w http.ResponseWriter, status int, v any)          { apiutil.JSON(w, status, v) }
func apiError(w http.ResponseWriter, status int, err error)     { apiutil.Error(w, status, err) }
func apiErrorMsg(w http.ResponseWriter, status int, msg string) { apiutil.ErrorMsg(w, status, msg) }
