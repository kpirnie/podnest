// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package modules

// PodName returns the canonical pod name for a site.
func PodName(siteName string) string { return "pn-" + siteName }

// ContainerName returns the canonical container name for a site and role.
func ContainerName(siteName, role string) string { return PodName(siteName) + "-" + role }
