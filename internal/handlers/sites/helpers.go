// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package sites

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"podnest/internal/db"
	"podnest/internal/fileutil"
	"podnest/internal/handlers/domains"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/podman"
	"podnest/internal/sftp"
	"regexp"
	"strconv"
	"strings"
	"syscall"
	"time"
)

// siteNameStrip matches every character not permitted in a site name.
var siteNameStrip = regexp.MustCompile(`[^a-z0-9_\-]`)

// siteNameValid matches a fully normalized, acceptable site name.
var siteNameValid = regexp.MustCompile(`^[a-z0-9][a-z0-9_\-]{0,62}$`)

// wpDBUserPattern matches the DB_USER define in a wp-config.php, including the
// defined('DB_USER') || define(...) form the scaffold emits.
var wpDBUserPattern = regexp.MustCompile(`(define\(\s*['"]DB_USER['"]\s*,\s*)(['"])(?:[^'"]*)(['"])`)

// wpDBNamePattern matches the DB_NAME define in a wp-config.php.
var wpDBNamePattern = regexp.MustCompile(`(define\(\s*['"]DB_NAME['"]\s*,\s*)(['"])(?:[^'"]*)(['"])`)

// uidRange is one line of a user namespace uid_map.
type uidRange struct {
	inside, outside, count uint64
}

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
		case models.SiteTypePython:
			if _, ok := models.PythonVersionMap[*runtimeVersion]; !ok {
				return fmt.Errorf("ValidateSiteVersions: unknown python version %d", *runtimeVersion)
			}
		}
	}

	// valid
	return nil
}

