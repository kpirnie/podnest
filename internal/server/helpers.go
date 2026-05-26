package server

import (
	"bufio"
	"context"
	"io"
	"net/http"
	"os"
	"strings"

	"podnest/internal/apiutil"
	"podnest/internal/logger"
)

// -- JSON response helpers ---------------------------------------------------

// apiJSON writes v as a JSON response body with the given HTTP status code
func apiJSON(w http.ResponseWriter, status int, v any)          { apiutil.JSON(w, status, v) }
func apiError(w http.ResponseWriter, status int, err error)     { apiutil.Error(w, status, err) }
func apiErrorMsg(w http.ResponseWriter, status int, msg string) { apiutil.ErrorMsg(w, status, msg) }

// -- file helpers ------------------------------------------------------------

// writeFile writes content to path with the given file permissions
func writeFile(path, content string, perm os.FileMode) error {
	if err := os.WriteFile(path, []byte(content), perm); err != nil {
		logger.Error("failed to write file %s: %v", path, err)
		return err
	}
	logger.Debug("wrote file %s", path)
	return nil
}

// readEnvValue reads a KEY=VALUE .env file and returns the value for the given key
func readEnvValue(path, key string) (string, error) {

	// open the .env file for reading
	f, err := os.Open(path)
	if err != nil {
		logger.Error("failed to open env file %s: %v", path, err)
		return "", err
	}
	defer f.Close()

	// scan line by line looking for the matching KEY= prefix
	scanner := bufio.NewScanner(f)
	prefix := key + "="
	for scanner.Scan() {
		line := scanner.Text()

		// return the value portion when the key is found
		if strings.HasPrefix(line, prefix) {
			logger.Debug("found key '%s' in %s", key, path)
			return strings.TrimPrefix(line, prefix), nil
		}
	}

	logger.Debug("key '%s' not found in %s", key, path)
	return "", scanner.Err()
}

// -- io pipe helper ----------------------------------------------------------

// io_pipe returns a synchronous in-memory pipe
func io_pipe() (io.Reader, io.WriteCloser) {
	return io.Pipe()
}

// readFull reads exactly len(buf) bytes from r into buf, returning an error
// if fewer bytes are available. Used for parsing multiplexed stream headers.
func readFull(r io.Reader, buf []byte) (int, error) {
	total := 0
	for total < len(buf) {
		n, err := r.Read(buf[total:])
		total += n
		if err != nil {
			return total, err
		}
	}
	return total, nil
}

// downloadFile fetches a URL and writes the response body to the given path.
func downloadFile(ctx context.Context, path, url string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()

	_, err = io.Copy(f, resp.Body)
	return err
}
