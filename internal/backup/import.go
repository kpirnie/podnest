// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package backup

import (
	"bufio"
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"

	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/podman"
)

// wpSaltConsts are the wp-config.php key/salt constants regenerated on import
var wpSaltConsts = []string{
	"AUTH_KEY", "SECURE_AUTH_KEY", "LOGGED_IN_KEY", "NONCE_KEY",
	"AUTH_SALT", "SECURE_AUTH_SALT", "LOGGED_IN_SALT", "NONCE_SALT",
}

var wpPrefixRe = regexp.MustCompile(`(?m)^\s*\$table_prefix\s*=\s*['"]([A-Za-z0-9_]+)['"]\s*;?`)

// ImportRestore extracts the archive at archivePath and restores it onto
// targetSite. On success the archive file is deleted. The site is placed in
// maintenance mode for the duration of the restore.
func (m *Manager) ImportRestore(ctx context.Context, targetSite *models.Site, archivePath string) error {

	// guard against concurrent restores on the same site
	m.restoring.Store(targetSite.ID, true)
	defer m.restoring.Delete(targetSite.ID)

	// setup the site path
	siteDir := filepath.Join(m.appPath, "sites", targetSite.Name)

	// enable maintenance mode before touching any site data
	if err := m.enableMaintenance(ctx, targetSite, siteDir); err != nil {
		return fmt.Errorf("ImportRestore: enable maintenance: %w", err)
	}
	defer func() {
		if err := m.disableMaintenance(ctx, targetSite, siteDir); err != nil {
			logger.Error("ImportRestore: disable maintenance for site %s: %v", targetSite.Name, err)
		}
	}()

	// extract the archive to a temp directory
	tmpDir, err := os.MkdirTemp(resticTmpDir, "podnest-import-*")
	if err != nil {
		return fmt.Errorf("ImportRestore: create temp dir: %w", err)
	}
	defer os.RemoveAll(tmpDir)
	if err := extractArchive(archivePath, tmpDir); err != nil {
		return fmt.Errorf("ImportRestore: extract: %w", err)
	}

	// clear the web root so the archive cannot merge into a previous occupant
	if err := wipeHTMLRoot(siteDir); err != nil {
		return fmt.Errorf("ImportRestore: wipe html: %w", err)
	}

	// copy extracted files into the site directory, excluding .env and db_dump.sql
	if err := importFiles(tmpDir, siteDir); err != nil {
		return fmt.Errorf("ImportRestore: import files: %w", err)
	}

	// reapply correct ownership after the file copy
	m.fixPostRestorePerms(siteDir, targetSite.ID)

	// the archive's wp-config wins for prefix, multisite and custom defines —
	// only this pod's own connection details and salts are replaced
	wpCfgPath := filepath.Join(siteDir, "html", "wp-config.php")
	if targetSite.SiteType == models.SiteTypeWordPress {
		if err := m.rewriteWPConfig(wpCfgPath, siteDir); err != nil {
			logger.Error("ImportRestore: rewrite wp-config for site %s: %v", targetSite.Name, err)
		}
	}

	// restore the database if a dump is present and the site type has a database
	dbDump := filepath.Join(tmpDir, "db_dump.sql")
	if _, err := os.Stat(dbDump); err == nil {
		if modules.TypeModule(targetSite.SiteType).HasDatabase() {
			if err := m.importDB(ctx, targetSite, dbDump, siteDir); err != nil {
				return fmt.Errorf("ImportRestore: import db: %w", err)
			}
		}
	}

	// read the manifest to get source domains for search-replace
	sourceDomains := readImportManifest(tmpDir)

	// run search-replace for WordPress sites, falling back to the imported
	// siteurl when the archive carried no manifest
	if targetSite.SiteType == models.SiteTypeWordPress {

		// fetch the target site's primary domain
		targetDomains, err := db.GetDomainsBySite(m.db, targetSite.ID)
		if err != nil || len(targetDomains) == 0 {
			logger.Warn("ImportRestore: could not fetch target domains for site %s: %v", targetSite.Name, err)
		} else {

			// prefer the manifest, then the siteurl already in the imported DB
			fromDomain := ""
			if len(sourceDomains) > 0 {
				fromDomain = sourceDomains[0]
			}
			if fromDomain == "" {
				fromDomain, err = m.wpSourceDomain(ctx, targetSite, siteDir, wpCfgPath)
				if err != nil {
					logger.Warn("ImportRestore: no source domain for site %s: %v", targetSite.Name, err)
				}
			}

			// replace throughout the DB, then repoint multisite at the new domain
			toDomain := targetDomains[0].Domain
			if fromDomain != "" && fromDomain != toDomain {
				if err := m.wpSearchReplace(ctx, targetSite, fromDomain, toDomain); err != nil {
					logger.Error("ImportRestore: search-replace failed for site %s: %v", targetSite.Name, err)
				} else if err := rewriteWPConfigDomain(wpCfgPath, toDomain); err != nil {
					logger.Error("ImportRestore: rewrite DOMAIN_CURRENT_SITE for site %s: %v", targetSite.Name, err)
				}
			}
		}
	}

	// delete the source archive now that the restore succeeded, but only when
	// it lives in the target's own import directory — a cross-site import
	// resolves the archive against the source site and must not remove it
	if filepath.Dir(archivePath) == m.importDir(targetSite.Name) {
		if err := os.Remove(archivePath); err != nil {
			logger.Warn("ImportRestore: remove archive %s: %v", archivePath, err)
		}
	} else {
		logger.Debug("ImportRestore: archive %s is outside %s, leaving it in place", archivePath, targetSite.Name)
	}

	logger.Debug("ImportRestore: completed for site %s from %s", targetSite.Name, filepath.Base(archivePath))
	return nil
}

