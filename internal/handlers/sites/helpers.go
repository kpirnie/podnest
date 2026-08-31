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
	"podnest/internal/db"
	"podnest/internal/fileutil"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/podman"
	"podnest/internal/sftp"
	"regexp"
	"strings"
	"time"
)

// siteNameStrip matches every character not permitted in a site name.
var siteNameStrip = regexp.MustCompile(`[^a-z0-9_\-]`)

// siteNameValid matches a fully normalized, acceptable site name.
var siteNameValid = regexp.MustCompile(`^[a-z0-9][a-z0-9_\-]{0,62}$`)

// NormalizeSiteName lowercases a requested site name, replaces disallowed
// characters with hyphens, and validates the result.
func NormalizeSiteName(name string) (string, error) {

	// normalize case and strip surrounding whitespace before filtering
	clean := siteNameStrip.ReplaceAllString(strings.ToLower(strings.TrimSpace(name)), "-")

	// reject rather than silently mangle — a leading hyphen would read as a
	// flag in podman and shell argument positions, and an empty or over-long
	// name has no valid pod or directory to map to
	if !siteNameValid.MatchString(clean) {
		return "", fmt.Errorf("NormalizeSiteName: invalid site name %q", name)
	}

	// return the safe name
	return clean, nil
}

// ValidateSiteVersions checks that a requested site type has a registered
// module and that the version selectors resolve to a real image tag. An
// unregistered type leaves TypeModule returning nil for every later caller to
// dereference, and an unknown version silently falls back to a default.
func ValidateSiteVersions(siteType, phpVersion int, runtimeVersion *int) error {

	// the type must be one the registry knows how to provision
	if modules.TypeModule(siteType) == nil {
		return fmt.Errorf("ValidateSiteVersions: unknown site type %d", siteType)
	}

	// php version is a map key, not a free integer
	if _, ok := models.PHPVersionMap[phpVersion]; phpVersion != 0 && !ok {
		return fmt.Errorf("ValidateSiteVersions: unknown php version %d", phpVersion)
	}

	// runtime version only applies to the runtime-backed types
	if runtimeVersion != nil {
		switch siteType {
		case models.SiteTypeNode:
			if _, ok := models.NodeVersionMap[*runtimeVersion]; !ok {
				return fmt.Errorf("ValidateSiteVersions: unknown node version %d", *runtimeVersion)
			}
		case models.SiteTypeDotNet:
			if _, ok := models.DotNetVersionMap[*runtimeVersion]; !ok {
				return fmt.Errorf("ValidateSiteVersions: unknown dotnet version %d", *runtimeVersion)
			}
		}
	}

	// valid
	return nil
}

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

