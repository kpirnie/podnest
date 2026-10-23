// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package backup

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/podman"
)

const (
	maxPushExcludes   = 100
	maxPushExcludeLen = 1024
)

// ErrPushBusy reports a push refused because one of its two sites already has
// a restore, import, backup or push running.
var ErrPushBusy = errors.New("a restore, import, backup or push is already running on one of these sites")

// PushOptions selects what a push copies from the source site onto the target.
type PushOptions struct {
	Files    bool
	Database bool
	Exclude  []string // paths relative to html/, left untouched on the target
}

// CleanPushExcludes validates push exclusions and returns them as clean paths
// relative to the web root. Blank lines are dropped.
func CleanPushExcludes(raw []string) ([]string, error) {
	if len(raw) > maxPushExcludes {
		return nil, fmt.Errorf("too many exclusions (max %d)", maxPushExcludes)
	}

	var out []string
	for _, p := range raw {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		if len(p) > maxPushExcludeLen {
			return nil, fmt.Errorf("exclusion too long (max %d characters)", maxPushExcludeLen)
		}

		// exclusions drive both the wipe and the copy, so a path climbing out of
		// the web root is rejected outright rather than silently re-rooted
		for _, seg := range strings.Split(filepath.ToSlash(p), "/") {
			if seg == ".." {
				return nil, fmt.Errorf("exclusion %q may not contain '..'", p)
			}
		}

		clean := strings.TrimPrefix(filepath.Clean("/"+p), "/")
		if clean == "" {
			return nil, fmt.Errorf("exclusion %q would exclude the whole web root", p)
		}
		out = append(out, clean)
	}
	return out, nil
}

// BeginPush claims both sites for a push. The target is marked restoring so it
// reports busy to the restore-status poll until EndPush.
func (m *Manager) BeginPush(srcID, dstID int64) error {
	if m.IsRestoring(srcID) {
		return ErrPushBusy
	}
	if active, _ := m.BackupJobStatus(dstID); active {
		return ErrPushBusy
	}
	if v, ok := m.pushJobs.Load(srcID); ok && v.(backupJob).active {
		return ErrPushBusy
	}

	// LoadOrStore makes the claim on the target atomic against a second push
	if _, loaded := m.restoring.LoadOrStore(dstID, true); loaded {
		return ErrPushBusy
	}
	m.pushJobs.Store(srcID, backupJob{active: true})
	return nil
}

// EndPush releases the target and records the outcome of the push against the
// source site.
func (m *Manager) EndPush(srcID, dstID int64, err error) {
	m.restoring.Delete(dstID)
	j := backupJob{}
	if err != nil {
		j.err = err.Error()
	}
	m.pushJobs.Store(srcID, j)
}

// PushJobStatus reports whether a push from the source site is running and the
// error from the last one, if it failed.
func (m *Manager) PushJobStatus(srcID int64) (active bool, errMsg string) {
	v, ok := m.pushJobs.Load(srcID)
	if !ok {
		return false, ""
	}
	j := v.(backupJob)
	return j.active, j.err
}

