// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package auth

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/argon2"
)

// totpEncPrefix marks a TOTP secret encrypted with a password-derived key
const totpEncPrefix = "enc:pw1:"

// ErrTOTPKeyUnavailable is returned when an encrypted secret cannot be decrypted
// because the password-derived key is not in the keystore (e.g. after a restart)
var ErrTOTPKeyUnavailable = errors.New("totp key unavailable")

// totpKeyEntry holds a derived key and its expiry in the in-memory keystore
type totpKeyEntry struct {
	key []byte
	exp time.Time
}

// totpKeys holds password-derived keys in memory only, keyed by pending token
// or session ID — never persisted, so a DB read alone cannot recover secrets
var (
	totpKeysMu sync.Mutex
	totpKeys   = map[string]totpKeyEntry{}
)

// StashTOTPKey stores a derived key under the given ID for the given TTL
func StashTOTPKey(id string, key []byte, ttl time.Duration) {
	if id == "" || key == nil {
		return
	}
	totpKeysMu.Lock()
	defer totpKeysMu.Unlock()

	// prune anything expired while we hold the lock — keeps the map tiny
	now := time.Now()
	for k, e := range totpKeys {
		if now.After(e.exp) {
			delete(totpKeys, k)
		}
	}
	totpKeys[id] = totpKeyEntry{key: key, exp: now.Add(ttl)}
}

// GetTOTPKey returns the derived key stashed under the given ID, or nil
func GetTOTPKey(id string) []byte {
	totpKeysMu.Lock()
	defer totpKeysMu.Unlock()
	e, ok := totpKeys[id]
	if !ok || time.Now().After(e.exp) {
		return nil
	}
	return e.key
}

// DropTOTPKey removes the derived key stashed under the given ID
func DropTOTPKey(id string) {
	totpKeysMu.Lock()
	defer totpKeysMu.Unlock()
	delete(totpKeys, id)
}

// GenerateTOTPSalt returns a random base64 salt for key derivation
func GenerateTOTPSalt() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(b), nil
}

// DeriveTOTPKey derives a 32-byte AES key from the user's password and salt
func DeriveTOTPKey(password, salt string) []byte {
	return argon2.IDKey([]byte(password), []byte(salt), 1, 64*1024, 4, 32)
}

// IsEncryptedTOTPSecret reports whether a stored secret is encrypted at rest
func IsEncryptedTOTPSecret(s string) bool {
	return strings.HasPrefix(s, totpEncPrefix)
}

// EncryptTOTPSecret encrypts a plaintext secret with the derived key using AES-256-GCM
func EncryptTOTPSecret(key []byte, secret string) (string, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}
	ct := gcm.Seal(nonce, nonce, []byte(secret), nil)
	return totpEncPrefix + base64.StdEncoding.EncodeToString(ct), nil
}

// DecryptTOTPSecret returns the plaintext secret; unencrypted values pass through
func DecryptTOTPSecret(key []byte, stored string) (string, error) {
	if !IsEncryptedTOTPSecret(stored) {
		return stored, nil
	}
	if key == nil {
		return "", ErrTOTPKeyUnavailable
	}
	raw, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(stored, totpEncPrefix))
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	if len(raw) < gcm.NonceSize() {
		return "", errors.New("invalid encrypted totp secret")
	}
	pt, err := gcm.Open(nil, raw[:gcm.NonceSize()], raw[gcm.NonceSize():], nil)
	if err != nil {
		return "", err
	}
	return string(pt), nil
}