// renameDatabase moves every object in oldDB into newDB inside the site's
// running DB container and drops the old schema. Base tables move with RENAME
// TABLE; views and stored routines do not, so whatever is left behind is
// dumped and replayed into the new schema before the drop.
func (h *Handler) renameDatabase(ctx context.Context, site *models.Site, oldDB, newDB, dbUser, rootPass string) error {

	// the pod is still up under the old name at this point
	dbContainer := podman.ContainerName(site.Name, "db")
	podEnv := append(os.Environ(), "CONTAINER_HOST=unix://"+h.PodmanSock, "TMPDIR=/var/tmp")

	// quote an identifier for use in a statement
	ident := func(s string) string {
		return "`" + strings.ReplaceAll(s, "`", "``") + "`"
	}

	// run a statement batch in the site's DB container
	run := func(sql string) error {
		var stderr bytes.Buffer
		cmd := exec.CommandContext(ctx, "podman", "exec", "-e", "MYSQL_PWD", dbContainer,
			"mariadb", "-uroot", "-e", sql,
		)
		cmd.Env = append(podEnv[:len(podEnv):len(podEnv)], "MYSQL_PWD="+rootPass)
		cmd.Stderr = &stderr
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("renameDatabase: mariadb: %w — %s", err, stderr.String())
		}
		return nil
	}

	// the target schema has to exist before anything can move into it
	if err := run(fmt.Sprintf("CREATE DATABASE IF NOT EXISTS %s", ident(newDB))); err != nil {
		return err
	}

	// list the base tables living in the old schema
	var listStderr bytes.Buffer
	listCmd := exec.CommandContext(ctx, "podman", "exec", "-e", "MYSQL_PWD", dbContainer,
		"mariadb", "-uroot", "-N", "-B", "-e",
		fmt.Sprintf(
			"SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA='%s' AND TABLE_TYPE='BASE TABLE'",
			strings.ReplaceAll(oldDB, "'", "''"),
		),
	)
	listCmd.Env = append(podEnv[:len(podEnv):len(podEnv)], "MYSQL_PWD="+rootPass)
	listCmd.Stderr = &listStderr
	out, err := listCmd.Output()
	if err != nil {
		return fmt.Errorf("renameDatabase: table list: %w — %s", err, listStderr.String())
	}

	// build a single RENAME TABLE covering every base table so the move is atomic
	var moves []string
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		if line == "" {
			continue
		}
		moves = append(moves, fmt.Sprintf("%s.%s TO %s.%s", ident(oldDB), ident(line), ident(newDB), ident(line)))
	}
	if len(moves) > 0 {
		if err := run("RENAME TABLE " + strings.Join(moves, ", ")); err != nil {
			return err
		}
	}

	// whatever remains in the old schema is views and routines — dump it
	var dumpStderr bytes.Buffer
	dumpCmd := exec.CommandContext(ctx, "podman", "exec", "-e", "MYSQL_PWD", dbContainer,
		"sh", "-c",
		fmt.Sprintf(
			"mysqldump -uroot --no-data --routines --skip-lock-tables %s 2>/dev/null || "+
				"mariadb-dump -uroot --no-data --routines --skip-lock-tables %s",
			ident(oldDB), ident(oldDB),
		),
	)
	dumpCmd.Env = append(podEnv[:len(podEnv):len(podEnv)], "MYSQL_PWD="+rootPass)
	dumpCmd.Stderr = &dumpStderr
	leftovers, err := dumpCmd.Output()
	if err != nil {
		return fmt.Errorf("renameDatabase: dump views/routines: %w — %s", err, dumpStderr.String())
	}

	// replay them into the new schema with the old schema qualifier swapped out
	replay := strings.ReplaceAll(string(leftovers), ident(oldDB), ident(newDB))
	if strings.Contains(replay, "CREATE") {
		var loadStderr bytes.Buffer
		loadCmd := exec.CommandContext(ctx, "podman", "exec", "-i", "-e", "MYSQL_PWD", dbContainer,
			"mariadb", "-uroot", newDB,
		)
		loadCmd.Env = append(podEnv[:len(podEnv):len(podEnv)], "MYSQL_PWD="+rootPass)
		loadCmd.Stdin = strings.NewReader(replay)
		loadCmd.Stderr = &loadStderr
		if err := loadCmd.Run(); err != nil {
			return fmt.Errorf("renameDatabase: replay views/routines: %w — %s", err, loadStderr.String())
		}
	}

	// point the site's DB user at the new schema and drop the old one
	if err := run(fmt.Sprintf(
		"GRANT ALL ON %s.* TO '%s'@'%%'; REVOKE ALL PRIVILEGES ON %s.* FROM '%s'@'%%'; DROP DATABASE IF EXISTS %s; FLUSH PRIVILEGES;",
		ident(newDB), strings.ReplaceAll(dbUser, "'", "''"),
		ident(oldDB), strings.ReplaceAll(dbUser, "'", "''"),
		ident(oldDB),
	)); err != nil {
		return err
	}

	// log success and return
	logger.Debug("renameDatabase: '%s' → '%s' for site %s", oldDB, newDB, site.Name)
	return nil
}

// setEnvValue rewrites a single KEY=VALUE line in a site's .env file, leaving
// every other line and the file's permissions as they were.
func setEnvValue(path, key, value string) error {
	raw, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("setEnvValue: read %s: %w", path, err)
	}

	// replace the matching line in place rather than rewriting the whole file
	prefix := key + "="
	lines := strings.Split(string(raw), "\n")
	for i, l := range lines {
		if strings.HasPrefix(l, prefix) {
			lines[i] = prefix + value
		}
	}

	if err := os.WriteFile(path, []byte(strings.Join(lines, "\n")), 0600); err != nil {
		return fmt.Errorf("setEnvValue: write %s: %w", path, err)
	}
	return nil
}

