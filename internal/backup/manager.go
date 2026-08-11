// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package backup

import (
	"archive/tar"
	"archive/zip"
	"bufio"
	"bytes"
	"compress/gzip"
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	_ "embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"podnest/internal/db"
	"podnest/internal/fileutil"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/podman"
)

//go:embed maintenance.html
var maintenanceHTML []byte

// wpSaltConsts are the wp-config.php key/salt constants regenerated on import
var wpSaltConsts = []string{
	"AUTH_KEY", "SECURE_AUTH_KEY", "LOGGED_IN_KEY", "NONCE_KEY",
	"AUTH_SALT", "SECURE_AUTH_SALT", "LOGGED_IN_SALT", "NONCE_SALT",
}

var wpPrefixRe = regexp.MustCompile(`(?m)^\s*\$table_prefix\s*=\s*['"]([A-Za-z0-9_]+)['"]\s*;?`)

// constants for restic binary path and maintenance mode file names
const (
	resticBin     = "/usr/bin/restic"
	maintConfName = "000-maint.conf"
	maintHTMLName = "maintenance.html"
)

// Manager orchestrates restic backup and restore operations for all sites
type Manager struct {
	db          *sql.DB
	podman      *podman.Client
	podmanSock  string // socket path for podman CLI exec piping
	appPath     string
	schedulerCh chan string // send cron expression to reschedule; "" disables
	restoring   sync.Map    // map[int64]bool
}

// s3Config holds the S3 connection settings resolved from global settings
type s3Config struct {
	endpoint  string
	bucket    string
	region    string
	accessKey string
	secretKey string
}

// New returns a backup Manager
func New(database *sql.DB, pc *podman.Client, podmanSock, appPath string) *Manager {

	// return the backup manager
	return &Manager{
		db:          database,
		podman:      pc,
		podmanSock:  podmanSock,
		appPath:     appPath,
		schedulerCh: make(chan string, 1),
	}
}

// localRepoPath returns the local restic repo directory for a site
func (m *Manager) localRepoPath(siteName string) string {
	return filepath.Join(m.appPath, "sites", siteName, "backups", "local")
}

// s3RepoURL builds the restic S3 repository URL for a site
func s3RepoURL(endpoint, bucket, siteName string) string {

	// restic S3 format: s3:https://endpoint/bucket/prefix
	ep := strings.TrimRight(endpoint, "/")
	return fmt.Sprintf("s3:%s/%s/%s", ep, bucket, siteName)
}

// loadS3Config reads S3 settings from the database; returns nil if incomplete
func (m *Manager) loadS3Config() (*s3Config, error) {

	// restic S3 backend requires endpoint and bucket at minimum; access key and secret key can be empty for public buckets
	keys := []string{
		"s3_endpoint", "s3_bucket", "s3_region",
		"s3_access_key", "s3_secret_key",
	}

	// read all S3 settings in one batch
	vals := make(map[string]string, len(keys))
	for _, k := range keys {
		v, err := db.GetSetting(m.db, k)
		if err != nil {
			return nil, err
		}
		vals[k] = v
	}

	// endpoint and bucket are the minimum required fields
	if vals["s3_endpoint"] == "" || vals["s3_bucket"] == "" {
		return nil, nil
	}

	// default to us-east-1 if region is not set
	region := vals["s3_region"]
	if region == "" {
		region = "us-east-1"
	}

	// return the config struct
	return &s3Config{
		endpoint:  vals["s3_endpoint"],
		bucket:    vals["s3_bucket"],
		region:    region,
		accessKey: vals["s3_access_key"],
		secretKey: vals["s3_secret_key"],
	}, nil
}

// resticEnv builds the environment slice for a restic command
func resticEnv(password string, s3 *s3Config) []string {
	env := append(os.Environ(), "RESTIC_PASSWORD="+password)
	env = append(env, "TMPDIR=/var/tmp")
	if s3 != nil {
		env = append(env,
			"AWS_ACCESS_KEY_ID="+s3.accessKey,
			"AWS_SECRET_ACCESS_KEY="+s3.secretKey,
			"AWS_DEFAULT_REGION="+s3.region,
		)
	}
	return env
}

// initRepo runs restic init for the given repo, treating an already-initialized
// repo as a non-error
func initRepo(ctx context.Context, repoPath string, env []string) error {

	// restic init will create the repo directory if it doesn't exist
	cmd := exec.CommandContext(ctx, resticBin, "-r", repoPath, "init")
	cmd.Env = env
	out, err := cmd.CombinedOutput()

	// if the repo is already initialized, treat that as a non-error
	if err != nil {
		if strings.Contains(string(out), "already initialized") ||
			strings.Contains(string(out), "config file already exists") {
			return nil
		}
		logger.Error("initRepo: %s: %v — %s", repoPath, err, string(out))
		return fmt.Errorf("restic init: %w — %s", err, string(out))
	}
	logger.Debug("initRepo: initialized repo at %s", repoPath)
	return nil
}

// ensureRepo returns the site's BackupRepo record, creating and persisting one
// (with a fresh random password) if none exists yet
func (m *Manager) ensureRepo(ctx context.Context, site *models.Site) (*models.BackupRepo, error) {

	// check if a repo record already exists for this site
	repo, err := db.GetBackupRepo(m.db, site.ID)
	if err != nil {
		return nil, err
	}
	if repo == nil {

		// generate a cryptographically random password for this site's repos
		b := make([]byte, 32)
		if _, err := rand.Read(b); err != nil {
			logger.Error("ensureRepo: generate password: %v", err)
			return nil, err
		}

		// create a new repo record with the generated password and local path
		repo = &models.BackupRepo{
			SiteID:       site.ID,
			RepoPassword: hex.EncodeToString(b),
			LocalPath:    m.localRepoPath(site.Name),
		}
		if err := db.UpsertBackupRepo(m.db, repo); err != nil {
			return nil, err
		}
		logger.Debug("ensureRepo: created repo record for site %d", site.ID)
	}

	// return the existing or newly created repo record
	return repo, nil
}