// importFiles copies the extracted archive contents into siteDir, skipping
// .env (target site credentials are preserved) and db_dump.sql (handled separately)
func importFiles(srcDir, siteDir string) error {
	return filepath.Walk(srcDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// get the path relative to the source directory for clean destination paths
		rel, err := filepath.Rel(srcDir, path)
		if err != nil {
			return fmt.Errorf("importFiles: rel path: %w", err)
		}

		// skip the root itself
		if rel == "." {
			return nil
		}

		// never overwrite the target site's credentials or import the raw dump
		if rel == ".env" || rel == "db_dump.sql" || rel == "manifest.json" ||
			rel == "html/web.config" || rel == "html/.env" {
			return nil
		}

		// preserved target files in the web root are never overwritten
		if dir, base := filepath.Split(rel); filepath.Clean(dir) == "html" && htmlPreserved(base) {
			return nil
		}

		// rendered configs belong to the target site — the source's carry its own
		// listen port and php-fpm pool user
		if rel == "nginx" || rel == "php-fpm" ||
			strings.HasPrefix(rel, "nginx"+string(os.PathSeparator)) ||
			strings.HasPrefix(rel, "php-fpm"+string(os.PathSeparator)) {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		dest := filepath.Join(siteDir, rel)

		// if it's a directory, create it and move on; we'll set permissions on the whole tree at the end
		if info.IsDir() {
			return os.MkdirAll(dest, 0755)
		}
		if err := os.MkdirAll(filepath.Dir(dest), 0755); err != nil {
			return fmt.Errorf("importFiles: mkdir %s: %w", rel, err)
		}

		// copy regular file contents into the destination path
		src, err := os.Open(path)
		if err != nil {
			return fmt.Errorf("importFiles: open %s: %w", rel, err)
		}
		defer src.Close()

		// create the destination file with the same permissions as the source
		dst, err := os.OpenFile(dest, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, info.Mode())
		if err != nil {
			return fmt.Errorf("importFiles: create %s: %w", rel, err)
		}
		defer dst.Close()

		// copy the file contents
		if _, err := io.Copy(dst, src); err != nil {
			return fmt.Errorf("importFiles: copy %s: %w", rel, err)
		}
		return nil
	})
}

// htmlPreserved reports whether a name directly inside html/ belongs to the
// target site and must survive an import untouched
func htmlPreserved(name string) bool {
	switch name {
	case ".user.ini", "web.config", ".env", "maintenance.html", "wp-config.php":
		return true
	}

	// nginx includes /var/www/html/.nginx.conf* as a glob
	return strings.HasPrefix(name, ".nginx.conf")
}

