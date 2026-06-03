package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base32"
	"encoding/binary"
	"fmt"
	"net/url"
	"strings"
	"time"
)

const (
	TOTPPendingCookieName = "podnest_totp_pending"
	TOTPPendingDuration   = 5 * time.Minute
)

// GenerateTOTPSecret returns a base32-encoded 160-bit random secret.
func GenerateTOTPSecret() (string, error) {
	b := make([]byte, 20)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(b), nil
}

// GenerateBackupCodes returns n single-use recovery codes in XXXX-XXXX format.
// Uses an unambiguous alphabet (no 0/O, 1/I/l) for easy transcription.
func GenerateBackupCodes(n int) ([]string, error) {
	const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	codes := make([]string, n)
	buf := make([]byte, 8)
	for i := range codes {
		if _, err := rand.Read(buf); err != nil {
			return nil, err
		}
		var b [8]byte
		for j, v := range buf {
			b[j] = alpha[int(v)%len(alpha)]
		}
		codes[i] = fmt.Sprintf("%s-%s", string(b[:4]), string(b[4:]))
	}
	return codes, nil
}

// totpCode computes the TOTP 6-digit code for a given secret and time.
func totpCode(secret string, t time.Time) (string, error) {
	upper := strings.ToUpper(strings.TrimSpace(secret))

	// Try without padding first, then with padding as fallback
	key, err := base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(upper)
	if err != nil {
		key, err = base32.StdEncoding.DecodeString(upper)
		if err != nil {
			return "", fmt.Errorf("invalid TOTP secret: %w", err)
		}
	}

	// TOTP code is based on the number of 30-second intervals since Unix epoch
	counter := uint64(t.Unix()) / 30
	var buf [8]byte
	binary.BigEndian.PutUint64(buf[:], counter)

	// Compute HMAC-SHA1 of the counter using the secret key
	mac := hmac.New(sha1.New, key)
	mac.Write(buf[:])
	h := mac.Sum(nil)

	// Dynamic truncation to extract a 4-byte code from the HMAC result
	offset := h[len(h)-1] & 0x0f
	code := (uint32(h[offset])&0x7f)<<24 |
		uint32(h[offset+1])<<16 |
		uint32(h[offset+2])<<8 |
		uint32(h[offset+3])

	// Return the code as a zero-padded 6-digit string
	return fmt.Sprintf("%06d", code%1_000_000), nil
}

// VerifyTOTP checks the user-supplied code against the current ±1 TOTP windows.
func VerifyTOTP(secret, userCode string) bool {
	now := time.Now()
	for _, delta := range []time.Duration{-30 * time.Second, 0, 30 * time.Second} {
		expected, err := totpCode(secret, now.Add(delta))
		if err != nil {
			return false
		}
		if hmac.Equal([]byte(expected), []byte(userCode)) {
			return true
		}
	}
	return false
}

// TOTPProvisioningURI returns the otpauth:// URI for authenticator apps.
func TOTPProvisioningURI(secret, account, issuer string) string {
	return fmt.Sprintf("otpauth://totp/%s%%3A%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30",
		url.QueryEscape(issuer),
		url.QueryEscape(account),
		secret,
		url.QueryEscape(issuer),
	)
}
