// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package cron

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/binary"
	"fmt"
	"io"
	"strconv"
	"strings"
	"sync"
	"time"

	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/modules"
	"podnest/internal/podman"
	"podnest/internal/sftp"
)

// maxOutputBytes is the maximum number of bytes captured from a job's combined output
const maxOutputBytes = 4096

// Manager schedules and executes per-site cron jobs
type Manager struct {
	database *sql.DB
	podman   *podman.Client
	reloadCh chan struct{}
}

// New returns a new cron Manager
func New(database *sql.DB, pc *podman.Client) *Manager {
	return &Manager{
		database: database,
		podman:   pc,
		reloadCh: make(chan struct{}, 1),
	}
}

// Start launches the background scheduler goroutine
func (m *Manager) Start(ctx context.Context) {
	go m.run(ctx)
}

// Reload signals the scheduler to re-read all jobs and re-arm the timer;
// safe to call from any goroutine after a create, update, or delete
func (m *Manager) Reload() {
	select {
	case m.reloadCh <- struct{}{}:
	default:
	}
}

// RunNow executes a single job immediately regardless of its schedule
func (m *Manager) RunNow(ctx context.Context, jobID int64) error {
	job, err := db.GetCron(m.database, jobID)
	if err != nil {
		return err
	}
	if job == nil {
		return fmt.Errorf("cron job %d not found", jobID)
	}

	// get the site
	site, err := db.GetSiteByID(m.database, job.SiteID)
	if err != nil || site == nil {
		return fmt.Errorf("site %d not found for cron job %d", job.SiteID, jobID)
	}

	// execute the job for the site
	return m.execute(ctx, job, site)
}

// run is the main scheduler loop; a single goroutine manages all jobs
func (m *Manager) run(ctx context.Context) {

	// setup the timer and channel
	var timer *time.Timer
	var timerCh <-chan time.Time

	// nextTimes maps job ID → its next scheduled fire time
	nextTimes := map[int64]time.Time{}

	// arm sets a timer to fire at the earliest next job time
	arm := func(jobs []*models.SiteCron) {
		if timer != nil {
			timer.Stop()
			timer = nil
			timerCh = nil
		}

		// rebuild the next-time map from scratch on every reload
		nextTimes = make(map[int64]time.Time, len(jobs))
		now := time.Now()
		for _, job := range jobs {
			next, err := nextCronTime(job.Schedule, now)
			if err != nil {
				logger.Warn("cron: job %d (%s) invalid schedule '%s': %v", job.ID, job.Label, job.Schedule, err)
				continue
			}
			nextTimes[job.ID] = next
		}

		// find the earliest upcoming fire time
		var earliest time.Time
		for _, t := range nextTimes {
			if earliest.IsZero() || t.Before(earliest) {
				earliest = t
			}
		}

		// oops, nothing scheduled
		if earliest.IsZero() {
			logger.Debug("cron: no scheduled jobs")
			return
		}

		// arm the timer to fire at the earliest time
		d := time.Until(earliest)
		logger.Debug("cron: next fire at %s (in %s)", earliest.Format(time.RFC3339), d.Round(time.Second))
		timer = time.NewTimer(d)
		timerCh = timer.C
	}

	// load returns all enabled jobs from the DB
	load := func() []*models.SiteCron {
		jobs, err := db.ListEnabledCrons(m.database)
		if err != nil {
			logger.Error("cron: failed to load jobs: %v", err)
			return nil
		}
		return jobs
	}

	// initial
	arm(load())

	// main loop
	for {
		select {
		// stop on context cancellation
		case <-ctx.Done():
			if timer != nil {
				timer.Stop()
			}
			logger.Debug("cron: scheduler stopped")
			return

		// reload signal to re-arm the timer with any schedule changes
		case <-m.reloadCh:
			logger.Debug("cron: reloading jobs")
			arm(load())

		// timer fired, execute any jobs that are due
		case <-timerCh:

			// get the current time and all jobs
			now := time.Now()
			jobs := load()

			// setup a wait group to run all due jobs in parallel
			var wg sync.WaitGroup

			// iterate over all jobs
			for _, job := range jobs {

				// check whether this job is due to run
				next, ok := nextTimes[job.ID]
				if !ok || now.Before(next) {
					continue
				}
				job := job

				// get the site for this job
				site, err := db.GetSiteByID(m.database, job.SiteID)
				if err != nil || site == nil {
					logger.Warn("cron: job %d skipped — site %d not found", job.ID, job.SiteID)
					continue
				}

				// add to the wait group
				wg.Add(1)

				// execute the job in a new goroutine; use a child context with timeout to prevent runaway jobs
				go func() {
					defer wg.Done()
					jCtx, cancel := context.WithTimeout(ctx, 30*time.Minute)
					defer cancel()
					if err := m.execute(jCtx, job, site); err != nil {
						logger.Error("cron: job %d (%s) failed: %v", job.ID, job.Label, err)
					}
				}()
			}

			// wait for all jobs to complete before re-arming the timer
			wg.Wait()

			// re-arm for the next occurrence
			arm(load())
		}
	}
}

