// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"os/user"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/spf13/cobra"
	"golang.org/x/term"
)

const (
	drBootstrapMarker = ".podnest-recovery-source"
	drPendingMarker   = ".podnest-recovery-pending"
)

var (
	recoverUser, recoverVersion, recoverEndpoint, recoverBucket, recoverRegion string
	recoverSource, recoverSite                                                 string
	recoverFull, recoverRetry                                                  bool
	recoverUsername                                                            = regexp.MustCompile(`^[a-z_][a-z0-9_-]{0,30}$`)
	recoverID                                                                  = regexp.MustCompile(`^[0-9a-f]{32}$`)
)

type drStageRequest struct {
	Storage struct {
		Endpoint  string `json:"endpoint"`
		Bucket    string `json:"bucket"`
		Region    string `json:"region"`
		AccessKey string `json:"access_key"`
		SecretKey string `json:"secret_key"`
	} `json:"storage"`
	Source     string `json:"source,omitempty"`
	Passphrase string `json:"passphrase,omitempty"`
}

type drSource struct {
	ID       string `json:"id"`
	Hostname string `json:"hostname"`
	Verified string `json:"verified"`
}

var recoverCmd = &cobra.Command{
	Use:   "recover",
	Short: "Recover a PodNest server from its latest S3 disaster recovery point",
	Args:  cobra.NoArgs,
	RunE:  runRecover,
}

func init() {
	flags := recoverCmd.Flags()
	flags.StringVar(&recoverUser, "user", "", "dedicated Linux service username")
	flags.StringVar(&recoverVersion, "version", "latest", "PodNest image tag: latest, rc, beta, or vX.Y.Z")
	flags.StringVar(&recoverEndpoint, "endpoint", "", "HTTPS S3 endpoint")
	flags.StringVar(&recoverBucket, "bucket", "", "S3 bucket")
	flags.StringVar(&recoverRegion, "region", "us-east-1", "S3 region")
	flags.StringVar(&recoverSource, "source", "", "original server ID; prompt when omitted")
	flags.BoolVar(&recoverFull, "full", false, "restore all sites and wait for the outcome")
	flags.BoolVar(&recoverRetry, "retry-failed", false, "retry failed sites on the installed server")
	flags.StringVar(&recoverSite, "site", "", "retry only the named site")
	rootCmd.AddCommand(recoverCmd)
}

func runRecover(cmd *cobra.Command, args []string) error {
	ctx, cancel := signal.NotifyContext(cmd.Context(), os.Interrupt, syscall.SIGTERM)
	defer cancel()
	if recoverRetry && recoverFull || (recoverSite != "" && !recoverRetry) {
		return errors.New("use --full or --retry-failed; --site requires --retry-failed")
	}

	state, err := loadState()
	if err == nil {
		if !recoverRetry && !recoverFull {
			return errors.New("PodNest is already installed; use its recovery panel or pdnctl recover --full to resume initial recovery")
		}
		return requestHostRecovery(ctx, state, recoverRetry, recoverSite)
	}
	if recoverRetry || !errors.Is(err, os.ErrNotExist) {
		return err
	}
	if !recoverUsername.MatchString(recoverUser) || recoverEndpoint == "" || recoverBucket == "" || !validVersion(recoverVersion) ||
		(recoverSource != "" && !recoverID.MatchString(recoverSource)) {
		return errors.New("fresh recovery requires --user, --endpoint and --bucket, with a valid image channel and source ID")
	}
	if existing, err := user.Lookup(recoverUser); err == nil {
		if err := verifyRecoveryHome(existing); err != nil {
			return err
		}
	}

	var request drStageRequest
	request.Storage.Endpoint, request.Storage.Bucket, request.Storage.Region = recoverEndpoint, recoverBucket, recoverRegion
	if request.Storage.AccessKey, err = readRecoverySecret("S3 access key ID"); err != nil {
		return err
	}
	if request.Storage.SecretKey, err = readRecoverySecret("S3 secret access key"); err != nil {
		return err
	}
	installUser, installVersion = recoverUser, recoverVersion
	err = runInstall(func(account *user.User, uid int, dataPath string) error {
		if err := verifyRecoveryHome(account); err != nil {
			return err
		}
		return recoverHostData(ctx, account, uid, dataPath, cmd, request)
	})
	if err != nil {
		return err
	}
	state, err = loadState()
	if err != nil {
		return err
	}
	if recoverFull {
		return requestHostRecovery(ctx, state, false, "")
	}
	fmt.Printf("The recovery-only panel listens on 127.0.0.1:%d. Forward that port over SSH to finish restoring sites.\n", state.Port)
	return nil
}