// wipeHTMLRoot empties the site's web root ahead of an import, keeping only the
// target's own files so the archive never merges into a previous occupant
func wipeHTMLRoot(siteDir string) error {
	htmlDir := filepath.Join(siteDir, "html")

	entries, err := os.ReadDir(htmlDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("wipeHTMLRoot: read %s: %w", htmlDir, err)
	}

	// remove every entry that is not on the preserve list; a failure mid-tree
	// must not abort, or the web root is left half-destroyed
	var failed []string
	for _, e := range entries {
		if htmlPreserved(e.Name()) {
			continue
		}

		target := filepath.Join(htmlDir, e.Name())
		if err := os.RemoveAll(target); err == nil {
			continue
		}

		// retry once after loosening the tree, then give up on this entry
		_ = filepath.Walk(target, func(p string, info os.FileInfo, err error) error {
			if err != nil {
				return nil
			}
			if info.IsDir() {
				_ = os.Chmod(p, 0o755)
			}
			return nil
		})
		if err := os.RemoveAll(target); err != nil {
			logger.Warn("wipeHTMLRoot: remove %s: %v", e.Name(), err)
			failed = append(failed, e.Name())
		}
	}

	// leftovers are reported, not fatal — the overlay still needs to run
	if len(failed) > 0 {
		logger.Warn("wipeHTMLRoot: %d entries could not be removed from %s: %s",
			len(failed), htmlDir, strings.Join(failed, ", "))
		return nil
	}

	logger.Debug("wipeHTMLRoot: cleared %s", htmlDir)
	return nil
}

// wpConstPattern matches a wp-config.php constant in either the guarded
// defined() || define() form or the bare define() form
func wpConstPattern(name string) *regexp.Regexp {
	return regexp.MustCompile(`(?mi)^([ \t]*(?:defined\(\s*['"]` + name + `['"]\s*\)\s*\|\|\s*)?define\(\s*['"]` + name + `['"]\s*,\s*)([^)]*?)(\s*\)\s*;)`)
}