// runtimeContainer returns the container role to exec into for a given site type;
// returns "" for site types with no execable runtime
func runtimeContainer(siteType int) string {
	if m := modules.TypeModule(siteType); m != nil {
		return m.RuntimeContainerRole()
	}
	return ""
}

// execute runs a single cron job inside the appropriate site container and
// persists the result back to the DB
func (m *Manager) execute(ctx context.Context, job *models.SiteCron, site *models.Site) error {
	role := runtimeContainer(site.SiteType)
	if role == "" {
		logger.Warn("cron: job %d skipped — site type %d has no runtime container", job.ID, site.SiteType)
		return nil
	}

	// grab the container name and userID for the site
	containerName := podman.ContainerName(site.Name, role)
	siteUID := sftp.UIDForSite(site.ID)

	// the exec user is the only boundary between a site-owner cron and the rest
	// of the host — the command itself is deliberately a full shell. A UID at or
	// below the base means site.ID was zero or negative, which would run the job
	// as root or as another site's user
	if siteUID <= sftp.UIDBase() {
		logger.Error("cron: job %d refused — invalid exec uid %d for site %d", job.ID, siteUID, site.ID)
		_ = db.SetCronResult(m.database, job.ID, "", "invalid exec uid")
		return fmt.Errorf("invalid exec uid %d for site %d", siteUID, site.ID)
	}

	logger.Debug("cron: running job %d (%s) in container %s", job.ID, job.Label, containerName)

	// for WordPress sites, auto-install WP-CLI if the command starts with "wp "
	// and rewrite it to use the absolute path with required flags
	command := job.Command

	// if the job is a wp-cli job and the container is a wordpress site
	if site.SiteType == models.SiteTypeWordPress &&
		(command == "wp" || strings.HasPrefix(command, "wp ")) {
		if err := m.ensureWPCLI(ctx, containerName); err != nil {
			_ = db.SetCronResult(m.database, job.ID, "", "WP-CLI install failed: "+err.Error())
			return fmt.Errorf("ensureWPCLI: %w", err)
		}
		// strip leading "wp" and prepend the absolute path with required flags
		command = "/usr/local/bin/wp --path=/var/www/html --allow-root" + strings.TrimPrefix(command, "wp")
	}

	// create the exec instance
	spec := map[string]any{
		"AttachStdout": true,
		"AttachStderr": true,
		"Detach":       false,
		"User":         fmt.Sprintf("%d", siteUID),
		"Cmd":          []string{"sh", "-c", command},
	}
	var execResp struct {
		ID string `json:"Id"`
	}
	if err := m.podman.PostJSON(ctx,
		"/v4.0.0/libpod/containers/"+containerName+"/exec",
		spec, &execResp,
	); err != nil {
		_ = db.SetCronResult(m.database, job.ID, "", err.Error())
		return fmt.Errorf("create exec: %w", err)
	}

	// start the exec and collect the multiplexed output stream
	body, err := m.podman.StreamPost(ctx,
		fmt.Sprintf("/v4.0.0/libpod/exec/%s/start", execResp.ID),
		map[string]any{"Detach": false, "Tty": false},
	)
	if err != nil {
		_ = db.SetCronResult(m.database, job.ID, "", err.Error())
		return fmt.Errorf("start exec: %w", err)
	}
	defer body.Close()

	output, execErr := readMuxOutput(body, maxOutputBytes)

	// persist result regardless of success or failure
	errMsg := ""
	if execErr != nil {
		errMsg = execErr.Error()
	}
	_ = db.SetCronResult(m.database, job.ID, output, errMsg)

	if execErr != nil {
		return fmt.Errorf("exec: %w", execErr)
	}

	logger.Debug("cron: job %d (%s) completed", job.ID, job.Label)
	return nil
}

