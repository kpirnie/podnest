package podman

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"podnest/internal/logger"
	"strings"
	"time"
)

// Client talks to the Podman REST API over a Unix socket
type Client struct {
	http         *http.Client
	streamClient *http.Client // no timeout — context drives cancellation for streams
	socketPath   string
}

// New returns a Podman REST API client bound to the given socket path
func New(socketPath string) *Client {

	// setup the transport to use the unix socket
	transport := &http.Transport{
		DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
			return (&net.Dialer{}).DialContext(ctx, "unix", socketPath)
		},
	}

	// create the HTTP client with a reasonable timeout
	logger.Debug("Creating Podman client with socket: %s", socketPath)
	return &Client{
		http: &http.Client{
			Transport: transport,
			Timeout:   120 * time.Second,
		},
		// streamClient has no deadline — it relies entirely on the request
		// context for cancellation so log tails and WP-CLI streams are not
		// cut off at 120 s
		streamClient: &http.Client{
			Transport: transport,
			Timeout:   0,
		},
		socketPath: socketPath,
	}
}

// get performs a GET request to the Podman API and decodes the JSON response into the provided output struct
func (c *Client) get(ctx context.Context, path string, out any) error {

	// setup a GET request to the Podman API
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://d"+path, nil)
	if err != nil {
		logger.Error("Failed to create GET request for path %s: %v", path, err)
		return err
	}

	// execute the request and check for errors
	resp, err := c.http.Do(req)
	if err != nil {
		logger.Error("Failed to execute GET request for path %s: %v", path, err)
		return err
	}
	defer resp.Body.Close()

	// check for non-2xx status codes
	if err := checkStatus(resp); err != nil {
		logger.Error("Podman API returned error for GET %s: %v", path, err)
		return err
	}

	// decode the JSON response if an output struct was provided
	if out != nil {
		logger.Debug("Decoding JSON response for GET %s", path)
		return json.NewDecoder(resp.Body).Decode(out)
	}

	// no output struct, just return success
	logger.Debug("GET %s completed successfully with no output", path)
	return nil
}

// post performs a POST request to the Podman API with an optional JSON body and decodes the JSON response into the provided output struct
func (c *Client) post(ctx context.Context, path string, body any, out any) error {

	// setup the request body if provided
	var r io.Reader
	if body != nil {

		// encode the body as JSON
		b, err := json.Marshal(body)
		if err != nil {
			logger.Error("Failed to marshal request body for POST %s: %v", path, err)
			return err
		}

		// log the request body for debugging
		logger.Debug("POST %s with body: %s", path, string(b))
		r = strings.NewReader(string(b))
	}

	// setup the POST request to the Podman API
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "http://d"+path, r)
	if err != nil {
		logger.Error("Failed to create POST request for path %s: %v", path, err)
		return err
	}

	// set the content type if we have a body
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	// execute the request and check for errors
	resp, err := c.http.Do(req)
	if err != nil {
		logger.Error("Failed to execute POST request for path %s: %v", path, err)
		return err
	}
	defer resp.Body.Close()

	// check for non-2xx status codes
	if err := checkStatus(resp); err != nil {
		logger.Error("Podman API returned error for POST %s: %v", path, err)
		return err
	}

	// decode the JSON response if an output struct was provided
	if out != nil {

		// read the entire response body for debugging
		b, err := io.ReadAll(resp.Body)
		if err != nil {
			logger.Error("Failed to read response body for POST %s: %v", path, err)
			return err
		}

		// log the raw response body for debugging
		if len(b) == 0 {
			logger.Debug("POST %s completed successfully with empty response body", path)
			return nil
		}

		// log the raw response body for debugging
		logger.Debug("POST %s response body: %s", path, string(b))
		return json.Unmarshal(b, out)
	}

	// no output struct, just return success
	logger.Debug("POST %s completed successfully with no output", path)
	return nil
}

