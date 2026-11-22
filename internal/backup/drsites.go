// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package backup

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"

	"podnest/internal/db"
	"podnest/internal/models"
	"podnest/internal/modules"
)

type drSitePoint struct {
	SiteID int64  `json:"site_id"`
	Name   string `json:"name"`
	Files  string `json:"files"`
	DB     string `json:"database,omitempty"`
}

func (m *Manager) captureDRSites(ctx context.Context, s3 *s3Config, nodeID, password string) ([]drSitePoint, error) {
	sites, err := db.GetAllSites(m.db)
	if err != nil {
		return nil, err
	}
	points := make([]drSitePoint, 0, len(sites))
	var failures error
	for _, site := range sites {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		point, err := m.captureDRSite(ctx, s3, nodeID, password, site)
		if err != nil {
			failures = errors.Join(failures, fmt.Errorf("site %s: %w", site.Name, err))
			continue
		}
		points = append(points, point)
	}
	return points, failures
}

func (m *Manager) captureDRSite(ctx context.Context, s3 *s3Config, nodeID, password string, site *models.Site) (drSitePoint, error) {
	point := drSitePoint{SiteID: site.ID, Name: site.Name}
	if site.ID <= 0 || !filepath.IsLocal(site.Name) || filepath.Base(site.Name) != site.Name || site.Name == "." {
		return point, errors.New("invalid site identity")
	}
	siteType := modules.TypeModule(site.SiteType)
	if siteType == nil {
		return point, errors.New("site type is unavailable")
	}
	claim, err := m.WaitClaim(ctx, site.ID, ClaimScheduled)
	if err != nil {
		return point, err
	}
	defer claim.Release()

	repo, env := drSiteRepo(s3, nodeID, password, site.ID)
	if err := initRepo(ctx, repo, env); err != nil {
		return point, err
	}
	tag, err := m.copyOrdinaryDRSite(ctx, s3, site, siteType.HasDatabase(), repo, env)
	if err != nil {
		if ctx.Err() != nil {
			return point, ctx.Err()
		}
	}
	if tag == "" {
		tag, err = m.backupDRSite(ctx, site, repo, env)
		if err != nil {
			return point, err
		}
	}
	point.Files, err = m.findSnapshot(ctx, repo, env, tag, "files")
	if err != nil {
		return point, err
	}
	if siteType.HasDatabase() {
		point.DB, err = m.findSnapshot(ctx, repo, env, tag, "db")
		if err != nil {
			return point, err
		}
	}

	// Check that repository trees and referenced data packs are intact. Restic
	// copy already authenticates pack contents as it copies ordinary backups.
	check := exec.CommandContext(ctx, resticBin, "-r", repo, "check")
	check.Env = env
	if err := check.Run(); err != nil {
		return point, fmt.Errorf("verify site repository: %w", err)
	}
	return point, nil
}

func drSiteRepo(s3 *s3Config, nodeID, password string, siteID int64) (string, []string) {
	repo := s3RepoURL(s3.endpoint, s3.bucket, drPrefix+nodeID+"/sites/"+strconv.FormatInt(siteID, 10))
	return repo, stripDRInstanceKey(resticEnv(password, s3))
}

