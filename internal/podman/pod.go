// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package podman

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"podnest/internal/logger"
	"podnest/internal/models"
	"strings"
	"time"
)

// pod specification for creating a new pod with port mappings
type PodSpec struct {
	Name         string              `json:"name"`
	PortMappings []PortMap           `json:"portmappings"`
	Netns        *NetworkNamespace   `json:"netns,omitempty"` // must be bridge mode when Networks is set (required rootless)
	Networks     map[string]struct{} `json:"Networks,omitempty"`
}

// PortMap defines a mapping from a container port to a host port with a specific protocol
type PortMap struct {
	ContainerPort uint16 `json:"container_port"`
	HostPort      uint16 `json:"host_port"`
	Protocol      string `json:"protocol"`
}

// response from pod creation endpoint, containing the new pod's ID
type PodCreateResponse struct {
	ID string `json:"Id"`
}

// PodInspect represents the detailed state of a pod and its containers as returned by the inspect endpoint
type PodInspect struct {
	ID         string         `json:"Id"`
	Name       string         `json:"Name"`
	State      string         `json:"State"`
	Containers []PodContainer `json:"Containers"`
}

// PodContainer represents a container within a pod, including its ID, name, and current state
type PodContainer struct {
	ID    string `json:"Id"`
	Name  string `json:"Name"`
	State string `json:"State"`
}

// NetworkMode holds the network namespace configuration for a container
type NetworkNamespace struct {
	NSMode string `json:"nsmode"`
}

// ContainerSpec defines the configuration for creating a new container within a pod, including image, environment variables, mounts, capabilities, and command
type ContainerSpec struct {
	Name         string             `json:"name"`
	Image        string             `json:"image"`
	Pod          string             `json:"pod"`
	Env          map[string]string  `json:"env"`
	Mounts       []Mount            `json:"mounts"`
	PortMappings []PortMap          `json:"portmappings,omitempty"`
	CapAdd       []string           `json:"cap_add"`
	CapDrop      []string           `json:"cap_drop"`
	SecOpts      []string           `json:"security_opt"`
	Entrypoint   []string           `json:"entrypoint,omitempty"`
	Command      []string           `json:"command,omitempty"`
	ReadOnlyFS   bool               `json:"read_only_filesystem,omitempty"`
	WorkingDir   string             `json:"work_dir,omitempty"`
	User         string             `json:"user,omitempty"`
	NetNS        NetworkNamespace   `json:"netns,omitempty"`
	Healthcheck  *HealthcheckConfig `json:"healthconfig,omitempty"`
}

// Mount represents a bind mount or volume mount for a container, specifying the source path on the host, the destination path in the container, the type of mount, and any additional options
type Mount struct {
	Type        string   `json:"type"`
	Source      string   `json:"source"`
	Destination string   `json:"destination"`
	Options     []string `json:"options,omitempty"`
}

// HealthcheckConfig defines the health check command and timing for a container.
// Interval, Timeout, and StartPeriod are in nanoseconds (use time.Duration values).
type HealthcheckConfig struct {
	Test        []string      `json:"Test"`
	Interval    time.Duration `json:"Interval"`
	Timeout     time.Duration `json:"Timeout"`
	Retries     int           `json:"Retries"`
	StartPeriod time.Duration `json:"StartPeriod"`
}

// ContainerCreateResponse represents the response from the container creation endpoint, containing the new container's ID
type ContainerCreateResponse struct {
	ID string `json:"Id"`
}

// ContainerStat holds resource usage for a single container.
type ContainerStat struct {
	Name     string
	CPUPerc  float64
	MemUsage uint64
	MemLimit uint64
	MemPerc  float64
}

