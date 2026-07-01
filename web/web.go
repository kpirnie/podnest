// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package web

import (
	"embed"
	"fmt"
	"html/template"
	"io/fs"
	"podnest/internal/logger"
	"time"
)

//go:embed static templates apidocs
var assets embed.FS

// APIDocs is the private filesystem for the admin-gated API reference assets
// (reference page, bootstrap, and OpenAPI spec) — deliberately kept out of the
// public /static/ mount so the API surface is only reachable by an admin.
var APIDocs fs.FS

// Static is the filesystem for serving /static/ assets
var Static fs.FS

// Templates is the parsed template set for UI pages
var Templates *template.Template

func init() {
	var err error

	// serve the static assets
	Static, err = fs.Sub(assets, "static")
	if err != nil {
		logger.Error("failed to sub static assets: %v", err)
		panic(fmt.Sprintf("failed to sub static assets: %v", err))
	}

	// serve the private API-docs assets — never exposed via /static/
	APIDocs, err = fs.Sub(assets, "apidocs")
	if err != nil {
		logger.Error("failed to sub apidocs assets: %v", err)
		panic(fmt.Sprintf("failed to sub apidocs assets: %v", err))
	}

	// try to parse the html templates
	Templates, err = template.New("").Funcs(template.FuncMap{

		// currentYear renders the current year server-side — avoids inline JS in templates
		"currentYear": func() int { return time.Now().Year() },
	}).ParseFS(assets, "templates/*.html")
	if err != nil {
		logger.Error("failed to parse templates: %v", err)
		panic(fmt.Sprintf("failed to parse templates: %v", err))
	}
}
