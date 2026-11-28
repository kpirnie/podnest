// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package server

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path"
	"strconv"
	"strings"
	"syscall"

	"podnest/internal/logger"
)

type memoryThrottle struct {
	name  string
	file  *os.File
	limit string
}

func (s *Server) applyMemoryThrottle(ctx context.Context, name string, usage uint64, pct float64) (memoryThrottle, error) {
	// Retain the existing floor and leave small containers alone.
	const floor = 64 * 1024 * 1024
	if usage <= floor {
		return memoryThrottle{}, nil
	}
	id, cgroup, err := s.podman.ContainerCgroup(ctx, name)
	if err != nil {
		return memoryThrottle{}, err
	}

	// Refuse shared pod cgroups and paths that do not identify this container.
	base := path.Base(cgroup)
	if !path.IsAbs(cgroup) || (base != "libpod-"+id && base != "libpod-"+id+".scope" && base != "libpod-payload-"+id) {
		return memoryThrottle{}, fmt.Errorf("no dedicated cgroup")
	}
	root, err := os.OpenRoot("/sys/fs/cgroup")
	if err != nil {
		return memoryThrottle{}, err
	}
	defer root.Close()

	// Keep the descriptor so recovery cannot write to a recreated container.
	file, err := root.OpenFile(strings.TrimPrefix(path.Join(cgroup, "memory.high"), "/"), os.O_RDWR|syscall.O_NONBLOCK, 0)
	if err != nil {
		return memoryThrottle{}, err
	}
	value, err := io.ReadAll(io.LimitReader(file, 32))
	if err != nil || strings.TrimSpace(string(value)) != "max" {
		file.Close()
		return memoryThrottle{}, err
	}

	target := max(floor, uint64(float64(usage)*(1-pct/100)))
	pageSize := uint64(os.Getpagesize())
	limit := strconv.FormatUint(target/pageSize*pageSize, 10)
	if _, err := file.WriteAt([]byte(limit), 0); err != nil {
		file.Close()
		return memoryThrottle{}, err
	}
	return memoryThrottle{name: name, file: file, limit: limit}, nil
}

func liftMemoryThrottles(throttles []memoryThrottle) []memoryThrottle {
	pending := throttles[:0]
	for _, throttle := range throttles {
		// An operator may have replaced our value since the breach.
		value, err := io.ReadAll(io.NewSectionReader(throttle.file, 0, 32))
		if err == nil && strings.TrimSpace(string(value)) == throttle.limit {
			_, err = throttle.file.WriteAt([]byte("max"), 0)
		}
		if err != nil && !errors.Is(err, syscall.ENODEV) && !errors.Is(err, os.ErrNotExist) {
			logger.Warn("resourceWatcher: restore soft limit for %s: %v", throttle.name, err)
			pending = append(pending, throttle)
			continue
		}
		throttle.file.Close()
	}
	return pending
}
