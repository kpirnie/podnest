// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package modules

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	"podnest/internal/models"
)

// pmaSecNoNewPriv mirrors the per-module security option applied to all site containers.
const pmaSecNoNewPriv = "no-new-privileges:true"

// CreatePMAContainer creates and starts the phpMyAdmin container for a site pod.
// Shared across all database-backed type modules so a PMA env, hardening, or
// healthcheck change is a one-place edit.
func CreatePMAContainer(ctx context.Context, client PodmanClient, cfg PodConfig, podName string) error {
	// derive a stable blowfish secret from the root password
	h := sha256.Sum256([]byte(cfg.DBRootPass))
	blowfish := hex.EncodeToString(h[:])[:32]
	if err := client.CreateContainer(ctx, ContainerConfig{
		Name:    ContainerName(cfg.Site.Name, "pma"),
		Image:   models.ImgPMA,
		PodName: podName,
		Env: map[string]string{
			"PMA_HOST":                "127.0.0.1",
			"PMA_PORT":                "3306",
			"PMA_USER":                cfg.DBUser,
			"PMA_PASSWORD":            cfg.DBPass,
			"PMA_BLOWFISH_SECRET":     blowfish,
			"PMA_ABSOLUTE_URI":        fmt.Sprintf("/pma/%d/", cfg.Site.ID),
			"APACHE_PORT":             fmt.Sprintf("%d", models.PHPMyAdminPort),
			"PHP_MEMORY_LIMIT":        "512M",
			"PHP_MAX_EXECUTION_TIME":  "300",
			"PHP_UPLOAD_MAX_FILESIZE": "256M",
			"PHP_POST_MAX_SIZE":       "256M",
			"UPLOAD_LIMIT":            "256M",
		},
		CapDrop:     []string{"ALL"},
		CapAdd:      []string{"CHOWN", "SETUID", "SETGID", "DAC_OVERRIDE", "NET_BIND_SERVICE"},
		SecOpts:     []string{pmaSecNoNewPriv},
		Healthcheck: HC(HCRolePMA),
	}); err != nil {
		return fmt.Errorf("create pma: %w", err)
	}
	if err := client.StartContainer(ctx, ContainerName(cfg.Site.Name, "pma")); err != nil {
		return fmt.Errorf("start pma: %w", err)
	}
	return nil
}
