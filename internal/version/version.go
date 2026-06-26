// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package version

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

// AppVersion is set at build time via ldflags; defaults to "dev" for local builds
var AppVersion = "dev"

// ghRepo is the GitHub repository to check for releases
const ghRepo = "kpirnie/podnest"

// ghReleaseURL is the GitHub API endpoint for the latest release
const ghReleaseURL = "https://api.github.com/repos/" + ghRepo + "/releases/latest"

// ReleaseURL is the human-facing releases page for the latest release
const ReleaseURL = "https://github.com/" + ghRepo + "/releases/latest"

// UpdateURL is the direct link to the update instructions
const UpdateURL = "https://github.com/" + ghRepo + "/blob/main/UPDATE.md"

// cache holds the result of the last GitHub API check to avoid hammering the API
var cache struct {
	sync.Mutex
	latest    string
	checkedAt time.Time
}

// cacheTTL is how long we cache the latest release tag before re-checking
const cacheTTL = 12 * time.Hour

// ghRelease is the subset of the GitHub releases API response we care about
type ghRelease struct {
	TagName string `json:"tag_name"`
}

// CheckLatest queries the GitHub releases API (with caching) and returns the
// latest tag and whether it differs from the running AppVersion.
// Returns ("", false) if AppVersion is "dev" or the check fails.
func CheckLatest() (latest string, updateAvailable bool) {

	// skip the check entirely for local/dev builds
	if AppVersion == "dev" {
		return "", false
	}

	cache.Lock()
	defer cache.Unlock()

	// return cached result if it is still fresh
	if cache.latest != "" && time.Since(cache.checkedAt) < cacheTTL {
		return cache.latest, cache.latest != AppVersion
	}

	// fetch the latest release from GitHub
	tag, err := fetchLatestTag()
	if err != nil {
		// on failure, return stale cache if we have it, otherwise silently skip
		return cache.latest, cache.latest != "" && cache.latest != AppVersion
	}

	// store the result in the cache
	cache.latest = tag
	cache.checkedAt = time.Now()

	return tag, tag != AppVersion
}

// fetchLatestTag performs the HTTP request to the GitHub releases API and
// returns the tag_name of the latest release
func fetchLatestTag() (string, error) {
	client := &http.Client{Timeout: 5 * time.Second}

	req, err := http.NewRequest(http.MethodGet, ghReleaseURL, nil)
	if err != nil {
		return "", fmt.Errorf("version: failed to build request: %w", err)
	}

	// identify ourselves to GitHub so we are not rate-limited as an anonymous scraper
	req.Header.Set("User-Agent", "podnest-version-check/"+AppVersion)
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("version: GitHub request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("version: GitHub API returned %d", resp.StatusCode)
	}

	var rel ghRelease
	if err := json.NewDecoder(resp.Body).Decode(&rel); err != nil {
		return "", fmt.Errorf("version: failed to decode response: %w", err)
	}

	if rel.TagName == "" {
		return "", fmt.Errorf("version: empty tag_name in response")
	}

	return rel.TagName, nil
}
