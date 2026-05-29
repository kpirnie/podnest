package web

import (
	"embed"
	"fmt"
	"html/template"
	"io/fs"
	"podnest/internal/logger"
	"time"
)

//go:embed static templates
var assets embed.FS

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

	// try to parse thhtml templates
	Templates, err = template.New("").Funcs(template.FuncMap{
		// currentYear renders the current year server-side — avoids inline JS in templates
		"currentYear": func() int { return time.Now().Year() },
	}).ParseFS(assets, "templates/*.html")
	if err != nil {
		logger.Error("failed to parse templates: %v", err)
		panic(fmt.Sprintf("failed to parse templates: %v", err))
	}
}
