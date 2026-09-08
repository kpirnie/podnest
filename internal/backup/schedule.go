// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package backup

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	"podnest/internal/db"
	"podnest/internal/logger"
)

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
		m.Go(func(jctx context.Context) {
			defer wg.Done()
			bCtx, cancel := context.WithTimeout(jctx, 2*time.Hour)
			defer cancel()
			if _, err := m.Backup(bCtx, site, "scheduled"); err != nil {
				logger.Error("scheduler: backup failed for site %s: %v", site.Name, err)
				_ = db.SetBackupError(m.db, site.ID, err.Error())
			} else {
				logger.Debug("scheduler: backup complete for site %s", site.Name)
				_ = db.ClearBackupError(m.db, site.ID)
			}
		})
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