// CreatePod creates a new pod with the given name and host port mapping
func (c *Client) CreatePod(ctx context.Context, name string, site *models.Site) (string, error) {

	// define the default port mappings for the pod, including the main site port
	ports := []PortMap{
		{ContainerPort: 80, HostPort: uint16(site.Port), Protocol: "tcp"},
	}

	// if the site is not static, also add a port mapping for phpMyAdmin
	if site.SiteType != models.SiteTypeStatic {
		ports = append(ports, PortMap{
			ContainerPort: models.PHPMyAdminPort,
			HostPort:      uint16(site.PMAPort),
			Protocol:      "tcp",
		})
	}

	// ensure this site's dedicated network exists before attaching it
	netName := NetworkName(site.Name)
	if err := c.EnsurePodmanNetwork(ctx, netName); err != nil {
		logger.Error("failed to ensure network %s for pod %s: %v", netName, name, err)
		return "", err
	}

	// if the pod already exists, reuse it in place rather than failing — this lets
	// recreate refresh container images without tearing down the pod, its netns, or
	// its published ports, minimizing downtime during an image update
	if exists, _ := c.PodExists(ctx, name); exists {
		inspect, err := c.InspectPod(ctx, name)
		if err != nil {
			logger.Error("failed to inspect existing pod %s for reuse: %v", name, err)
			return "", err
		}
		logger.Debug("pod %s already exists — reusing ID %s", name, inspect.ID)
		return inspect.ID, nil
	}

	// create the pod with the specified name and port mappings; the infra
	// container's netns must be bridge mode for the custom network to attach —
	// rootless Podman otherwise defaults to pasta/slirp4netns and rejects it
	spec := PodSpec{
		Name:         name,
		PortMappings: ports,
		Netns:        &NetworkNamespace{NSMode: "bridge"},
		Networks:     map[string]struct{}{netName: {}},
	}

	// hold the response from the pod creation endpoint, which will contain the new pod's ID
	var resp PodCreateResponse

	// send the request to create the pod and handle any errors that occur
	if err := c.post(ctx, "/v4.0.0/libpod/pods/create", spec, &resp); err != nil {
		logger.Error("failed to create pod %s: %v", name, err)
		return "", err
	}

	// log the successful creation of the pod with its name and ID, and return the new pod's ID
	logger.Debug("created pod %s with ID %s", name, resp.ID)
	return resp.ID, nil
}

// StartPod starts all containers in a pod
func (c *Client) StartPod(ctx context.Context, name string) error {

	// send the request to start the pod and handle any errors that occur
	if err := c.post(ctx, "/v4.0.0/libpod/pods/"+name+"/start", nil, nil); err != nil {
		logger.Error("failed to start pod %s: %v", name, err)
		return err
	}

	// log the successful start of the pod with its name and return nil to indicate success
	logger.Debug("started pod %s", name)
	return nil
}

// StopPod stops all containers in a pod
func (c *Client) StopPod(ctx context.Context, name string) error {

	// send the request to stop the pod and handle any errors that occur
	if err := c.post(ctx, "/v4.0.0/libpod/pods/"+name+"/stop", nil, nil); err != nil {
		logger.Error("failed to stop pod %s: %v", name, err)
		return err
	}

	// log the successful stop of the pod with its name and return nil to indicate success
	logger.Debug("stopped pod %s", name)
	return nil
}

// RestartPod restarts all containers in a pod
func (c *Client) RestartPod(ctx context.Context, name string) error {

	// send the request to restart the pod and handle any errors that occur
	if err := c.post(ctx, "/v4.0.0/libpod/pods/"+name+"/restart", nil, nil); err != nil {
		logger.Error("failed to restart pod %s: %v", name, err)
		return err
	}

	// log the successful restart of the pod with its name and return nil to indicate success
	logger.Debug("restarted pod %s", name)
	return nil
}

// RemovePod force-removes a pod and all its containers
func (c *Client) RemovePod(ctx context.Context, name string) error {

	// send the request to remove the pod with the force option and handle any errors that occur
	if err := c.delete(ctx, "/v4.0.0/libpod/pods/"+name+"?force=true"); err != nil {
		logger.Error("failed to remove pod %s: %v", name, err)
		return err
	}

	// log the successful removal of the pod with its name and return nil to indicate success
	logger.Debug("removed pod %s", name)
	return nil
}