// delete performs a DELETE request to the Podman API and checks for errors
func (c *Client) delete(ctx context.Context, path string) error {

	// setup the DELETE request to the Podman API
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, "http://d"+path, nil)
	if err != nil {
		logger.Error("Failed to create DELETE request for path %s: %v", path, err)
		return err
	}

	// execute the request and check for errors
	resp, err := c.http.Do(req)
	if err != nil {
		logger.Error("Failed to execute DELETE request for path %s: %v", path, err)
		return err
	}
	defer resp.Body.Close()

	// check for non-2xx status codes
	logger.Debug("DELETE %s completed with status code %d", path, resp.StatusCode)
	return checkStatus(resp)
}

// StreamResponse returns the raw response body for streaming endpoints (logs)
func (c *Client) stream(ctx context.Context, path string) (io.ReadCloser, error) {

	// setup a GET request to the Podman API for streaming
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://d"+path, nil)
	if err != nil {
		logger.Error("Failed to create stream request for path %s: %v", path, err)
		return nil, err
	}

	// execute the request and check for errors
	resp, err := c.streamClient.Do(req)
	if err != nil {
		logger.Error("Failed to execute stream request for path %s: %v", path, err)
		return nil, err
	}

	// check for non-2xx status codes before returning the body
	if err := checkStatus(resp); err != nil {
		resp.Body.Close()
		logger.Error("Podman API returned error for stream %s: %v", path, err)
		return nil, err
	}

	// return the response body for streaming, caller is responsible for closing it
	logger.Debug("Stream %s started successfully", path)
	return resp.Body, nil
}

// checkStatus checks the HTTP response status code and returns an error if it's not a 2xx code
func checkStatus(resp *http.Response) error {

	// 2xx status codes indicate success, anything else is an error
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		logger.Debug("Received successful response with status code %d", resp.StatusCode)
		return nil
	}

	// read the response body for error details
	body, _ := io.ReadAll(resp.Body)
	logger.Error("Podman API error %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	return fmt.Errorf("podman API error %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
}

// StreamRaw is a public wrapper around the stream method for streaming endpoints
func (c *Client) StreamRaw(ctx context.Context, path string) (io.ReadCloser, error) {
	return c.stream(ctx, path)
}

// GetJSON is a public wrapper around the get method for GET requests that return JSON responses
func (c *Client) GetJSON(ctx context.Context, path string, out any) error {
	return c.get(ctx, path, out)
}

// PostJSON is a public wrapper around the post method
func (c *Client) PostJSON(ctx context.Context, path string, body any, out any) error {
	return c.post(ctx, path, body, out)
}

// ContainerExists returns true if the named container exists and is running
func (c *Client) ContainerExists(ctx context.Context, name string) (bool, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://d/v4.0.0/libpod/containers/"+name+"/exists", nil)
	if err != nil {
		logger.Error("failed to create container exists request for %s: %v", name, err)
		return false, err
	}
	resp, err := c.http.Do(req)
	if err != nil {
		logger.Error("failed to check if container %s exists: %v", name, err)
		return false, err
	}
	defer resp.Body.Close()
	logger.Debug("checked if container %s exists: %t", name, resp.StatusCode == 204)
	return resp.StatusCode == 204, nil
}

// StreamPost performs a POST request and returns the raw response body for
// streaming endpoints such as exec start — caller is responsible for closing.
func (c *Client) StreamPost(ctx context.Context, path string, body any) (io.ReadCloser, error) {
	b, err := json.Marshal(body)
	if err != nil {
		logger.Error("StreamPost: failed to marshal body for %s: %v", path, err)
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "http://d"+path, strings.NewReader(string(b)))
	if err != nil {
		logger.Error("StreamPost: failed to create request for %s: %v", path, err)
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.streamClient.Do(req)
	if err != nil {
		logger.Error("StreamPost: failed to execute request for %s: %v", path, err)
		return nil, err
	}

	if err := checkStatus(resp); err != nil {
		resp.Body.Close()
		logger.Error("StreamPost: API error for %s: %v", path, err)
		return nil, err
	}

	logger.Debug("StreamPost: stream started for %s", path)
	return resp.Body, nil
}