func verifyRecoveryHome(account *user.User) error {
	uid, err := strconv.Atoi(account.Uid)
	if err != nil || uid < 1000 || !filepath.IsAbs(account.HomeDir) || filepath.Clean(account.HomeDir) == "/" || strings.ContainsRune(account.HomeDir, ':') {
		return errors.New("recovery requires a dedicated unprivileged Linux account with its own home directory")
	}
	info, err := os.Lstat(account.HomeDir)
	if err != nil || !info.IsDir() {
		return errors.New("recovery requires a real dedicated home directory")
	}
	root, err := os.OpenRoot(account.HomeDir)
	if err != nil {
		return err
	}
	defer root.Close()
	info, err = root.Lstat("sites")
	if os.IsNotExist(err) {
		if _, keyErr := root.Lstat(pnEnvName); os.IsNotExist(keyErr) {
			return nil
		}
		return errors.New("target already has an instance key")
	}
	if err != nil || !info.IsDir() {
		return errors.New("target application path must be a real directory")
	}
	content, err := root.Open("sites")
	if err != nil {
		return err
	}
	defer content.Close()
	entries, err := content.ReadDir(1)
	if errors.Is(err, io.EOF) && len(entries) == 0 {
		if _, keyErr := root.Lstat(pnEnvName); os.IsNotExist(keyErr) {
			return nil
		}
		pending, pendingErr := root.ReadFile(drPendingMarker)
		if pendingErr == nil && recoverID.Match(bytes.TrimSpace(pending)) {
			return checkPNEnv(filepath.Join(account.HomeDir, pnEnvName))
		}
	}
	marker, err := root.ReadFile(filepath.Join("sites", drBootstrapMarker))
	if err != nil || !recoverID.Match(bytes.TrimSpace(marker)) {
		return errors.New("target contains an existing PodNest installation")
	}
	return nil
}

func readRecoverySecret(label string) (string, error) {
	fd := int(os.Stdin.Fd())
	if !term.IsTerminal(fd) {
		return "", errors.New("a terminal is required for recovery credentials")
	}
	fmt.Fprintf(os.Stderr, "%s: ", label)
	value, err := term.ReadPassword(fd)
	fmt.Fprintln(os.Stderr)
	defer clear(value)
	if err != nil {
		return "", err
	}
	if len(value) == 0 || len(value) > 4096 {
		return "", errors.New("invalid recovery credential length")
	}
	return string(value), nil
}