// InspectPod returns the current state of a pod and its containers
func (c *Client) InspectPod(ctx context.Context, name string) (*PodInspect, error) {

	// hold the response from the pod inspect endpoint, which will contain the detailed state of the pod and its containers
	var inspect PodInspect

	// send the request to inspect the pod and handle any errors that occur
	if err := c.get(ctx, "/v4.0.0/libpod/pods/"+name+"/json", &inspect); err != nil {
		logger.Error("failed to inspect pod %s: %v", name, err)
		return nil, fmt.Errorf("inspect pod %s: %w", name, err)
	}

	// log the successful inspection of the pod with its name and return the detailed state of the pod
	logger.Debug("inspected pod %s", name)
	return &inspect, nil
}

// PodExists returns true if the named pod exists
func (c *Client) PodExists(ctx context.Context, name string) (bool, error) {

	// send a request to the pod exists endpoint and handle any errors that occur
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet,
		"http://d/v4.0.0/libpod/pods/"+name+"/exists", nil)
	resp, err := c.http.Do(req)
	if err != nil {
		logger.Error("failed to check if pod %s exists: %v", name, err)
		return false, err
	}
	defer resp.Body.Close()

	// return true if the response status code is 204 (No Content), indicating that the pod exists, otherwise return false
	logger.Debug("checked if pod %s exists: %t", name, resp.StatusCode == 204)
	return resp.StatusCode == 204, nil

}

// CreateContainer creates a container within an existing pod
func (c *Client) CreateContainer(ctx context.Context, spec ContainerSpec) (string, error) {

	// replace any pre-existing container of the same name so creation doubles as an
	// in-place image update: stop and remove the old container, then create the new
	// one from the freshly pulled image (no-op on a clean create where none exists)
	if exists, _ := c.ContainerExists(ctx, spec.Name); exists {
		if err := c.RemoveContainer(ctx, spec.Name); err != nil {
			logger.Error("failed to remove existing container %s before recreate: %v", spec.Name, err)
			return "", err
		}
	}

	// hold the response from the container creation endpoint, which will contain the new container's ID
	var resp ContainerCreateResponse

	// send the request to create the container with the specified configuration and handle any errors that occur
	if err := c.post(ctx, "/v4.0.0/libpod/containers/create", spec, &resp); err != nil {
		logger.Error("failed to create container %s in pod %s: %v", spec.Name, spec.Pod, err)
		return "", err
	}

	/// log the successful creation of the container with its name, pod, and ID, and return the new container's ID
	logger.Debug("created container %s in pod %s with ID %s", spec.Name, spec.Pod, resp.ID)
	return resp.ID, nil
}

// StartContainer starts a single container by name or ID
func (c *Client) StartContainer(ctx context.Context, name string) error {

	// hold the response from the container start endpoint, which is not expected to contain any meaningful data
	var out any

	// send the request to start the container and handle any errors that occur
	if err := c.post(ctx, "/v4.0.0/libpod/containers/"+name+"/start", nil, &out); err != nil {
		logger.Error("failed to start container %s: %v", name, err)
		return err
	}

	// log the successful start of the container with its name and return nil to indicate success
	logger.Debug("started container %s", name)
	return nil
}

// RemoveContainer force-removes a single container by name or ID; force=true
// gracefully stops the container (honoring its stop timeout) before removal, so
// it doubles as the stop+rm step of an in-place image update
func (c *Client) RemoveContainer(ctx context.Context, name string) error {

	// send the request to force-remove the container and handle any errors that occur
	if err := c.delete(ctx, "/v4.0.0/libpod/containers/"+name+"?force=true"); err != nil {
		logger.Error("failed to remove container %s: %v", name, err)
		return err
	}

	// log the successful removal of the container with its name and return nil to indicate success
	logger.Debug("removed container %s", name)
	return nil
}