// Backup creates a restic snapshot for the given site across all enabled
// destinations. File tree and DB dump are tagged with a shared run ID so they
// can be located together at restore time. Returns the created Backup ID.
func (m *Manager) Backup(ctx context.Context, site *models.Site, label string) (int64, error) {

	// ensure a repo record exists for this site, creating one if needed
	repo, err := m.ensureRepo(ctx, site)
	if err != nil {
		return 0, err
	}

	// load S3 config if S3 backup is enabled
	s3, err := m.loadS3Config()
	if err != nil {
		return 0, err
	}

	// generate a unique tag to correlate the file and DB snapshots for this run
	tagBytes := make([]byte, 8)
	if _, err := rand.Read(tagBytes); err != nil {
		return 0, fmt.Errorf("backup: generate tag: %w", err)
	}
	tag := "podnest-" + hex.EncodeToString(tagBytes)

	// the siteDir is the root for all file operations in this backup
	siteDir := filepath.Join(m.appPath, "sites", site.Name)

	// paths included in the file snapshot
	includePaths := []string{
		filepath.Join(siteDir, "html"),
		filepath.Join(siteDir, "nginx"),
		filepath.Join(siteDir, "php-fpm"),
		filepath.Join(siteDir, "redis"),
		filepath.Join(siteDir, ".env"),
	}

	// paths excluded from the file snapshot
	excludePaths := []string{
		// fastcgi cache — ephemeral, never worth backing up
		filepath.Join(siteDir, "nginx", "cache"),
		// InnoDB binary data dir — replaced entirely by the mysqldump
		filepath.Join(siteDir, "db"),
	}

	// hold the total size of data added across all repos for this backup run
	var totalSize int64
	var backupType int

	// if local backup is enabled, run restic backup for the file tree and DB dump
	if repo.LocalEnabled {
		localEnv := resticEnv(repo.RepoPassword, nil)
		if err := os.MkdirAll(repo.LocalPath, 0750); err != nil {
			return 0, fmt.Errorf("backup: create local repo dir: %w", err)
		}
		logger.Debug("Backup: starting local backup for site %d (%s)", site.ID, site.Name)
		if err := initRepo(ctx, repo.LocalPath, localEnv); err != nil {
			return 0, err
		}
		sz, err := m.backupFiles(ctx, repo.LocalPath, localEnv, includePaths, excludePaths, tag)
		if err != nil {
			return 0, err
		}
		totalSize += sz
		if err := m.backupDB(ctx, site, repo.LocalPath, localEnv, tag, siteDir); err != nil {
			return 0, err
		}

		// apply retention policy and prune
		if err := m.forgetPrune(ctx, repo.LocalPath, localEnv); err != nil {
			logger.Warn("Backup: local forget/prune failed for site %d: %v", site.ID, err)
		}
		backupType = models.BackupTypeLocal
	}

	// if S3 backup is enabled and configured, run restic backup for the file tree and DB dump
	if repo.S3Enabled && s3 != nil {
		s3Repo := s3RepoURL(s3.endpoint, s3.bucket, site.Name)
		s3Env := resticEnv(repo.RepoPassword, s3)
		logger.Debug("Backup: starting S3 backup for site %d (%s)", site.ID, site.Name)
		if err := initRepo(ctx, s3Repo, s3Env); err != nil {
			return 0, err
		}
		sz, err := m.backupFiles(ctx, s3Repo, s3Env, includePaths, excludePaths, tag)
		if err != nil {
			return 0, err
		}
		totalSize += sz
		if err := m.backupDB(ctx, site, s3Repo, s3Env, tag, siteDir); err != nil {
			return 0, err
		}

		// apply retention policy and prune
		if err := m.forgetPrune(ctx, s3Repo, s3Env); err != nil {
			logger.Warn("Backup: S3 forget/prune failed for site %d: %v", site.ID, err)
		}
		if backupType == 0 {
			backupType = models.BackupTypeS3
		}
	}

	// fetch the site's domains to store with the backup record
	siteDomains, err := db.GetDomainsBySite(m.db, site.ID)
	if err != nil {
		logger.Warn("CreateFinalBackup: failed to fetch domains for site %d: %v", site.ID, err)
	}
	var domainList []string
	for _, d := range siteDomains {
		domainList = append(domainList, d.Domain)
	}

	// record the completed backup in the database
	b := &models.Backup{
		SiteID:     site.ID,
		SnapshotID: tag,
		Label:      label,
		BackupType: backupType,
		SizeBytes:  totalSize,
		Domains:    domainList,
	}
	id, err := db.CreateBackup(m.db, b)
	if err != nil {
		return 0, err
	}

	logger.Debug("Backup: completed %s for site %s (id=%d, size=%d)", tag, site.Name, id, totalSize)
	return id, nil
}

// backupFiles runs restic backup for the site's file tree and returns bytes added
func (m *Manager) backupFiles(ctx context.Context, repoPath string, env, paths, excludes []string, tag string) (int64, error) {

	// build the restic backup command with the given include and exclude paths
	args := []string{"-r", repoPath, "backup", "--json", "--tag", tag}
	for _, ex := range excludes {
		args = append(args, "--exclude", ex)
	}
	args = append(args, paths...)

	// run the restic backup command
	cmd := exec.CommandContext(ctx, resticBin, args...)
	cmd.Env = env

	// capture restic stdout for parsing the summary of bytes added
	out, err := cmd.Output()
	if err != nil {
		logger.Error("backupFiles: restic backup failed for %s: %v", repoPath, err)
		return 0, fmt.Errorf("restic backup files: %w", err)
	}

	// restic --json outputs one JSON object per line; the last is the summary
	var summary struct {
		DataAdded int64 `json:"data_added"`
	}
	lines := bytes.Split(bytes.TrimSpace(out), []byte("\n"))
	if len(lines) > 0 {
		_ = json.Unmarshal(lines[len(lines)-1], &summary)
	}

	logger.Debug("backupFiles: %d bytes added to %s", summary.DataAdded, repoPath)
	return summary.DataAdded, nil
}

// backupDB pipes mysqldump from the MariaDB container directly into
// restic backup --stdin, storing it as db_dump.sql in the snapshot
func (m *Manager) backupDB(ctx context.Context, site *models.Site, repoPath string, env []string, tag, siteDir string) error {

	// only sites with a MariaDB container need a DB backup
	if !modules.TypeModule(site.SiteType).HasDatabase() {
		logger.Debug("backupDB: skipping non-PHP site %s", site.Name)
		return nil
	}

	// read DB credentials from the site's .env file
	dbName, err := readEnvValue(filepath.Join(siteDir, ".env"), "DB_NAME")
	if err != nil {
		return fmt.Errorf("backupDB: DB_NAME: %w", err)
	}
	rootPass, err := readEnvValue(filepath.Join(siteDir, ".env"), "DB_ROOT_PASS")
	if err != nil {
		return fmt.Errorf("backupDB: DB_ROOT_PASS: %w", err)
	}

	// set up restic to receive the dump on stdin
	resticCmd := exec.CommandContext(ctx, resticBin,
		"-r", repoPath, "backup",
		"--stdin", "--stdin-filename", "db_dump.sql",
		"--tag", tag,
	)
	resticCmd.Env = env

	// capture restic stderr for error reporting
	var resticStderr bytes.Buffer
	resticCmd.Stderr = &resticStderr

	// stream mysqldump from the MariaDB container via podman exec CLI;
	// CONTAINER_HOST points the CLI at the correct socket
	dbContainer := podman.ContainerName(site.Name, "db")
	dumpCmd := exec.CommandContext(ctx, "podman",
		"exec", "--user=mysql", "-e", "MYSQL_PWD", dbContainer,
		"sh", "-c",
		fmt.Sprintf(
			"mysqldump -uroot --single-transaction --quick --routines %s 2>/dev/null || "+
				"mariadb-dump -uroot --single-transaction --quick --routines %s",
			dbName, dbName,
		),
	)
	// MYSQL_PWD passed via -e (name only) so the password is in neither the host
	// nor the container process list (it lives only in this command's env)
	dumpCmd.Env = append(os.Environ(), "CONTAINER_HOST=unix://"+m.podmanSock, "MYSQL_PWD="+rootPass)

	// capture dump stderr for error reporting
	var dumpStderr bytes.Buffer
	dumpCmd.Stderr = &dumpStderr

	// connect: dumpCmd.Stdout → resticCmd.Stdin
	resticCmd.Stdin, err = dumpCmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("backupDB: stdout pipe: %w", err)
	}

	logger.Debug("backupDB: starting DB stream to restic for site %s", site.Name)

	// start the dump command first
	if err := dumpCmd.Start(); err != nil {
		return fmt.Errorf("backupDB: start mysqldump: %w", err)
	}

	// then start the restic command to read from the dump's stdout
	if err := resticCmd.Run(); err != nil {
		dumpCmd.Wait()
		return fmt.Errorf("backupDB: restic: %w — restic_stderr: %s — dump_stderr: %s",
			err, resticStderr.String(), dumpStderr.String())
	}

	// wait for the dump command to finish and check for errors
	if err := dumpCmd.Wait(); err != nil {
		return fmt.Errorf("backupDB: mysqldump wait: %w — dump_stderr: %s",
			err, dumpStderr.String())
	}

	logger.Debug("backupDB: DB snapshot complete for site %s", site.Name)
	return nil
}

