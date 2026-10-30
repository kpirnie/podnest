// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package server

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"runtime"
	"strings"
	"sync"
	"time"

	"podnest/internal/logger"
	"podnest/internal/version"
)

// panelUpdateTTL is how long a registry check of the panel's image is reused
const panelUpdateTTL = 1 * time.Hour

// panelUpdateTimeout bounds one registry check so a slow registry cannot stall page loads
const panelUpdateTimeout = 10 * time.Second

// panelUpdate caches the last registry check of the panel's own image
var panelUpdate struct {
	sync.Mutex
	available bool
	checkedAt time.Time
}

// panelContainerInfo is the slice of the panel container's inspect data the update check needs
type panelContainerInfo struct {
	Image     string `json:"Image"`
	ImageName string `json:"ImageName"`
}

// panelUpdateAvailable reports whether the registry holds a newer build of the
// image tag this panel container is running, cached for panelUpdateTTL. A
// failed check keeps the previous result and is not retried until the TTL
// passes, so an unreachable registry never slows every page load.
func (s *Server) panelUpdateAvailable() bool {
	if version.AppVersion == "dev" {
		return false
	}

	panelUpdate.Lock()
	defer panelUpdate.Unlock()

	if !panelUpdate.checkedAt.IsZero() && time.Since(panelUpdate.checkedAt) < panelUpdateTTL {
		return panelUpdate.available
	}
	panelUpdate.checkedAt = time.Now()

	ctx, cancel := context.WithTimeout(s.ctx, panelUpdateTimeout)
	defer cancel()

	available, err := s.checkPanelImage(ctx)
	if err != nil {
		logger.Warn("selfupdate: image check failed: %v", err)
		return panelUpdate.available
	}
	panelUpdate.available = available
	return available
}

// panelContainer inspects the panel's own container, by hostname first and
// then by the default container name
func (s *Server) panelContainer(ctx context.Context) (*panelContainerInfo, error) {
	hostname, _ := os.Hostname()
	for _, name := range []string{hostname, "podnest"} {
		if name == "" {
			continue
		}
		var info panelContainerInfo
		if err := s.podman.GetJSON(ctx, "/v4.0.0/libpod/containers/"+url.QueryEscape(name)+"/json", &info); err == nil && info.Image != "" && info.ImageName != "" {
			return &info, nil
		}
	}
	return nil, fmt.Errorf("panel container not found")
}

// checkPanelImage compares the image the panel container was started from
// against the registry's current build of the same tag for this platform. The
// running container's image ID is used rather than the tag, because a tag
// pulled since startup no longer points at what is actually running.
func (s *Server) checkPanelImage(ctx context.Context) (bool, error) {
	ctr, err := s.panelContainer(ctx)
	if err != nil {
		return false, err
	}

	var img struct {
		Digest      string   `json:"Digest"`
		RepoDigests []string `json:"RepoDigests"`
	}
	if err := s.podman.GetJSON(ctx, "/v4.0.0/libpod/images/"+url.QueryEscape(ctr.Image)+"/json", &img); err != nil {
		return false, fmt.Errorf("image inspect %s: %w", ctr.Image, err)
	}

	// libpod's manifest inspect reads the remote index for an ordinary local
	// image — it carries no top-level digest, only one per platform
	var remote struct {
		Manifests []struct {
			Digest   string `json:"digest"`
			Platform struct {
				OS           string `json:"os"`
				Architecture string `json:"architecture"`
			} `json:"platform"`
		} `json:"manifests"`
	}
	if err := s.podman.GetJSON(ctx, "/v4.0.0/libpod/manifests/"+url.QueryEscape(ctr.ImageName)+"/json", &remote); err != nil {
		return false, fmt.Errorf("manifest inspect %s: %w", ctr.ImageName, err)
	}

	want := ""
	for _, m := range remote.Manifests {
		if m.Platform.OS == "linux" && m.Platform.Architecture == runtime.GOARCH {
			want = m.Digest
			break
		}
	}
	if want == "" {
		return false, fmt.Errorf("no linux/%s build in %s", runtime.GOARCH, ctr.ImageName)
	}

	if img.Digest == want {
		return false, nil
	}
	for _, rd := range img.RepoDigests {
		if strings.HasSuffix(rd, "@"+want) {
			return false, nil
		}
	}
	return true, nil
}
