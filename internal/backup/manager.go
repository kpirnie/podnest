package backup

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"context"
	"crypto/rand"
	"database/sql"
	_ "embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/podman"
)

//go:embed maintenance.html
var maintenanceHTML []byte

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

// New returns a backup Manager
func New(database *sql.DB, pc *podman.Client, podmanSock, appPath string) *Manager {
	return &Manager{
		db:          database,
		podman:      pc,
		podmanSock:  podmanSock,
		appPath:     appPath,
		schedulerCh: make(chan string, 1),
	}
}

// -- repo paths --------------------------------------------------------------

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

// -- s3 config ---------------------------------------------------------------

// s3Config holds the S3 connection settings resolved from global settings
type s3Config struct {
	endpoint  string
	bucket    string
	region    string
	accessKey string
	secretKey string
}

// loadS3Config reads S3 settings from the database; returns nil if incomplete
func (m *Manager) loadS3Config() (*s3Config, error) {
	keys := []string{
		"s3_endpoint", "s3_bucket", "s3_region",
		"s3_access_key", "s3_secret_key",
	}
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

	region := vals["s3_region"]
	if region == "" {
		region = "us-east-1"
	}

	return &s3Config{
		endpoint:  vals["s3_endpoint"],
		bucket:    vals["s3_bucket"],
		region:    region,
		accessKey: vals["s3_access_key"],
		secretKey: vals["s3_secret_key"],
	}, nil
}

// -- restic helpers ----------------------------------------------------------

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
	cmd := exec.CommandContext(ctx, resticBin, "-r", repoPath, "init")
	cmd.Env = env
	out, err := cmd.CombinedOutput()
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

// -- repo management ---------------------------------------------------------

// ensureRepo returns the site's BackupRepo record, creating and persisting one
// (with a fresh random password) if none exists yet
func (m *Manager) ensureRepo(ctx context.Context, site *models.Site) (*models.BackupRepo, error) {
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

	return repo, nil
}

// -- backup ------------------------------------------------------------------

// Backup creates a restic snapshot for the given site across all enabled
// destinations. File tree and DB dump are tagged with a shared run ID so they
// can be located together at restore time. Returns the created Backup ID.
func (m *Manager) Backup(ctx context.Context, site *models.Site, label string) (int64, error) {
	repo, err := m.ensureRepo(ctx, site)
	if err != nil {
		return 0, err
	}

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

	var totalSize int64
	var backupType int

	// -- local ---------------------------------------------------------------
	if repo.LocalEnabled {
		localEnv := resticEnv(repo.RepoPassword, nil)
		if err := os.MkdirAll(repo.LocalPath, 0750); err != nil {
			return 0, fmt.Errorf("backup: create local repo dir: %w", err)
		}
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
		if err := m.forgetPrune(ctx, repo.LocalPath, localEnv); err != nil {
			logger.Warn("Backup: local forget/prune failed for site %d: %v", site.ID, err)
		}
		backupType = models.BackupTypeLocal
	}

	// -- S3 ------------------------------------------------------------------
	if repo.S3Enabled && s3 != nil {
		s3Repo := s3RepoURL(s3.endpoint, s3.bucket, site.Name)
		s3Env := resticEnv(repo.RepoPassword, s3)
		logger.Info("Backup: starting S3 backup for site %d (%s)", site.ID, site.Name) // ← add

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
		if err := m.forgetPrune(ctx, s3Repo, s3Env); err != nil {
			logger.Warn("Backup: S3 forget/prune failed for site %d: %v", site.ID, err)
		}
		if backupType == 0 {
			backupType = models.BackupTypeS3
		}
	}

	// record the completed backup in the database
	b := &models.Backup{
		SiteID:     site.ID,
		SnapshotID: tag,
		Label:      label,
		BackupType: backupType,
		SizeBytes:  totalSize,
	}
	id, err := db.CreateBackup(m.db, b)
	if err != nil {
		return 0, err
	}

	logger.Info("Backup: completed %s for site %s (id=%d, size=%d)", tag, site.Name, id, totalSize)
	return id, nil
}