// readMuxOutput reads the Docker/Podman multiplexed stream format (8-byte
// header per frame) and returns the combined output, capped at maxBytes
func readMuxOutput(r io.Reader, maxBytes int) (string, error) {
	var buf bytes.Buffer
	hdr := make([]byte, 8)

	for {
		if _, err := io.ReadFull(r, hdr); err != nil {
			if err == io.EOF || err == io.ErrUnexpectedEOF {
				break
			}
			return buf.String(), err
		}

		size := int(binary.BigEndian.Uint32(hdr[4:8]))
		if size == 0 {
			continue
		}

		chunk := make([]byte, size)
		if _, err := io.ReadFull(r, chunk); err != nil {
			return buf.String(), err
		}

		remaining := maxBytes - buf.Len()
		if remaining <= 0 {
			continue // drain the stream but stop buffering
		}
		if len(chunk) > remaining {
			chunk = chunk[:remaining]
		}
		buf.Write(chunk)
	}

	return buf.String(), nil
}

// -- cron parser -------------------------------------------------------------

// nextCronTime returns the next time after 'from' that satisfies the
// 5-field cron expression (minute hour dom month dow)
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

	if field == "*" {
		for i := min; i <= max; i++ {
			result[i] = true
		}
		return result, nil
	}

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

	v, err := strconv.Atoi(field)
	if err != nil || v < min || v > max {
		return nil, fmt.Errorf("invalid value '%s' (must be %d-%d)", field, min, max)
	}
	result[v] = true
	return result, nil
}

// ensureWPCLI installs wp-cli.phar into the container if it is not already present
func (m *Manager) ensureWPCLI(ctx context.Context, containerName string) error {
	// check whether the binary already exists
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
			return nil // already present
		}
	}

	// not present — download and install inside the container
	logger.Debug("cron: installing WP-CLI in container %s", containerName)
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
		return fmt.Errorf("create install exec: %w", err)
	}

	if err := m.podman.PostJSON(ctx,
		"/v4.0.0/libpod/exec/"+installResp.ID+"/start",
		map[string]any{"Detach": false}, nil,
	); err != nil {
		return fmt.Errorf("start install exec: %w", err)
	}

	// poll until the install exec finishes
	deadline := time.Now().Add(60 * time.Second)
	var inspect struct {
		ExitCode int  `json:"ExitCode"`
		Running  bool `json:"Running"`
	}
	for time.Now().Before(deadline) {
		time.Sleep(500 * time.Millisecond)
		if err := m.podman.GetJSON(ctx,
			"/v4.0.0/libpod/exec/"+installResp.ID+"/json", &inspect,
		); err != nil {
			return fmt.Errorf("inspect install exec: %w", err)
		}
		if !inspect.Running {
			break
		}
	}
	if inspect.Running {
		return fmt.Errorf("WP-CLI install timed out")
	}
	if inspect.ExitCode != 0 {
		return fmt.Errorf("WP-CLI install exited %d", inspect.ExitCode)
	}

	logger.Debug("cron: WP-CLI installed in container %s", containerName)
	return nil
}
