// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package podman

import (
	"bufio"
	"bytes"
	"context"
	"encoding/binary"
	"fmt"
	"io"
	"net"

	"podnest/internal/logger"
)

// ExecResult holds the captured output and exit status of an exec invocation.
type ExecResult struct {
	Stdout   []byte
	Stderr   []byte
	ExitCode int
}

// ExecCapture creates and runs an argv command inside the named container,
// capturing stdout and stderr and returning the exit code. The user argument
// runs the command as that user — pass a numeric "uid" or "uid:gid" to run as
// a specific site UID, or "" for the container default. cmd is passed as a
// discrete argv slice, so no shell parsing occurs and no injection is possible.
func (c *Client) ExecCapture(ctx context.Context, container, user string, cmd []string) (*ExecResult, error) {

	// create the exec instance with both output streams attached
	spec := map[string]any{
		"AttachStdout": true,
		"AttachStderr": true,
		"Cmd":          cmd,
	}

	var execResp struct {
		ID string `json:"Id"`
	}
	if err := c.post(ctx, "/v4.0.0/libpod/containers/"+container+"/exec", spec, &execResp); err != nil {
		logger.Error("ExecCapture: failed to create exec in %s for cmd %v: %v", container, cmd, err)
		return nil, err
	}

	// start the exec attached (Detach:false) and read the hijacked multiplexed stream
	startSpec := map[string]any{"Detach": false}
	if user != "" {
		startSpec["User"] = user
	}
	body, err := c.StreamPost(ctx, "/v4.0.0/libpod/exec/"+execResp.ID+"/start", startSpec)
	if err != nil {
		logger.Error("ExecCapture: failed to start exec %s in %s: %v", execResp.ID, container, err)
		return nil, err
	}
	defer body.Close()

	// demultiplex the stdout/stderr frames into separate buffers
	stdout, stderr, err := demuxStream(body)
	if err != nil {
		logger.Error("ExecCapture: failed to read exec stream %s in %s: %v", execResp.ID, container, err)
		return nil, err
	}

	// inspect the exec instance to retrieve the exit code now that it has finished
	var inspect struct {
		ExitCode int `json:"ExitCode"`
	}
	if err := c.get(ctx, "/v4.0.0/libpod/exec/"+execResp.ID+"/json", &inspect); err != nil {
		logger.Error("ExecCapture: failed to inspect exec %s in %s: %v", execResp.ID, container, err)
		return nil, err
	}

	logger.Debug("ExecCapture: %v in %s exited %d", cmd, container, inspect.ExitCode)
	return &ExecResult{Stdout: stdout, Stderr: stderr, ExitCode: inspect.ExitCode}, nil
}

// demuxStream reads a Docker/Podman multiplexed attach stream and splits it into
// stdout and stderr. Each frame is an 8-byte header — byte 0 is the stream type
// (1=stdout, 2=stderr), bytes 4-7 are the big-endian payload length — followed by
// that many payload bytes.
func demuxStream(r io.Reader) (stdout, stderr []byte, err error) {

	// read frame by frame until the stream ends
	header := make([]byte, 8)
	for {

		// read the 8-byte frame header; clean EOF ends the loop
		if _, err = io.ReadFull(r, header); err != nil {
			if err == io.EOF {
				return stdout, stderr, nil
			}
			return stdout, stderr, err
		}

		// extract the payload length and read exactly that many bytes
		n := binary.BigEndian.Uint32(header[4:8])
		if n == 0 {
			continue
		}
		payload := make([]byte, n)
		if _, err = io.ReadFull(r, payload); err != nil {
			return stdout, stderr, err
		}

		// route the payload to the correct buffer based on the stream type
		switch header[0] {
		case 1:
			stdout = append(stdout, payload...)
		case 2:
			stderr = append(stderr, payload...)
		default:
			return stdout, stderr, fmt.Errorf("unknown stream type %d in exec frame", header[0])
		}
	}
}