// quotePHP renders a value as a single-quoted PHP string literal
func quotePHP(v string) string {
	return "'" + strings.NewReplacer(`\`, `\\`, `'`, `\'`).Replace(v) + "'"
}

// setWPConst replaces the value of an existing wp-config.php constant. A
// constant that is not already defined is never added.
func setWPConst(src, name, value string) string {
	return setWPConstRaw(src, name, quotePHP(value))
}

// setWPConstRaw is setWPConst for values that are not PHP strings
func setWPConstRaw(src, name, literal string) string {
	re := wpConstPattern(name)
	return re.ReplaceAllStringFunc(src, func(hit string) string {
		g := re.FindStringSubmatch(hit)
		return g[1] + literal + g[3]
	})
}

// wpSalt returns a fresh random value for a wp-config.php key or salt
func wpSalt() (string, error) {
	b := make([]byte, 48)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// rewriteWPConfig points the imported wp-config.php at the target pod's own
// database and Redis and regenerates its keys and salts. Everything else the
// archive carried — table prefix, multisite constants, custom defines — stands.
func (m *Manager) rewriteWPConfig(wpCfgPath, siteDir string) error {
	raw, err := os.ReadFile(wpCfgPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("rewriteWPConfig: read: %w", err)
	}

	envPath := filepath.Join(siteDir, ".env")
	dbName, err := readEnvValue(envPath, "DB_NAME")
	if err != nil {
		return fmt.Errorf("rewriteWPConfig: DB_NAME: %w", err)
	}
	dbUser, err := readEnvValue(envPath, "DB_USER")
	if err != nil {
		return fmt.Errorf("rewriteWPConfig: DB_USER: %w", err)
	}
	dbPass, err := readEnvValue(envPath, "DB_PASS")
	if err != nil {
		return fmt.Errorf("rewriteWPConfig: DB_PASS: %w", err)
	}
	redisPass, err := readEnvValue(envPath, "REDIS_PASS")
	if err != nil {
		return fmt.Errorf("rewriteWPConfig: REDIS_PASS: %w", err)
	}

	src := string(raw)
	src = setWPConst(src, "DB_NAME", dbName)
	src = setWPConst(src, "DB_USER", dbUser)
	src = setWPConst(src, "DB_PASSWORD", dbPass)
	src = setWPConst(src, "DB_HOST", "127.0.0.1:3306")
	src = setWPConst(src, "WP_REDIS_HOST", "127.0.0.1")
	src = setWPConstRaw(src, "WP_REDIS_PORT", "6379")
	src = setWPConst(src, "WP_REDIS_PASSWORD", redisPass)

	for _, name := range wpSaltConsts {
		s, err := wpSalt()
		if err != nil {
			return fmt.Errorf("rewriteWPConfig: salt: %w", err)
		}
		src = setWPConst(src, name, s)
	}

	if err := os.WriteFile(wpCfgPath, []byte(src), 0640); err != nil {
		return fmt.Errorf("rewriteWPConfig: write: %w", err)
	}

	logger.Debug("rewriteWPConfig: connection constants rewritten in %s", wpCfgPath)
	return nil
}

// rewriteWPConfigDomain repoints DOMAIN_CURRENT_SITE at the target domain.
// Single-site installs have no such constant and are left untouched. This runs
// only after search-replace, since wp-cli bootstraps multisite against the
// domain still stored in the site and blogs tables.
func rewriteWPConfigDomain(wpCfgPath, toDomain string) error {
	raw, err := os.ReadFile(wpCfgPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("rewriteWPConfigDomain: read: %w", err)
	}

	src := setWPConst(string(raw), "DOMAIN_CURRENT_SITE", toDomain)
	if err := os.WriteFile(wpCfgPath, []byte(src), 0640); err != nil {
		return fmt.Errorf("rewriteWPConfigDomain: write: %w", err)
	}
	return nil
}

// wpSourceDomain reads the host out of the imported siteurl option, used as the
// search-replace source when the archive carried no manifest
func (m *Manager) wpSourceDomain(ctx context.Context, site *models.Site, siteDir, wpCfgPath string) (string, error) {
	prefix := "wp_"
	if raw, err := os.ReadFile(wpCfgPath); err == nil {
		if hit := wpPrefixRe.FindSubmatch(raw); hit != nil {
			prefix = string(hit[1])
		}
	}

	envPath := filepath.Join(siteDir, ".env")
	rootPass, err := readEnvValue(envPath, "DB_ROOT_PASS")
	if err != nil {
		return "", fmt.Errorf("wpSourceDomain: DB_ROOT_PASS: %w", err)
	}
	dbName, err := readEnvValue(envPath, "DB_NAME")
	if err != nil {
		return "", fmt.Errorf("wpSourceDomain: DB_NAME: %w", err)
	}

	query := fmt.Sprintf(
		"SELECT option_value FROM `%s`.`%soptions` WHERE option_name='siteurl' LIMIT 1",
		dbName, prefix,
	)
	cmd := exec.CommandContext(ctx, "podman",
		"exec", "-e", "MYSQL_PWD", podman.ContainerName(site.Name, "db"),
		"mariadb", "-uroot", "-N", "-B", "-e", query,
	)
	cmd.Env = append(os.Environ(), "CONTAINER_HOST=unix://"+m.podmanSock, "MYSQL_PWD="+rootPass)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	out, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("wpSourceDomain: mariadb: %w — %s", err, stderr.String())
	}

	u, err := url.Parse(strings.TrimSpace(string(out)))
	if err != nil || u.Host == "" {
		return "", fmt.Errorf("wpSourceDomain: unusable siteurl %q", strings.TrimSpace(string(out)))
	}
	return u.Host, nil
}

// clearDatabase drops every table, view and routine in the target schema so an
// import lands on an empty database. The database itself and its grants stay.
func (m *Manager) clearDatabase(ctx context.Context, site *models.Site, dbName, rootPass string) error {

	dbContainer := podman.ContainerName(site.Name, "db")

	// run a query in the site's DB container and split the rows into fields
	query := func(sql string) ([][]string, error) {
		cmd := exec.CommandContext(ctx, "podman",
			"exec", "-e", "MYSQL_PWD", dbContainer,
			"mariadb", "-uroot", "-N", "-B", "-e", sql,
		)
		cmd.Env = append(os.Environ(), "CONTAINER_HOST=unix://"+m.podmanSock, "MYSQL_PWD="+rootPass)

		var stderr bytes.Buffer
		cmd.Stderr = &stderr
		out, err := cmd.Output()
		if err != nil {
			return nil, fmt.Errorf("clearDatabase: mariadb: %w — %s", err, stderr.String())
		}

		var rows [][]string
		for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
			if line == "" {
				continue
			}
			rows = append(rows, strings.Split(line, "\t"))
		}
		return rows, nil
	}

	// base tables and views living in the schema
	tables, err := query(fmt.Sprintf(
		"SELECT TABLE_NAME, TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA='%s'",
		strings.ReplaceAll(dbName, "'", "''"),
	))
	if err != nil {
		return err
	}

	// stored procedures and functions living in the schema
	routines, err := query(fmt.Sprintf(
		"SELECT ROUTINE_NAME, ROUTINE_TYPE FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA='%s'",
		strings.ReplaceAll(dbName, "'", "''"),
	))
	if err != nil {
		return err
	}

	// nothing to do on a fresh site
	if len(tables) == 0 && len(routines) == 0 {
		logger.Debug("clearDatabase: %s is already empty", dbName)
		return nil
	}

	// quote an identifier for the drop script
	ident := func(s string) string {
		return "`" + strings.ReplaceAll(s, "`", "``") + "`"
	}

	// build the drop script with constraint checks off so order does not matter
	var sb strings.Builder
	fmt.Fprintf(&sb, "SET FOREIGN_KEY_CHECKS=0;\nUSE %s;\n", ident(dbName))
	for _, r := range tables {
		if len(r) < 2 {
			continue
		}
		kind := "TABLE"
		if strings.EqualFold(r[1], "VIEW") {
			kind = "VIEW"
		}
		fmt.Fprintf(&sb, "DROP %s IF EXISTS %s;\n", kind, ident(r[0]))
	}
	for _, r := range routines {
		if len(r) < 2 {
			continue
		}
		kind := "PROCEDURE"
		if strings.EqualFold(r[1], "FUNCTION") {
			kind = "FUNCTION"
		}
		fmt.Fprintf(&sb, "DROP %s IF EXISTS %s;\n", kind, ident(r[0]))
	}
	fmt.Fprint(&sb, "SET FOREIGN_KEY_CHECKS=1;\n")

	// stage the script on the host
	script, err := os.CreateTemp("", "podnest-clear-*.sql")
	if err != nil {
		return fmt.Errorf("clearDatabase: create temp: %w", err)
	}
	defer os.Remove(script.Name())

	if _, err := script.WriteString(sb.String()); err != nil {
		script.Close()
		return fmt.Errorf("clearDatabase: write temp: %w", err)
	}
	script.Close()

	// copy the script into the container
	cpCmd := exec.CommandContext(ctx, "podman",
		"cp", script.Name(), dbContainer+":/tmp/podnest-clear.sql",
	)
	cpCmd.Env = append(os.Environ(), "CONTAINER_HOST=unix://"+m.podmanSock)
	if out, err := cpCmd.CombinedOutput(); err != nil {
		return fmt.Errorf("clearDatabase: podman cp: %w — %s", err, string(out))
	}

	// run the drops
	dropCmd := exec.CommandContext(ctx, "podman",
		"exec", "-e", "MYSQL_PWD", dbContainer,
		"sh", "-c",
		"mariadb -uroot < /tmp/podnest-clear.sql && rm /tmp/podnest-clear.sql",
	)
	dropCmd.Env = append(os.Environ(), "CONTAINER_HOST=unix://"+m.podmanSock, "MYSQL_PWD="+rootPass)

	var dropStderr bytes.Buffer
	dropCmd.Stderr = &dropStderr
	if err := dropCmd.Run(); err != nil {
		return fmt.Errorf("clearDatabase: mariadb: %w — %s", err, dropStderr.String())
	}

	logger.Debug("clearDatabase: dropped %d tables/views and %d routines in %s", len(tables), len(routines), dbName)
	return nil
}