// Push overwrites the target site with the source site's files and/or
// database. The target is backed up first and the push is aborted if that
// backup fails; the target serves the maintenance page while it is overwritten.
func (m *Manager) Push(ctx context.Context, src, dst *models.Site, opts PushOptions) error {

	// setup the site paths
	srcDir := filepath.Join(m.appPath, "sites", src.Name)
	dstDir := filepath.Join(m.appPath, "sites", dst.Name)
	pushDB := opts.Database && modules.TypeModule(dst.SiteType).HasDatabase()

	// snapshot the target first so a bad push can be rolled back
	if _, err := m.Backup(ctx, dst, "pre-push"); err != nil {
		return fmt.Errorf("Push: pre-push backup of %s: %w", dst.Name, err)
	}

	// dump the source database before maintenance so the target is down only
	// for the overwrite itself
	var dumpPath string
	if pushDB {
		tmp, err := os.CreateTemp(resticTmpDir, "podnest-push-*.sql")
		if err != nil {
			return fmt.Errorf("Push: create temp: %w", err)
		}
		defer os.Remove(tmp.Name())
		err = m.dumpDB(ctx, src, srcDir, tmp)
		tmp.Close()
		if err != nil {
			return fmt.Errorf("Push: %w", err)
		}
		dumpPath = tmp.Name()
	}

	// enable maintenance mode before touching any target data
	if err := m.enableMaintenance(ctx, dst, dstDir); err != nil {
		return fmt.Errorf("Push: enable maintenance: %w", err)
	}
	defer func() {
		if err := m.disableMaintenance(ctx, dst, dstDir); err != nil {
			logger.Error("Push: disable maintenance for site %s: %v", dst.Name, err)
		}
	}()

	// mirror the web root, then hand the copied tree to the target's UID
	if opts.Files {
		if err := pushHTML(filepath.Join(srcDir, "html"), filepath.Join(dstDir, "html"), opts.Exclude); err != nil {
			return fmt.Errorf("Push: files: %w", err)
		}
		m.fixPostRestorePerms(dstDir, dst.ID)
	}

	// importDB empties the target schema before loading the dump
	if pushDB {
		if err := m.importDB(ctx, dst, dumpPath, dstDir); err != nil {
			return fmt.Errorf("Push: import db: %w", err)
		}

		// the pushed DB still carries the source's domain; a failure here
		// leaves the target pointing at the clone, so it fails the push
		if dst.SiteType == models.SiteTypeWordPress {
			if err := m.pushSearchReplace(ctx, src, dst, dstDir); err != nil {
				return fmt.Errorf("Push: %w", err)
			}
		}
	}

	// flush caches so the target serves the pushed code and data
	if modules.TypeModule(dst.SiteType).HasPHPFPM() {
		if err := m.podman.FlushPHPCache(ctx, podman.ContainerName(dst.Name, "php")); err != nil {
			logger.Warn("Push: flush php opcache for site %s: %v", dst.Name, err)
		}
	}
	if modules.TypeModule(dst.SiteType).HasRedis() {
		if redisPass, err := readEnvValue(filepath.Join(dstDir, ".env"), "REDIS_PASS"); err != nil {
			logger.Warn("Push: REDIS_PASS for site %s: %v", dst.Name, err)
		} else if err := m.podman.FlushRedisCache(ctx, podman.ContainerName(dst.Name, "redis"), redisPass); err != nil {
			logger.Warn("Push: flush redis for site %s: %v", dst.Name, err)
		}
	}
	if modules.TypeModule(dst.SiteType).HasPHPFPM() {
		if err := m.podman.FlushCache(ctx, podman.ContainerName(dst.Name, "nginx"), models.FastCGICachePath); err != nil {
			logger.Warn("Push: flush fastcgi cache for site %s: %v", dst.Name, err)
		}
	}
	if varnishKV, _ := db.GetConfigsBySiteAndType(m.db, dst.ID, models.ConfigVarnish); strings.ToLower(varnishKV["enabled"]) == "true" {
		if err := m.podman.FlushVarnishCache(ctx, podman.ContainerName(dst.Name, "varnish")); err != nil {
			logger.Warn("Push: flush varnish for site %s: %v", dst.Name, err)
		}
	}

	logger.Debug("Push: completed %s → %s (files=%v db=%v)", src.Name, dst.Name, opts.Files, pushDB)
	return nil
}

// pushSearchReplace rewrites the source domain to the target's primary domain
// throughout the target's freshly imported WordPress database.
func (m *Manager) pushSearchReplace(ctx context.Context, src, dst *models.Site, dstDir string) error {

	// fetch the target site's primary domain
	dstDomains, err := db.GetDomainsBySite(m.db, dst.ID)
	if err != nil || len(dstDomains) == 0 {
		logger.Warn("pushSearchReplace: could not fetch target domains for site %s: %v", dst.Name, err)
		return nil
	}
	toDomain := dstDomains[0].Domain

	// the imported siteurl is the domain actually stored in the data; the
	// clone's own primary domain is the fallback
	wpCfgPath := filepath.Join(dstDir, "html", "wp-config.php")
	fromDomain, err := m.wpSourceDomain(ctx, dst, dstDir, wpCfgPath)
	if err != nil {
		logger.Warn("pushSearchReplace: siteurl for site %s: %v", dst.Name, err)
		if srcDomains, derr := db.GetDomainsBySite(m.db, src.ID); derr == nil && len(srcDomains) > 0 {
			fromDomain = srcDomains[0].Domain
		}
	}
	if fromDomain == "" || fromDomain == toDomain {
		return nil
	}

	// replace throughout the DB, then repoint multisite at the target domain
	if err := m.wpSearchReplace(ctx, dst, fromDomain, toDomain); err != nil {
		return fmt.Errorf("pushSearchReplace: %w", err)
	}
	if err := rewriteWPConfigDomain(wpCfgPath, toDomain); err != nil {
		return fmt.Errorf("pushSearchReplace: %w", err)
	}
	return nil
}

// CloneSearchReplace repoints a freshly cloned WordPress database from the
// source's domain to the clone's own primary domain.
func (m *Manager) CloneSearchReplace(ctx context.Context, src, clone *models.Site) error {
	return m.pushSearchReplace(ctx, src, clone, filepath.Join(m.appPath, "sites", clone.Name))
}