// ExecStream creates and runs an argv command inside the named container, piping
// the supplied reader to the command's stdin and capturing stdout/stderr for
// error reporting. Used for write and upload operations where the command reads
// file content from stdin (e.g. "tee {path}"). Runs as user when non-empty.
func (c *Client) ExecStream(ctx context.Context, container, user string, cmd []string, stdin io.Reader) (*ExecResult, error) {

	// create the exec instance with stdin and both output streams attached
	spec := map[string]any{
		"AttachStdin":  true,
		"AttachStdout": true,
		"AttachStderr": true,
		"Cmd":          cmd,
	}

	var execResp struct {
		ID string `json:"Id"`
	}
	if err := c.post(ctx, "/v4.0.0/libpod/containers/"+container+"/exec", spec, &execResp); err != nil {
		logger.Error("ExecStream: failed to create exec in %s for cmd %v: %v", container, cmd, err)
		return nil, err
	}

	// dial the podman socket directly — the start endpoint hijacks the connection
	// into a full-duplex stream, which the pooled http client cannot expose
	conn, err := (&net.Dialer{}).DialContext(ctx, "unix", c.socketPath)
	if err != nil {
		logger.Error("ExecStream: failed to dial podman socket: %v", err)
		return nil, err
	}
	defer conn.Close()

	// close the connection if the context is cancelled while streaming
	done := make(chan struct{})
	defer close(done)
	go func() {
		select {
		case <-ctx.Done():
			conn.Close()
		case <-done:
		}
	}()

	// write the raw HTTP request to start the exec attached
	startBody := []byte(`{"Detach":false}`)
	if user != "" {
		startBody = []byte(`{"Detach":false,"User":"` + user + `"}`)
	}
	req := fmt.Sprintf(
		"POST /v4.0.0/libpod/exec/%s/start HTTP/1.1\r\nHost: d\r\nContent-Type: application/json\r\nContent-Length: %d\r\nConnection: Upgrade\r\nUpgrade: tcp\r\n\r\n",
		execResp.ID, len(startBody),
	)
	if _, err := conn.Write(append([]byte(req), startBody...)); err != nil {
		logger.Error("ExecStream: failed to write start request for exec %s: %v", execResp.ID, err)
		return nil, err
	}

	// consume the HTTP response headers up to the blank line; the remainder of
	// the buffered reader is the hijacked multiplexed output stream
	br := bufio.NewReader(conn)
	for {
		line, err := br.ReadString('\n')
		if err != nil {
			logger.Error("ExecStream: failed to read response headers for exec %s: %v", execResp.ID, err)
			return nil, err
		}
		if line == "\r\n" || line == "\n" {
			break
		}
	}

	// pipe stdin into the command, then half-close the write side so the command
	// receives EOF and can finish
	if stdin != nil {
		if _, err := io.Copy(conn, stdin); err != nil {
			logger.Error("ExecStream: failed to write stdin for exec %s: %v", execResp.ID, err)
			return nil, err
		}
	}
	if uc, ok := conn.(*net.UnixConn); ok {
		if err := uc.CloseWrite(); err != nil {
			logger.Warn("ExecStream: failed to half-close stdin for exec %s: %v", execResp.ID, err)
		}
	}

	// read and demultiplex the remaining output frames
	stdout, stderr, err := demuxStream(br)
	if err != nil {
		logger.Error("ExecStream: failed to read exec stream %s in %s: %v", execResp.ID, container, err)
		return nil, err
	}

	// inspect the exec instance for the final exit code
	var inspect struct {
		ExitCode int `json:"ExitCode"`
	}
	if err := c.get(ctx, "/v4.0.0/libpod/exec/"+execResp.ID+"/json", &inspect); err != nil {
		logger.Error("ExecStream: failed to inspect exec %s in %s: %v", execResp.ID, container, err)
		return nil, err
	}

	logger.Debug("ExecStream: %v in %s exited %d", cmd, container, inspect.ExitCode)
	return &ExecResult{Stdout: stdout, Stderr: stderr, ExitCode: inspect.ExitCode}, nil
}