// backupFiles runs restic backup for the site's file tree and returns bytes added
func (m *Manager) backupFiles(ctx context.Context, repoPath string, env, paths, excludes []string, tag string) (int64, error) {
	args := []string{"-r", repoPath, "backup", "--json", "--tag", tag}
	for _, ex := range excludes {
		args = append(args, "--exclude", ex)
	}
	args = append(args, paths...)

	cmd := exec.CommandContext(ctx, resticBin, args...)
	cmd.Env = env

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
	if site.SiteType != models.SiteTypeWordPress && site.SiteType != models.SiteTypePHP {
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
		"exec", dbContainer,
		"sh", "-c",
		fmt.Sprintf(
			"mysqldump -uroot -p%s --single-transaction --quick --routines %s 2>/dev/null || "+
				"mariadb-dump -uroot -p%s --single-transaction --quick --routines %s",
			rootPass, dbName, rootPass, dbName,
		),
	)
	dumpCmd.Env = append(os.Environ(), "CONTAINER_HOST=unix://"+m.podmanSock)

	// capture dump stderr for error reporting
	var dumpStderr bytes.Buffer
	dumpCmd.Stderr = &dumpStderr

	// connect: dumpCmd.Stdout → resticCmd.Stdin
	resticCmd.Stdin, err = dumpCmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("backupDB: stdout pipe: %w", err)
	}

	logger.Info("backupDB: starting DB stream to restic for site %s", site.Name)

	if err := dumpCmd.Start(); err != nil {
		return fmt.Errorf("backupDB: start mysqldump: %w", err)
	}
	if err := resticCmd.Run(); err != nil {
		dumpCmd.Wait()
		return fmt.Errorf("backupDB: restic: %w — restic_stderr: %s — dump_stderr: %s",
			err, resticStderr.String(), dumpStderr.String())
	}
	if err := dumpCmd.Wait(); err != nil {
		return fmt.Errorf("backupDB: mysqldump wait: %w — dump_stderr: %s",
			err, dumpStderr.String())
	}

	logger.Debug("backupDB: DB snapshot complete for site %s", site.Name)
	return nil
}

// -- restore -----------------------------------------------------------------

// Restore restores a site from the snapshot identified by the given Backup
// record. Nginx serves the maintenance page for the duration.
func (m *Manager) Restore(ctx context.Context, site *models.Site, backup *models.Backup) error {

	m.restoring.Store(site.ID, true)
	defer m.restoring.Delete(site.ID)

	repo, err := db.GetBackupRepo(m.db, site.ID)
	if err != nil || repo == nil {
		return fmt.Errorf("restore: no repo configured for site %s", site.Name)
	}

	s3, err := m.loadS3Config()
	if err != nil {
		return err
	}

	// resolve which repo to restore from based on the backup type
	var repoPath string
	var env []string
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

	logger.Info("Restore: completed for site %s from tag %s", site.Name, backup.SnapshotID)
	return nil
}

// add exported method
func (m *Manager) IsRestoring(siteID int64) bool {
	_, ok := m.restoring.Load(siteID)
	return ok
}