// PullImage pulls a container image only if the local digest differs from the
// remote registry digest — skipping unnecessary re-pulls when already up to date
func (c *Client) PullImage(ctx context.Context, image string) error {

	// fetch the local image digest if it exists
	var localInspect []struct {
		Digest string `json:"Digest"`
	}
	localDigest := ""
	if err := c.GetJSON(ctx, "/v4.0.0/libpod/images/"+url.QueryEscape(image)+"/json", &localInspect); err == nil && len(localInspect) > 0 {
		localDigest = localInspect[0].Digest
	}

	// fetch the remote manifest digest without pulling the full image
	if localDigest != "" {
		path := "/v4.0.0/libpod/manifests/" + url.QueryEscape(image) + "/json"
		var remote struct {
			Digest string `json:"Digest"`
		}
		if err := c.GetJSON(ctx, path, &remote); err == nil && remote.Digest != "" {
			if remote.Digest == localDigest {
				logger.Debug("image already up to date, skipping pull: %s", image)
				return nil
			}
			logger.Debug("image digest changed (%s → %s), pulling: %s", localDigest[:12], remote.Digest[:12], image)
		}
	}

	logger.Debug("pulling image: %s", image)

	path := "/v4.0.0/libpod/images/pull?reference=" + url.QueryEscape(image) + "&quiet=true"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "http://d"+path, nil)
	if err != nil {
		logger.Error("failed to create request to pull image %s: %v", image, err)
		return err
	}

	resp, err := c.http.Do(req)
	if err != nil {
		logger.Error("failed to pull image %s: %v", image, err)
		return err
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)
	if resp.StatusCode != 200 {
		logger.Error("failed to pull image %s: status %d", image, resp.StatusCode)
		return fmt.Errorf("failed to pull image %s: status %d", image, resp.StatusCode)
	}

	logger.Debug("pulled image: %s", image)
	return nil
}

// StreamLogs streams container logs and writes them to the provided writer
func (c *Client) StreamLogs(ctx context.Context, containerName string, tail int, w io.Writer) error {

	// setup the request to stream the container logs by sending a GET request to the container logs endpoint with the follow, stdout, stderr, and tail query parameters set appropriately, and handle any errors that occur
	path := fmt.Sprintf(
		"/v4.0.0/libpod/containers/%s/logs?follow=true&stdout=true&stderr=true&tail=%d",
		containerName, tail,
	)

	// execute the request to stream the logs and handle any errors that occur, ensuring that the response body is properly closed when done, and copy the log output from the response body to the provided writer
	body, err := c.stream(ctx, path)
	if err != nil {
		logger.Error("failed to stream logs for container %s: %v", containerName, err)
		return err
	}
	defer body.Close()

	// copy the log output from the response body to the provided writer and return any errors that occur during the copy operation
	_, err = io.Copy(w, body)
	if err != nil {
		logger.Error("error while streaming logs for container %s: %v", containerName, err)
	}

	// log the successful streaming of the logs for the container with its name and return any errors that occurred during the copy operation
	logger.Debug("finished streaming logs for container %s", containerName)
	return err
}

// FlushCache deletes all files under the nginx fastcgi cache directory in the nginx container
func (c *Client) FlushCache(ctx context.Context, containerName string, cachePath string) error {

	// setup the command specification for the exec instance to delete all files under the nginx fastcgi cache directory, ensuring that stdout and stderr are attached to capture any output or errors from the command execution
	spec := map[string]any{
		"AttachStdout": true,
		"AttachStderr": true,
		"Cmd":          []string{"find", cachePath, "-type", "f", "-delete"},
	}
	var execResp struct {
		ID string `json:"Id"`
	}

	// send the request to create the exec instance for the specified command and handle any errors that occur, then send the request to start the exec instance with the detach option enabled and handle any errors that occur
	if err := c.post(ctx,
		"/v4.0.0/libpod/containers/"+containerName+"/exec",
		spec, &execResp,
	); err != nil {
		logger.Error("failed to create exec instance in container %s: %v", containerName, err)
		return err
	}

	// send the request to start the exec instance with the detach option enabled and handle any errors that occur, then log the successful flush of the cache for the container with its name and return nil to indicate success
	if err := c.post(ctx,
		"/v4.0.0/libpod/exec/"+execResp.ID+"/start",
		map[string]any{"Detach": true}, nil,
	); err != nil {
		logger.Error("failed to start exec instance in container %s: %v", containerName, err)
		return err
	}

	// log the successful flush of the cache for the container with its name and return nil to indicate success
	logger.Debug("flushed cache for container %s", containerName)
	return nil

}

