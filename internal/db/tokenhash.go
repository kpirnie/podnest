// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package db

import (
	"crypto/sha256"
	"encoding/hex"
)

// hashToken returns the storage form of a bearer token. Session IDs, PMA tokens,
// and TOTP pending tokens are all 128-bit random values handed to the client, so
// only the hash is persisted — a read of the DB then yields nothing replayable.
// SHA-256 rather than bcrypt: there is no low-entropy guess to slow down, and
// these run on every authenticated request.
func hashToken(token string) string {
	if token == "" {
		return ""
	}
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
