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
	Name         string    `json:"name"`
	PortMappings []PortMap `json:"portmappings"`
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
	Name         string            `json:"name"`
	Image        string            `json:"image"`
	Pod          string            `json:"pod"`
	Env          map[string]string `json:"env"`
	Mounts       []Mount           `json:"mounts"`
	PortMappings []PortMap         `json:"portmappings,omitempty"`
	CapAdd       []string          `json:"cap_add"`
	CapDrop      []string          `json:"cap_drop"`
	SecOpts      []string          `json:"security_opt"`
	Entrypoint   []string          `json:"entrypoint,omitempty"`
	Command      []string          `json:"command,omitempty"`
	ReadOnlyFS   bool              `json:"read_only_rootfs,omitempty"`
	WorkingDir   string            `json:"work_dir,omitempty"`
	User         string            `json:"user,omitempty"`
	NetNS        NetworkNamespace  `json:"netns,omitempty"`
}

// Mount represents a bind mount or volume mount for a container, specifying the source path on the host, the destination path in the container, the type of mount, and any additional options
type Mount struct {
	Type        string   `json:"type"`
	Source      string   `json:"source"`
	Destination string   `json:"destination"`
	Options     []string `json:"options,omitempty"`
}

// ContainerCreateResponse represents the response from the container creation endpoint, containing the new container's ID
type ContainerCreateResponse struct {
	ID string `json:"Id"`
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

	// create the pod with the specified name and port mappings
	spec := PodSpec{Name: name, PortMappings: ports}

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

// PullImage pulls a container image only if it does not already exist locally
func (c *Client) PullImage(ctx context.Context, image string) error {

	// check if the image already exists locally by sending a request to the image exists endpoint and handle any errors that occur
	checkPath := "/v4.0.0/libpod/images/" + url.QueryEscape(image) + "/exists"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://d"+checkPath, nil)
	if err != nil {
		logger.Error("failed to create request to check if image %s exists: %v", image, err)
		return err
	}

	// if the request succeeds and returns a 204 status code, the image already exists locally, so log that and return nil to skip pulling
	resp, err := c.http.Do(req)
	if err == nil {
		resp.Body.Close()
		if resp.StatusCode == 204 {
			logger.Debug("image already exists, skipping pull: %s", image)
			return nil
		}
	}

	logger.Debug("pulling image: %s", image)

	// setup the request to pull the image by sending a POST request to the image pull endpoint with the reference query parameter set to the image name and quiet mode enabled, and handle any errors that occur
	path := "/v4.0.0/libpod/images/pull?reference=" + url.QueryEscape(image) + "&quiet=true"
	req, err = http.NewRequestWithContext(ctx, http.MethodPost, "http://d"+path, nil)
	if err != nil {
		logger.Error("failed to create request to pull image %s: %v", image, err)
		return err
	}

	// execute the request to pull the image and handle any errors that occur, ensuring that the response body is fully read and closed to prevent resource leaks, and check the response status code to confirm that the pull was successful
	resp, err = c.http.Do(req)
	if err != nil {
		logger.Error("failed to pull image %s: %v", image, err)
		return err
	}
	defer resp.Body.Close()

	// read the response body and discard it to prevent resource leaks
	io.Copy(io.Discard, resp.Body)
	if resp.StatusCode != 200 {
		logger.Error("failed to pull image %s: status %d", image, resp.StatusCode)
		return fmt.Errorf("failed to pull image %s: status %d", image, resp.StatusCode)
	}

	// log the successful pull of the image with its name and return nil to indicate success
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