// Restore restores a site from the snapshot identified by the given Backup
// record. Nginx serves the maintenance page for the duration.
func (m *Manager) Restore(ctx context.Context, site *models.Site, backup *models.Backup) error {

	// if a restore is already in progress for this site, prevent starting another
	m.restoring.Store(site.ID, true)
	defer m.restoring.Delete(site.ID)

	// look up the repo for this site; we need the password and repo type to know
	repo, err := db.GetBackupRepo(m.db, site.ID)
	if err != nil || repo == nil {
		return fmt.Errorf("restore: no repo configured for site %s", site.Name)
	}

	// load S3 config if needed for this backup type
	s3, err := m.loadS3Config()
	if err != nil {
		return err
	}

	// resolve which repo to restore from based on the backup type
	var repoPath string
	var env []string

	// find the actual backup type so we can set up the repo path and env correctly
	switch backup.BackupType {
	case models.BackupTypeLocal:
		repoPath = repo.LocalPath
		env = resticEnv(repo.RepoPassword, nil)
	case models.BackupTypeS3:
		if s3 == nil {
			return fmt.Errorf("restore: S3 not configured")
		}
		repoPath = s3RepoURL(s3.endpoint, s3.bucket, site.Name)
		env = resticEnv(repo.RepoPassword, s3)
	default:
		return fmt.Errorf("restore: unknown backup type %d", backup.BackupType)
	}

	// setup the site directory string
	siteDir := filepath.Join(m.appPath, "sites", site.Name)

	// enable maintenance mode before touching any site data
	if err := m.enableMaintenance(ctx, site, siteDir); err != nil {
		return fmt.Errorf("restore: enable maintenance: %w", err)
	}

	// always lift maintenance mode on exit, even on error
	defer func() {
		if err := m.disableMaintenance(ctx, site, siteDir); err != nil {
			logger.Error("Restore: disable maintenance for site %s: %v", site.Name, err)
		}
	}()

	// restore the files
	if err := m.restoreFiles(ctx, repoPath, env, backup.SnapshotID, siteDir); err != nil {
		return fmt.Errorf("restore files: %w", err)
	}

	// reapply correct ownership — restic restores files as root
	m.fixPostRestorePerms(siteDir, site.ID)

	// restore the database
	if err := m.restoreDB(ctx, site, repoPath, env, backup.SnapshotID, siteDir); err != nil {
		return fmt.Errorf("restore db: %w", err)
	}

	logger.Debug("Restore: completed for site %s from tag %s", site.Name, backup.SnapshotID)
	return nil
}

// IsRestoring returns true if a restore operation is currently in progress for the given site ID
func (m *Manager) IsRestoring(siteID int64) bool {
	_, ok := m.restoring.Load(siteID)
	return ok
}

// restoreFiles runs restic restore for the file tree snapshot matching the tag
func (m *Manager) restoreFiles(ctx context.Context, repoPath string, env []string, tag, siteDir string) error {

	// find the snapshot ID for the file tree snapshot with the given tag
	snapID, err := m.findSnapshot(ctx, repoPath, env, tag, "files")
	if err != nil {
		return err
	}

	// setup the restore command
	args := []string{
		"-r", repoPath, "restore", snapID,
		"--target", "/",
		// exclude the nginx cache and the maintenance conf we injected
		"--exclude", filepath.Join(siteDir, "nginx", "cache"),
		"--exclude", filepath.Join(siteDir, "nginx", "conf.d", maintConfName),
		// rendered configs are the target site's, never the snapshot's
		"--exclude", filepath.Join(siteDir, "nginx"),
		"--exclude", filepath.Join(siteDir, "php-fpm"),
	}

	// run the restic restore command
	cmd := exec.CommandContext(ctx, resticBin, args...)
	cmd.Env = env

	// capture stderr for error reporting
	if out, err := cmd.CombinedOutput(); err != nil {
		logger.Error("restoreFiles: restic restore: %v — %s", err, string(out))
		return fmt.Errorf("restic restore: %w — %s", err, string(out))
	}

	logger.Debug("restoreFiles: restored files from snapshot %s", snapID)
	return nil
}

// restoreDB streams the DB dump out of restic and pipes it into mysql inside
// the MariaDB container via the podman exec CLI
func (m *Manager) restoreDB(ctx context.Context, site *models.Site, repoPath string, env []string, tag, siteDir string) error {

	// only sites with a MariaDB container need a DB restore
	if !modules.TypeModule(site.SiteType).HasDatabase() {
		return nil
	}

	// find the snapshot ID for the DB dump snapshot with the given tag
	snapID, err := m.findSnapshot(ctx, repoPath, env, tag, "db")
	if err != nil {
		return err
	}

	// read DB credentials from the site's .env file
	rootPass, err := readEnvValue(filepath.Join(siteDir, ".env"), "DB_ROOT_PASS")
	if err != nil {
		return fmt.Errorf("restoreDB: DB_ROOT_PASS: %w", err)
	}
	dbName, err := readEnvValue(filepath.Join(siteDir, ".env"), "DB_NAME")
	if err != nil {
		return fmt.Errorf("restoreDB: DB_NAME: %w", err)
	}

	// dump the SQL from restic into a temp file on the host
	tmp, err := os.CreateTemp("", "podnest-restore-*.sql")
	if err != nil {
		return fmt.Errorf("restoreDB: create temp: %w", err)
	}
	defer os.Remove(tmp.Name())

	// run restic dump to write the SQL to the temp file
	dumpCmd := exec.CommandContext(ctx, resticBin, "-r", repoPath, "dump", snapID, "db_dump.sql")
	dumpCmd.Env = env
	dumpCmd.Stdout = tmp
	if err := dumpCmd.Run(); err != nil {
		tmp.Close()
		return fmt.Errorf("restoreDB: restic dump: %w", err)
	}
	tmp.Close()

	// copy the SQL file into the container
	dbContainer := podman.ContainerName(site.Name, "db")
	cpCmd := exec.CommandContext(ctx, "podman",
		"cp", tmp.Name(), dbContainer+":/tmp/podnest-restore.sql",
	)
	cpCmd.Env = append(os.Environ(), "CONTAINER_HOST=unix://"+m.podmanSock)
	if out, err := cpCmd.CombinedOutput(); err != nil {
		return fmt.Errorf("restoreDB: podman cp: %w — %s", err, string(out))
	}

	// run mysql inside the container redirected from the copied file
	mysqlCmd := exec.CommandContext(ctx, "podman",
		"exec", "-e", "MYSQL_PWD", dbContainer,
		"sh", "-c",
		fmt.Sprintf("mariadb -uroot %s < /tmp/podnest-restore.sql && rm /tmp/podnest-restore.sql", dbName),
	)
	mysqlCmd.Env = append(os.Environ(), "CONTAINER_HOST=unix://"+m.podmanSock, "MYSQL_PWD="+rootPass)

	var mysqlStderr bytes.Buffer
	mysqlCmd.Stderr = &mysqlStderr
	if err := mysqlCmd.Run(); err != nil {
		return fmt.Errorf("restoreDB: mariadb: %w — %s", err, mysqlStderr.String())
	}

	logger.Debug("restoreDB: DB restored for site %s from snapshot %s", site.Name, snapID)
	return nil
}

// findSnapshot queries the restic repo for the snapshot matching the tag and
// kind ("files" or "db"). The DB snapshot is identified by having a single
// path entry of "db_dump.sql"; the file snapshot has directory paths.
func (m *Manager) findSnapshot(ctx context.Context, repoPath string, env []string, tag, kind string) (string, error) {

	// list ALL snapshots — tag filtering via restic CLI can miss stdin snapshots
	cmd := exec.CommandContext(ctx, resticBin,
		"-r", repoPath, "snapshots", "--json",
	)
	cmd.Env = env

	// capture the output for parsing
	out, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("findSnapshot: restic snapshots: %w", err)
	}

	// parse the JSON output to find the snapshot with the given tag and kind
	var snaps []struct {
		ID    string   `json:"id"`
		Tags  []string `json:"tags"`
		Paths []string `json:"paths"`
	}
	if err := json.Unmarshal(out, &snaps); err != nil {
		return "", fmt.Errorf("findSnapshot: parse: %w", err)
	}

	// loop over snapshots to find one that matches the tag and kind criteria
	for _, s := range snaps {

		// check tag matches manually
		hasTag := false
		for _, t := range s.Tags {
			if t == tag {
				hasTag = true
				break
			}
		}
		if !hasTag {
			continue
		}

		logger.Debug("findSnapshot: candidate %s tags=%v paths=%v", s.ID, s.Tags, s.Paths)

		// DB snapshot has exactly one path of "db_dump.sql"; file snapshot has multiple paths that are not "db_dump.sql"
		isDB := len(s.Paths) == 1 &&
			(s.Paths[0] == "db_dump.sql" || s.Paths[0] == "/db_dump.sql")
		if kind == "db" && isDB {
			return s.ID, nil
		}
		if kind == "files" && !isDB {
			return s.ID, nil
		}
	}

	// if we get here, no matching snapshot was found
	return "", fmt.Errorf("findSnapshot: no %s snapshot for tag %s", kind, tag)
}

