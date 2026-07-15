// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package version

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"
)

// AppVersion is set at build time via ldflags; defaults to "dev" for local builds
var AppVersion = "dev"

// ghRepo is the GitHub repository to check for releases
const ghRepo = "kpirnie/podnest"

// ghTagsURL is the GitHub API endpoint for the newest repository tag — releases
// are never published for this repo, tags are the single source of truth
const ghTagsURL = "https://api.github.com/repos/" + ghRepo + "/tags?per_page=1"

// ReleaseURL is the human-facing tags page showing the latest version
const ReleaseURL = "https://github.com/" + ghRepo + "/tags"

// UpdateURL is the direct link to the update instructions
const UpdateURL = "https://podnest.us/support/instructions/updating/"

// cache holds the result of the last GitHub API check to avoid hammering the API
var cache struct {
	sync.Mutex
	latest    string
	checkedAt time.Time
}

// cacheTTL is how long we cache the latest release tag before re-checking
const cacheTTL = 12 * time.Hour

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
		return cache.latest, versionsDiffer(cache.latest, AppVersion)
	}

	// fetch the latest release from GitHub
	tag, err := fetchLatestTag()
	if err != nil {
		// on failure, return stale cache if we have it, otherwise silently skip
		return cache.latest, cache.latest != "" && versionsDiffer(cache.latest, AppVersion)
	}

	// store the result in the cache
	cache.latest = tag
	cache.checkedAt = time.Now()

	return tag, versionsDiffer(tag, AppVersion)
}

// fetchLatestTag performs the HTTP request to the GitHub releases API and
// returns the tag_name of the latest release
func fetchLatestTag() (string, error) {
	client := &http.Client{Timeout: 5 * time.Second}

	req, err := http.NewRequest(http.MethodGet, ghTagsURL, nil)
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

	var tags []struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tags); err != nil {
		return "", fmt.Errorf("version: failed to decode response: %w", err)
	}

	if len(tags) == 0 || tags[0].Name == "" {
		return "", fmt.Errorf("version: no tags found")
	}

	return tags[0].Name, nil
}

// versionsDiffer compares two version strings, tolerating a v prefix mismatch
func versionsDiffer(a, b string) bool {
	return strings.TrimPrefix(a, "v") != strings.TrimPrefix(b, "v")
}
