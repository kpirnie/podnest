package podman

import (
	"context"
	"fmt"
	"time"

	"podnest/internal/logger"
	"podnest/internal/models"
)

// setup constants for image names and security options
const (
	imgNginx = models.ImgNginx
	imgDB    = models.ImgDB
	imgRedis = models.ImgRedis
	imgPMA   = models.ImgPMA

	// common security options applied to every container
	secNoNewPriv = "no-new-privileges:true"
)

// SiteConfig holds everything needed to create a full WordPress pod
type SiteConfig struct {
	Site           *models.Site
	SiteUID        int
	SiteDir        string
	DBName         string
	DBUser         string
	DBPass         string
	DBRootPass     string
	RedisPass      string
	NginxConf      string
	NginxSite      string
	PHPFPMConf     string
	PHPIniConf     string
	MariaDBConf    string
	RedisConf      string
	VarnishEnabled bool
	VarnishMemory  string
}

// PodName returns the canonical pod name for a site
func PodName(siteName string) string {
	return "pn-" + siteName
}

// ContainerName returns the canonical container name for a site+role
func ContainerName(siteName, role string) string {
	return PodName(siteName) + "-" + role
}

// RemoveSitePod force-removes the pod and all containers for a site, then
// removes the site's dedicated network. Network cleanup is best-effort and
// runs after the pod (a network cannot be removed while a pod is attached).
func (c *Client) RemoveSitePod(ctx context.Context, siteName string) error {
	podErr := c.RemovePod(ctx, PodName(siteName))
	if err := c.RemoveNetwork(ctx, NetworkName(siteName)); err != nil {
		logger.Debug("RemoveSitePod: network %s cleanup: %v", NetworkName(siteName), err)
	}
	return podErr
}

// SiteStatus returns the pod inspect for a site
func (c *Client) SiteStatus(ctx context.Context, siteName string) (*PodInspect, error) {
	return c.InspectPod(ctx, PodName(siteName))
}

// WaitForMariaDB blocks until MariaDB in containerName accepts connections or ctx expires.
func (c *Client) WaitForMariaDB(ctx context.Context, containerName, rootPass string) error {
	deadline := time.Now().Add(120 * time.Second)
	for time.Now().Before(deadline) {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}
		var info struct {
			State struct {
				Status string `json:"Status"`
			} `json:"State"`
		}
		if err := c.get(ctx, "/v4.0.0/libpod/containers/"+containerName+"/json", &info); err != nil || info.State.Status != "running" {
			logger.Debug("WaitForMariaDB: container %s not running yet (status=%q)", containerName, info.State.Status)
			time.Sleep(3 * time.Second)
			continue
		}
		execSpec := map[string]any{
			"AttachStdout": false,
			"AttachStderr": false,
			"Detach":       true,
			"Cmd": []string{
				"mariadb-admin", "--host=127.0.0.1", "--port=3306",
				"-u", "root", "-p" + rootPass,
				"ping", "--silent", "--connect-timeout=2",
			},
		}
		var execResp struct {
			ID string `json:"Id"`
		}
		if err := c.post(ctx, "/v4.0.0/libpod/containers/"+containerName+"/exec", execSpec, &execResp); err != nil || execResp.ID == "" {
			logger.Debug("WaitForMariaDB: not ready yet in %s: %v", containerName, err)
			time.Sleep(3 * time.Second)
			continue
		}
		if err := c.post(ctx, "/v4.0.0/libpod/exec/"+execResp.ID+"/start", map[string]any{"Detach": true}, nil); err != nil {
			time.Sleep(3 * time.Second)
			continue
		}
		time.Sleep(500 * time.Millisecond)
		var inspect struct {
			ExitCode int  `json:"ExitCode"`
			Running  bool `json:"Running"`
		}
		if err := c.get(ctx, "/v4.0.0/libpod/exec/"+execResp.ID+"/json", &inspect); err == nil && !inspect.Running && inspect.ExitCode == 0 {
			logger.Debug("WaitForMariaDB: ready in %s", containerName)
			return nil
		}
		time.Sleep(3 * time.Second)
	}
	logger.Error("WaitForMariaDB: timed out waiting for %s", containerName)
	return fmt.Errorf("timed out waiting for MariaDB to be ready")
}

// EnsureMariaDBUser creates the site database, user, and grants if they do not already exist.
func (c *Client) EnsureMariaDBUser(ctx context.Context, containerName, rootPass, dbName, dbUser, dbPass string) error {
	sql := fmt.Sprintf(
		"CREATE DATABASE IF NOT EXISTS `%s`; "+
			"CREATE USER IF NOT EXISTS '%s'@'%%' IDENTIFIED BY '%s'; "+
			"GRANT ALL ON `%s`.* TO '%s'@'%%'; "+
			"FLUSH PRIVILEGES;",
		dbName, dbUser, dbPass, dbName, dbUser,
	)
	spec := map[string]any{
		"AttachStdout": true,
		"AttachStderr": true,
		"Detach":       false,
		"Cmd":          []string{"mariadb", "--host=127.0.0.1", "--port=3306", "-u", "root", "-p" + rootPass, "-e", sql},
	}
	var execResp struct {
		ID string `json:"Id"`
	}
	if err := c.post(ctx, "/v4.0.0/libpod/containers/"+containerName+"/exec", spec, &execResp); err != nil {
		return fmt.Errorf("EnsureMariaDBUser: create exec in %s: %w", containerName, err)
	}
	if err := c.post(ctx, "/v4.0.0/libpod/exec/"+execResp.ID+"/start", map[string]any{"Detach": false}, nil); err != nil {
		return fmt.Errorf("EnsureMariaDBUser: start exec in %s: %w", containerName, err)
	}
	deadline := time.Now().Add(30 * time.Second)
	var inspect struct {
		ExitCode int  `json:"ExitCode"`
		Running  bool `json:"Running"`
	}
	for time.Now().Before(deadline) {
		time.Sleep(500 * time.Millisecond)
		if err := c.get(ctx, "/v4.0.0/libpod/exec/"+execResp.ID+"/json", &inspect); err != nil {
			return fmt.Errorf("EnsureMariaDBUser: inspect exec in %s: %w", containerName, err)
		}
		if !inspect.Running {
			break
		}
	}
	if inspect.Running {
		return fmt.Errorf("EnsureMariaDBUser: timed out in %s", containerName)
	}
	if inspect.ExitCode != 0 {
		return fmt.Errorf("EnsureMariaDBUser: SQL exec exited %d in %s", inspect.ExitCode, containerName)
	}
	logger.Debug("EnsureMariaDBUser: user '%s' and database '%s' ensured in %s", dbUser, dbName, containerName)
	return nil
}

// NetworkName returns the canonical per-site Podman network name. Each site
// gets its own network so a compromised site cannot reach another site's
// containers over a shared bridge.
func NetworkName(siteName string) string {
	return PodName(siteName) + "-net"
}