// forgetPrune applies the configured retention policy and prunes unreachable data
func (m *Manager) forgetPrune(ctx context.Context, repoPath string, env []string) error {

	// clear any stale locks before pruning
	unlockCmd := exec.CommandContext(ctx, resticBin, "-r", repoPath, "unlock")
	unlockCmd.Env = env
	_ = unlockCmd.Run()

	// get the retention policy from settings
	retainDays, err := db.GetSetting(m.db, "backup_retain_days")
	if err != nil || retainDays == "" {
		retainDays = "30"
	}

	// set up the restic forget command with --keep-within to apply the retention policy, and --prune to remove unreachable data
	cmd := exec.CommandContext(ctx, resticBin,
		"-r", repoPath, "forget",
		"--keep-within", retainDays+"d",
		"--prune",
	)
	cmd.Env = env

	// capture stderr for error reporting
	if out, err := cmd.CombinedOutput(); err != nil {
		logger.Error("forgetPrune: %s: %v — %s", repoPath, err, string(out))
		return fmt.Errorf("restic forget: %w", err)
	}

	logger.Debug("forgetPrune: pruned %s with %sd retention", repoPath, retainDays)
	return nil
}

// enableMaintenance writes the maintenance page and injects a catch-all nginx
// config that returns 503 for all requests
func (m *Manager) enableMaintenance(ctx context.Context, site *models.Site, siteDir string) error {

	// write the maintenance page into the site's web root
	htmlPath := filepath.Join(siteDir, "html", maintHTMLName)
	if err := os.WriteFile(htmlPath, maintenanceHTML, 0644); err != nil {
		return fmt.Errorf("write maintenance.html: %w", err)
	}

	// 000- prefix ensures this conf sorts first and takes priority
	maintConf := `server {
    listen 80 default_server;
    root /var/www/html;
    error_page 503 /maintenance.html;
    location = /maintenance.html { internal; }
    location / { return 503; }
}
`

	// write the maintenance nginx conf into the site's nginx conf.d directory
	confPath := filepath.Join(siteDir, "nginx", "conf.d", maintConfName)
	if err := os.WriteFile(confPath, []byte(maintConf), 0644); err != nil {
		return fmt.Errorf("write maintenance nginx conf: %w", err)
	}

	// reload nginx to apply the maintenance page and config
	if err := m.nginxReload(ctx, site.Name); err != nil {
		return fmt.Errorf("nginx reload (maintenance on): %w", err)
	}

	logger.Debug("enableMaintenance: maintenance mode on for site %s", site.Name)
	return nil
}

// disableMaintenance removes the maintenance conf and page, then reloads nginx
func (m *Manager) disableMaintenance(ctx context.Context, site *models.Site, siteDir string) error {

	// set up paths to the maintenance conf and page
	confPath := filepath.Join(siteDir, "nginx", "conf.d", maintConfName)

	// remove the maintenance nginx conf; ignore if it doesn't exist, but log other errors
	if err := os.Remove(confPath); err != nil && !os.IsNotExist(err) {
		logger.Warn("disableMaintenance: remove conf: %v", err)
	}
	htmlPath := filepath.Join(siteDir, "html", maintHTMLName)
	if err := os.Remove(htmlPath); err != nil && !os.IsNotExist(err) {
		logger.Warn("disableMaintenance: remove html: %v", err)
	}

	// reload nginx to apply the config change
	if err := m.nginxReload(ctx, site.Name); err != nil {
		return fmt.Errorf("nginx reload (maintenance off): %w", err)
	}

	logger.Debug("disableMaintenance: maintenance mode off for site %s", site.Name)
	return nil
}

// nginxReload sends nginx -s reload inside the site's nginx container
func (m *Manager) nginxReload(ctx context.Context, siteName string) error {

	// the nginx container name is deterministic based on the site name and module type
	containerName := podman.ContainerName(siteName, "nginx")

	// create an exec instance for the reload command; we can detach immediately since we don't need to wait for it to finish
	var execResp struct {
		ID string `json:"Id"`
	}
	spec := map[string]any{
		"AttachStdout": false,
		"AttachStderr": false,
		"Detach":       true,
		"Cmd":          []string{"nginx", "-s", "reload"},
	}

	// POST to the podman API
	if err := m.podman.PostJSON(ctx,
		"/v4.0.0/libpod/containers/"+containerName+"/exec",
		spec, &execResp,
	); err != nil {
		return fmt.Errorf("nginxReload: create exec: %w", err)
	}

	// start the exec instance we just created
	if err := m.podman.PostJSON(ctx,
		"/v4.0.0/libpod/exec/"+execResp.ID+"/start",
		map[string]any{"Detach": true}, nil,
	); err != nil {
		return fmt.Errorf("nginxReload: start exec: %w", err)
	}

	logger.Debug("nginxReload: sent reload to %s", containerName)
	return nil
}

// StartScheduler launches the background cron scheduler goroutine.
// It reads backup_schedule from settings on startup and whenever Reschedule
// is called.
func (m *Manager) StartScheduler(ctx context.Context) {
	go m.runScheduler(ctx)
}

// Reschedule signals the scheduler to re-arm with a new cron expression.
// Sending an empty string disables scheduled backups.
func (m *Manager) Reschedule(expr string) {

	// non-blocking send; if the channel is already full the pending value
	// is the latest so the signal can be safely dropped
	select {
	case m.schedulerCh <- expr:
	default:
	}
}

// runScheduler is the main scheduler loop
func (m *Manager) runScheduler(ctx context.Context) {

	// timer and channel for the next scheduled backup; nil if no backup is scheduled
	var timer *time.Timer
	var timerCh <-chan time.Time

	// arm or disarm the timer from a cron expression
	arm := func(expr string) {
		if timer != nil {
			timer.Stop()
			timer = nil
			timerCh = nil
		}
		if expr == "" {
			logger.Debug("scheduler: disabled")
			return
		}

		// compute the next scheduled time from the cron expression
		next, err := nextCronTime(expr, time.Now())
		if err != nil {
			logger.Warn("scheduler: invalid cron expression '%s': %v", expr, err)
			return
		}

		// set a timer to fire at the next scheduled time
		d := time.Until(next)
		logger.Debug("scheduler: next backup at %s (in %s)", next.Format(time.RFC3339), d.Round(time.Second))
		timer = time.NewTimer(d)
		timerCh = timer.C
	}

	// load initial schedule from settings
	expr, _ := db.GetSetting(m.db, "backup_schedule")
	arm(expr)

	// main loop: wait for context cancellation, new cron expressions, or timer firing
	for {
		select {
		case <-ctx.Done():
			if timer != nil {
				timer.Stop()
			}
			logger.Debug("scheduler: stopped")
			return

		// new cron expression received — re-arm the timer with the new schedule
		case newExpr := <-m.schedulerCh:
			arm(newExpr)

		case <-timerCh:

			// run backups then re-arm for the next occurrence
			m.runScheduledBackups(ctx)
			expr, _ = db.GetSetting(m.db, "backup_schedule")
			arm(expr)
		}
	}
}

// runScheduledBackups fires a concurrent backup for every site that has a
// repo with at least one destination enabled
func (m *Manager) runScheduledBackups(ctx context.Context) {
	logger.Debug("scheduler: starting backup run")

	// fetch all sites and their repos to find which ones need to be backed up
	sites, err := db.GetAllSites(m.db)
	if err != nil {
		logger.Error("scheduler: list sites: %v", err)
		return
	}

	// run a backup for each site that has a repo with at least one destination enabled
	var wg sync.WaitGroup

	// we run backups in parallel but with a shared context
	for _, site := range sites {
		site := site

		// look up the repo for this site; if no repo or no destinations enabled, skip it
		repo, err := db.GetBackupRepo(m.db, site.ID)
		if err != nil || repo == nil {
			continue
		}

		// if neither local nor S3 backup is enabled for this site, skip it
		if !repo.LocalEnabled && !repo.S3Enabled {
			continue
		}

		// add to the wait group
		wg.Add(1)

		// run the backup in a separate goroutine
		go func() {
			defer wg.Done()
			bCtx, cancel := context.WithTimeout(ctx, 2*time.Hour)
			defer cancel()
			if _, err := m.Backup(bCtx, site, "scheduled"); err != nil {
				logger.Error("scheduler: backup failed for site %s: %v", site.Name, err)
				_ = db.SetBackupError(m.db, site.ID, err.Error())
			} else {
				logger.Debug("scheduler: backup complete for site %s", site.Name)
				_ = db.ClearBackupError(m.db, site.ID)
			}
		}()
	}

	// wait for all backups to complete before returning
	wg.Wait()
	logger.Debug("scheduler: backup run complete")
}

