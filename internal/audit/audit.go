// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package audit

import (
	"context"
	"database/sql"
	"encoding/json"
	"regexp"
	"time"

	"podnest/internal/db"
	"podnest/internal/logger"
	"podnest/internal/models"
)

// sensitiveKeys matches JSON key names whose values must be masked before persistence.
// Two alternations: separator-bounded generic words, and compound forms that carry no
// separator (apikey, secretkey) which the bounded pattern would otherwise miss.
var sensitiveKeys = regexp.MustCompile(`(?i)((^|[_\-.])(password|pass|passwd|pwd|secret|token|key|auth|credential|credentials|totp|otp|mfa|seed|salt|signature|private|cert|certificate|cookie|bearer|dsn|passphrase|recovery)([_\-.]|$))|(apikey|apitoken|apisecret|accesskey|secretkey|privatekey|authtoken|sessiontoken|refreshtoken|connectionstring)`)

// sensitiveRegex is the fallback pattern for non-JSON bodies — same terms as the logger.
var sensitiveRegex = regexp.MustCompile(`(?i)(password|pass|passwd|pwd|secret|token|key|auth|credential|credentials|totp|otp|mfa|seed|salt|signature|passphrase|recovery|apikey|apitoken|accesskey|secretkey|privatekey|authtoken|connectionstring)([=:\s"]+)([^\s"&,]+)`)

// auditCh is the async drain channel — callers enqueue and return immediately.
var auditCh = make(chan models.AuditEntry, 2048)

// Recorder holds a reference to the database for the background drain goroutine.
type Recorder struct {
	db *sql.DB
}

// contextKey is the type for audit context keys
type contextKey struct{}

// WithStateContext attaches prior/new state strings to a request context
// so the outermost audit middleware can include them in its record.
func WithStateContext(ctx context.Context, prior, next string) context.Context {
	return context.WithValue(ctx, contextKey{}, [2]string{prior, next})
}

// StateFromContext retrieves prior/new state strings from the context.
// Returns empty strings if not set.
func StateFromContext(ctx context.Context) (prior, new string) {
	v, _ := ctx.Value(contextKey{}).([2]string)
	return v[0], v[1]
}

// New creates a Recorder and starts the background drain goroutine.
// Call once at startup; the goroutine runs for the lifetime of the process.
func New(database *sql.DB) *Recorder {
	r := &Recorder{db: database}
	go r.drain()
	return r
}

// drain reads from auditCh and writes each entry to the database.
// Runs in its own goroutine; a failed insert is logged and dropped — never retried.
func (r *Recorder) drain() {
	for e := range auditCh {
		if err := db.InsertAuditLog(r.db, e); err != nil {
			logger.Error("audit: drain: failed to persist entry: %v", err)
		}
	}
}

// Record enqueues an audit entry for async persistence.
// Masking is applied here, before the entry touches the channel.
// Drops silently if the channel is full to protect request throughput.
func Record(e models.AuditEntry) {
	e.Details = MaskString(e.Details)
	e.PriorState = MaskString(e.PriorState)
	e.NewState = MaskString(e.NewState)
	if e.TS.IsZero() {
		e.TS = time.Now().UTC()
	}
	select {
	case auditCh <- e:
	default:
		logger.Warn("audit: channel full — entry dropped: %s %s", e.Method, e.Action)
	}
}

// MaskString masks sensitive values in a string.
// If the string is valid JSON, masks by key name; otherwise falls back to regex.
func MaskString(s string) string {
	if s == "" {
		return s
	}
	// attempt JSON key masking first
	if masked, ok := maskJSON(s); ok {
		return masked
	}
	// fallback: regex replacement on raw string
	return maskLeafString(s)
}

// maskJSON unmarshals a JSON string, redacts values for sensitive keys at any
// nesting depth, and re-marshals. Returns (masked, true) on success.
func maskJSON(s string) (string, bool) {
	var v interface{}
	if err := json.Unmarshal([]byte(s), &v); err != nil {
		return s, false
	}
	masked := maskValue(v)
	b, err := json.Marshal(masked)
	if err != nil {
		return s, false
	}
	return string(b), true
}

// maskValue recursively walks a decoded JSON value and replaces sensitive leaf values.
func maskValue(v interface{}) interface{} {
	switch val := v.(type) {
	case map[string]interface{}:
		// walk every key; mask the value if the key matches sensitiveKeys
		out := make(map[string]interface{}, len(val))
		for k, child := range val {
			if sensitiveKeys.MatchString(k) {
				out[k] = "*****"
			} else {
				out[k] = maskValue(child)
			}
		}
		return out
	case []interface{}:
		// recurse into array elements
		out := make([]interface{}, len(val))
		for i, item := range val {
			out[i] = maskValue(item)
		}
		return out
	case string:
		// a non-JSON request body arrives as a string leaf under "body", which
		// makes maskJSON succeed and short-circuit the fallback in MaskString —
		// run the pattern here so form and CSV bodies are not stored in the clear
		return maskLeafString(val)
	default:
		return val
	}
}

// RecordWithState enqueues an audit entry that carries before/after state snapshots.
// Called from handlers that have already captured prior state at the db layer.
// Masking is applied before the entry touches the channel.
func RecordWithState(e models.AuditEntry, priorState, newState string) {
	e.PriorState = priorState
	e.NewState = newState
	Record(e)
}

// maskLeafString applies the fallback pattern to a single string value.
// Shared by MaskString and the string case in maskValue.
func maskLeafString(s string) string {
	return sensitiveRegex.ReplaceAllStringFunc(s, func(match string) string {
		sub := sensitiveRegex.FindStringSubmatch(match)
		if len(sub) < 4 {
			return match
		}
		return sub[1] + sub[2] + "*****"
	})
}