func recoverHostData(ctx context.Context, account *user.User, uid int, dataPath string, cmd *cobra.Command, request drStageRequest) error {
	home := account.HomeDir
	root, err := os.OpenRoot(home)
	if err != nil {
		return err
	}
	defer root.Close()

	installed, err := root.ReadFile(filepath.Join("sites", drBootstrapMarker))
	appPublished := err == nil
	if appPublished {
		id := strings.TrimSpace(string(installed))
		if !recoverID.MatchString(id) || (recoverSource != "" && id != recoverSource) {
			return errors.New("staged application is from a different recovery source")
		}
		recoverSource = id
		if err := checkPNEnv(filepath.Join(home, pnEnvName)); err == nil {
			return nil
		} else if !errors.Is(err, os.ErrNotExist) {
			return err
		}
	}

	if pending, err := root.ReadFile(drPendingMarker); err == nil {
		id := strings.TrimSpace(string(pending))
		if !recoverID.MatchString(id) || (recoverSource != "" && recoverSource != id) {
			return errors.New("interrupted bootstrap is for a different recovery source")
		}
		recoverSource = id
	}
	image := "ghcr.io/kpirnie/podnest:" + installVersion
	if recoverSource == "" {
		output, err := runDRStageContainer(ctx, account, uid, image, request, "")
		if err != nil {
			return err
		}
		var sources []drSource
		if err := json.Unmarshal(output, &sources); err != nil {
			return errors.New("could not read recovery source listing")
		}
		if len(sources) == 0 {
			return errors.New("no verified PodNest recovery points were found")
		}
		for i, source := range sources {
			fmt.Fprintf(cmd.OutOrStdout(), "%d. %s (%s), verified %s\n", i+1,
				strconv.QuoteToGraphic(source.Hostname), source.ID, source.Verified)
		}
		fmt.Fprint(cmd.OutOrStdout(), "Select the original server: ")
		var choice int
		if _, err := fmt.Fscanln(os.Stdin, &choice); err != nil || choice < 1 || choice > len(sources) {
			return errors.New("invalid recovery source selection")
		}
		recoverSource = sources[choice-1].ID
	}
	if !recoverID.MatchString(recoverSource) {
		return errors.New("invalid recovery source ID")
	}
	request.Source = recoverSource
	request.Passphrase, err = readRecoverySecret("Recovery passphrase")
	if err != nil {
		return err
	}

	work, err := os.MkdirTemp(home, ".podnest-stage-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(work)
	gid, err := strconv.Atoi(account.Gid)
	if err != nil {
		return err
	}
	if err := os.Chown(work, uid, gid); err != nil {
		return err
	}
	if _, err := runDRStageContainer(ctx, account, uid, image, request, work); err != nil {
		return err
	}
	stage := filepath.Join(filepath.Base(work), "checkpoint")
	restoredApp := filepath.Join(stage, "application")
	marker := filepath.Join(restoredApp, drBootstrapMarker)
	if err := writeRecoveryMarker(root, marker, request.Source); err != nil {
		return err
	}
	keyfile := filepath.Join(stage, pnEnvName)
	if err := checkPNEnv(filepath.Join(home, keyfile)); err != nil {
		return err
	}
	// Persist the source before linking the key so an interrupted bootstrap
	// can resume with the same selected node.
	if err := writeRecoveryMarker(root, drPendingMarker, request.Source); err != nil {
		return err
	}
	linked := false
	if err := root.Link(keyfile, pnEnvName); err == nil {
		linked = true
	} else if errors.Is(err, os.ErrExist) {
		existing, readErr := root.ReadFile(pnEnvName)
		staged, stageErr := root.ReadFile(keyfile)
		match := readErr == nil && stageErr == nil && bytes.Equal(existing, staged)
		clear(existing)
		clear(staged)
		if !match {
			return errors.New("target instance key differs from the selected recovery source")
		}
	} else {
		return err
	}
	published := false
	defer func() {
		if !published && linked {
			_ = root.Remove(pnEnvName)
		}
	}()
	if !appPublished {
		if err := root.Rename(restoredApp, filepath.Base(dataPath)); err != nil {
			return fmt.Errorf("publish restored application data: %w", err)
		}
	}
	published = true
	_ = root.Remove(drPendingMarker)
	return nil
}

func writeRecoveryMarker(root *os.Root, path, source string) error {
	file, err := root.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL|syscall.O_NOFOLLOW, 0600)
	if errors.Is(err, os.ErrExist) {
		info, err := root.Lstat(path)
		if err != nil || !info.Mode().IsRegular() || info.Mode().Perm() != 0600 {
			return errors.New("invalid existing recovery marker")
		}
		raw, err := root.ReadFile(path)
		if err != nil || strings.TrimSpace(string(raw)) != source {
			return errors.New("existing recovery marker is for another source")
		}
		return nil
	}
	if err != nil {
		return err
	}
	_, writeErr := file.WriteString(source + "\n")
	return errors.Join(writeErr, file.Sync(), file.Close())
}