// PruneOrphanedPods removes any pods prefixed wp- that are in a degraded or created state
func (c *Client) PruneOrphanedPods(ctx context.Context) error {

	// loop through the pod statuses of "degraded" and "created" to find any pods that are in those states, and for each status, send a request to list the pods with a filter for that status, then loop through the returned pods and delete any that have a name starting with "wp-", logging any errors that occur during the deletion process
	for _, status := range []string{"degraded", "created"} {
		var pods []struct {
			Name string `json:"Name"`
		}

		// send the request to list the pods with a filter for the current status and handle any errors that occur, then loop through the returned pods and delete any that have a name starting with "wp-", logging any errors that occur during the deletion process
		if err := c.get(ctx, "/v4.0.0/libpod/pods/json?filters="+
			url.QueryEscape(`{"status":["`+status+`"]}`), &pods); err != nil {
			logger.Error("failed to list pods with status %s: %v", status, err)
			continue
		}

		// loop through the returned pods and delete any that have a name starting with "wp-", logging any errors that occur during the deletion process
		for _, p := range pods {
			if strings.HasPrefix(p.Name, "wp-") {
				if err := c.delete(ctx, "/v4.0.0/libpod/pods/"+p.Name+"?force=true"); err != nil {
					logger.Error("failed to delete pod %s: %v", p.Name, err)
				}
			}
		}
	}

	// log the completion of the prune operation for orphaned pods and return nil to indicate success
	logger.Debug("pruned orphaned pods")
	return nil
}

// PruneImages removes dangling (untagged) images from the local store —
// the API equivalent of `podman image prune -f`. Returns the number of
// images reclaimed so callers can log the result.
func (c *Client) PruneImages(ctx context.Context) (int, error) {

	// send the prune request to the libpod images prune endpoint; with no
	// filters supplied the daemon removes only dangling images, matching the
	// default `podman image prune` behavior, and decode the list of removed
	// images so we can report how many were reclaimed
	var pruned []struct {
		Id string `json:"Id"`
	}
	if err := c.post(ctx, "/v4.0.0/libpod/images/prune", nil, &pruned); err != nil {
		logger.Error("failed to prune dangling images: %v", err)
		return 0, err
	}

	// log the completion of the prune operation with the count of reclaimed images and return that count to the caller
	logger.Debug("pruned %d dangling image(s)", len(pruned))
	return len(pruned), nil
}

// FlushPHPCache clears the OPcache by executing opcache_reset() inside the PHP container
func (c *Client) FlushPHPCache(ctx context.Context, containerName string) error {

	// run php -r 'opcache_reset();' inside the php-fpm container to clear the opcode cache
	spec := map[string]any{
		"AttachStdout": true,
		"AttachStderr": true,
		"Cmd":          []string{"php", "-r", "opcache_reset();"},
	}
	var execResp struct {
		ID string `json:"Id"`
	}

	if err := c.post(ctx,
		"/v4.0.0/libpod/containers/"+containerName+"/exec",
		spec, &execResp,
	); err != nil {
		logger.Error("failed to create php opcache flush exec in %s: %v", containerName, err)
		return err
	}

	if err := c.post(ctx,
		"/v4.0.0/libpod/exec/"+execResp.ID+"/start",
		map[string]any{"Detach": true}, nil,
	); err != nil {
		logger.Error("failed to start php opcache flush exec in %s: %v", containerName, err)
		return err
	}

	logger.Debug("flushed PHP opcache for container %s", containerName)
	return nil
}