// importDB pipes db_dump.sql into the target site's MariaDB container,
// rewriting USE / CREATE DATABASE statements to match the target site name
func (m *Manager) importDB(ctx context.Context, site *models.Site, dumpPath, siteDir string) error {
	rootPass, err := readEnvValue(filepath.Join(siteDir, ".env"), "DB_ROOT_PASS")
	if err != nil {
		return fmt.Errorf("importDB: DB_ROOT_PASS: %w", err)
	}
	dbName, err := readEnvValue(filepath.Join(siteDir, ".env"), "DB_NAME")
	if err != nil {
		return fmt.Errorf("importDB: DB_NAME: %w", err)
	}

	// the target must be empty or the archive merges into whatever was there
	if err := m.clearDatabase(ctx, site, dbName, rootPass); err != nil {
		return err
	}

	// rewrite the dump to a temp file with corrected db references
	rewritten, err := os.CreateTemp("", "podnest-import-db-*.sql")
	if err != nil {
		return fmt.Errorf("importDB: create temp: %w", err)
	}
	defer os.Remove(rewritten.Name())

	if err := rewriteDBDump(dumpPath, rewritten, dbName); err != nil {
		rewritten.Close()
		return fmt.Errorf("importDB: rewrite: %w", err)
	}
	rewritten.Close()

	// get the databse container name
	dbContainer := podman.ContainerName(site.Name, "db")

	// ensure no stale directory exists at the import path inside the container
	cleanCmd := exec.CommandContext(ctx, "podman",
		"exec", dbContainer, "rm", "-rf", "/tmp/podnest-import.sql",
	)

	// copy the rewritten dump into the container
	cleanCmd.Env = append(os.Environ(), "CONTAINER_HOST=unix://"+m.podmanSock)
	_ = cleanCmd.Run()
	cpCmd := exec.CommandContext(ctx, "podman",
		"cp", rewritten.Name(), dbContainer+":/tmp/podnest-import.sql",
	)
	cpCmd.Env = append(os.Environ(), "CONTAINER_HOST=unix://"+m.podmanSock)
	if out, err := cpCmd.CombinedOutput(); err != nil {
		return fmt.Errorf("importDB: podman cp: %w — %s", err, string(out))
	}

	// run the import inside the container
	mysqlCmd := exec.CommandContext(ctx, "podman",
		"exec", "-e", "MYSQL_PWD", dbContainer,
		"sh", "-c",
		fmt.Sprintf("mariadb -uroot %s < /tmp/podnest-import.sql && rm /tmp/podnest-import.sql", dbName),
	)
	mysqlCmd.Env = append(os.Environ(), "CONTAINER_HOST=unix://"+m.podmanSock, "MYSQL_PWD="+rootPass)

	var mysqlStderr bytes.Buffer
	mysqlCmd.Stderr = &mysqlStderr
	if err := mysqlCmd.Run(); err != nil {
		return fmt.Errorf("importDB: mariadb: %w — %s", err, mysqlStderr.String())
	}

	logger.Debug("importDB: DB imported for site %s", site.Name)
	return nil
}

