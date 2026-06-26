// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package fileutil

import (
	"bufio"
	"os"
	"strings"

	"podnest/internal/logger"
)

// WriteFile writes content to path with the given file permissions.
func WriteFile(path, content string, perm os.FileMode) error {
	if err := os.WriteFile(path, []byte(content), perm); err != nil {
		logger.Error("failed to write file %s: %v", path, err)
		return err
	}
	logger.Debug("wrote file %s", path)
	return nil
}

// ReadEnvValue reads a KEY=VALUE .env file and returns the value for the given key.
func ReadEnvValue(path, key string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		logger.Error("failed to open env file %s: %v", path, err)
		return "", err
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	prefix := key + "="
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, prefix) {
			logger.Debug("found key '%s' in %s", key, path)
			return strings.TrimPrefix(line, prefix), nil
		}
	}

	logger.Debug("key '%s' not found in %s", key, path)
	return "", scanner.Err()
}
