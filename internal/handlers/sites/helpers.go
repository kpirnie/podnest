// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package sites

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"podnest/internal/fileutil"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/podman"
	"time"
)

// cloneDatabase copies the database from the source site to the clone site.
func (h *Handler) cloneDatabase(ctx context.Context, src, clone *models.Site) error {

	// setup paths
	srcSiteDir := h.sitesBase() + "/" + src.Name
	cloneSiteDir := h.sitesBase() + "/" + clone.Name

	// read DB_ROOT_PASS from .env files
	srcRootPass, err := fileutil.ReadEnvValue(srcSiteDir+"/.env", "DB_ROOT_PASS")
	if err != nil {
		return fmt.Errorf("cloneDatabase: read src DB_ROOT_PASS: %w", err)
	}
	cloneRootPass, err := fileutil.ReadEnvValue(cloneSiteDir+"/.env", "DB_ROOT_PASS")
	if err != nil {
		return fmt.Errorf("cloneDatabase: read clone DB_ROOT_PASS: %w", err)
	}

	// create temp file for mysqldump output
	tmp, err := os.CreateTemp("", "podnest-clone-*.sql")
	if err != nil {
		return fmt.Errorf("cloneDatabase: create temp file: %w", err)
	}
	defer os.Remove(tmp.Name())

	// set up environment for podman exec commands
	podEnv := append(os.Environ(), "CONTAINER_HOST=unix://"+h.PodmanSock, "TMPDIR=/var/tmp")
	srcDBContainer := podman.ContainerName(src.Name, "db")

	// run mysqldump inside the source DB container
	var dumpStderr bytes.Buffer
	dumpCmd := exec.CommandContext(ctx, "podman", "exec", "-e", "MYSQL_PWD", srcDBContainer,
		"sh", "-c",
		fmt.Sprintf(
			"mysqldump -uroot --single-transaction --quick --routines %s 2>/dev/null || "+
				"mariadb-dump -uroot --single-transaction --quick --routines %s",
			src.Name, src.Name,
		),
	)

	// capped append forces a new backing array so dump/restore envs don't alias;
	// MYSQL_PWD via -e (name only) keeps the password out of argv on host + container
	dumpCmd.Env = append(podEnv[:len(podEnv):len(podEnv)], "MYSQL_PWD="+srcRootPass)

	// redirect stdout to temp file and stderr to buffer
	dumpCmd.Stdout = tmp
	dumpCmd.Stderr = &dumpStderr
	if err := dumpCmd.Run(); err != nil {
		tmp.Close()
		return fmt.Errorf("cloneDatabase: mysqldump: %w — %s", err, dumpStderr.String())
	}
	tmp.Close()

	// copy the dump file into the clone DB container
	cloneDBContainer := podman.ContainerName(clone.Name, "db")
	cpCmd := exec.CommandContext(ctx, "podman", "cp", tmp.Name(), cloneDBContainer+":/tmp/podnest-clone.sql")
	cpCmd.Env = podEnv
	if out, err := cpCmd.CombinedOutput(); err != nil {
		return fmt.Errorf("cloneDatabase: podman cp: %w — %s", err, string(out))
	}

	// run mariadb to restore the dump inside the clone DB container
	var mysqlStderr bytes.Buffer
	mysqlCmd := exec.CommandContext(ctx, "podman", "exec", "-e", "MYSQL_PWD", cloneDBContainer,
		"sh", "-c",
		fmt.Sprintf(
			"mariadb -uroot %s < /tmp/podnest-clone.sql && rm /tmp/podnest-clone.sql",
			clone.Name,
		),
	)
	mysqlCmd.Env = append(podEnv[:len(podEnv):len(podEnv)], "MYSQL_PWD="+cloneRootPass)
	mysqlCmd.Stderr = &mysqlStderr
	if err := mysqlCmd.Run(); err != nil {
		return fmt.Errorf("cloneDatabase: mariadb restore: %w — %s", err, mysqlStderr.String())
	}

	// log success and return
	logger.Debug("cloneDatabase: DB cloned from '%s' to '%s'", src.Name, clone.Name)
	return nil
}

// confirmPodRunning checks if the pod is running within the timeout period for the site type.
func (h *Handler) confirmPodRunning(ctx context.Context, podName string, siteType int) bool {

	// default timeout is 30 seconds, but some site types may require more time to start up
	timeout := 30 * time.Second
	if m := modules.TypeModule(siteType); m != nil {
		timeout = m.StartupTimeout()
	}
	deadline := time.Now().Add(timeout)

	// poll the pod state until it is running or the timeout expires
	for time.Now().Before(deadline) {
		inspect, err := h.Podman.InspectPod(ctx, podName)
		if err == nil && inspect.State == "Running" {
			return true
		}
		select {
		case <-ctx.Done():
			return false
		case <-time.After(2 * time.Second):
		}
	}

	// log a warning if the pod did not start in time
	logger.Warn("confirmPodRunning: pod '%s' did not start within %v", podName, timeout)
	return false
}

// clearDirContents removes all files and directories within the specified directory.
func clearDirContents(dir string) error {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	for _, e := range entries {
		if err := os.RemoveAll(dir + "/" + e.Name()); err != nil {
			return err
		}
	}
	return nil
}

// maybeUpgradeMariaDB runs mariadb-upgrade inside the DB container if the
// MariaDB version has changed since the data directory was last initialised.
// It is a no-op for site types without a database.
func (h *Handler) maybeUpgradeMariaDB(ctx context.Context, site *models.Site) {

	// skip if the site type does not have a database
	if !modules.TypeModule(site.SiteType).HasDatabase() {
		return
	}

	// read DB_ROOT_PASS from the site's .env file
	rootPass, err := fileutil.ReadEnvValue(
		filepath.Join(h.sitesBase(), site.Name, ".env"), "DB_ROOT_PASS",
	)
	if err != nil {
		logger.Warn("maybeUpgradeMariaDB: site %s: read DB_ROOT_PASS: %v", site.Name, err)
		return
	}

	// get the name of the DB container for the site
	dbContainer := modules.ContainerName(site.Name, "db")

	// retry for up to 2 minutes — the DB is usually still initializing right after the pod comes up
	deadline := time.Now().Add(2 * time.Minute)
	for {
		cmd := exec.CommandContext(ctx, "podman",
			"exec", "--user=mysql", dbContainer,
			"mariadb-upgrade", "-uroot", "-p"+rootPass,
		)
		cmd.Env = append(os.Environ(), "CONTAINER_HOST=unix://"+h.PodmanSock)
		out, err := cmd.CombinedOutput()
		if err == nil {
			break
		}
		if time.Now().After(deadline) {
			logger.Warn("maybeUpgradeMariaDB: site %s: %v — %s", site.Name, err, string(out))
			return
		}
		time.Sleep(5 * time.Second)
	}

	// log that the upgrade check is complete
	logger.Debug("maybeUpgradeMariaDB: upgrade check complete for site %s", site.Name)
}