// dumpDB writes the site's database through mysqldump (or mariadb-dump) in its
// DB container into w.
func (m *Manager) dumpDB(ctx context.Context, site *models.Site, siteDir string, w io.Writer) error {
	envPath := filepath.Join(siteDir, ".env")
	dbName, err := readEnvValue(envPath, "DB_NAME")
	if err != nil {
		return fmt.Errorf("dumpDB: DB_NAME: %w", err)
	}
	rootPass, err := readEnvValue(envPath, "DB_ROOT_PASS")
	if err != nil {
		return fmt.Errorf("dumpDB: DB_ROOT_PASS: %w", err)
	}

	// the schema name is a positional arg, never interpolated into the script
	cmd := exec.CommandContext(ctx, "podman",
		"exec", "--user=mysql", "-e", "MYSQL_PWD", podman.ContainerName(site.Name, "db"),
		"sh", "-c",
		`mysqldump -uroot --single-transaction --quick --routines "$1" 2>/dev/null || `+
			`mariadb-dump -uroot --single-transaction --quick --routines "$1"`,
		"sh",
		dbName,
	)

	// MYSQL_PWD via -e (name only) keeps the password out of argv on host + container
	cmd.Env = append(os.Environ(), "CONTAINER_HOST=unix://"+m.podmanSock, "MYSQL_PWD="+rootPass)

	var stderr bytes.Buffer
	cmd.Stdout = w
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("dumpDB: mysqldump: %w — %s", err, stderr.String())
	}

	logger.Debug("dumpDB: dumped database for site %s", site.Name)
	return nil
}

// pushHTML mirrors the source web root onto the target. The target's own
// config files and every excluded path are left exactly as they were;
// everything else on the target is replaced by the source's copy.
func pushHTML(srcHTML, dstHTML string, exclude []string) error {
	if err := wipeExcept(dstHTML, "", exclude); err != nil {
		return err
	}

	// Walk uses Lstat, so symlinks are copied as links and never followed
	return filepath.Walk(srcHTML, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		rel, err := filepath.Rel(srcHTML, path)
		if err != nil {
			return fmt.Errorf("pushHTML: rel path: %w", err)
		}
		if rel == "." {
			return nil
		}

		// the source's config files and excluded paths are never copied over
		if pushSkipped(rel, exclude) {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		dest := filepath.Join(dstHTML, rel)
		switch {
		case info.Mode()&os.ModeSymlink != 0:
			link, err := os.Readlink(path)
			if err != nil {
				return fmt.Errorf("pushHTML: readlink %s: %w", rel, err)
			}
			if err := os.Symlink(link, dest); err != nil {
				return fmt.Errorf("pushHTML: symlink %s: %w", rel, err)
			}
		case info.IsDir():
			if err := os.MkdirAll(dest, info.Mode().Perm()); err != nil {
				return fmt.Errorf("pushHTML: mkdir %s: %w", rel, err)
			}
		case info.Mode().IsRegular():
			if err := pushCopyFile(path, dest, info.Mode().Perm()); err != nil {
				return fmt.Errorf("pushHTML: copy %s: %w", rel, err)
			}
		}
		return nil
	})
}

// pushCopyFile copies a single regular file's contents to dst.
func pushCopyFile(src, dst string, mode os.FileMode) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, mode)
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, in); err != nil {
		out.Close()
		return err
	}
	return out.Close()
}

// wipeExcept empties a directory of the target's web root ahead of a push. The
// target's config files and every excluded path survive; a directory holding
// an excluded path is descended into rather than removed.
func wipeExcept(htmlDir, rel string, exclude []string) error {
	entries, err := os.ReadDir(filepath.Join(htmlDir, rel))
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("wipeExcept: read %s: %w", rel, err)
	}

	for _, e := range entries {
		child := filepath.Join(rel, e.Name())
		if pushSkipped(child, exclude) {
			continue
		}

		// only real directories are descended — a symlink is removed as a leaf
		if e.IsDir() && holdsExcluded(child, exclude) {
			if err := wipeExcept(htmlDir, child, exclude); err != nil {
				return err
			}
			continue
		}

		target := filepath.Join(htmlDir, child)
		if err := os.RemoveAll(target); err == nil {
			continue
		}

		// retry once after loosening the tree, as wipeHTMLRoot does; unlike an
		// import, a leftover here would merge into the pushed tree, so it is fatal
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
			return fmt.Errorf("wipeExcept: remove %s: %w", child, err)
		}
	}
	return nil
}

// pushSkipped reports whether a path relative to the web root is left alone by
// a push: the target's own top-level config files, or an excluded path.
func pushSkipped(rel string, exclude []string) bool {
	if dir, base := filepath.Split(rel); dir == "" && htmlPreserved(base) {
		return true
	}
	for _, e := range exclude {
		if rel == e || strings.HasPrefix(rel, e+string(os.PathSeparator)) {
			return true
		}
	}
	return false
}

// holdsExcluded reports whether an excluded path lies beneath rel.
func holdsExcluded(rel string, exclude []string) bool {
	prefix := rel + string(os.PathSeparator)
	for _, e := range exclude {
		if strings.HasPrefix(e, prefix) {
			return true
		}
	}
	return false
}