// wpDBNamePattern matches the DB_NAME define in a wp-config.php.
var wpDBNamePattern = regexp.MustCompile(`(define\(\s*['"]DB_NAME['"]\s*,\s*)(['"])(?:[^'"]*)(['"])`)

// setWPConfigDBName repoints an existing wp-config.php at the renamed schema.
// A site without one — every non-WordPress type — is not an error.
func setWPConfigDBName(path, dbName string) error {
	raw, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("setWPConfigDBName: read: %w", err)
	}

	// keep the file's mode and ownership by writing back over it in place
	info, err := os.Stat(path)
	if err != nil {
		return fmt.Errorf("setWPConfigDBName: stat: %w", err)
	}

	src := wpDBNamePattern.ReplaceAllString(string(raw), "${1}${2}"+dbName+"${3}")
	if err := os.WriteFile(path, []byte(src), info.Mode().Perm()); err != nil {
		return fmt.Errorf("setWPConfigDBName: write: %w", err)
	}
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

	// base env for the podman exec — password is passed by name only, never in argv
	podEnv := append(os.Environ(), "CONTAINER_HOST=unix://"+h.PodmanSock)

	// retry for up to 2 minutes — the DB is usually still initializing right after the pod comes up
	deadline := time.Now().Add(2 * time.Minute)
	for {
		cmd := exec.CommandContext(ctx, "podman",
			"exec", "--user=mysql", "-e", "MYSQL_PWD", dbContainer,
			"mariadb-upgrade", "-uroot",
		)

		// capped append forces a new backing array so the loop's envs don't alias
		cmd.Env = append(podEnv[:len(podEnv):len(podEnv)], "MYSQL_PWD="+rootPass)
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

// createSitePod builds the site's pod from what is already on disk. It is the
// pod half of a recreate, factored out so a rename can stand the pod back up
// under either name.
func (h *Handler) createSitePod(ctx context.Context, site *models.Site) error {

	// credentials live in the site's .env, which travels with the directory
	siteDir := h.sitesBase() + "/" + site.Name
	dbUser, _ := fileutil.ReadEnvValue(siteDir+"/.env", "DB_USER")
	dbPass, _ := fileutil.ReadEnvValue(siteDir+"/.env", "DB_PASS")
	dbRootPass, _ := fileutil.ReadEnvValue(siteDir+"/.env", "DB_ROOT_PASS")
	redisPass, _ := fileutil.ReadEnvValue(siteDir+"/.env", "REDIS_PASS")

	// build the pod against the host-visible path
	allConfigs, _ := db.GetAllConfigsBySite(h.DB, site.ID)
	return modules.TypeModule(site.SiteType).Create(ctx, &modules.PodmanClientAdapter{Client: h.PodmanClient}, modules.PodConfig{
		Site:       site,
		SiteUID:    sftp.UIDForSite(site.ID),
		SiteDir:    h.hostSitesBase() + "/" + site.Name,
		Configs:    allConfigs,
		DBUser:     dbUser,
		DBPass:     dbPass,
		DBRootPass: dbRootPass,
		RedisPass:  redisPass,
	})
}

// refreshSiteDomains repoints the proxy's cached view of a site at its current
// name, dropping the per-site caches and open log handles that carry the old one.
func (h *Handler) refreshSiteDomains(site *models.Site) {

	// drop the cached artifacts keyed by this site before re-adding its domains
	h.Proxy.ForgetSite(site.ID, site.Port)

	// re-add every domain so the entries carry the current name
	domains, err := db.GetDomainsBySite(h.DB, site.ID)
	if err != nil {
		logger.Warn("refreshSiteDomains: site %d: %v", site.ID, err)
		return
	}
	for _, d := range domains {
		h.Proxy.AddDomain(d.Domain, site.Port, site.ID, site.Name)
	}
}