func runDRStageContainer(ctx context.Context, account *user.User, uid int, image string, request drStageRequest, work string) ([]byte, error) {
	payload, err := json.Marshal(request)
	if err != nil {
		return nil, err
	}
	defer clear(payload)
	name := fmt.Sprintf("podnest-dr-stage-%d", os.Getpid())
	args := []string{"-H", "-u", account.Username, fmt.Sprintf("XDG_RUNTIME_DIR=/run/user/%d", uid),
		"HOME=" + account.HomeDir, "podman", "run", "--rm", "-i", "--name", name}
	if work != "" {
		args = append(args, "-v", work+":/stage:Z")
	}
	args = append(args, image, "dr-stage")
	if work != "" {
		args = append(args, "/stage/checkpoint")
	}
	child := exec.CommandContext(ctx, "sudo", args...)
	child.Dir = "/tmp"
	child.Stdin = bytes.NewReader(payload)
	child.Stderr = os.Stderr
	defer func() {
		if ctx.Err() != nil {
			_ = userRun(account.Username, uid, "podman", "rm", "-f", name)
		}
	}()
	output, err := child.Output()
	if err != nil {
		return nil, fmt.Errorf("PodNest recovery bootstrap: %w", err)
	}
	return output, nil
}

type hostDRStatus struct {
	Active bool `json:"active"`
	Busy   bool `json:"busy"`
	Sites  []struct {
		Name  string `json:"name"`
		State string `json:"state"`
		Error string `json:"error"`
	} `json:"sites"`
}

func requestHostRecovery(ctx context.Context, state *State, retry bool, site string) error {
	socket := filepath.Join(state.DataPath, ".disaster-recovery", "control.sock")
	transport := &http.Transport{DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
		var dialer net.Dialer
		return dialer.DialContext(ctx, "unix", socket)
	}}
	defer transport.CloseIdleConnections()
	client := &http.Client{Transport: transport, Timeout: 5 * time.Second}
	status, err := waitHostDRStatus(ctx, client, 90*time.Second)
	if err != nil {
		return err
	}
	if !retry && !status.Active {
		return printHostDRResult(status, "")
	}
	if status.Busy && retry {
		return errors.New("another site recovery operation is already running")
	}
	if !status.Busy {
		body, err := json.Marshal(map[string]any{"retry": retry, "site": site})
		if err != nil {
			return err
		}
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, "http://podnest/", bytes.NewReader(body))
		if err != nil {
			return err
		}
		req.Header.Set("Content-Type", "application/json")
		response, err := client.Do(req)
		if err != nil {
			return err
		}
		response.Body.Close()
		if response.StatusCode != http.StatusAccepted {
			return fmt.Errorf("restore request returned HTTP %d", response.StatusCode)
		}
	}
	tick := time.NewTicker(2 * time.Second)
	defer tick.Stop()
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-tick.C:
			status, err := waitHostDRStatus(ctx, client, 90*time.Second)
			if err != nil {
				return err
			}
			if !status.Busy {
				if status.Active {
					return errors.New("initial recovery was interrupted; review the recovery panel and rerun --full")
				}
				return printHostDRResult(status, site)
			}
		}
	}
}

func waitHostDRStatus(ctx context.Context, client *http.Client, timeout time.Duration) (hostDRStatus, error) {
	var status hostDRStatus
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	for {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://podnest/", nil)
		if err != nil {
			return status, err
		}
		response, err := client.Do(req)
		if err == nil {
			decodeErr := json.NewDecoder(io.LimitReader(response.Body, 16<<20)).Decode(&status)
			response.Body.Close()
			if response.StatusCode == http.StatusOK && decodeErr == nil {
				return status, nil
			}
		}
		select {
		case <-ctx.Done():
			return status, fmt.Errorf("recovery service unavailable: %w", ctx.Err())
		case <-ticker.C:
		}
	}
}

func printHostDRResult(status hostDRStatus, name string) error {
	failed, matched := 0, false
	for _, site := range status.Sites {
		if name != "" && site.Name != name {
			continue
		}
		matched = true
		fmt.Printf("%s: %s\n", site.Name, site.State)
		if site.Error != "" {
			fmt.Println("  ", site.Error)
		}
		if site.State != "restored" {
			failed++
		}
	}
	if name != "" && !matched {
		return errors.New("requested site was not found in recovery state")
	}
	if failed != 0 {
		return fmt.Errorf("%d site(s) require recovery attention", failed)
	}
	fmt.Println("PodNest recovery completed.")
	return nil
}
