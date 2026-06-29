// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package files

import (
	"context"
	"net/http"

	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/podman"
	"podnest/internal/sftp"
)

// Module implements modules.FeatureModule for the per-site file manager. File
// work is delegated to a fileops.Manager built per request, which exec's into
// the global SFTP container as the site UID — so this module only needs the
// podman client and SFTP manager to construct that per-site worker.
type Module struct {
	Podman *podman.Client
	SFTP   *sftp.Manager
}

// FeatureID returns the unique key for this feature.
func (m Module) FeatureID() string { return "files" }

// AppliesTo reports that the file manager is available for site types that have
// SFTP credentials — i.e. those with a writable html root and a user in the SFTP
// container, which is exactly what the exec path requires.
func (m Module) AppliesTo(siteType int) bool {
	mod := modules.TypeModule(siteType)
	return mod != nil && mod.HasSFTP()
}

// Tabs returns site-detail tab descriptors for the file manager feature.
func (m Module) Tabs(_ *models.Site) []modules.TabDescriptor { return nil }

// RegisterRoutes mounts all file manager HTTP handlers onto the provided mux.
// State-changing methods (PUT/POST/PATCH/DELETE) are audited automatically by the
// outer /api/ audit middleware; read-only GET routes are intentionally not.
func (m Module) RegisterRoutes(mux *http.ServeMux, resolve modules.SiteResolver) {

	// directory listing — ?path= relative to the html root
	mux.HandleFunc("GET /sites/{id}/files", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiList(w, r, site)
	})

	// read a text file into the editor — ?path=
	mux.HandleFunc("GET /sites/{id}/files/content", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiRead(w, r, site)
	})

	// download a file as an attachment — ?path=
	mux.HandleFunc("GET /sites/{id}/files/download", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiDownload(w, r, site)
	})

	// save edited text — JSON {path, content}
	mux.HandleFunc("PUT /sites/{id}/files/content", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiWrite(w, r, site)
	})

	// upload a file into a directory — ?path= destination, raw body is the content
	mux.HandleFunc("POST /sites/{id}/files/upload", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiUpload(w, r, site)
	})

	// create a new directory — JSON {path}
	mux.HandleFunc("POST /sites/{id}/files/dir", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiMkdir(w, r, site)
	})

	// create a new empty file — JSON {path}
	mux.HandleFunc("POST /sites/{id}/files/file", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiNewFile(w, r, site)
	})

	// rename or move — JSON {src, dst}
	mux.HandleFunc("POST /sites/{id}/files/move", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiMove(w, r, site)
	})

	// copy — JSON {src, dst}
	mux.HandleFunc("POST /sites/{id}/files/copy", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiCopy(w, r, site)
	})

	// set permissions — JSON {path, mode}
	mux.HandleFunc("PATCH /sites/{id}/files/chmod", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiChmod(w, r, site)
	})

	// delete a file or directory — ?path=
	mux.HandleFunc("DELETE /sites/{id}/files", func(w http.ResponseWriter, r *http.Request) {
		site, ok := resolve(w, r)
		if !ok {
			return
		}
		m.apiDelete(w, r, site)
	})
}

// OnSiteCreate is a no-op; the html directory is provisioned by the site type module.
func (m Module) OnSiteCreate(_ context.Context, _ *models.Site) error { return nil }

// OnSiteDelete is a no-op; the html directory is removed with the site pod and tree.
func (m Module) OnSiteDelete(_ context.Context, _ *models.Site) error { return nil }
