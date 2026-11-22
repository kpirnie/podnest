// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package apiutil

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/json"
	"errors"
	"io"
	"mime"
	"net/http"

	"golang.org/x/crypto/scrypt"
)

const (
	migrationVersion     = "PNM1"
	migrationSaltSize    = 16
	migrationLimit       = 4 << 20
	migrationPasswordMax = 1024
)

var errMigration = errors.New("invalid migration package, scope, or passphrase")

// ExportMigration encrypts settings before writing an attachment. The scope is
// authenticated so a package cannot be mistaken for a different settings type.
func ExportMigration(w http.ResponseWriter, r *http.Request, filename, scope string, values map[string]string) {
	var input struct {
		Passphrase string `json:"passphrase"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<10)).Decode(&input); err != nil ||
		len(input.Passphrase) < 12 || len(input.Passphrase) > migrationPasswordMax {
		ErrorMsg(w, http.StatusBadRequest, "use a passphrase of at least 12 bytes")
		return
	}
	payload, err := json.Marshal(values)
	if err != nil || len(payload) > migrationLimit {
		ErrorMsg(w, http.StatusBadRequest, "settings exceed migration size limit")
		return
	}
	header := make([]byte, len(migrationVersion)+migrationSaltSize)
	copy(header, migrationVersion)
	if _, err := rand.Read(header[len(migrationVersion):]); err != nil {
		ErrorMsg(w, http.StatusInternalServerError, "could not encrypt migration package")
		return
	}
	aead, err := migrationAEAD(input.Passphrase, header)
	if err != nil {
		ErrorMsg(w, http.StatusInternalServerError, "could not encrypt migration package")
		return
	}
	// NewGCMWithRandomNonce generates and prefixes a fresh nonce on each seal.
	pkg := aead.Seal(header, nil, payload, []byte(migrationVersion+":"+scope))
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": filename}))
	w.Header().Set("Cache-Control", "no-store")
	_, _ = w.Write(pkg)
}

// ImportMigration authenticates and decodes an uploaded package in memory.
// The passphrase travels in the multipart body and is never persisted.
func ImportMigration(w http.ResponseWriter, r *http.Request, scope string) (map[string]string, error) {
	r.Body = http.MaxBytesReader(w, r.Body, migrationLimit+(64<<10))
	reader, err := r.MultipartReader()
	if err != nil {
		return nil, errMigration
	}
	var pkg []byte
	var passphrase string
	for {
		part, err := reader.NextPart()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, errMigration
		}
		switch part.FormName() {
		case "file":
			if pkg != nil {
				return nil, errMigration
			}
			pkg, err = io.ReadAll(part)
		case "passphrase":
			if passphrase != "" {
				return nil, errMigration
			}
			var value []byte
			value, err = io.ReadAll(io.LimitReader(part, migrationPasswordMax+1))
			passphrase = string(value)
		default:
			return nil, errMigration
		}
		if err != nil {
			return nil, errMigration
		}
	}
	headerSize := len(migrationVersion) + migrationSaltSize
	if len(passphrase) < 12 || len(passphrase) > migrationPasswordMax ||
		len(pkg) < headerSize || string(pkg[:len(migrationVersion)]) != migrationVersion {
		return nil, errMigration
	}
	aead, err := migrationAEAD(passphrase, pkg[:headerSize])
	if err != nil {
		return nil, errMigration
	}
	payload, err := aead.Open(nil, nil, pkg[headerSize:], []byte(migrationVersion+":"+scope))
	if err != nil || len(payload) > migrationLimit {
		return nil, errMigration
	}
	var values map[string]string
	if err := json.Unmarshal(payload, &values); err != nil || values == nil {
		return nil, errMigration
	}
	return values, nil
}

func migrationAEAD(passphrase string, header []byte) (cipher.AEAD, error) {
	key, err := scrypt.Key([]byte(passphrase), header[len(migrationVersion):], 1<<15, 8, 3, 32)
	if err != nil {
		return nil, err
	}
	defer clear(key)
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	return cipher.NewGCMWithRandomNonce(block)
}