// nextCronTime returns the next time after 'from' that satisfies the 5-field
// cron expression (minute hour dom month dow).
// Supported field syntax: * | N | */N | N-M | N,M,...
func nextCronTime(expr string, from time.Time) (time.Time, error) {

	// parse the cron expression into sets of matching integers for each field
	fields := strings.Fields(expr)
	if len(fields) != 5 {
		return time.Time{}, fmt.Errorf("expected 5 fields, got %d", len(fields))
	}

	// match a minute
	matchMinute, err := parseCronField(fields[0], 0, 59)
	if err != nil {
		return time.Time{}, fmt.Errorf("minute: %w", err)
	}

	// match hour
	matchHour, err := parseCronField(fields[1], 0, 23)
	if err != nil {
		return time.Time{}, fmt.Errorf("hour: %w", err)
	}

	// match on day of month
	matchDOM, err := parseCronField(fields[2], 1, 31)
	if err != nil {
		return time.Time{}, fmt.Errorf("dom: %w", err)
	}

	// match on month
	matchMonth, err := parseCronField(fields[3], 1, 12)
	if err != nil {
		return time.Time{}, fmt.Errorf("month: %w", err)
	}

	// match on day of week (0=Sunday to 6=Saturday)
	matchDOW, err := parseCronField(fields[4], 0, 6)
	if err != nil {
		return time.Time{}, fmt.Errorf("dow: %w", err)
	}

	// start one minute after 'from' so the current minute is never returned
	t := from.Truncate(time.Minute).Add(time.Minute)
	limit := t.Add(366 * 24 * time.Hour)

	// brute-force search for the next time matching all fields; since we have a limit of 366 days, this will always terminate
	for t.Before(limit) {
		if !matchMonth[int(t.Month())] {
			t = time.Date(t.Year(), t.Month()+1, 1, 0, 0, 0, 0, t.Location())
			continue
		}
		if !matchDOM[t.Day()] || !matchDOW[int(t.Weekday())] {
			t = time.Date(t.Year(), t.Month(), t.Day()+1, 0, 0, 0, 0, t.Location())
			continue
		}
		if !matchHour[t.Hour()] {
			t = time.Date(t.Year(), t.Month(), t.Day(), t.Hour()+1, 0, 0, 0, t.Location())
			continue
		}
		if !matchMinute[t.Minute()] {
			t = t.Add(time.Minute)
			continue
		}
		return t, nil
	}

	// if we get here, no matching time was found within the limit
	return time.Time{}, fmt.Errorf("no matching time within 366 days")
}

// parseCronField parses one cron field and returns the set of matching integers
func parseCronField(field string, min, max int) (map[int]bool, error) {
	result := make(map[int]bool)

	// comma-separated list — recurse on each part
	if strings.Contains(field, ",") {
		for _, part := range strings.Split(field, ",") {
			sub, err := parseCronField(strings.TrimSpace(part), min, max)
			if err != nil {
				return nil, err
			}
			for v := range sub {
				result[v] = true
			}
		}
		return result, nil
	}

	// wildcard
	if field == "*" {
		for i := min; i <= max; i++ {
			result[i] = true
		}
		return result, nil
	}

	// step: */N or base/N
	if strings.Contains(field, "/") {
		parts := strings.SplitN(field, "/", 2)
		step, err := strconv.Atoi(parts[1])
		if err != nil || step <= 0 {
			return nil, fmt.Errorf("invalid step '%s'", parts[1])
		}
		start := min
		if parts[0] != "*" {
			if start, err = strconv.Atoi(parts[0]); err != nil {
				return nil, fmt.Errorf("invalid step base '%s'", parts[0])
			}
		}
		for i := start; i <= max; i += step {
			result[i] = true
		}
		return result, nil
	}

	// range: N-M
	if strings.Contains(field, "-") {
		parts := strings.SplitN(field, "-", 2)
		lo, err1 := strconv.Atoi(parts[0])
		hi, err2 := strconv.Atoi(parts[1])
		if err1 != nil || err2 != nil || lo > hi {
			return nil, fmt.Errorf("invalid range '%s'", field)
		}
		for i := lo; i <= hi; i++ {
			result[i] = true
		}
		return result, nil
	}

	// single value
	v, err := strconv.Atoi(field)
	if err != nil || v < min || v > max {
		return nil, fmt.Errorf("invalid value '%s' (must be %d-%d)", field, min, max)
	}
	result[v] = true
	return result, nil
}

// readEnvValue reads a KEY=VALUE .env file and returns the value for the given key
func readEnvValue(path, key string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	prefix := key + "="
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimRight(line, "\r")
		if strings.HasPrefix(line, prefix) {
			return strings.TrimPrefix(line, prefix), nil
		}
	}
	return "", fmt.Errorf("key %q not found in %s", key, path)
}

// EnsureRepo is the exported wrapper used by the HTTP handlers to initialise
// a site's repo record without triggering a full backup
func (m *Manager) EnsureRepo(ctx context.Context, site *models.Site) (*models.BackupRepo, error) {
	return m.ensureRepo(ctx, site)
}

// ImportDirFor returns the SFTP import drop directory path for a site
func (m *Manager) ImportDirFor(siteName string) string {
	return m.importDir(siteName)
}

// DeleteSnapshot removes the restic snapshots for a backup from all configured
// repos. The DB record deletion is handled by the calling handler.
func (m *Manager) DeleteSnapshot(ctx context.Context, site *models.Site, b *models.Backup) error {

	// look up the repo for this site
	repo, err := db.GetBackupRepo(m.db, site.ID)
	if err != nil || repo == nil {
		return nil
	}

	// load S3 config if needed for S3 backups
	s3, err := m.loadS3Config()
	if err != nil {
		return err
	}

	// forget by tag across both repos — restic forget --tag removes all
	// snapshots carrying that tag, which covers both the file and DB snapshots
	forget := func(repoPath string, env []string) error {

		// clear any stale locks before attempting forget
		unlockCmd := exec.CommandContext(ctx, resticBin, "-r", repoPath, "unlock")
		unlockCmd.Env = env
		_ = unlockCmd.Run() // best-effort, ignore errors

		// list snapshots matching the tag to get their IDs
		listCmd := exec.CommandContext(ctx, resticBin,
			"-r", repoPath, "snapshots", "--tag", b.SnapshotID, "--json",
		)
		listCmd.Env = env
		out, err := listCmd.Output()
		if err != nil {
			return fmt.Errorf("restic snapshots: %w", err)
		}

		// parse the JSON output
		var snaps []struct {
			ID string `json:"id"`
		}
		if err := json.Unmarshal(out, &snaps); err != nil || len(snaps) == 0 {
			logger.Debug("DeleteSnapshot: no snapshots found for tag %s in %s", b.SnapshotID, repoPath)
			return nil
		}

		// forget each snapshot by ID, then prune
		ids := make([]string, len(snaps))
		for i, s := range snaps {
			ids[i] = s.ID
		}
		args := append([]string{"-r", repoPath, "forget", "--prune"}, ids...)
		cmd := exec.CommandContext(ctx, resticBin, args...)
		cmd.Env = env

		// capture stderr for error reporting
		if out, err := cmd.CombinedOutput(); err != nil {
			logger.Error("DeleteSnapshot: forget %s: %v — %s", repoPath, err, string(out))
			return fmt.Errorf("restic forget: %w", err)
		}
		return nil
	}

	// forget snapshots for this backup's tag in local repo's
	if repo.LocalEnabled {
		if err := forget(repo.LocalPath, resticEnv(repo.RepoPassword, nil)); err != nil {
			return err
		}
	}

	// forget snapshots for this backup's tag in S3 repo if enabled and configured
	if repo.S3Enabled && s3 != nil {
		s3Repo := s3RepoURL(s3.endpoint, s3.bucket, site.Name)
		if err := forget(s3Repo, resticEnv(repo.RepoPassword, s3)); err != nil {
			return err
		}
	}

	logger.Debug("DeleteSnapshot: removed snapshots for tag %s", b.SnapshotID)
	return nil
}

