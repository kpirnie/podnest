// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package backup

import (
	"bytes"
	"compress/gzip"
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"

	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/podman"
)

// DBTable describes one base table in a site's database.
type DBTable struct {
	Name   string `json:"name"`
	Engine string `json:"engine"`
	Rows   int64  `json:"rows"`
	Size   int64  `json:"size"`
}

// DumpDB streams a gzip-compressed dump of the site's database to w. Nothing
// reaches w until the dump produces output, so a dump that fails to start
// still leaves the caller free to send an error response.
func (m *Manager) DumpDB(ctx context.Context, site *models.Site, w io.Writer) error {

	// read DB credentials from the site's .env file
	envPath := filepath.Join(m.appPath, "sites", site.Name, ".env")
	dbName, err := readEnvValue(envPath, "DB_NAME")
	if err != nil {
		return fmt.Errorf("DumpDB: DB_NAME: %w", err)
	}
	rootPass, err := readEnvValue(envPath, "DB_ROOT_PASS")
	if err != nil {
		return fmt.Errorf("DumpDB: DB_ROOT_PASS: %w", err)
	}

	// stream mysqldump from the MariaDB container via podman exec CLI
	dbContainer := podman.ContainerName(site.Name, "db")
	dumpCmd := exec.CommandContext(ctx, "podman",
		"exec", "--user=mysql", "-e", "MYSQL_PWD", dbContainer,
		"sh", "-c",
		// the schema name is a positional arg, never interpolated into the script
		`mysqldump -uroot --single-transaction --quick --routines "$1" 2>/dev/null || `+
			`mariadb-dump -uroot --single-transaction --quick --routines "$1"`,
		"sh",
		dbName,
	)
	// MYSQL_PWD passed via -e (name only) so the password is in neither the host
	// nor the container process list
	dumpCmd.Env = append(os.Environ(), "CONTAINER_HOST=unix://"+m.podmanSock, "MYSQL_PWD="+rootPass)

	// capture dump stderr for error reporting
	var dumpStderr bytes.Buffer
	dumpCmd.Stderr = &dumpStderr

	stdout, err := dumpCmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("DumpDB: stdout pipe: %w", err)
	}
	if err := dumpCmd.Start(); err != nil {
		return fmt.Errorf("DumpDB: start mysqldump: %w", err)
	}

	// compress on the panel side so the DB container needs no compressor
	gz := gzip.NewWriter(w)
	if _, err := io.Copy(gz, stdout); err != nil {
		dumpCmd.Wait()
		return fmt.Errorf("DumpDB: stream: %w — dump_stderr: %s", err, dumpStderr.String())
	}

	// a failed dump leaves the gzip stream unterminated, so a truncated
	// download fails its integrity check instead of passing as complete
	if err := dumpCmd.Wait(); err != nil {
		return fmt.Errorf("DumpDB: mysqldump wait: %w — dump_stderr: %s", err, dumpStderr.String())
	}
	if err := gz.Close(); err != nil {
		return fmt.Errorf("DumpDB: gzip close: %w", err)
	}

	logger.Debug("DumpDB: dump streamed for site %s", site.Name)
	return nil
}

// IsSQLDumpName reports whether name has a supported SQL dump extension.
func IsSQLDumpName(name string) bool {
	return strings.HasSuffix(name, ".sql") || strings.HasSuffix(name, ".sql.gz")
}

// ListImportSQLFiles returns the filenames of any SQL dumps (.sql, .sql.gz) in
// the site's SFTP import directory.
func (m *Manager) ListImportSQLFiles(siteName string) ([]string, error) {
	entries, err := os.ReadDir(m.importDir(siteName))
	if err != nil {
		if os.IsNotExist(err) {
			return []string{}, nil
		}
		return nil, fmt.Errorf("ListImportSQLFiles: %w", err)
	}

	files := []string{}
	for _, e := range entries {
		// the SFTP user owns this dir, so only surface plain files — never
		// symlinks, FIFOs or other special files
		if !e.Type().IsRegular() {
			continue
		}
		if IsSQLDumpName(e.Name()) {
			files = append(files, e.Name())
		}
	}
	return files, nil
}

