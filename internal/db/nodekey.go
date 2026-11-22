// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package db

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"errors"
	"os"
	"strings"

	"podnest/internal/logger"
)

// NodeKeyEnv names the environment variable holding the secret that encrypts
// node link private keys at rest. pdnctl writes it to ~/.pn.env, outside the
// app dir, so a copy of the database alone cannot sign hops into a child.
const NodeKeyEnv = "PN_SECRET_KEY"

// nodeKeyPrefix marks a node private key sealed with the PN_SECRET_KEY-derived key.
const nodeKeyPrefix = "enc:nk1:"

// ErrNodeKeyUnavailable is returned when a sealed node key cannot be opened
// because PN_SECRET_KEY is missing or no longer matches.
var ErrNodeKeyUnavailable = errors.New("node key unavailable: PN_SECRET_KEY missing or changed")

// nodeKEK derives the 256-bit key-encryption key from PN_SECRET_KEY, or nil when unset.
func nodeKEK() []byte {
	v := strings.TrimSpace(os.Getenv(NodeKeyEnv))
	if v == "" {
		return nil
	}
	sum := sha256.Sum256([]byte(v))
	return sum[:]
}

// nodeGCM returns the AES-256-GCM AEAD for the given key-encryption key.
func nodeGCM(kek []byte) (cipher.AEAD, error) {
	block, err := aes.NewCipher(kek)
	if err != nil {
		return nil, err
	}
	return cipher.NewGCM(block)
}

// sealNodeKey encrypts a node private key for storage. Empty and already
// sealed values are returned unchanged.
func sealNodeKey(plain string) (string, error) {
	kek := nodeKEK()
	if plain == "" || strings.HasPrefix(plain, nodeKeyPrefix) {
		return plain, nil
	}
	if kek == nil {
		return "", ErrNodeKeyUnavailable
	}
	gcm, err := nodeGCM(kek)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}
	return nodeKeyPrefix + base64.StdEncoding.EncodeToString(gcm.Seal(nonce, nonce, []byte(plain), nil)), nil
}

// openNodeKey decrypts a stored node private key. Plaintext values pass through.
func openNodeKey(stored string) (string, error) {
	if !strings.HasPrefix(stored, nodeKeyPrefix) {
		return stored, nil
	}
	kek := nodeKEK()
	if kek == nil {
		return "", ErrNodeKeyUnavailable
	}
	raw, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(stored, nodeKeyPrefix))
	if err != nil {
		return "", ErrNodeKeyUnavailable
	}
	gcm, err := nodeGCM(kek)
	if err != nil {
		return "", err
	}
	if len(raw) < gcm.NonceSize() {
		return "", ErrNodeKeyUnavailable
	}
	pt, err := gcm.Open(nil, raw[:gcm.NonceSize()], raw[gcm.NonceSize():], nil)
	if err != nil {
		return "", ErrNodeKeyUnavailable
	}
	return string(pt), nil
}

// SealNodeKeys encrypts any node private keys still stored in plaintext, both on
// node links and on pending re-key operations.
func SealNodeKeys(db *sql.DB) error {
	if nodeKEK() == nil {
		return ErrNodeKeyUnavailable
	}
	if err := sealNodeKeyColumn(db, `SELECT id, priv_key FROM kppn_nodes WHERE priv_key != '' AND priv_key NOT LIKE ?`,
		`UPDATE kppn_nodes SET priv_key = ? WHERE id = ?`); err != nil {
		return err
	}
	return sealNodeKeyColumn(db, `SELECT id, new_key FROM kppn_node_ops WHERE new_key != '' AND new_key NOT LIKE ?`,
		`UPDATE kppn_node_ops SET new_key = ? WHERE id = ?`)
}

// sealNodeKeyColumn seals every plaintext key the select returns and writes it
// back with the update. Rows are collected before writing so no read cursor is
// held open across the updates.
func sealNodeKeyColumn(db *sql.DB, sel, upd string) error {
	rows, err := db.Query(sel, nodeKeyPrefix+"%")
	if err != nil {
		logger.Error("SealNodeKeys: failed to query plaintext keys: %v", err)
		return err
	}
	type pending struct {
		id  int64
		key string
	}
	var todo []pending
	for rows.Next() {
		var p pending
		if err := rows.Scan(&p.id, &p.key); err != nil {
			rows.Close()
			logger.Error("SealNodeKeys: failed to scan key row: %v", err)
			return err
		}
		todo = append(todo, p)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		logger.Error("SealNodeKeys: failed reading key rows: %v", err)
		return err
	}

	for _, p := range todo {
		sealed, err := sealNodeKey(p.key)
		if err != nil {
			logger.Error("SealNodeKeys: failed to seal key %d: %v", p.id, err)
			return err
		}
		if _, err := db.Exec(upd, sealed, p.id); err != nil {
			logger.Error("SealNodeKeys: failed to store sealed key %d: %v", p.id, err)
			return err
		}
	}
	if len(todo) > 0 {
		logger.Info("SealNodeKeys: encrypted %d plaintext node key(s)", len(todo))
	}
	return nil
}
