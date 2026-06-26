// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package reverseproxy

import "podnest/internal/modules"

// scaffoldDir is a no-op; reverse proxy sites require no filesystem structure
// or config files on disk.
func scaffoldDir(_ string, _ modules.ScaffoldConfig) error {
	return nil
}