// rewriteDBDump copies src to dst line by line, replacing USE / CREATE DATABASE
// statements that reference any database name with the target database name
func rewriteDBDump(srcPath string, dst *os.File, targetDB string) error {
	f, err := os.Open(srcPath)
	if err != nil {
		return err
	}
	defer f.Close()

	// patterns to match and rewrite — case-insensitive prefix checks
	usePrefix := "use `"
	createPrefix := "create database "

	// always inject the target database selection at the top of the dump
	if _, err := fmt.Fprintf(dst, "USE `%s`;\n", targetDB); err != nil {
		return fmt.Errorf("rewriteDBDump: write USE: %w", err)
	}

	scanner := bufio.NewScanner(f)
	// increase the buffer for very long lines (e.g. large INSERT rows)
	scanner.Buffer(make([]byte, 4*1024*1024), 4*1024*1024)

	for scanner.Scan() {
		line := scanner.Text()
		lower := strings.ToLower(line)

		if strings.HasPrefix(lower, usePrefix) {
			// rewrite: USE `anything`; → USE `targetDB`;
			line = fmt.Sprintf("USE `%s`;", targetDB)
		} else if strings.HasPrefix(lower, createPrefix) {
			// rewrite: CREATE DATABASE `anything` ... → CREATE DATABASE IF NOT EXISTS `targetDB`;
			line = fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s`;", targetDB)
		}

		if _, err := fmt.Fprintln(dst, line); err != nil {
			return fmt.Errorf("rewriteDBDump: write: %w", err)
		}
	}
	return scanner.Err()
}

// ensureWPCLI installs wp-cli into the PHP container if not already present
func (m *Manager) ensureWPCLI(ctx context.Context, containerName string) error {
	var checkResp struct {
		ID string `json:"Id"`
	}
	if err := m.podman.PostJSON(ctx,
		"/v4.0.0/libpod/containers/"+containerName+"/exec",
		map[string]any{
			"AttachStdout": true,
			"AttachStderr": true,
			"Detach":       false,
			"Cmd":          []string{"test", "-f", "/usr/local/bin/wp"},
		}, &checkResp,
	); err == nil {
		_ = m.podman.PostJSON(ctx, "/v4.0.0/libpod/exec/"+checkResp.ID+"/start",
			map[string]any{"Detach": false}, nil)
		var inspect struct {
			ExitCode int  `json:"ExitCode"`
			Running  bool `json:"Running"`
		}
		if err := m.podman.GetJSON(ctx, "/v4.0.0/libpod/exec/"+checkResp.ID+"/json", &inspect); err == nil &&
			!inspect.Running && inspect.ExitCode == 0 {
			return nil
		}
	}

	logger.Debug("ensureWPCLI: installing wp-cli in container %s", containerName)
	var installResp struct {
		ID string `json:"Id"`
	}
	if err := m.podman.PostJSON(ctx,
		"/v4.0.0/libpod/containers/"+containerName+"/exec",
		map[string]any{
			"AttachStdout": true,
			"AttachStderr": true,
			"Detach":       false,
			"Cmd": []string{"sh", "-c",
				"wget -q https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar" +
					" -O /tmp/wp.phar && chmod +x /tmp/wp.phar && mv /tmp/wp.phar /usr/local/bin/wp",
			},
		}, &installResp,
	); err != nil {
		return fmt.Errorf("ensureWPCLI: create install exec: %w", err)
	}

	if err := m.podman.PostJSON(ctx,
		"/v4.0.0/libpod/exec/"+installResp.ID+"/start",
		map[string]any{"Detach": false}, nil,
	); err != nil {
		return fmt.Errorf("ensureWPCLI: start install exec: %w", err)
	}

	logger.Debug("ensureWPCLI: wp-cli installed in %s", containerName)
	return nil
}

// wpSearchReplace runs wp search-replace inside the PHP container to rewrite
// the source domain to the target domain throughout the WordPress database
func (m *Manager) wpSearchReplace(ctx context.Context, site *models.Site, fromDomain, toDomain string) error {
	containerName := podman.ContainerName(site.Name, "php")

	if err := m.ensureWPCLI(ctx, containerName); err != nil {
		return fmt.Errorf("wpSearchReplace: %w", err)
	}

	var execResp struct {
		ID string `json:"Id"`
	}
	if err := m.podman.PostJSON(ctx,
		"/v4.0.0/libpod/containers/"+containerName+"/exec",
		map[string]any{
			"AttachStdout": true,
			"AttachStderr": true,
			"Detach":       false,
			"Cmd": []string{
				"/usr/local/bin/wp",
				"--path=/var/www/html",
				"--url=" + fromDomain,
				"--allow-root",
				"search-replace",
				"--all-tables",
				"--precise",
				fromDomain,
				toDomain,
			},
		}, &execResp,
	); err != nil {
		return fmt.Errorf("wpSearchReplace: create exec: %w", err)
	}

	if err := m.podman.PostJSON(ctx,
		"/v4.0.0/libpod/exec/"+execResp.ID+"/start",
		map[string]any{"Detach": false}, nil,
	); err != nil {
		return fmt.Errorf("wpSearchReplace: start exec: %w", err)
	}

	// a failed wp-cli run exits non-zero without erroring the API call
	var inspect struct {
		ExitCode int  `json:"ExitCode"`
		Running  bool `json:"Running"`
	}
	if err := m.podman.GetJSON(ctx, "/v4.0.0/libpod/exec/"+execResp.ID+"/json", &inspect); err != nil {
		return fmt.Errorf("wpSearchReplace: inspect exec: %w", err)
	}
	if inspect.ExitCode != 0 {
		return fmt.Errorf("wpSearchReplace: wp-cli exited %d", inspect.ExitCode)
	}

	logger.Debug("wpSearchReplace: replaced %s → %s for site %s", fromDomain, toDomain, site.Name)
	return nil
}

// readImportManifest reads manifest.json from the extracted archive temp dir
// and returns the domain list, or nil if no manifest is present
func readImportManifest(tmpDir string) []string {
	data, err := os.ReadFile(filepath.Join(tmpDir, "manifest.json"))
	if err != nil {
		return nil
	}
	var m struct {
		Domains []string `json:"domains"`
	}
	if err := json.Unmarshal(data, &m); err != nil {
		return nil
	}
	return m.Domains
}
