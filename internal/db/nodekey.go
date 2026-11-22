// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package db

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"strings"

	"podnest/internal/logger"
	"podnest/internal/models"
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

// ValidateNodeKey checks the installation key without exposing it in errors.
func ValidateNodeKey() error {
	if nodeKEK() == nil {
		return fmt.Errorf("PN_SECRET_KEY must contain 64 hexadecimal characters from a random 32-byte key; restore the original key from ~/.pn.env or your protected copy. Generate a new key only for an installation without encrypted state")
	}
	return nil
}

// nodeKEK preserves the original text-based derivation used by stored secrets.
func nodeKEK() []byte {
	v := strings.TrimSpace(os.Getenv(NodeKeyEnv))
	if len(v) != 64 {
		return nil
	}
	if _, err := hex.DecodeString(v); err != nil {
		return nil
	}
	sum := sha256.Sum256([]byte(v))
	return sum[:]
}

// VerifyNodeKey checks existing encrypted credentials before binding the database
// to its key. The verifier also detects replacement when no credentials exist.
func VerifyNodeKey(database *sql.DB) error {
	if err := ValidateNodeKey(); err != nil {
		return err
	}
	mismatch := errors.New("PN_SECRET_KEY cannot unlock this database; restore the original key from ~/.pn.env or your protected copy")
	tx, err := database.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`CREATE TABLE IF NOT EXISTS kppn_instance_key (
		id INTEGER PRIMARY KEY CHECK (id = 1), verifier BLOB NOT NULL
	)`); err != nil {
		return err
	}
	expected := nodeKeyVerifier(nodeKEK())
	var stored []byte
	switch err := tx.QueryRow(`SELECT verifier FROM kppn_instance_key WHERE id = 1`).Scan(&stored); err {
	case nil:
		if !hmac.Equal(stored, expected) {
			return mismatch
		}
		return tx.Commit()
	case sql.ErrNoRows:
	default:
		return err
	}

	rows, err := tx.Query(`SELECT 0, priv_key FROM kppn_nodes WHERE substr(priv_key, 1, ?) = ?
		UNION ALL SELECT 0, new_key FROM kppn_node_ops WHERE substr(new_key, 1, ?) = ?
		UNION ALL SELECT site_id, value FROM kppn_configs WHERE type = ? AND key = 'password'`,
		len(nodeKeyPrefix), nodeKeyPrefix, len(nodeKeyPrefix), nodeKeyPrefix, models.ConfigSMTP)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var siteID int64
		var value string
		if err := rows.Scan(&siteID, &value); err != nil {
			return err
		}
		if siteID == 0 {
			_, err = openNodeKey(value)
		} else {
			_, err = openSMTPPassword(siteID, value)
		}
		if err != nil {
			return mismatch
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if err := rows.Close(); err != nil {
		return err
	}
	if _, err := tx.Exec(`INSERT INTO kppn_instance_key (id, verifier) VALUES (1, ?)`, expected); err != nil {
		return err
	}
	return tx.Commit()
}

// VerifyRecoveredNodeKey checks the sealed key verifier in a recovered database.
func VerifyRecoveredNodeKey(database *sql.DB, key string) error {
	var stored []byte
	if err := database.QueryRow(`SELECT verifier FROM kppn_instance_key WHERE id = 1`).Scan(&stored); err != nil {
		return fmt.Errorf("read recovered instance key verifier: %w", err)
	}
	digest := sha256.Sum256([]byte(key))
	if !hmac.Equal(stored, nodeKeyVerifier(digest[:])) {
		return ErrNodeKeyUnavailable
	}
	return nil
}

func nodeKeyVerifier(kek []byte) []byte {
	mac := hmac.New(sha256.New, kek)
	mac.Write([]byte("podnest:instance-key-verifier:v1"))
	return mac.Sum(nil)
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
