package proxy

import (
	"bytes"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
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

// wafBodyPool pools 1MB byte slices for WAF request body inspection to avoid
// a fresh heap allocation per POST/PUT request — significantly reduces GC pressure
// on sites with frequent form submissions, WooCommerce checkouts, or REST API writes
var wafBodyPool = sync.Pool{
	New: func() interface{} {
		b := make([]byte, 0, wafMaxBodyBytes)
		return &b
	},
}

// pluginSuffixes are the three file types that make up a CRS plugin
var pluginSuffixes = []string{"-config.conf", "-before.conf", "-after.conf"}

// WAFEngine wraps a compiled Coraza WAF instance and its active operational settings.
type WAFEngine struct {
	waf  coraza.WAF
	mode int  // db.WAFModeDetect or db.WAFModePrevent
	log  bool // whether audit logging is enabled
}

// overlayFS gives local CRS files priority over the embedded coreruleset.
// Requests for owasp_crs/* are remapped to rules/* to match the local CRS layout.
type overlayFS struct {
	local    fs.FS // locally downloaded CRS — takes priority
	embedded fs.FS // embedded coraza-coreruleset — fallback only
}

// Open implements fs.FS. It first tries to open the file from the local FS, and if that fails it falls back to the embedded FS.
func (o overlayFS) Open(name string) (fs.File, error) {
	if logger.IsDebug() {
		logger.Debug("overlayFS.Open: name=%q", name)
	}

	// strip the leading @ that Coraza preserves in directive paths
	localName := strings.TrimPrefix(name, "@")

	// remap owasp_crs/* → rules/* to match the downloaded CRS directory layout
	if strings.HasPrefix(localName, "owasp_crs/") {
		localName = "rules/" + strings.TrimPrefix(localName, "owasp_crs/")
	}

	// plugins/* maps directly — same directory name in local and embedded
	if f, err := o.local.Open(localName); err == nil {
		return f, nil
	}
	return o.embedded.Open(name)
}

// NewWAFEngine builds a Coraza WAF engine from the given global settings.
// extraExclusions is merged on top of s.Exclusions — pass a per-site exclusion
// list here, or an empty string when building the global engine.
// plugins is the list of plugin names to load (e.g. "wordpress-rule-exclusions");
// pass nil for the global engine. All three file types for each plugin are
// included in the correct order: config → before → CRS rules → after.
func NewWAFEngine(s db.WAFSettings, extraExclusions, crsDir string, plugins []string) (*WAFEngine, error) {

	// resolve per-plugin directives in the correct load order when a local
	// CRS install is present and plugins have been selected
	configD, beforeD, afterD := buildPluginDirectives(crsDir, plugins)

	// directives are always @-prefixed; the rootFS determines which files are served —
	// local CRS takes priority via overlayFS when a local install is present
	directives := fmt.Sprintf(`
Include @coraza.conf-recommended
Include @crs-setup.conf.example
%s%sInclude @owasp_crs/*.conf
%s%s`,
		configD,
		beforeD,
		afterD,
		buildDirectives(s.ParanoiaLevel, mergeExclusions(s.Exclusions, extraExclusions)),
	)

	// use the overlay FS when a local CRS install is present so local rules
	// take priority over the embedded coraza-coreruleset
	var rootFS fs.FS = coreruleset.FS
	if crsDir != "" {
		rootFS = overlayFS{local: os.DirFS(crsDir), embedded: coreruleset.FS}
	}

	waf, err := coraza.NewWAF(
		coraza.NewWAFConfig().
			WithRootFS(rootFS).
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

	logger.Debug("waf: engine ready (mode=%d pl=%d audit=%v plugins=%v)", s.Mode, s.ParanoiaLevel, s.AuditLog, plugins)
	return &WAFEngine{waf: waf, mode: s.Mode, log: s.AuditLog}, nil
}

// Inspect runs a Coraza transaction against the incoming request.
// Returns true if the request should proceed to the upstream proxy.
// On a block decision a 403 has already been written to w.
func (e *WAFEngine) Inspect(w http.ResponseWriter, r *http.Request, clientIP string, accessLog *os.File, logMu *sync.Mutex) bool {
	tx := e.waf.NewTransaction()
	defer func() {
		tx.ProcessLogging()
		_ = tx.Close()
	}()

	// connection and URI phase
	tx.ProcessConnection(clientIP, 0, "", 0)
	tx.ProcessURI(r.URL.RequestURI(), r.Method, r.Proto)

	// query string args — only log individual entries when debug is explicitly enabled
	// to avoid fmt.Sprintf allocations on every arg for every request
	for key, vals := range r.URL.Query() {
		for _, v := range vals {
			tx.AddGetRequestArgument(key, v)
			if logger.IsDebug() {
				logger.Debug("waf: adding GET arg key=%q val=%q", key, v)
			}
		}
	}

	// process request headers — Host must be added explicitly as Go excludes
	// it from r.Header and stores it separately in r.Host
	tx.AddRequestHeader("Host", r.Host)
	for name, vals := range r.Header {
		for _, v := range vals {
			tx.AddRequestHeader(name, v)
			// only log individual headers when debug is explicitly enabled
			if logger.IsDebug() {
				logger.Debug("waf: HEADER name=%q val=%q", name, v)
			}
		}
	}
	if it := tx.ProcessRequestHeaders(); it != nil {
		return e.interrupt(w, r, it, clientIP, accessLog, logMu)
	}

	// request body phase — buffer up to wafMaxBodyBytes using a pooled buffer to
	// avoid per-request heap allocation; restore full stream for upstream after inspection
	if r.Body != nil {
		// acquire a pooled buffer and reset length, keeping capacity
		bufPtr := wafBodyPool.Get().(*[]byte)
		buf := (*bufPtr)[:0]
		buf, _ = io.ReadAll(io.LimitReader(r.Body, wafMaxBodyBytes))

		// restore the full body stream for the upstream — chunk already read + remainder
		r.Body = io.NopCloser(io.MultiReader(bytes.NewReader(buf), r.Body))

		if len(buf) > 0 {
			if it, _, err := tx.WriteRequestBody(buf); err != nil {
				logger.Error("waf: WriteRequestBody: %v", err)
			} else if it != nil {
				wafBodyPool.Put(bufPtr) // return buffer before early exit
				return e.interrupt(w, r, it, clientIP, accessLog, logMu)
			}
		}
		wafBodyPool.Put(bufPtr) // return buffer after use
	}

	if logger.IsDebug() {
		logger.Debug("waf: calling ProcessRequestBody")
	}
	if it, err := tx.ProcessRequestBody(); err != nil {
		logger.Error("waf: ProcessRequestBody: %v", err)
	} else if it != nil {
		// interrupt call — pass logMu through so writeWAFLog can lock correctly
		return e.interrupt(w, r, it, clientIP, accessLog, logMu)
	}

	if logger.IsDebug() {
		logger.Debug("waf: inspect complete — no interruption (method=%s uri=%s)", r.Method, r.URL.RequestURI())
	}
	return true
}

// interrupt handles a WAF interruption. In detect mode it logs and passes the
// request through. In prevent mode it logs and returns a 403.
func (e *WAFEngine) interrupt(w http.ResponseWriter, r *http.Request, it *types.Interruption, clientIP string, accessLog *os.File, logMu *sync.Mutex) bool {
	action := "DETECT"
	if e.mode == db.WAFModePrevent {
		action = "BLOCK"
	}
	writeWAFLog(accessLog, logMu, r, clientIP, it.RuleID, action)

	if e.mode == db.WAFModePrevent {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return false
	}
	return true
}

// writeWAFLog writes a WAF event to the WAF log in a structured format.
// mu must be Proxy.wafLogMu — passed in to avoid a package-level global.
func writeWAFLog(f *os.File, mu *sync.Mutex, r *http.Request, clientIP string, ruleID int, action string) {
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
	mu.Lock()
	_, err := f.WriteString(line)
	mu.Unlock()
	if err != nil {
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

// pluginNameFromFile extracts the plugin name from a plugin filename.
// Returns ("", false) if the file is not a recognised plugin file.
func pluginNameFromFile(filename string) (string, bool) {
	for _, s := range pluginSuffixes {
		if strings.HasSuffix(filename, s) {
			return strings.TrimSuffix(filename, s), true
		}
	}
	return "", false
}

// buildPluginDirectives returns the config, before, and after Include directives
// for the given plugin names, checking that each file actually exists on disk
// before including it — missing files are silently skipped
func buildPluginDirectives(crsDir string, plugins []string) (config, before, after string) {
	if crsDir == "" || len(plugins) == 0 {
		return
	}
	pluginsDir := filepath.Join(crsDir, "plugins")
	var cfgB, befB, aftB strings.Builder
	for _, p := range plugins {
		for _, suffix := range []string{"-config.conf", "-before.conf", "-after.conf"} {
			if _, err := os.Stat(filepath.Join(pluginsDir, p+suffix)); err == nil {
				switch suffix {
				case "-config.conf":
					fmt.Fprintf(&cfgB, "Include @plugins/%s%s\n", p, suffix)
				case "-before.conf":
					fmt.Fprintf(&befB, "Include @plugins/%s%s\n", p, suffix)
				case "-after.conf":
					fmt.Fprintf(&aftB, "Include @plugins/%s%s\n", p, suffix)
				}
			}
		}
	}
	return cfgB.String(), befB.String(), aftB.String()
}

// ListAvailablePlugins returns the unique plugin names present in {crsDir}/plugins/
// that are compatible with Coraza — each candidate is probe-compiled and silently
// excluded if it fails. Names are returned sorted.
func ListAvailablePlugins(crsDir string) ([]string, error) {
	dir := filepath.Join(crsDir, "plugins")
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return []string{}, nil
		}
		return nil, fmt.Errorf("waf: list plugins: %w", err)
	}

	// collect unique plugin names from the directory
	seen := make(map[string]struct{})
	var candidates []string
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		if name, ok := pluginNameFromFile(e.Name()); ok {
			if _, exists := seen[name]; !exists {
				seen[name] = struct{}{}
				candidates = append(candidates, name)
			}
		}
	}

	// probe-compile each candidate — exclude any that Coraza cannot load
	var out []string
	for _, name := range candidates {
		if probePlugin(crsDir, name) {
			out = append(out, name)
		} else {
			logger.Debug("waf: plugin %s excluded — not compatible with this Coraza build", name)
		}
	}

	if out == nil {
		out = []string{}
	}
	sort.Strings(out)
	logger.Debug("waf: found %d compatible plugins in %s", len(out), dir)
	return out, nil
}

// probePlugin attempts to compile a minimal WAF engine with only the given
// plugin's files loaded. Returns true if Coraza accepts all the plugin's
// directives, false if any file fails to compile.
func probePlugin(crsDir, pluginName string) bool {
	configD, beforeD, afterD := buildPluginDirectives(crsDir, []string{pluginName})

	directives := fmt.Sprintf(`
SecRuleEngine DetectionOnly
%s%s%s`, configD, beforeD, afterD)

	_, err := coraza.NewWAF(
		coraza.NewWAFConfig().
			WithRootFS(overlayFS{local: os.DirFS(crsDir), embedded: coreruleset.FS}).
			WithDirectives(directives),
	)
	return err == nil
}