// stderrCap bounds how much stderr is retained from a streaming exec for error
// reporting, since its stdout is written straight through to the caller.
const stderrCap = 8 << 10 // 8 KiB

// ExecStreamOut creates and runs an argv command inside the named container as
// the given user, writing the command's stdout directly to w as frames arrive —
// nothing is buffered — while retaining a bounded amount of stderr for error
// reporting. Used for downloads, where a large or binary file streams straight
// to the HTTP response.
func (c *Client) ExecStreamOut(ctx context.Context, container, user string, cmd []string, w io.Writer) (*ExecResult, error) {

	// create the exec instance with both output streams attached
	spec := map[string]any{
		"AttachStdout": true,
		"AttachStderr": true,
		"Cmd":          cmd,
	}

	var execResp struct {
		ID string `json:"Id"`
	}
	if err := c.post(ctx, "/v4.0.0/libpod/containers/"+container+"/exec", spec, &execResp); err != nil {
		logger.Error("ExecStreamOut: failed to create exec in %s for cmd %v: %v", container, cmd, err)
		return nil, err
	}

	startSpec := map[string]any{"Detach": false}
	if user != "" {
		startSpec["User"] = user
	}
	body, err := c.StreamPost(ctx, "/v4.0.0/libpod/exec/"+execResp.ID+"/start", startSpec)
	if err != nil {
		logger.Error("ExecStreamOut: failed to start exec %s in %s: %v", execResp.ID, container, err)
		return nil, err
	}
	defer body.Close()

	// demux frames, writing stdout straight through and capping stderr
	var stderr bytes.Buffer
	if err := demuxTo(body, w, &stderr); err != nil {
		logger.Error("ExecStreamOut: failed to stream exec %s in %s: %v", execResp.ID, container, err)
		return nil, err
	}

	// inspect for the exit code now that the stream has drained
	var inspect struct {
		ExitCode int `json:"ExitCode"`
	}
	if err := c.get(ctx, "/v4.0.0/libpod/exec/"+execResp.ID+"/json", &inspect); err != nil {
		logger.Error("ExecStreamOut: failed to inspect exec %s in %s: %v", execResp.ID, container, err)
		return nil, err
	}

	logger.Debug("ExecStreamOut: %v in %s exited %d", cmd, container, inspect.ExitCode)
	return &ExecResult{Stderr: stderr.Bytes(), ExitCode: inspect.ExitCode}, nil
}

// demuxTo reads a multiplexed attach stream, writing stdout-type payloads to
// stdout as they arrive and appending stderr-type payloads to stderr up to
// stderrCap bytes. Frame format matches demuxStream.
func demuxTo(r io.Reader, stdout io.Writer, stderr *bytes.Buffer) error {

	// read frame by frame until the stream ends
	header := make([]byte, 8)
	for {

		// read the 8-byte frame header; clean EOF ends the loop
		if _, err := io.ReadFull(r, header); err != nil {
			if err == io.EOF {
				return nil
			}
			return err
		}

		// extract the payload length and read exactly that many bytes
		n := binary.BigEndian.Uint32(header[4:8])
		if n == 0 {
			continue
		}
		payload := make([]byte, n)
		if _, err := io.ReadFull(r, payload); err != nil {
			return err
		}

		// route stdout straight to the writer; retain a bounded amount of stderr
		switch header[0] {
		case 1:
			if _, err := stdout.Write(payload); err != nil {
				return err
			}
		case 2:
			if room := stderrCap - stderr.Len(); room > 0 {
				if len(payload) > room {
					payload = payload[:room]
				}
				stderr.Write(payload)
			}
		default:
			return fmt.Errorf("unknown stream type %d in exec frame", header[0])
		}
	}
}
