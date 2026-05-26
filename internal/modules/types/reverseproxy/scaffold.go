package reverseproxy

import "podnest/internal/modules"

// scaffoldDir is a no-op; reverse proxy sites require no filesystem structure
// or config files on disk.
func scaffoldDir(_ string, _ modules.ScaffoldConfig) error {
	return nil
}