// FlushVarnishCache issues a ban-all to the Varnish container via varnishadm,
// purging all cached objects
func (c *Client) FlushVarnishCache(ctx context.Context, containerName string) error {
	spec := map[string]any{
		"AttachStdout": false,
		"AttachStderr": false,
		"Detach":       true,
		"Cmd":          []string{"varnishadm", "ban", "req.url", "~", "."},
	}
	var execResp struct {
		ID string `json:"Id"`
	}
	if err := c.post(ctx, "/v4.0.0/libpod/containers/"+containerName+"/exec", spec, &execResp); err != nil {
		logger.Error("FlushVarnishCache: failed to create exec in %s: %v", containerName, err)
		return err
	}
	if err := c.post(ctx, "/v4.0.0/libpod/exec/"+execResp.ID+"/start", map[string]any{"Detach": true}, nil); err != nil {
		logger.Error("FlushVarnishCache: failed to start exec in %s: %v", containerName, err)
		return err
	}
	logger.Debug("FlushVarnishCache: ban issued in %s", containerName)
	return nil
}

// FlushRedisCache runs FLUSHALL inside the Redis container to clear all cached data
func (c *Client) FlushRedisCache(ctx context.Context, containerName, password string) error {
	spec := map[string]any{
		"AttachStdout": false,
		"AttachStderr": false,
		"Detach":       true,
		"Cmd":          []string{"redis-cli", "-a", password, "--no-auth-warning", "FLUSHALL"},
	}
	var execResp struct {
		ID string `json:"Id"`
	}
	if err := c.post(ctx, "/v4.0.0/libpod/containers/"+containerName+"/exec", spec, &execResp); err != nil {
		logger.Error("FlushRedisCache: failed to create exec in %s: %v", containerName, err)
		return err
	}
	if err := c.post(ctx, "/v4.0.0/libpod/exec/"+execResp.ID+"/start", map[string]any{"Detach": true}, nil); err != nil {
		logger.Error("FlushRedisCache: failed to start exec in %s: %v", containerName, err)
		return err
	}
	logger.Debug("FlushRedisCache: FLUSHALL issued in %s", containerName)
	return nil
}

// KillContainer sends a signal to a running container; used to trigger
// hot-reloads without a full pod recreate (e.g. SIGHUP for nginx, SIGUSR2 for php-fpm)
func (c *Client) KillContainer(ctx context.Context, name, signal string) error {
	path := fmt.Sprintf("/v4.0.0/libpod/containers/%s/kill?signal=%s", name, signal)
	if err := c.post(ctx, path, nil, nil); err != nil {
		logger.Warn("KillContainer: failed to send %s to %s: %v", signal, name, err)
		return err
	}
	logger.Debug("KillContainer: sent %s to %s", signal, name)
	return nil
}

// RestartContainer stops and restarts a single container without affecting the pod;
// used to apply config changes that cannot be hot-reloaded (e.g. redis, mariadb)
func (c *Client) RestartContainer(ctx context.Context, name string) error {
	path := fmt.Sprintf("/v4.0.0/libpod/containers/%s/restart", name)
	if err := c.post(ctx, path, nil, nil); err != nil {
		logger.Warn("RestartContainer: failed to restart %s: %v", name, err)
		return err
	}
	logger.Debug("RestartContainer: restarted %s", name)
	return nil
}