// ImportSQL loads the .sql or .sql.gz dump at dumpPath into the site's
// database, merging into the existing schema unless wipe is set. The site is
// placed in maintenance mode for the duration, and on success the dump is
// deleted when it lives in the site's own import directory.
func (m *Manager) ImportSQL(ctx context.Context, site *models.Site, dumpPath string, wipe bool) (err error) {

	// record the outcome for the status poll; the caller releases its claim
	// after this returns, so the error is stored before the site reports idle
	m.importErrs.Delete(site.ID)
	defer func() {
		if err != nil {
			m.importErrs.Store(site.ID, err.Error())
		}
	}()

	// read DB credentials from the site's .env file
	siteDir := filepath.Join(m.appPath, "sites", site.Name)
	envPath := filepath.Join(siteDir, ".env")
	dbName, err := readEnvValue(envPath, "DB_NAME")
	if err != nil {
		return fmt.Errorf("ImportSQL: DB_NAME: %w", err)
	}
	rootPass, err := readEnvValue(envPath, "DB_ROOT_PASS")
	if err != nil {
		return fmt.Errorf("ImportSQL: DB_ROOT_PASS: %w", err)
	}

	// the import dir is writable by the site's SFTP user, so the dump is opened
	// without following links and must be a regular file
	f, err := openArchive(dumpPath)
	if err != nil {
		return fmt.Errorf("ImportSQL: %w", err)
	}
	defer f.Close()

	var src io.Reader = f
	if strings.HasSuffix(dumpPath, ".gz") {
		gz, err := gzip.NewReader(f)
		if err != nil {
			return fmt.Errorf("ImportSQL: gzip: %w", err)
		}
		defer gz.Close()
		src = gz
	}

	// enable maintenance mode before touching the database
	if err := m.enableMaintenance(ctx, site, siteDir); err != nil {
		return fmt.Errorf("ImportSQL: enable maintenance: %w", err)
	}
	defer func() {
		if err := m.disableMaintenance(ctx, site, siteDir); err != nil {
			logger.Error("ImportSQL: disable maintenance for site %s: %v", site.Name, err)
		}
	}()

	if wipe {
		if err := m.clearDatabase(ctx, site, dbName, rootPass); err != nil {
			return fmt.Errorf("ImportSQL: %w", err)
		}
	}
	if err := m.loadDBDump(ctx, site, src, dbName, rootPass); err != nil {
		return fmt.Errorf("ImportSQL: %w", err)
	}

	// remove the dump now that the import succeeded
	if filepath.Dir(dumpPath) == m.importDir(site.Name) {
		if err := os.Remove(dumpPath); err != nil {
			logger.Warn("ImportSQL: remove dump %s: %v", dumpPath, err)
		}
	}
	m.notifySiteChanged(site.ID)
	logger.Debug("ImportSQL: imported %s into site %s (wipe=%v)", filepath.Base(dumpPath), site.Name, wipe)
	return nil
}

// SearchReplace runs WP-CLI's serialization-safe search-replace across every
// table in a WordPress site's database and returns the number of replacements.
// On a dry run nothing is written and the count is what would be replaced.
func (m *Manager) SearchReplace(ctx context.Context, site *models.Site, search, replace string, dryRun bool) (int, error) {
	containerName := podman.ContainerName(site.Name, "php")

	if err := m.ensureWPCLI(ctx, containerName); err != nil {
		return 0, fmt.Errorf("SearchReplace: %w", err)
	}

	// the terms go in as discrete argv entries — no shell is involved
	args := []string{
		"exec", containerName,
		"/tmp/wp", "--path=/var/www/html", "--allow-root",
		"search-replace", "--all-tables", "--precise", "--format=count",
	}
	if dryRun {
		args = append(args, "--dry-run")
	}
	args = append(args, search, replace)

	cmd := exec.CommandContext(ctx, "podman", args...)
	cmd.Env = append(os.Environ(), "CONTAINER_HOST=unix://"+m.podmanSock)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	out, err := cmd.Output()
	if err != nil {
		return 0, fmt.Errorf("SearchReplace: wp-cli: %w — %s", err, strings.TrimSpace(stderr.String()))
	}

	// --format=count prints the total on the last line of output
	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	count, err := strconv.Atoi(strings.TrimSpace(lines[len(lines)-1]))
	if err != nil {
		return 0, fmt.Errorf("SearchReplace: unexpected wp-cli output %q", strings.TrimSpace(string(out)))
	}

	logger.Debug("SearchReplace: site %s — %d replacements (dry_run=%v)", site.Name, count, dryRun)
	return count, nil
}