func (m *Manager) copyOrdinaryDRSite(ctx context.Context, s3 *s3Config, site *models.Site, hasDatabase bool, repo string, env []string) (string, error) {
	ordinary, err := db.GetBackupRepo(m.db, site.ID)
	if err != nil || ordinary == nil {
		return "", err
	}
	backups, err := db.ListBackups(m.db, site.ID)
	if err != nil {
		return "", err
	}
	source := s3RepoURL(s3.endpoint, s3.bucket, site.Name)
	sourceEnv := stripDRInstanceKey(resticEnv(ordinary.RepoPassword, s3))
	for _, backup := range backups {
		// A local-typed record can also have an S3 copy. Check the underlying
		// repository instead of using the record's destination as proof.
		files, err := m.findSnapshot(ctx, source, sourceEnv, backup.SnapshotID, "files")
		if err != nil || !validDRSnapshotID(files) {
			continue
		}
		ids := []string{files}
		if hasDatabase {
			database, err := m.findSnapshot(ctx, source, sourceEnv, backup.SnapshotID, "db")
			if err != nil || !validDRSnapshotID(database) {
				continue
			}
			ids = append(ids, database)
		}
		if !validDRKey(ordinary.RepoPassword) {
			return "", errors.New("invalid ordinary repository password")
		}
		reader, writer, err := os.Pipe()
		if err != nil {
			return "", err
		}
		_, writeErr := writer.WriteString(ordinary.RepoPassword)
		if err := errors.Join(writeErr, writer.Close()); err != nil {
			reader.Close()
			return "", err
		}
		cmd := exec.CommandContext(ctx, resticBin, append([]string{
			"-r", repo, "copy", "--from-repo", source, "--from-password-file", "/proc/self/fd/3",
		}, ids...)...)
		cmd.Env = append(env, "RESTIC_FROM_PASSWORD=", "RESTIC_FROM_PASSWORD_COMMAND=")
		cmd.ExtraFiles = []*os.File{reader}
		copyErr := cmd.Run()
		reader.Close()
		if copyErr == nil {
			return backup.SnapshotID, nil
		}
		// Prefer a new backup if the latest entry could not be copied.
		return "", fmt.Errorf("copy ordinary site backup: %w", copyErr)
	}
	return "", nil
}

func (m *Manager) backupDRSite(ctx context.Context, site *models.Site, repo string, env []string) (string, error) {
	random, err := models.GenerateUHash()
	if err != nil {
		return "", err
	}
	tag := "podnest-dr-" + random
	siteDir := filepath.Join(m.appPath, "sites", site.Name)
	var paths []string
	for _, name := range []string{"html", "nginx", "php-fpm", "redis", ".env"} {
		path := filepath.Join(siteDir, name)
		if _, err := os.Lstat(path); os.IsNotExist(err) {
			continue
		} else if err != nil {
			return "", err
		}
		paths = append(paths, path)
	}
	if len(paths) == 0 {
		return "", errors.New("site has no files to back up")
	}
	excludes := []string{filepath.Join(siteDir, "nginx", "cache")}
	if _, err := m.backupFiles(ctx, repo, env, paths, excludes, tag); err != nil {
		return "", err
	}
	if err := m.backupDB(ctx, site, repo, env, tag, siteDir); err != nil {
		return "", err
	}
	return tag, nil
}

func pruneDRSites(ctx context.Context, s3 *s3Config, nodeID, password string, points []drSitePoint) error {
	var failures error
	for _, point := range points {
		repo, env := drSiteRepo(s3, nodeID, password, point.SiteID)
		if err := pruneDRSite(ctx, repo, env, point); err != nil {
			failures = errors.Join(failures, fmt.Errorf("retain site %s recovery point: %w", point.Name, err))
		}
	}
	return failures
}

func pruneDRSite(ctx context.Context, repo string, env []string, point drSitePoint) error {
	list := exec.CommandContext(ctx, resticBin, "-r", repo, "snapshots", "--json")
	list.Env = env
	raw, err := list.Output()
	if err != nil {
		return err
	}
	var snapshots []struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(raw, &snapshots); err != nil {
		return err
	}
	filesFound, dbFound := false, point.DB == ""
	var obsolete []string
	for _, snap := range snapshots {
		if !validDRSnapshotID(snap.ID) {
			return errors.New("Restic returned an invalid site snapshot ID")
		}
		switch snap.ID {
		case point.Files:
			filesFound = true
		case point.DB:
			dbFound = true
		default:
			obsolete = append(obsolete, snap.ID)
		}
	}
	if !filesFound || !dbFound {
		return errors.New("a published site snapshot is missing")
	}
	if len(obsolete) == 0 {
		return nil
	}
	cmd := exec.CommandContext(ctx, resticBin, append([]string{"-r", repo, "forget", "--prune"}, obsolete...)...)
	cmd.Env = env
	return cmd.Run()
}
