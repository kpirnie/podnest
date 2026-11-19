// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package db

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"strconv"
	"strings"
)

// smtpPasswordPrefix identifies encrypted SMTP passwords.
const smtpPasswordPrefix = "enc:smtp1:"

// ErrSMTPKeyUnavailable indicates that the encryption key is unavailable.
var ErrSMTPKeyUnavailable = errors.New("SMTP encryption key unavailable")

// ErrSMTPPasswordInvalid indicates an invalid or undecryptable SMTP password.
var ErrSMTPPasswordInvalid = errors.New("SMTP password is invalid or cannot be decrypted")

// sealSMTPPassword encrypts a password using the instance encryption key.
// The site ID is authenticated to prevent ciphertext reuse across sites.
func sealSMTPPassword(siteID int64, plain string) (string, error) {

	if siteID <= 0 || plain == "" || strings.HasPrefix(plain, smtpPasswordPrefix) {
		return "", ErrSMTPPasswordInvalid
	}

	// SMTP passwords must never be stored without encryption.
	kek := nodeKEK()
	if kek == nil {
		return "", ErrSMTPKeyUnavailable
	}

	gcm, err := nodeGCM(kek)
	if err != nil {
		return "", err
	}

	// Generate a unique nonce for each encryption.
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}

	// Bind the encrypted password to its originating site.
	aad := []byte("podnest:smtp:" + strconv.FormatInt(siteID, 10))
	sealed := gcm.Seal(nil, nonce, []byte(plain), aad)

	return smtpPasswordPrefix + base64.StdEncoding.EncodeToString(append(nonce, sealed...)), nil
}

// openSMTPPassword decrypts an SMTP password belonging to the specified site.
func openSMTPPassword(siteID int64, stored string) (string, error) {

	if siteID <= 0 || !strings.HasPrefix(stored, smtpPasswordPrefix) {
		return "", ErrSMTPPasswordInvalid
	}

	kek := nodeKEK()
	if kek == nil {
		return "", ErrSMTPKeyUnavailable
	}

	raw, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(stored, smtpPasswordPrefix))
	if err != nil {
		return "", ErrSMTPPasswordInvalid
	}

	gcm, err := nodeGCM(kek)
	if err != nil {
		return "", err
	}

	if len(raw) < gcm.NonceSize()+gcm.Overhead() {
		return "", ErrSMTPPasswordInvalid
	}

	// Authenticate the originating site before returning plaintext.
	aad := []byte("podnest:smtp:" + strconv.FormatInt(siteID, 10))
	plain, err := gcm.Open(nil, raw[:gcm.NonceSize()], raw[gcm.NonceSize():], aad)
	if err != nil {
		return "", ErrSMTPPasswordInvalid
	}

	return string(plain), nil
}
