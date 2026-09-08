// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package backup

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/podman"
)

// resticEnv builds the environment slice for a restic command
func resticEnv(password string, s3 *s3Config) []string {
	env := append(os.Environ(), "RESTIC_PASSWORD="+password)
	env = append(env, "TMPDIR="+resticTmpDir)
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

	// bring the record list in line with what survived the retention prune
	m.reconcileBackupRecords(ctx, site, repo, s3)

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

	// clear the web root so the snapshot cannot merge into what is there now
	if err := wipeHTMLRoot(siteDir); err != nil {
		return fmt.Errorf("restoreFiles: wipe html: %w", err)
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
		// preserved target files in the web root are never overwritten
		"--exclude", filepath.Join(siteDir, "html", ".nginx.conf*"),
		"--exclude", filepath.Join(siteDir, "html", ".user.ini"),
		"--exclude", filepath.Join(siteDir, "html", "web.config"),
		"--exclude", filepath.Join(siteDir, "html", ".env"),
		"--exclude", filepath.Join(siteDir, "html", maintHTMLName),
		"--exclude", filepath.Join(siteDir, "html", "wp-config.php"),
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

	// the target must be empty or the snapshot merges into whatever was there
	if err := m.clearDatabase(ctx, site, dbName, rootPass); err != nil {
		return err
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

// snapshotTags returns the set of run tags still present in a restic repo
func (m *Manager) snapshotTags(ctx context.Context, repoPath string, env []string) (map[string]bool, error) {

	// list ALL snapshots — tag filtering via restic CLI can miss stdin snapshots
	cmd := exec.CommandContext(ctx, resticBin,
		"-r", repoPath, "snapshots", "--json",
	)
	cmd.Env = env

	// capture the output for parsing
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("snapshotTags: restic snapshots: %w", err)
	}

	// parse the JSON output; only the tags matter here
	var snaps []struct {
		Tags []string `json:"tags"`
	}
	if err := json.Unmarshal(out, &snaps); err != nil {
		return nil, fmt.Errorf("snapshotTags: parse: %w", err)
	}

	// collect every tag still living in the repo
	tags := make(map[string]bool)
	for _, s := range snaps {
		for _, t := range s.Tags {
			tags[t] = true
		}
	}
	return tags, nil
}

// reconcileBackupRecords removes backup records whose restic snapshots no
// longer exist, keeping the record list in step with the retention policy
func (m *Manager) reconcileBackupRecords(ctx context.Context, site *models.Site, repo *models.BackupRepo, s3 *s3Config) {

	// union of surviving tags across every enabled repo
	tags := make(map[string]bool)
	unread := false

	// collect surviving tags from the local repo
	if repo.LocalEnabled {
		t, err := m.snapshotTags(ctx, repo.LocalPath, resticEnv(repo.RepoPassword, nil))
		if err != nil {
			logger.Warn("reconcileBackupRecords: local snapshots for site %d: %v", site.ID, err)
			unread = true
		} else {
			for k := range t {
				tags[k] = true
			}
		}
	}

	// collect surviving tags from the S3 repo
	if repo.S3Enabled && s3 != nil {
		t, err := m.snapshotTags(ctx, s3RepoURL(s3.endpoint, s3.bucket, site.Name), resticEnv(repo.RepoPassword, s3))
		if err != nil {
			logger.Warn("reconcileBackupRecords: S3 snapshots for site %d: %v", site.ID, err)
			unread = true
		} else {
			for k := range t {
				tags[k] = true
			}
		}
	}

	// an unreadable repo means an incomplete picture — never prune on a guess
	if unread {
		logger.Warn("reconcileBackupRecords: skipping site %d, a repo could not be read", site.ID)
		return
	}

	// pull the current record list to compare against
	backups, err := db.ListBackups(m.db, site.ID)
	if err != nil {
		logger.Warn("reconcileBackupRecords: list backups for site %d: %v", site.ID, err)
		return
	}

	// drop any record with no surviving snapshot behind it
	for _, b := range backups {
		if tags[b.SnapshotID] {
			continue
		}
		if err := db.DeleteBackup(m.db, b.ID); err != nil {
			logger.Warn("reconcileBackupRecords: delete record %d: %v", b.ID, err)
			continue
		}
		logger.Debug("reconcileBackupRecords: removed orphaned record %d (%s) for site %d", b.ID, b.SnapshotID, site.ID)
	}
}

// EnsureRepo is the exported wrapper used by the HTTP handlers to initialise
// a site's repo record without triggering a full backup
func (m *Manager) EnsureRepo(ctx context.Context, site *models.Site) (*models.BackupRepo, error) {
	return m.ensureRepo(ctx, site)
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

	// only the db snapshot lookup remains before staging; resolve it now so
	// every metadata failure happens ahead of the first byte of output
	var dbSnapID string
	if modules.TypeModule(site.SiteType).HasDatabase() {
		dbSnapID, err = m.findSnapshot(ctx, repoPath, env, backup.SnapshotID, "db")
		if err != nil {
			return fmt.Errorf("export: find db snapshot: %w", err)
		}
	}

	logger.Debug("Export: fileSnapID=%q repoPath=%q", fileSnapID, repoPath)

	// restore the file snapshot to a temp directory — avoids relying on
	// restic's --archive tar flag which is not available in all versions
	tmpDir, err := os.MkdirTemp(resticTmpDir, "podnest-export-*")
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

	// staging succeeded — signal the caller that headers may now be written
	if h, ok := w.(interface{ ExportReady() }); ok {
		h.ExportReady()
	}

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
	if dbSnapID != "" {

		// spill the dump to disk — tar needs the size up front and the dump can
		// be multiple gigabytes, far too large to hold in memory
		spill, err := os.CreateTemp(tmpDir, "podnest-dbdump-*.sql")
		if err != nil {
			return fmt.Errorf("export: create db spill: %w", err)
		}
		defer os.Remove(spill.Name())
		defer spill.Close()

		// setup the command to dump the DB snapshot
		dbCmd := exec.CommandContext(ctx, resticBin,
			"-r", repoPath, "dump", dbSnapID, "db_dump.sql",
		)
		dbCmd.Env = env
		dbCmd.Stdout = spill

		// capture stderr for error reporting
		var dbStderr bytes.Buffer
		dbCmd.Stderr = &dbStderr

		// run the restic dump command, streaming the SQL to the spill file
		if err := dbCmd.Run(); err != nil {
			return fmt.Errorf("export: restic dump db: %w — %s", err, dbStderr.String())
		}

		// size the tar entry from the spilled file
		st, err := spill.Stat()
		if err != nil {
			return fmt.Errorf("export: stat db spill: %w", err)
		}

		// rewind before streaming the spill into the archive
		if _, err := spill.Seek(0, io.SeekStart); err != nil {
			return fmt.Errorf("export: rewind db spill: %w", err)
		}

		// write db_dump.sql as a top-level entry in the archive
		if err := tw.WriteHeader(&tar.Header{
			Name:    "db_dump.sql",
			Size:    st.Size(),
			Mode:    0644,
			ModTime: backup.Created,
		}); err != nil {
			return fmt.Errorf("export: write db header: %w", err)
		}
		if _, err := io.Copy(tw, spill); err != nil {
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
// otherwise the open temp file is returned for the caller to stream to the
// browser — the caller owns closing and removing it.
// Returns a human-readable destination label and the archive file when S3 is
// not configured (nil file when uploaded to S3).
func (m *Manager) CreateFinalBackup(ctx context.Context, site *models.Site) (dest string, archive *os.File, err error) {

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

	// spill the export to a temp file — a full site archive must never be
	// materialised in RAM
	tmp, err := os.CreateTemp(resticTmpDir, "podnest-final-*.tar.gz")
	if err != nil {
		return "", nil, fmt.Errorf("CreateFinalBackup: create temp file: %w", err)
	}
	cleanup := func() {
		tmp.Close()
		os.Remove(tmp.Name())
	}

	if err := m.Export(ctx, site, stored, tmp); err != nil {
		cleanup()
		return "", nil, fmt.Errorf("CreateFinalBackup: export: %w", err)
	}

	size, err := tmp.Seek(0, io.SeekEnd)
	if err != nil {
		cleanup()
		return "", nil, fmt.Errorf("CreateFinalBackup: size archive: %w", err)
	}
	if _, err := tmp.Seek(0, io.SeekStart); err != nil {
		cleanup()
		return "", nil, fmt.Errorf("CreateFinalBackup: rewind archive: %w", err)
	}

	// if S3 is configured, upload the archive there; otherwise hand the open
	// file back for the caller to stream to the browser
	if s3 != nil {
		defer cleanup()
		key := site.Name + "/" + filename
		if err := s3PutObject(ctx, s3, key, tmp, size); err != nil {
			return "", nil, fmt.Errorf("CreateFinalBackup: s3 upload: %w", err)
		}
		logger.Debug("CreateFinalBackup: uploaded %s to S3 bucket %s", key, s3.bucket)
		return "s3:" + s3.bucket + "/" + key, nil, nil
	}

	logger.Debug("CreateFinalBackup: returning archive %s for browser download", filename)
	return "browser:" + filename, tmp, nil
}
