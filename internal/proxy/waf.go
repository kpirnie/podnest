package proxy

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	coreruleset "github.com/corazawaf/coraza-coreruleset/v4"
	"github.com/corazawaf/coraza/v3"
	"github.com/corazawaf/coraza/v3/types"

	"podnest/internal/db"
	"podnest/internal/logger"
)

// wafMaxBodyBytes is the maximum request body size inspected per request.
// Bytes beyond this limit are forwarded to the upstream uninspected.
const wafMaxBodyBytes = 1 << 20 // 1 MB

// WAFEngine wraps a compiled Coraza WAF instance and its active operational settings.
type WAFEngine struct {
	waf  coraza.WAF
	mode int  // db.WAFModeDetect or db.WAFModePrevent
	log  bool // whether audit logging is enabled
}

// NewWAFEngine builds a Coraza WAF engine from the given global settings.
// extraExclusions is merged on top of s.Exclusions — pass a per-site exclusion
// list here, or an empty string when building the global engine.
func NewWAFEngine(s db.WAFSettings, extraExclusions, crsDir string) (*WAFEngine, error) {
	directives := fmt.Sprintf(`
Include @coraza.conf-recommended
Include @crs-setup.conf.example
Include @owasp_crs/*.conf
%s`, buildDirectives(s.ParanoiaLevel, mergeExclusions(s.Exclusions, extraExclusions)))

	waf, err := coraza.NewWAF(
		coraza.NewWAFConfig().
			WithRootFS(coreruleset.FS).
			WithErrorCallback(func(mr types.MatchedRule) {
				// log every matched rule for false-positive diagnosis
				logger.Debug("waf: rule matched id=%d raw=%q", mr.Rule().ID(), mr.Rule().Raw())
			}).
			WithDirectives(directives),
	)
	if err != nil {
		logger.Error("waf: engine init failed: %v", err)
		return nil, fmt.Errorf("waf: engine init: %w", err)
	}

	logger.Info("waf: engine ready (mode=%d pl=%d audit=%v)", s.Mode, s.ParanoiaLevel, s.AuditLog)
	return &WAFEngine{waf: waf, mode: s.Mode, log: s.AuditLog}, nil
}

// Inspect runs a Coraza transaction against the incoming request.
// Returns true if the request should proceed to the upstream proxy.
// On a block decision a 403 has already been written to w.
func (e *WAFEngine) Inspect(w http.ResponseWriter, r *http.Request, clientIP string, accessLog *os.File) bool {
	tx := e.waf.NewTransaction()
	defer func() {
		tx.ProcessLogging()
		_ = tx.Close()
	}()

	// connection and URI phase
	tx.ProcessConnection(clientIP, 0, "", 0)
	tx.ProcessURI(r.URL.RequestURI(), r.Method, r.Proto)

	// explicitly populate ARGS from query string so CRS rules can inspect them
	for key, vals := range r.URL.Query() {
		for _, v := range vals {
			tx.AddGetRequestArgument(key, v)
			logger.Debug("waf: adding GET arg key=%q val=%q", key, v)
		}
	}

	// process request headers — Host must be added explicitly as Go excludes
	// it from r.Header and stores it separately in r.Host
	tx.AddRequestHeader("Host", r.Host)
	for name, vals := range r.Header {
		for _, v := range vals {
			tx.AddRequestHeader(name, v)
			logger.Debug("waf: HEADER name=%q val=%q", name, v)
		}
	}
	if it := tx.ProcessRequestHeaders(); it != nil {
		return e.interrupt(w, r, it, clientIP, accessLog)
	}

	// request body phase — buffer up to wafMaxBodyBytes; restore full stream for upstream
	if r.Body != nil {
		chunk, _ := io.ReadAll(io.LimitReader(r.Body, wafMaxBodyBytes))
		r.Body = io.NopCloser(io.MultiReader(bytes.NewReader(chunk), r.Body))
		if len(chunk) > 0 {
			if it, _, err := tx.WriteRequestBody(chunk); err != nil {
				logger.Error("waf: WriteRequestBody: %v", err)
			} else if it != nil {
				return e.interrupt(w, r, it, clientIP, accessLog)
			}
		}
	}

	logger.Debug("waf: calling ProcessRequestBody")
	if it, err := tx.ProcessRequestBody(); err != nil {
		logger.Error("waf: ProcessRequestBody: %v", err)
	} else if it != nil {
		return e.interrupt(w, r, it, clientIP, accessLog)
	}

	logger.Debug("waf: inspect complete — no interruption (method=%s uri=%s)", r.Method, r.URL.RequestURI())
	return true
}

// interrupt handles a WAF interruption. In detect mode it logs and passes the
// request through. In prevent mode it logs and returns a 403.
func (e *WAFEngine) interrupt(w http.ResponseWriter, r *http.Request, it *types.Interruption, clientIP string, accessLog *os.File) bool {
	action := "DETECT"
	if e.mode == db.WAFModePrevent {
		action = "BLOCK"
	}
	writeWAFLog(accessLog, r, clientIP, it.RuleID, action)

	if e.mode == db.WAFModePrevent {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return false
	}
	return true
}

// writeWAFLog writes a WAF event to the proxy access log in a structured format
// compatible with the standard access log so Fail2Ban filters can match both.
func writeWAFLog(f *os.File, r *http.Request, clientIP string, ruleID int, action string) {
	if f == nil {
		return
	}
	line := fmt.Sprintf("%s WAF %s %s %s rule=%d %s %q\n",
		time.Now().UTC().Format(time.RFC3339),
		action,
		r.Host,
		r.URL.Path,
		ruleID,
		clientIP,
		r.UserAgent(),
	)
	if _, err := f.WriteString(line); err != nil {
		logger.Error("waf: access log write: %v", err)
	}
}

// buildDirectives produces inline Coraza/CRS directives for the paranoia level
// and rule exclusions. exclusions is a newline-separated list of rule IDs
// (numeric) or tag names.
func buildDirectives(paranoiaLevel int, exclusions string) string {
	var b strings.Builder

	// enable the rule engine so ProcessRequest* returns interruptions;
	// detect-vs-prevent behaviour is handled in WAFEngine.interrupt()
	b.WriteString("SecRuleEngine On\n")

	fmt.Fprintf(&b,
		"SecAction \"id:900000,phase:1,nolog,pass,t:none,setvar:tx.paranoia_level=%d\"\n",
		paranoiaLevel,
	)
	for _, line := range strings.Split(exclusions, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if isNumeric(line) {
			fmt.Fprintf(&b, "SecRuleRemoveById %s\n", line)
		} else {
			fmt.Fprintf(&b, "SecRuleRemoveByTag %s\n", line)
		}
	}
	return b.String()
}

// mergeExclusions combines two newline-separated exclusion lists, deduplicating entries.
func mergeExclusions(global, extra string) string {
	if extra == "" {
		return global
	}
	seen := make(map[string]struct{})
	var out []string
	for _, line := range strings.Split(global+"\n"+extra, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if _, exists := seen[line]; !exists {
			seen[line] = struct{}{}
			out = append(out, line)
		}
	}
	return strings.Join(out, "\n")
}

// isNumeric returns true if s contains only ASCII digit characters.
func isNumeric(s string) bool {
	if len(s) == 0 {
		return false
	}
	for _, c := range s {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}