// ListTables returns the base tables in the site's database with their engine,
// estimated row count and on-disk size (data plus indexes).
func (m *Manager) ListTables(ctx context.Context, site *models.Site) ([]DBTable, error) {
	envPath := filepath.Join(m.appPath, "sites", site.Name, ".env")
	dbName, err := readEnvValue(envPath, "DB_NAME")
	if err != nil {
		return nil, fmt.Errorf("ListTables: DB_NAME: %w", err)
	}
	rootPass, err := readEnvValue(envPath, "DB_ROOT_PASS")
	if err != nil {
		return nil, fmt.Errorf("ListTables: DB_ROOT_PASS: %w", err)
	}

	query := fmt.Sprintf(
		"SELECT TABLE_NAME, IFNULL(ENGINE,''), IFNULL(TABLE_ROWS,0), IFNULL(DATA_LENGTH,0)+IFNULL(INDEX_LENGTH,0) "+
			"FROM information_schema.TABLES WHERE TABLE_SCHEMA='%s' AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME",
		strings.ReplaceAll(dbName, "'", "''"),
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
		return nil, fmt.Errorf("ListTables: mariadb: %w — %s", err, stderr.String())
	}

	tables := []DBTable{}
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		f := strings.Split(line, "\t")
		if len(f) < 4 {
			continue
		}
		rows, _ := strconv.ParseInt(f[2], 10, 64)
		size, _ := strconv.ParseInt(f[3], 10, 64)
		tables = append(tables, DBTable{Name: f[0], Engine: f[1], Rows: rows, Size: size})
	}
	return tables, nil
}

// MaintainTables runs an optimize or repair over the named tables in the
// site's database and returns the tool's per-table report. Every name must be
// an existing base table, so nothing but real tables ever reaches the command.
func (m *Manager) MaintainTables(ctx context.Context, site *models.Site, action string, tables []string) (string, error) {
	if action != "optimize" && action != "repair" {
		return "", fmt.Errorf("MaintainTables: unsupported action %q", action)
	}

	envPath := filepath.Join(m.appPath, "sites", site.Name, ".env")
	dbName, err := readEnvValue(envPath, "DB_NAME")
	if err != nil {
		return "", fmt.Errorf("MaintainTables: DB_NAME: %w", err)
	}
	rootPass, err := readEnvValue(envPath, "DB_ROOT_PASS")
	if err != nil {
		return "", fmt.Errorf("MaintainTables: DB_ROOT_PASS: %w", err)
	}

	// resolve the requested names against the live table list
	existing, err := m.ListTables(ctx, site)
	if err != nil {
		return "", fmt.Errorf("MaintainTables: %w", err)
	}
	known := make(map[string]bool, len(existing))
	for _, t := range existing {
		known[t.Name] = true
	}
	seen := make(map[string]bool, len(tables))
	var names []string
	for _, t := range tables {
		if !known[t] {
			return "", fmt.Errorf("MaintainTables: unknown table %q", t)
		}
		// a leading dash would be parsed as an option by the check tool
		if strings.HasPrefix(t, "-") {
			return "", fmt.Errorf("MaintainTables: unsupported table name %q", t)
		}
		if !seen[t] {
			seen[t] = true
			names = append(names, t)
		}
	}
	if len(names) == 0 {
		return "", fmt.Errorf("MaintainTables: no tables selected")
	}

	// the schema and table names are positional args, never interpolated into
	// the script; newer images ship only mariadb-check, older only mysqlcheck
	args := append([]string{
		"exec", "-e", "MYSQL_PWD", podman.ContainerName(site.Name, "db"),
		"sh", "-c",
		`if command -v mariadb-check >/dev/null 2>&1; then exec mariadb-check -uroot "$@"; else exec mysqlcheck -uroot "$@"; fi`,
		"sh",
		"--" + action, dbName,
	}, names...)
	cmd := exec.CommandContext(ctx, "podman", args...)
	cmd.Env = append(os.Environ(), "CONTAINER_HOST=unix://"+m.podmanSock, "MYSQL_PWD="+rootPass)

	out, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("MaintainTables: %s: %w — %s", action, err, strings.TrimSpace(string(out)))
	}

	logger.Debug("MaintainTables: %s on %d tables for site %s", action, len(names), site.Name)
	return strings.TrimSpace(string(out)), nil
}