// Export streams a complete site backup as a gzip-compressed tar archive to w.
// The archive contains the full file tree from the files snapshot plus the
// database dump extracted from the DB snapshot, giving the caller a single
// self-contained archive restorable without restic.
func (m *Manager) Export(ctx context.Context, site *models.Site, backup *models.Backup, w io.Writer) error {

	// look up the repo for this site
	repo, err := db.GetBackupRepo(m.db, site.ID)
	if err != nil || repo == nil {
		return fmt.Errorf("export: no repo configured for site %s", site.Name)
	}

	// load S3 config if needed for S3 backups
	s3, err := m.loadS3Config()
	if err != nil {
		return err
	}

	// resolve which repo to export from based on the backup type
	var repoPath string
	var env []string
	switch backup.BackupType {
	case models.BackupTypeLocal:
		repoPath = repo.LocalPath
		env = resticEnv(repo.RepoPassword, nil)
	case models.BackupTypeS3:
		if s3 == nil {
			return fmt.Errorf("export: S3 not configured")
		}
		repoPath = s3RepoURL(s3.endpoint, s3.bucket, site.Name)
		env = resticEnv(repo.RepoPassword, s3)
	default:
		return fmt.Errorf("export: unknown backup type %d", backup.BackupType)
	}

	// find the file snapshot ID up front so we fail fast before writing output
	fileSnapID, err := m.findSnapshot(ctx, repoPath, env, backup.SnapshotID, "files")
	if err != nil {
		return fmt.Errorf("export: find file snapshot: %w", err)
	}

	logger.Debug("Export: fileSnapID=%q repoPath=%q", fileSnapID, repoPath)

	// restore the file snapshot to a temp directory — avoids relying on
	// restic's --archive tar flag which is not available in all versions
	tmpDir, err := os.MkdirTemp("", "podnest-export-*")
	if err != nil {
		return fmt.Errorf("export: create temp dir: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	// setup the command to restore the file snapshot
	restoreCmd := exec.CommandContext(ctx, resticBin,
		"-r", repoPath, "restore", fileSnapID,
		"--target", tmpDir,
		"--exclude", "*/nginx/cache/*",
	)
	restoreCmd.Env = env

	// capture stderr for error reporting
	var restoreStderr bytes.Buffer
	restoreCmd.Stderr = &restoreStderr

	// run the restic restore command
	if err := restoreCmd.Run(); err != nil {
		return fmt.Errorf("export: restic restore: %w — %s", err, restoreStderr.String())
	}

	// restic restores to tmpDir + original absolute path, e.g.
	// tmpDir/home/sites/sites/testsite/html/...
	siteRestoreDir := filepath.Join(tmpDir, m.appPath, "sites", site.Name)

	// wrap the response writer in gzip then tar
	gz := gzip.NewWriter(w)
	tw := tar.NewWriter(gz)

	// walk the restored site directory and emit each entry into the tar stream
	err = filepath.Walk(siteRestoreDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// get the path relative to the site root for clean archive entries
		rel, err := filepath.Rel(siteRestoreDir, path)
		if err != nil {
			return fmt.Errorf("export: rel path: %w", err)
		}

		// build the tar header from the file's metadata
		hdr, err := tar.FileInfoHeader(info, "")
		if err != nil {
			return fmt.Errorf("export: tar header for %s: %w", rel, err)
		}
		hdr.Name = rel

		// write the header for this file into the tar stream
		if err := tw.WriteHeader(hdr); err != nil {
			return fmt.Errorf("export: write header %s: %w", rel, err)
		}

		// copy regular file contents into the tar stream
		if info.Mode().IsRegular() {
			f, err := os.Open(path)
			if err != nil {
				return fmt.Errorf("export: open %s: %w", rel, err)
			}
			defer f.Close()
			if _, err := io.Copy(tw, f); err != nil {
				return fmt.Errorf("export: write %s: %w", rel, err)
			}
		}

		return nil
	})
	if err != nil {
		return fmt.Errorf("export: walk restore dir: %w", err)
	}

	// only sites with a MariaDB container have a DB snapshot
	if modules.TypeModule(site.SiteType).HasDatabase() {
		dbSnapID, err := m.findSnapshot(ctx, repoPath, env, backup.SnapshotID, "db")
		if err != nil {
			return fmt.Errorf("export: find db snapshot: %w", err)
		}

		// setup the command to dump the DB snapshot
		dbCmd := exec.CommandContext(ctx, resticBin,
			"-r", repoPath, "dump", dbSnapID, "db_dump.sql",
		)
		dbCmd.Env = env

		// capture stderr for error reporting
		var dbStderr bytes.Buffer
		dbCmd.Stderr = &dbStderr

		// run the restic dump command and capture the SQL data into memory
		sqlData, err := dbCmd.Output()
		if err != nil {
			return fmt.Errorf("export: restic dump db: %w — %s", err, dbStderr.String())
		}

		// write db_dump.sql as a top-level entry in the archive
		if err := tw.WriteHeader(&tar.Header{
			Name:    "db_dump.sql",
			Size:    int64(len(sqlData)),
			Mode:    0644,
			ModTime: backup.Created,
		}); err != nil {
			return fmt.Errorf("export: write db header: %w", err)
		}
		if _, err := tw.Write(sqlData); err != nil {
			return fmt.Errorf("export: write db entry: %w", err)
		}
	}

	// write manifest.json with the site's domains for use during import restore
	if len(backup.Domains) > 0 {

		// setup the manifest's data as JSON containing the backup's domains
		manifestData, err := json.Marshal(map[string]any{
			"domains": backup.Domains,
		})
		if err == nil {

			// write manifest.json as a top-level entry in the archive
			if err := tw.WriteHeader(&tar.Header{
				Name:    "manifest.json",
				Size:    int64(len(manifestData)),
				Mode:    0644,
				ModTime: backup.Created,
			}); err != nil {
				return fmt.Errorf("export: write manifest header: %w", err)
			}
			if _, err := tw.Write(manifestData); err != nil {
				return fmt.Errorf("export: write manifest: %w", err)
			}
		}
	}

	// flush tar and gzip writers to ensure all data reaches the response writer
	if err := tw.Close(); err != nil {
		return fmt.Errorf("export: close tar: %w", err)
	}
	if err := gz.Close(); err != nil {
		return fmt.Errorf("export: close gzip: %w", err)
	}

	logger.Debug("Export: completed archive for site %s backup %d", site.Name, backup.ID)
	return nil
}

// CreateFinalBackup creates a complete tar.gz archive of the site immediately
// before deletion. If S3 is configured the archive is uploaded directly;
// otherwise the raw bytes are returned for the caller to stream to the browser.
// Returns a human-readable destination label and the archive bytes when S3 is
// not configured (nil bytes when uploaded to S3).
func (m *Manager) CreateFinalBackup(ctx context.Context, site *models.Site) (dest string, archive []byte, err error) {

	// generate a filename with the site name and timestamp for either S3 key or browser download
	now := time.Now().UTC()
	filename := fmt.Sprintf("%s_final_%s.tar.gz", site.Name, now.Format("20060102-150405"))

	// load S3 config to determine whether to upload or return bytes
	s3, err := m.loadS3Config()
	if err != nil {
		return "", nil, fmt.Errorf("CreateFinalBackup: load s3 config: %w", err)
	}

	// make sure there's a repo
	repo, err := m.ensureRepo(ctx, site)
	if err != nil {
		return "", nil, fmt.Errorf("CreateFinalBackup: ensure repo: %w", err)
	}

	// generate a unique tag
	tagBytes := make([]byte, 8)
	if _, err := rand.Read(tagBytes); err != nil {
		return "", nil, fmt.Errorf("CreateFinalBackup: generate tag: %w", err)
	}
	tag := "podnest-final-" + hex.EncodeToString(tagBytes)

	// setup the paths to include and exclude
	siteDir := filepath.Join(m.appPath, "sites", site.Name)
	includePaths := []string{
		filepath.Join(siteDir, "html"),
		filepath.Join(siteDir, "nginx"),
		filepath.Join(siteDir, "php-fpm"),
		filepath.Join(siteDir, "redis"),
		filepath.Join(siteDir, ".env"),
	}
	excludePaths := []string{
		filepath.Join(siteDir, "nginx", "cache"),
		filepath.Join(siteDir, "db"),
	}

	// force S3 when globally configured, regardless of per-site repo settings
	var repoPath string
	var repoEnv []string

	// if S3 is configured, use it as the primary repo for the backup; otherwise fall back to local
	if s3 != nil {
		repoPath = s3RepoURL(s3.endpoint, s3.bucket, site.Name)
		repoEnv = resticEnv(repo.RepoPassword, s3)
		if err := initRepo(ctx, repoPath, repoEnv); err != nil {
			return "", nil, fmt.Errorf("CreateFinalBackup: init s3 repo: %w", err)
		}
	} else {
		// fall back to local repo so Export has a snapshot to work from
		repoPath = repo.LocalPath
		repoEnv = resticEnv(repo.RepoPassword, nil)
		if err := os.MkdirAll(repoPath, 0750); err != nil {
			return "", nil, fmt.Errorf("CreateFinalBackup: create local repo dir: %w", err)
		}
		if err := initRepo(ctx, repoPath, repoEnv); err != nil {
			return "", nil, fmt.Errorf("CreateFinalBackup: init local repo: %w", err)
		}
	}

	// backup the files
	if _, err := m.backupFiles(ctx, repoPath, repoEnv, includePaths, excludePaths, tag); err != nil {
		return "", nil, fmt.Errorf("CreateFinalBackup: backup files: %w", err)
	}

	// backup the DB if the site has a database container
	if err := m.backupDB(ctx, site, repoPath, repoEnv, tag, siteDir); err != nil {
		return "", nil, fmt.Errorf("CreateFinalBackup: backup db: %w", err)
	}

	// fetch the site's domains to store with the backup record
	siteDomains, err := db.GetDomainsBySite(m.db, site.ID)
	if err != nil {
		logger.Warn("CreateFinalBackup: failed to fetch domains for site %d: %v", site.ID, err)
	}
	var domainList []string
	for _, d := range siteDomains {
		domainList = append(domainList, d.Domain)
	}

	// record in DB so Export can find the snapshot
	b := &models.Backup{
		SiteID:     site.ID,
		SnapshotID: tag,
		Label:      "final",
		BackupType: func() int {
			if s3 != nil {
				return models.BackupTypeS3
			}
			return models.BackupTypeLocal
		}(),
		Domains: domainList,
	}
	bid, err := db.CreateBackup(m.db, b)
	if err != nil {
		return "", nil, fmt.Errorf("CreateFinalBackup: record backup: %w", err)
	}

	// re-query the backup to get all fields populated
	stored, err := db.GetBackup(m.db, bid)
	if err != nil || stored == nil {
		return "", nil, fmt.Errorf("CreateFinalBackup: get backup record: %w", err)
	}

	var buf bytes.Buffer
	if err := m.Export(ctx, site, stored, &buf); err != nil {
		return "", nil, fmt.Errorf("CreateFinalBackup: export: %w", err)
	}

	// if S3 is configured, upload the archive there; otherwise return the bytes for browser download
	if s3 != nil {
		key := site.Name + "/" + filename
		if err := s3PutObject(ctx, s3, key, buf.Bytes()); err != nil {
			return "", nil, fmt.Errorf("CreateFinalBackup: s3 upload: %w", err)
		}
		logger.Debug("CreateFinalBackup: uploaded %s to S3 bucket %s", key, s3.bucket)
		return "s3:" + s3.bucket + "/" + key, nil, nil
	}

	logger.Debug("CreateFinalBackup: returning archive %s for browser download", filename)
	return "browser:" + filename, buf.Bytes(), nil
}

// s3PutObject uploads data to an S3-compatible bucket using AWS Signature V4.
// Uses only stdlib — no AWS SDK.
func s3PutObject(ctx context.Context, s3 *s3Config, key string, data []byte) error {

	// build the raw URL for the object
	ep := strings.TrimRight(s3.endpoint, "/")
	rawURL := fmt.Sprintf("%s/%s/%s", ep, s3.bucket, key)

	// AWS Signature V4 signing process: https://docs.aws.amazon.com/general/latest/gr/sigv4-calculate-signature.html
	now := time.Now().UTC()
	dateStamp := now.Format("20060102")
	amzDate := now.Format("20060102T150405Z")

	bodyHash := fmt.Sprintf("%x", sha256.Sum256(data))

	// canonical headers (must be sorted)
	canonHeaders := map[string]string{
		"host":                 strings.TrimPrefix(strings.TrimPrefix(ep, "https://"), "http://"),
		"x-amz-content-sha256": bodyHash,
		"x-amz-date":           amzDate,
	}
	headerKeys := make([]string, 0, len(canonHeaders))
	for k := range canonHeaders {
		headerKeys = append(headerKeys, k)
	}
	sort.Strings(headerKeys)

	// build the canonical headers string and the signed headers string
	var canonHeaderStr, signedHeaderStr strings.Builder
	for _, k := range headerKeys {
		canonHeaderStr.WriteString(k + ":" + canonHeaders[k] + "\n")
		if signedHeaderStr.Len() > 0 {
			signedHeaderStr.WriteByte(';')
		}
		signedHeaderStr.WriteString(k)
	}

	// parse the URL to get the escaped path for the canonical request
	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("s3PutObject: parse url: %w", err)
	}

	// build the canonical request string
	canonRequest := strings.Join([]string{
		"PUT",
		parsedURL.EscapedPath(),
		"", // no query string
		canonHeaderStr.String(),
		signedHeaderStr.String(),
		bodyHash,
	}, "\n")

	// build the string to sign
	credScope := strings.Join([]string{dateStamp, s3.region, "s3", "aws4_request"}, "/")
	strToSign := strings.Join([]string{
		"AWS4-HMAC-SHA256",
		amzDate,
		credScope,
		fmt.Sprintf("%x", sha256.Sum256([]byte(canonRequest))),
	}, "\n")

	// derive the signing key
	sign := func(key, data []byte) []byte {
		h := hmac.New(sha256.New, key)
		h.Write(data)
		return h.Sum(nil)
	}
	signingKey := sign(
		sign(
			sign(
				sign([]byte("AWS4"+s3.secretKey), []byte(dateStamp)),
				[]byte(s3.region),
			),
			[]byte("s3"),
		),
		[]byte("aws4_request"),
	)
	signature := fmt.Sprintf("%x", hmac.New(sha256.New, signingKey).Sum([]byte(strToSign)))[len(strToSign)*2:]

	// rebuild signature correctly
	mac := hmac.New(sha256.New, signingKey)
	mac.Write([]byte(strToSign))
	signature = hex.EncodeToString(mac.Sum(nil))

	// build the Authorization header
	authHeader := fmt.Sprintf(
		"AWS4-HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s",
		s3.accessKey, credScope, signedHeaderStr.String(), signature,
	)

	// make the HTTP PUT request with the signed headers and the archive data as the body
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, rawURL, bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("s3PutObject: new request: %w", err)
	}
	req.Header.Set("Authorization", authHeader)
	req.Header.Set("X-Amz-Date", amzDate)
	req.Header.Set("X-Amz-Content-Sha256", bodyHash)
	req.Header.Set("Content-Type", "application/gzip")
	req.ContentLength = int64(len(data))

	// perform the request
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("s3PutObject: do: %w", err)
	}
	defer resp.Body.Close()

	// consider 200 OK, 201 Created, and 204 No Content as success responses
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("s3PutObject: unexpected status %d: %s", resp.StatusCode, string(body))
	}
	return nil
}