// restoreFiles runs restic restore for the file tree snapshot matching the tag
func (m *Manager) restoreFiles(ctx context.Context, repoPath string, env []string, tag, siteDir string) error {
	snapID, err := m.findSnapshot(ctx, repoPath, env, tag, "files")
	if err != nil {
		return err
	}

	args := []string{
		"-r", repoPath, "restore", snapID,
		"--target", "/",
		// exclude the nginx cache and the maintenance conf we injected
		"--exclude", filepath.Join(siteDir, "nginx", "cache"),
		"--exclude", filepath.Join(siteDir, "nginx", "conf.d", maintConfName),
	}
	cmd := exec.CommandContext(ctx, resticBin, args...)
	cmd.Env = env

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
	if site.SiteType != models.SiteTypeWordPress && site.SiteType != models.SiteTypePHP {
		return nil
	}

	snapID, err := m.findSnapshot(ctx, repoPath, env, tag, "db")
	if err != nil {
		return err
	}

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
		"exec", dbContainer,
		"sh", "-c",
		fmt.Sprintf("mariadb -uroot -p%s %s < /tmp/podnest-restore.sql && rm /tmp/podnest-restore.sql", rootPass, dbName),
	)
	mysqlCmd.Env = append(os.Environ(), "CONTAINER_HOST=unix://"+m.podmanSock)
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

	out, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("findSnapshot: restic snapshots: %w", err)
	}

	var snaps []struct {
		ID    string   `json:"id"`
		Tags  []string `json:"tags"`
		Paths []string `json:"paths"`
	}
	if err := json.Unmarshal(out, &snaps); err != nil {
		return "", fmt.Errorf("findSnapshot: parse: %w", err)
	}

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

		isDB := len(s.Paths) == 1 &&
			(s.Paths[0] == "db_dump.sql" || s.Paths[0] == "/db_dump.sql")
		if kind == "db" && isDB {
			return s.ID, nil
		}
		if kind == "files" && !isDB {
			return s.ID, nil
		}
	}

	return "", fmt.Errorf("findSnapshot: no %s snapshot for tag %s", kind, tag)
}

// -- forget / prune ----------------------------------------------------------

// forgetPrune applies the configured retention policy and prunes unreachable data
func (m *Manager) forgetPrune(ctx context.Context, repoPath string, env []string) error {
	// clear any stale locks before pruning
	unlockCmd := exec.CommandContext(ctx, resticBin, "-r", repoPath, "unlock")
	unlockCmd.Env = env
	_ = unlockCmd.Run()

	retainDays, err := db.GetSetting(m.db, "backup_retain_days")
	if err != nil || retainDays == "" {
		retainDays = "30"
	}

	cmd := exec.CommandContext(ctx, resticBin,
		"-r", repoPath, "forget",
		"--keep-within", retainDays+"d",
		"--prune",
	)
	cmd.Env = env

	if out, err := cmd.CombinedOutput(); err != nil {
		logger.Error("forgetPrune: %s: %v — %s", repoPath, err, string(out))
		return fmt.Errorf("restic forget: %w", err)
	}

	logger.Debug("forgetPrune: pruned %s with %sd retention", repoPath, retainDays)
	return nil
}

// -- maintenance mode --------------------------------------------------------

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
	confPath := filepath.Join(siteDir, "nginx", "conf.d", maintConfName)
	if err := os.WriteFile(confPath, []byte(maintConf), 0644); err != nil {
		return fmt.Errorf("write maintenance nginx conf: %w", err)
	}

	if err := m.nginxReload(ctx, site.Name); err != nil {
		return fmt.Errorf("nginx reload (maintenance on): %w", err)
	}

	logger.Debug("enableMaintenance: maintenance mode on for site %s", site.Name)
	return nil
}

// disableMaintenance removes the maintenance conf and page, then reloads nginx
func (m *Manager) disableMaintenance(ctx context.Context, site *models.Site, siteDir string) error {
	confPath := filepath.Join(siteDir, "nginx", "conf.d", maintConfName)
	if err := os.Remove(confPath); err != nil && !os.IsNotExist(err) {
		logger.Warn("disableMaintenance: remove conf: %v", err)
	}

	htmlPath := filepath.Join(siteDir, "html", maintHTMLName)
	if err := os.Remove(htmlPath); err != nil && !os.IsNotExist(err) {
		logger.Warn("disableMaintenance: remove html: %v", err)
	}

	if err := m.nginxReload(ctx, site.Name); err != nil {
		return fmt.Errorf("nginx reload (maintenance off): %w", err)
	}

	logger.Debug("disableMaintenance: maintenance mode off for site %s", site.Name)
	return nil
}

