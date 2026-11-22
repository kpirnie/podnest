// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package server

import (
	"context"
	"encoding/json"
	"fmt"
	"mime"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"podnest/internal/apiutil"
	"podnest/internal/auth"
	"podnest/internal/backup"
	"podnest/internal/handlers/sites"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/web"
)

type drRestoreRequest struct {
	Retry bool   `json:"retry"`
	Name  string `json:"site,omitempty"`
}

func (s *Server) recoveryRoutes() http.Handler {
	mux := http.NewServeMux()
	_ = mime.AddExtensionType(".js", "text/javascript; charset=utf-8")
	_ = mime.AddExtensionType(".css", "text/css; charset=utf-8")
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.FS(web.Static))))
	mux.HandleFunc("/login", s.handleLogin)
	mux.HandleFunc("/login/totp", s.handleLoginTOTP)
	mux.HandleFunc("/logout", s.handleLogout)

	page := auth.RequireAuth(s.cfg.DB, auth.RequireAdmin(http.HandlerFunc(s.handleRecoveryPage)))
	mux.Handle("GET /{$}", page)
	mux.Handle("GET /dashboard", page)
	mux.Handle("GET /recovery", page)

	api := http.NewServeMux()
	s.registerRecoveryAPI(api)
	mux.Handle("/api/disaster-recovery/restore", http.StripPrefix("/api",
		limitAPIBody(s.auditMiddleware(auth.RequireAPIAuth(s.cfg.DB, api)))))
	return securityHeaders(mux)
}

func (s *Server) registerRecoveryAPI(api *http.ServeMux) {
	api.Handle("GET /disaster-recovery/restore", auth.RequireAPIAdmin(http.HandlerFunc(s.apiRecoveryStatus)))
	api.Handle("POST /disaster-recovery/restore", auth.RequireAPIAdmin(http.HandlerFunc(s.apiResumeRecovery)))
}

func (s *Server) handleRecoveryPage(w http.ResponseWriter, r *http.Request) {
	data := map[string]any{
		"CSRF": auth.CSRFTokenFromContext(r.Context()), "Nonce": cspNonce(r),
	}
	if err := web.Templates.ExecuteTemplate(w, "recovery.html", data); err != nil {
		logger.Error("render recovery page: %v", err)
	}
}

func (s *Server) apiRecoveryStatus(w http.ResponseWriter, r *http.Request) {
	status, err := s.backup.DRRestoreStatus(r.Context())
	if err != nil {
		apiutil.ErrorMsg(w, http.StatusInternalServerError, "could not read recovery progress")
		return
	}
	apiutil.JSON(w, http.StatusOK, struct {
		backup.DRRestoreStatus
		Busy bool `json:"busy"`
	}{status, s.restoreBusy.Load()})
}

func (s *Server) apiResumeRecovery(w http.ResponseWriter, r *http.Request) {
	var request drRestoreRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&request); err != nil ||
		len(request.Name) > 255 || (!request.Retry && request.Name != "") {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "invalid restoration request")
		return
	}
	active, err := s.backup.InDRRecovery()
	if err != nil {
		apiutil.ErrorMsg(w, http.StatusInternalServerError, "could not read initial recovery status")
		return
	}
	if active == request.Retry {
		apiutil.ErrorMsg(w, http.StatusConflict, "requested restore operation is unavailable")
		return
	}
	if !s.restoreBusy.CompareAndSwap(false, true) {
		apiutil.ErrorMsg(w, http.StatusConflict, "a restore operation is already running")
		return
	}
	select {
	case s.restoreRun <- request:
		w.WriteHeader(http.StatusAccepted)
	case <-s.ctx.Done():
		s.restoreBusy.Store(false)
		apiutil.ErrorMsg(w, http.StatusServiceUnavailable, "PodNest is shutting down")
	case <-r.Context().Done():
		s.restoreBusy.Store(false)
	}
}

func (s *Server) startRecoverySocket() error {
	dir := filepath.Join(s.cfg.AppPath, ".disaster-recovery")
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}
	path := filepath.Join(dir, backup.DRControlSocket)
	if info, err := os.Lstat(path); err == nil {
		if info.Mode()&os.ModeSocket == 0 {
			return fmt.Errorf("recovery control path is not a socket")
		}
		if err := os.Remove(path); err != nil {
			return err
		}
	} else if !os.IsNotExist(err) {
		return err
	}
	listener, err := net.Listen("unix", path)
	if err != nil {
		return err
	}
	if err := os.Chmod(path, 0600); err != nil {
		listener.Close()
		return err
	}
	// The socket is accessible only to the service account. Host pdnctl
	// connects through podman exec as that account.
	mux := http.NewServeMux()
	mux.HandleFunc("GET /", s.apiRecoveryStatus)
	mux.HandleFunc("POST /", s.apiResumeRecovery)
	server := &http.Server{Handler: mux, ReadHeaderTimeout: 5 * time.Second}
	s.goTracked(func() {
		if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
			logger.Error("recovery control socket: %v", err)
		}
	})
	s.goTracked(func() {
		<-s.ctx.Done()
		_ = server.Close()
	})
	return nil
}

func (s *Server) recoveryWorker() {
	for {
		select {
		case <-s.ctx.Done():
			return
		case request := <-s.restoreRun:
			s.runRecovery(request)
			s.restoreBusy.Store(false)
			if !request.Retry {
				active, err := s.backup.InDRRecovery()
				if err == nil && !active {
					// The service manager starts the normal panel only after the
					// durable recovery flag is cleared.
					ctx, cancel := context.WithTimeout(context.Background(), shutdownDrainTimeout)
					_ = s.http.Shutdown(ctx)
					cancel()
					s.cancel()
					return
				}
			}
		}
	}
}

func (s *Server) runRecovery(request drRestoreRequest) {
	ctx, cancel := context.WithTimeout(s.ctx, 12*time.Hour)
	defer cancel()
	handler := &sites.Handler{
		DB: s.cfg.DB, AppPath: s.cfg.AppPath, HostAppPath: s.cfg.HostAppPath,
		PodmanSock: s.cfg.PodmanSock, Podman: s.podman, PodmanClient: s.podman,
		WPUpdate: s.wpupdate, SFTP: s.sftp, Proxy: s.proxy, Backup: s.backup,
	}
	err := s.backup.RunDRRestore(ctx, request.Retry, request.Name, func(ctx context.Context, site *models.Site) error {
		_, err := handler.RecreateSite(ctx, site, nil, false, true)
		return err
	})
	if err != nil {
		logger.Warn("site recovery: %v", err)
	}
	if s.proxy != nil {
		_ = s.proxy.WarmCaches(false)
	}
}