// fixPostRestorePerms reapplies the correct ownership and permissions to the
// site directory after a file restore, matching what scaffoldSiteDir sets up
func (m *Manager) fixPostRestorePerms(siteDir string, siteID int64) {

	// look up the SFTP credentials to get the site UID for ownership
	cred, err := db.GetSFTPCredBySite(m.db, siteID)
	if err != nil || cred == nil {
		logger.Warn("fixPostRestorePerms: could not get sftp cred for site %d: %v", siteID, err)
		return
	}
	uid := cred.UID

	// site root — must be root:root for sshd chroot
	os.Chown(siteDir, 0, 0)
	os.Chmod(siteDir, 0755)

	// html — setgid + group-writable, siteUID owned; the restored tree carries
	// whatever ownership the archive held, so it is corrected in full here
	fileutil.ChownTree(siteDir+"/html", uid)
	os.Chmod(siteDir+"/html", 0755)

	// php-fpm, redis — siteUID owned
	for _, d := range []string{"php-fpm", "redis"} {
		os.Chown(siteDir+"/"+d, uid, uid)
	}

	// nginx dir — siteUID owned
	os.Chown(siteDir+"/nginx", uid, uid)

	// nginx/logs — nginx uid (101)
	os.Chown(siteDir+"/nginx/logs", 101, 101)
	os.Chmod(siteDir+"/nginx/logs", 0750)

	// db — mysql uid (999) inside the MariaDB container
	os.Chown(siteDir+"/db", 999, 999)

	logger.Debug("fixPostRestorePerms: permissions restored for %s", siteDir)
}