// cloneDatabase copies the database from the source site to the clone site.
func (h *Handler) cloneDatabase(ctx context.Context, src, clone *models.Site) error {

	// read DB_ROOT_PASS from .env files
	srcRootPass, err := fileutil.ReadEnvValue(h.sitesBase(), src.Name, "DB_ROOT_PASS")
	if err != nil {
		return fmt.Errorf("cloneDatabase: read src DB_ROOT_PASS: %w", err)
	}
	cloneRootPass, err := fileutil.ReadEnvValue(h.sitesBase(), clone.Name, "DB_ROOT_PASS")
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
	// the schema name is a positional arg, never interpolated into the script
	dumpCmd := exec.CommandContext(ctx, "podman", "exec", "-e", "MYSQL_PWD", srcDBContainer,
		"sh", "-c",
		`mysqldump -uroot --single-transaction --quick --routines "$1" 2>/dev/null || `+
			`mariadb-dump -uroot --single-transaction --quick --routines "$1"`,
		"sh",
		src.Name,
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
	cloneName, err := NormalizeSiteName(clone.Name)
	if err != nil {
		return fmt.Errorf("cloneDatabase: clone name: %w", err)
	}
	cloneDBContainer := podman.ContainerName(cloneName, "db")
	cpCmd := exec.CommandContext(ctx, "podman", "cp", tmp.Name(), cloneDBContainer+":/tmp/podnest-clone.sql")
	cpCmd.Env = podEnv
	if out, err := cpCmd.CombinedOutput(); err != nil {
		return fmt.Errorf("cloneDatabase: podman cp: %w — %s", err, string(out))
	}

	// run mariadb to restore the dump inside the clone DB container
	var mysqlStderr bytes.Buffer
	mysqlCmd := exec.CommandContext(ctx, "podman", "exec", "-e", "MYSQL_PWD", cloneDBContainer,
		"sh", "-c",
		`mariadb -uroot "$1" < /tmp/podnest-clone.sql && rm /tmp/podnest-clone.sql`,
		"sh",
		cloneName,
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
			// backslash is an escape character in MariaDB's default mode, so
			// doubling quotes alone would not survive a name containing one
			strings.NewReplacer(`\`, `\\`, "'", "''").Replace(oldDB),
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
		// the schema name is a positional arg, never interpolated into the script
		`mysqldump -uroot --no-data --routines --skip-lock-tables "$1" 2>/dev/null || `+
			`mariadb-dump -uroot --no-data --routines --skip-lock-tables "$1"`,
		"sh",
		oldDB,
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

// migrateDBUser moves every view, routine, trigger and event the old DB user
// defines onto the new user, then drops the old user. The drop happens only
// once nothing is left under the old user, so on any failure the old user stays
// and existing objects keep resolving.
func (h *Handler) migrateDBUser(ctx context.Context, site *models.Site, oldUser, newUser, rootPass string) error {

	// the pod is up, and CreateMariaDB has already ensured the new user
	dbContainer := podman.ContainerName(site.Name, "db")
	podEnv := append(os.Environ(), "CONTAINER_HOST=unix://"+h.PodmanSock, "TMPDIR=/var/tmp")

	// quote an identifier for use in a statement
	ident := func(s string) string {
		return "`" + strings.ReplaceAll(s, "`", "``") + "`"
	}

	// quote a string literal — backslash is an escape character in MariaDB's
	// default mode, so doubling quotes alone would not survive one in a name
	lit := func(s string) string {
		return "'" + strings.NewReplacer(`\`, `\\`, "'", "''").Replace(s) + "'"
	}

	// mariadb echoes statement text in its errors, so no credential may reach a log
	scrub := strings.NewReplacer(oldUser, "<old>", newUser, "<new>", rootPass, "<root>").Replace

	// run a statement batch as root in the DB container and return what it prints
	query := func(sql string) (string, error) {
		var stderr bytes.Buffer
		cmd := exec.CommandContext(ctx, "podman", "exec", "-e", "MYSQL_PWD", dbContainer,
			"mariadb", "-uroot", "--default-character-set=utf8mb4", "-N", "-B", "--raw", "-e", sql,
		)
		cmd.Env = append(podEnv[:len(podEnv):len(podEnv)], "MYSQL_PWD="+rootPass)
		cmd.Stderr = &stderr
		out, err := cmd.Output()
		if err != nil {
			return "", fmt.Errorf("migrateDBUser: mariadb: %w — %s", err, scrub(stderr.String()))
		}
		return string(out), nil
	}

	// replay a script against the site schema as root, so another user can be set as DEFINER
	feed := func(script string) error {
		var stderr bytes.Buffer
		cmd := exec.CommandContext(ctx, "podman", "exec", "-i", "-e", "MYSQL_PWD", dbContainer,
			"mariadb", "-uroot", "--default-character-set=utf8mb4", site.Name,
		)
		cmd.Env = append(podEnv[:len(podEnv):len(podEnv)], "MYSQL_PWD="+rootPass)
		cmd.Stdin = strings.NewReader(script)
		cmd.Stderr = &stderr
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("migrateDBUser: replay: %w — %s", err, scrub(stderr.String()))
		}
		return nil
	}

	// run a query whose rows are ready-made statements, and replay them
	reassign := func(sql string) error {
		script, err := query(sql)
		if err != nil {
			return err
		}
		if strings.TrimSpace(script) == "" {
			return nil
		}
		return feed(script)
	}

	// information_schema reports a definer as user@host
	oldDef := lit(oldUser + "@%")
	schema := lit(site.Name)

	// routines and triggers cannot be altered in place, so they are dumped,
	// dropped and replayed with the new definer — list them first, flagging
	// which ones the old user owns
	listing, err := query(
		"SELECT ROUTINE_TYPE, ROUTINE_NAME, DEFINER=" + oldDef + " FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=" + schema +
			" UNION ALL SELECT 'TRIGGER', TRIGGER_NAME, DEFINER=" + oldDef + " FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=" + schema,
	)
	if err != nil {
		return err
	}
	var objects []string
	var drops strings.Builder
	owned := false
	for _, line := range strings.Split(strings.TrimSpace(listing), "\n") {
		if line == "" {
			continue
		}
		f := strings.SplitN(line, "\t", 3)
		if len(f) != 3 {
			return fmt.Errorf("migrateDBUser: unexpected routine listing")
		}
		objects = append(objects, f[0]+" "+ident(f[1]))
		fmt.Fprintf(&drops, "DROP %s IF EXISTS %s.%s;\n", f[0], ident(site.Name), ident(f[1]))
		if f[2] == "1" {
			owned = true
		}
	}

	if owned {

		// dump only routines and triggers — never table structure, which a
		// replay would drop and recreate empty
		var dumpStderr bytes.Buffer
		dumpCmd := exec.CommandContext(ctx, "podman", "exec", "-e", "MYSQL_PWD", dbContainer,
			"sh", "-c",
			// the schema name is a positional arg, never interpolated into the script
			`mysqldump -uroot --skip-opt --no-data --no-create-info --no-create-db --routines --triggers --skip-lock-tables "$1" 2>/dev/null || `+
				`mariadb-dump -uroot --skip-opt --no-data --no-create-info --no-create-db --routines --triggers --skip-lock-tables "$1"`,
			"sh",
			site.Name,
		)
		dumpCmd.Env = append(podEnv[:len(podEnv):len(podEnv)], "MYSQL_PWD="+rootPass)
		dumpCmd.Stderr = &dumpStderr
		out, err := dumpCmd.Output()
		if err != nil {
			return fmt.Errorf("migrateDBUser: dump routines: %w — %s", err, scrub(dumpStderr.String()))
		}
		dump := string(out)

		// nothing is dropped unless every listed object is in the dump, or a
		// dump that skipped triggers would silently delete them
		for _, o := range objects {
			if !strings.Contains(dump, o) {
				return fmt.Errorf("migrateDBUser: dump is missing a routine or trigger, nothing was changed")
			}
		}

		// the definer appears backtick-quoted in a dump, so swap the whole
		// quoted token rather than pattern-matching a raw name
		replay := drops.String() + strings.ReplaceAll(dump, ident(oldUser)+"@"+ident("%"), ident(newUser)+"@"+ident("%"))
		if err := feed(replay); err != nil {

			// put the routines and triggers back exactly as they were
			if rerr := feed(drops.String() + dump); rerr != nil {
				logger.Error("migrateDBUser: failed to restore routines and triggers for site %s: %v", site.Name, rerr)
			}
			return err
		}
	}

	// views carry their full definition in information_schema, so rebuild each
	// one under the new definer from it
	viewPrefix := "ALTER DEFINER=" + lit(newUser) + "@'%' SQL SECURITY "
	if err := reassign(
		"SELECT CONCAT(" + lit(viewPrefix) + ", SECURITY_TYPE, ' VIEW `', REPLACE(TABLE_SCHEMA, '`', '``'), '`.`', REPLACE(TABLE_NAME, '`', '``'), '` AS ', VIEW_DEFINITION, " +
			"CASE CHECK_OPTION WHEN 'CASCADED' THEN ' WITH CASCADED CHECK OPTION' WHEN 'LOCAL' THEN ' WITH LOCAL CHECK OPTION' ELSE '' END, ';') " +
			"FROM information_schema.VIEWS WHERE DEFINER=" + oldDef + " AND TABLE_SCHEMA=" + schema,
	); err != nil {
		return err
	}

	// events take a new definer directly
	eventPrefix := "ALTER DEFINER=" + lit(newUser) + "@'%' EVENT "
	if err := reassign(
		"SELECT CONCAT(" + lit(eventPrefix) + ", '`', REPLACE(EVENT_SCHEMA, '`', '``'), '`.`', REPLACE(EVENT_NAME, '`', '``'), '`;') " +
			"FROM information_schema.EVENTS WHERE DEFINER=" + oldDef + " AND EVENT_SCHEMA=" + schema,
	); err != nil {
		return err
	}

	// only drop the old user once nothing anywhere still names it as definer
	left, err := query(
		"SELECT (SELECT COUNT(ROUTINE_NAME) FROM information_schema.ROUTINES WHERE DEFINER=" + oldDef + ")" +
			" + (SELECT COUNT(TRIGGER_NAME) FROM information_schema.TRIGGERS WHERE DEFINER=" + oldDef + ")" +
			" + (SELECT COUNT(TABLE_NAME) FROM information_schema.VIEWS WHERE DEFINER=" + oldDef + ")" +
			" + (SELECT COUNT(EVENT_NAME) FROM information_schema.EVENTS WHERE DEFINER=" + oldDef + ")",
	)
	if err != nil {
		return err
	}
	n, err := strconv.Atoi(strings.TrimSpace(left))
	if err != nil {
		return fmt.Errorf("migrateDBUser: unexpected definer count: %w", err)
	}
	if n != 0 {
		return fmt.Errorf("migrateDBUser: %d object(s) still defined by the old user", n)
	}
	if _, err := query("DROP USER IF EXISTS " + lit(oldUser) + "@'%'; FLUSH PRIVILEGES;"); err != nil {
		return err
	}

	// log success and return
	logger.Debug("migrateDBUser: definers reassigned and old user dropped for site %s", site.Name)
	return nil
}

// normalizeRequestDomains validates requested domains the same way a domain
// added to an existing site is, dropping blanks and duplicates. On failure it
// returns the HTTP status to answer with and a message fit for the client.
func (h *Handler) normalizeRequestDomains(raw []string) ([]string, int, error) {

	// the panel's own hostname must not be claimable by a site
	adminDomain, err := db.GetSetting(h.DB, "admin_domain")
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	ad := strings.ToLower(strings.TrimSpace(adminDomain))

	seen := make(map[string]bool, len(raw))
	var out []string
	for _, d := range raw {
		if strings.TrimSpace(d) == "" {
			continue
		}

		// reject rather than mangle — an unroutable entry still triggers ACME issuance
		clean, err := domains.NormalizeDomain(d)
		if err != nil {
			return nil, http.StatusBadRequest, fmt.Errorf("invalid domain: %s", d)
		}
		if seen[clean] {
			continue
		}
		seen[clean] = true

		if ad != "" && clean == ad {
			return nil, http.StatusConflict, fmt.Errorf("domain is reserved for the panel")
		}
		exists, err := db.DomainExists(h.DB, clean)
		if err != nil {
			return nil, http.StatusInternalServerError, err
		}
		if exists {
			return nil, http.StatusConflict, fmt.Errorf("domain already registered: %s", clean)
		}
		taken, err := db.RPRouteDomainTaken(h.DB, clean, 0)
		if err != nil {
			return nil, http.StatusInternalServerError, err
		}
		if taken {
			return nil, http.StatusConflict, fmt.Errorf("domain already registered: %s", clean)
		}
		out = append(out, clean)
	}
	return out, 0, nil
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

// setWPConfigDBName repoints an existing wp-config.php at the renamed schema.
// A site without one — every non-WordPress type — is not an error. The file is
// read and written inside siteDir so a planted symlink cannot redirect either.
func setWPConfigDBName(siteDir, dbName string) error {
	raw, err := fileutil.ReadFile(siteDir, "html/wp-config.php")
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("setWPConfigDBName: read: %w", err)
	}

	// an existing regular file is truncated in place, keeping its mode and ownership
	src := wpDBNamePattern.ReplaceAllString(string(raw), "${1}${2}"+dbName+"${3}")
	if err := fileutil.WriteFile(siteDir, "html/wp-config.php", src, 0640); err != nil {
		return fmt.Errorf("setWPConfigDBName: write: %w", err)
	}
	return nil
}

// isAlnum reports whether s holds only ASCII letters and digits.
func isAlnum(s string) bool {
	for _, r := range s {
		if (r < 'a' || r > 'z') && (r < 'A' || r > 'Z') && (r < '0' || r > '9') {
			return false
		}
	}
	return true
}

// setWPConfigDBUser repoints an existing wp-config.php at a new DB username.
// A site without one — every non-WordPress type — is not an error. The file is
// read and written inside siteDir so a planted symlink cannot redirect either.
func setWPConfigDBUser(siteDir, dbUser string) error {
	raw, err := fileutil.ReadFile(siteDir, "html/wp-config.php")
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("setWPConfigDBUser: read: %w", err)
	}

	// an existing regular file is truncated in place, keeping its mode and ownership
	src := wpDBUserPattern.ReplaceAllString(string(raw), "${1}${2}"+dbUser+"${3}")
	if err := fileutil.WriteFile(siteDir, "html/wp-config.php", src, 0640); err != nil {
		return fmt.Errorf("setWPConfigDBUser: write: %w", err)
	}
	return nil
}

// setSiteDBUser writes a DB username to the site's .env and, when the site has
// one, its wp-config.php.
func setSiteDBUser(siteDir, dbUser string) error {
	if err := setEnvValue(siteDir+"/.env", "DB_USER", dbUser); err != nil {
		return err
	}
	return setWPConfigDBUser(siteDir, dbUser)
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
	rootPass, err := fileutil.ReadEnvValue(h.sitesBase(), site.Name, "DB_ROOT_PASS")
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
	hostSiteDir, err := fileutil.SiteDir(h.hostSitesBase(), site.Name)
	if err != nil {
		return err
	}
	dbUser, _ := fileutil.ReadEnvValue(h.sitesBase(), site.Name, "DB_USER")
	dbPass, _ := fileutil.ReadEnvValue(h.sitesBase(), site.Name, "DB_PASS")
	dbRootPass, _ := fileutil.ReadEnvValue(h.sitesBase(), site.Name, "DB_ROOT_PASS")
	redisPass, _ := fileutil.ReadEnvValue(h.sitesBase(), site.Name, "REDIS_PASS")

	// build the pod against the host-visible path
	allConfigs, _ := db.GetAllConfigsBySite(h.DB, site.ID)
	return modules.TypeModule(site.SiteType).Create(ctx, &modules.PodmanClientAdapter{Client: h.PodmanClient}, modules.PodConfig{
		Site:       site,
		SiteUID:    sftp.UIDForSite(site.ID),
		SiteDir:    hostSiteDir,
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

// readUIDMap parses /proc/self/uid_map so namespaced file owners can be
// translated to the UIDs the host shows in top and ps.
func readUIDMap() ([]uidRange, error) {
	data, err := os.ReadFile("/proc/self/uid_map")
	if err != nil {
		return nil, err
	}
	var ranges []uidRange
	for _, line := range strings.Split(string(data), "\n") {
		f := strings.Fields(line)
		if len(f) != 3 {
			continue
		}
		in, err1 := strconv.ParseUint(f[0], 10, 64)
		out, err2 := strconv.ParseUint(f[1], 10, 64)
		cnt, err3 := strconv.ParseUint(f[2], 10, 64)
		if err1 != nil || err2 != nil || err3 != nil {
			return nil, fmt.Errorf("parse /proc/self/uid_map line %q", line)
		}
		ranges = append(ranges, uidRange{inside: in, outside: out, count: cnt})
	}
	return ranges, nil
}

// hostUIDFor stats the site's html directory and maps its owner through the
// uid_map ranges to the host UID. ok is false when the directory is missing
// or its owner falls outside every mapped range.
func (h *Handler) hostUIDFor(ranges []uidRange, name string) (int64, bool) {
	dir, err := fileutil.SiteDir(h.sitesBase(), name)
	if err != nil {
		return 0, false
	}
	var st syscall.Stat_t
	if err := syscall.Stat(dir+"/html", &st); err != nil {
		return 0, false
	}
	uid := uint64(st.Uid)
	for _, r := range ranges {
		if uid >= r.inside && uid < r.inside+r.count {
			return int64(r.outside + uid - r.inside), true
		}
	}
	return 0, false
}