// ReloadVarnish hot-reloads the VCL config inside a running Varnish container
// by loading the updated VCL file and switching to it via varnishadm
func (c *Client) ReloadVarnish(ctx context.Context, name string) error {
	// use a timestamp-based label so each reload gets a unique VCL name
	label := fmt.Sprintf("podnest_%d", time.Now().Unix())

	for _, cmd := range [][]string{
		{"varnishadm", "vcl.load", label, "/etc/varnish/default.vcl"},
		{"varnishadm", "vcl.use", label},
	} {
		spec := map[string]any{
			"AttachStdout": false,
			"AttachStderr": false,
			"Detach":       true,
			"Cmd":          cmd,
		}
		var execResp struct {
			ID string `json:"Id"`
		}
		if err := c.post(ctx, "/v4.0.0/libpod/containers/"+name+"/exec", spec, &execResp); err != nil {
			logger.Warn("ReloadVarnish: failed to create exec for %v in %s: %v", cmd, name, err)
			return err
		}
		if err := c.post(ctx, "/v4.0.0/libpod/exec/"+execResp.ID+"/start", map[string]any{"Detach": true}, nil); err != nil {
			logger.Warn("ReloadVarnish: failed to start exec for %v in %s: %v", cmd, name, err)
			return err
		}
	}

	logger.Debug("ReloadVarnish: hot-reloaded VCL in %s (label: %s)", name, label)
	return nil
}

// ContainerHealthState returns the Podman health status string for a container:
// "healthy", "unhealthy", "starting", or "none" (no healthcheck defined).
func (c *Client) ContainerHealthState(ctx context.Context, name string) (string, error) {
	var inspect struct {
		State struct {
			Health struct {
				Status string `json:"Status"`
			} `json:"Health"`
		} `json:"State"`
	}
	if err := c.get(ctx, "/v4.0.0/libpod/containers/"+name+"/json", &inspect); err != nil {
		return "none", err
	}
	if inspect.State.Health.Status == "" {
		return "none", nil
	}
	return inspect.State.Health.Status, nil
}

// UpdateContainerResources applies or removes a memory limit on a running container
// via the Docker-compat update endpoint. Set limitBytes=0 to remove the limit.
func (c *Client) UpdateContainerResources(ctx context.Context, name string, limitBytes int64) error {
	body := map[string]any{
		"Memory":     limitBytes,
		"MemorySwap": -1, // -1 = unlimited swap; prevents swap-based OOM circumvention
	}
	if limitBytes == 0 {
		body["MemorySwap"] = 0
	}
	if err := c.post(ctx, "/v1.41/containers/"+name+"/update", body, nil); err != nil {
		logger.Error("UpdateContainerResources: failed for %s: %v", name, err)
		return err
	}
	logger.Debug("UpdateContainerResources: set limit=%d on %s", limitBytes, name)
	return nil
}

// ContainerStats returns resource usage for the named containers. The stats
// endpoint accepts a repeated containers filter, so the host-wide payload is
// never serialized for callers that only want a few pods.
func (c *Client) ContainerStats(ctx context.Context, names []string) ([]ContainerStat, error) {
	if len(names) == 0 {
		return nil, nil
	}

	var raw struct {
		Stats []struct {
			Name     string  `json:"Name"`
			CPU      float64 `json:"CPU"`
			MemUsage uint64  `json:"MemUsage"`
			MemLimit uint64  `json:"MemLimit"`
			MemPerc  float64 `json:"MemPerc"`
		} `json:"Stats"`
	}

	var path strings.Builder
	path.WriteString("/v4.0.0/libpod/containers/stats?stream=false")
	for _, n := range names {
		path.WriteString("&containers=")
		path.WriteString(url.QueryEscape(n))
	}

	if err := c.get(ctx, path.String(), &raw); err != nil {
		return nil, err
	}

	out := make([]ContainerStat, 0, len(raw.Stats))
	for _, r := range raw.Stats {
		out = append(out, ContainerStat{
			Name:     r.Name,
			CPUPerc:  r.CPU,
			MemUsage: r.MemUsage,
			MemLimit: r.MemLimit,
			MemPerc:  r.MemPerc,
		})
	}
	return out, nil
}