// nginxReload sends nginx -s reload inside the site's nginx container
func (m *Manager) nginxReload(ctx context.Context, siteName string) error {
	containerName := podman.ContainerName(siteName, "nginx")

	var execResp struct {
		ID string `json:"Id"`
	}
	spec := map[string]any{
		"AttachStdout": false,
		"AttachStderr": false,
		"Detach":       true,
		"Cmd":          []string{"nginx", "-s", "reload"},
	}
	if err := m.podman.PostJSON(ctx,
		"/v4.0.0/libpod/containers/"+containerName+"/exec",
		spec, &execResp,
	); err != nil {
		return fmt.Errorf("nginxReload: create exec: %w", err)
	}
	if err := m.podman.PostJSON(ctx,
		"/v4.0.0/libpod/exec/"+execResp.ID+"/start",
		map[string]any{"Detach": true}, nil,
	); err != nil {
		return fmt.Errorf("nginxReload: start exec: %w", err)
	}

	logger.Debug("nginxReload: sent reload to %s", containerName)
	return nil
}

// -- scheduler ---------------------------------------------------------------

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
		next, err := nextCronTime(expr, time.Now())
		if err != nil {
			logger.Warn("scheduler: invalid cron expression '%s': %v", expr, err)
			return
		}
		d := time.Until(next)
		logger.Info("scheduler: next backup at %s (in %s)", next.Format(time.RFC3339), d.Round(time.Second))
		timer = time.NewTimer(d)
		timerCh = timer.C
	}

	// load initial schedule from settings
	expr, _ := db.GetSetting(m.db, "backup_schedule")
	arm(expr)

	for {
		select {
		case <-ctx.Done():
			if timer != nil {
				timer.Stop()
			}
			logger.Debug("scheduler: stopped")
			return

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
	logger.Info("scheduler: starting backup run")

	sites, err := db.GetAllSites(m.db)
	if err != nil {
		logger.Error("scheduler: list sites: %v", err)
		return
	}

	var wg sync.WaitGroup
	for _, site := range sites {
		site := site
		repo, err := db.GetBackupRepo(m.db, site.ID)
		if err != nil || repo == nil {
			continue
		}
		if !repo.LocalEnabled && !repo.S3Enabled {
			continue
		}
		wg.Add(1)
		go func() {
			defer wg.Done()
			bCtx, cancel := context.WithTimeout(ctx, 2*time.Hour)
			defer cancel()
			if _, err := m.Backup(bCtx, site, "scheduled"); err != nil {
				logger.Error("scheduler: backup failed for site %s: %v", site.Name, err)
				_ = db.SetBackupError(m.db, site.ID, err.Error())
			} else {
				logger.Info("scheduler: backup complete for site %s", site.Name)
				_ = db.ClearBackupError(m.db, site.ID)
			}
		}()
	}

	wg.Wait()
	logger.Info("scheduler: backup run complete")
}

// -- cron parser -------------------------------------------------------------

// nextCronTime returns the next time after 'from' that satisfies the 5-field
// cron expression (minute hour dom month dow).
// Supported field syntax: * | N | */N | N-M | N,M,...
func nextCronTime(expr string, from time.Time) (time.Time, error) {
	fields := strings.Fields(expr)
	if len(fields) != 5 {
		return time.Time{}, fmt.Errorf("expected 5 fields, got %d", len(fields))
	}

	matchMinute, err := parseCronField(fields[0], 0, 59)
	if err != nil {
		return time.Time{}, fmt.Errorf("minute: %w", err)
	}
	matchHour, err := parseCronField(fields[1], 0, 23)
	if err != nil {
		return time.Time{}, fmt.Errorf("hour: %w", err)
	}
	matchDOM, err := parseCronField(fields[2], 1, 31)
	if err != nil {
		return time.Time{}, fmt.Errorf("dom: %w", err)
	}
	matchMonth, err := parseCronField(fields[3], 1, 12)
	if err != nil {
		return time.Time{}, fmt.Errorf("month: %w", err)
	}
	matchDOW, err := parseCronField(fields[4], 0, 6)
	if err != nil {
		return time.Time{}, fmt.Errorf("dow: %w", err)
	}

	// start one minute after 'from' so the current minute is never returned
	t := from.Truncate(time.Minute).Add(time.Minute)
	limit := t.Add(366 * 24 * time.Hour)

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

// -- .env reader -------------------------------------------------------------

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

// DeleteSnapshot removes the restic snapshots for a backup from all configured
// repos. The DB record deletion is handled by the calling handler.
func (m *Manager) DeleteSnapshot(ctx context.Context, site *models.Site, b *models.Backup) error {
	repo, err := db.GetBackupRepo(m.db, site.ID)
	if err != nil || repo == nil {
		return nil
	}

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
		if out, err := cmd.CombinedOutput(); err != nil {
			logger.Error("DeleteSnapshot: forget %s: %v — %s", repoPath, err, string(out))
			return fmt.Errorf("restic forget: %w", err)
		}
		return nil
	}

	if repo.LocalEnabled {
		if err := forget(repo.LocalPath, resticEnv(repo.RepoPassword, nil)); err != nil {
			return err
		}
	}
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
	repo, err := db.GetBackupRepo(m.db, site.ID)
	if err != nil || repo == nil {
		return fmt.Errorf("export: no repo configured for site %s", site.Name)
	}

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

	restoreCmd := exec.CommandContext(ctx, resticBin,
		"-r", repoPath, "restore", fileSnapID,
		"--target", tmpDir,
		"--exclude", "*/nginx/cache/*",
	)
	restoreCmd.Env = env

	var restoreStderr bytes.Buffer
	restoreCmd.Stderr = &restoreStderr

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

	// -- database dump -------------------------------------------------------

	// only sites with a MariaDB container have a DB snapshot
	if site.SiteType == models.SiteTypeWordPress || site.SiteType == models.SiteTypePHP {
		dbSnapID, err := m.findSnapshot(ctx, repoPath, env, backup.SnapshotID, "db")
		if err != nil {
			return fmt.Errorf("export: find db snapshot: %w", err)
		}

		// buffer the SQL so we know the byte size before writing the tar header
		dbCmd := exec.CommandContext(ctx, resticBin,
			"-r", repoPath, "dump", dbSnapID, "db_dump.sql",
		)
		dbCmd.Env = env

		var dbStderr bytes.Buffer
		dbCmd.Stderr = &dbStderr

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

	// flush tar and gzip writers to ensure all data reaches the response writer
	if err := tw.Close(); err != nil {
		return fmt.Errorf("export: close tar: %w", err)
	}
	if err := gz.Close(); err != nil {
		return fmt.Errorf("export: close gzip: %w", err)
	}

	logger.Info("Export: completed archive for site %s backup %d", site.Name, backup.ID)
	return nil
}

// fixPostRestorePerms reapplies the correct ownership and permissions to the
// site directory after a file restore, matching what scaffoldSiteDir sets up
func (m *Manager) fixPostRestorePerms(siteDir string, siteID int64) {
	cred, err := db.GetSFTPCredBySite(m.db, siteID)
	if err != nil || cred == nil {
		logger.Warn("fixPostRestorePerms: could not get sftp cred for site %d: %v", siteID, err)
		return
	}
	uid := cred.UID

	// site root — must be root:root for sshd chroot
	os.Chown(siteDir, 0, 0)
	os.Chmod(siteDir, 0755)

	// html — setgid + group-writable, siteUID owned
	os.Chown(siteDir+"/html", uid, uid)
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