// -- import restore ----------------------------------------------------------

// importDir returns the SFTP import drop directory for a site
func (m *Manager) importDir(siteName string) string {
	return filepath.Join(m.appPath, "sites", siteName, "backups", "import")
}

// ListImportFiles returns the filenames of any importable archives in the
// site's SFTP import directory (.tar.gz, .tar.xz, .zip)
func (m *Manager) ListImportFiles(siteName string) ([]string, error) {

	// read the import directory and filter for supported archive formats
	dir := m.importDir(siteName)
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return []string{}, nil
		}
		return nil, fmt.Errorf("ListImportFiles: %w", err)
	}

	// filter for supported archive formats
	var files []string
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		n := e.Name()
		// only surface recognised archive formats
		if strings.HasSuffix(n, ".tar.gz") ||
			strings.HasSuffix(n, ".tar.xz") ||
			strings.HasSuffix(n, ".zip") {
			files = append(files, n)
		}
	}
	return files, nil
}

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
	tmpDir, err := os.MkdirTemp("", "podnest-import-*")
	if err != nil {
		return fmt.Errorf("ImportRestore: create temp dir: %w", err)
	}
	defer os.RemoveAll(tmpDir)
	if err := extractArchive(archivePath, tmpDir); err != nil {
		return fmt.Errorf("ImportRestore: extract: %w", err)
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

	// delete the source archive now that the restore succeeded
	if err := os.Remove(archivePath); err != nil {
		logger.Warn("ImportRestore: remove archive %s: %v", archivePath, err)
	}

	logger.Debug("ImportRestore: completed for site %s from %s", targetSite.Name, filepath.Base(archivePath))
	return nil
}

// extractArchive dispatches to the correct extractor based on file extension
func extractArchive(src, destDir string) error {
	switch {
	case strings.HasSuffix(src, ".tar.gz"):
		return extractTarGz(src, destDir)
	case strings.HasSuffix(src, ".tar.xz"):
		return extractTarXz(src, destDir)
	case strings.HasSuffix(src, ".zip"):
		return extractZip(src, destDir)
	default:
		return fmt.Errorf("extractArchive: unsupported format: %s", filepath.Base(src))
	}
}

// extractTarGz extracts a .tar.gz archive into destDir
func extractTarGz(src, destDir string) error {

	// open the file and wrap in a gzip reader
	f, err := os.Open(src)
	if err != nil {
		return err
	}
	defer f.Close()

	// try to create a gzip reader; if it fails, the file may be a plain tar without gzip compression
	gr, err := gzip.NewReader(f)
	if err != nil {
		return fmt.Errorf("extractTarGz: gzip reader: %w", err)
	}
	defer gr.Close()

	// pass the gzip reader into the tar extractor
	return extractTar(tar.NewReader(gr), destDir)
}

// extractTarXz extracts a .tar.xz archive into destDir via the xz binary
func extractTarXz(src, destDir string) error {

	// bound the decompress so a malformed or oversized .tar.xz cannot hang the
	// restore indefinitely
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
	defer cancel()

	// decompress via xz CLI, pipe stdout into the tar reader
	xzCmd := exec.CommandContext(ctx, "xz", "-d", "-c", src)
	pr, err := xzCmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("extractTarXz: stdout pipe: %w", err)
	}

	// start the xz command to begin streaming decompressed data
	if err := xzCmd.Start(); err != nil {
		return fmt.Errorf("extractTarXz: start xz: %w", err)
	}

	// pass the xz stdout into the tar extractor; wait for xz to finish and capture any errors
	tarErr := extractTar(tar.NewReader(pr), destDir)
	waitErr := xzCmd.Wait()
	if tarErr != nil {
		return tarErr
	}

	return waitErr
}

// extractTar reads all entries from a tar.Reader into destDir, guarding
// against path traversal attacks
func extractTar(tr *tar.Reader, destDir string) error {

	// iterate through each entry in the tar archive and write it to the destination directory
	for {

		// read the next header from the tar stream
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("extractTar: next: %w", err)
		}

		// guard against path traversal
		target := filepath.Join(destDir, filepath.Clean("/"+hdr.Name))
		if !strings.HasPrefix(target, destDir+string(os.PathSeparator)) && target != destDir {
			logger.Warn("extractTar: skipping unsafe path %s", hdr.Name)
			continue
		}

		// handle directories and regular files; skip other types like symlinks for safety
		switch hdr.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, 0755); err != nil {
				return fmt.Errorf("extractTar: mkdir %s: %w", hdr.Name, err)
			}
		case tar.TypeReg:
			if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
				return fmt.Errorf("extractTar: mkdir parent %s: %w", hdr.Name, err)
			}
			f, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, hdr.FileInfo().Mode())
			if err != nil {
				return fmt.Errorf("extractTar: create %s: %w", hdr.Name, err)
			}
			if _, err := io.Copy(f, tr); err != nil {
				f.Close()
				return fmt.Errorf("extractTar: write %s: %w", hdr.Name, err)
			}
			f.Close()
		case tar.TypeSymlink, tar.TypeLink:
			// never recreate links from an archive — a crafted backup could point
			// one outside destDir; legitimate backups hold only dirs and reg files
			logger.Warn("extractTar: skipping link entry %q -> %q", hdr.Name, hdr.Linkname)
			continue
		default:
			logger.Warn("extractTar: skipping unsupported entry %q (type %d)", hdr.Name, hdr.Typeflag)
			continue
		}
	}
	return nil
}

// extractZip extracts a .zip archive into destDir, guarding against path traversal
func extractZip(src, destDir string) error {

	// stat the file to get its size for zip.OpenReader
	fi, err := os.Stat(src)
	if err != nil {
		return fmt.Errorf("extractZip: stat: %w", err)
	}

	// open the file and create a zip reader
	f, err := os.Open(src)
	if err != nil {
		return fmt.Errorf("extractZip: open: %w", err)
	}
	defer f.Close()
	zr, err := zip.NewReader(f, fi.Size())
	if err != nil {
		return fmt.Errorf("extractZip: reader: %w", err)
	}

	// iterate through each file in the zip archive and write it to the destination directory
	for _, zf := range zr.File {
		target := filepath.Join(destDir, filepath.Clean("/"+zf.Name))
		if !strings.HasPrefix(target, destDir+string(os.PathSeparator)) && target != destDir {
			logger.Warn("extractZip: skipping unsafe path %s", zf.Name)
			continue
		}

		// skip unsupported file types like symlinks for safety; only handle directories and regular files
		if zf.FileInfo().IsDir() {
			os.MkdirAll(target, 0755)
			continue
		}

		// reject symlink entries — never materialise a link from an archive
		if zf.Mode()&os.ModeSymlink != 0 {
			logger.Warn("extractZip: skipping symlink entry %s", zf.Name)
			continue
		}

		// ensure the parent directory exists before creating the file
		if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
			return fmt.Errorf("extractZip: mkdir %s: %w", zf.Name, err)
		}

		// open the zip file entry and copy its contents to the target file
		rc, err := zf.Open()
		if err != nil {
			return fmt.Errorf("extractZip: open entry %s: %w", zf.Name, err)
		}
		out, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, zf.Mode())
		if err != nil {
			rc.Close()
			return fmt.Errorf("extractZip: create %s: %w", zf.Name, err)
		}
		_, copyErr := io.Copy(out, rc)
		rc.Close()
		out.Close()
		if copyErr != nil {
			return fmt.Errorf("extractZip: write %s: %w", zf.Name, copyErr)
		}
	}
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
