// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package logger

import (
	"fmt"
	"log"
	"os"
	"regexp"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// -- ANSI color codes for terminal output ------------------------------------
const (
	colorReset  = "\033[0m"
	colorRed    = "\033[31m"
	colorGreen  = "\033[32m"
	colorYellow = "\033[33m"
	colorBlue   = "\033[34m"
)

// LogLevel represents the severity level of log messages
type LogLevel int

const (
	DEBUG LogLevel = iota
	WARN
	ERROR
	INFO
	NONE
)

// LogEntry represents a single log message with associated metadata
type LogEntry struct {
	Timestamp string `json:"timestamp"`
	Level     string `json:"level"`
	Message   string `json:"message"`
}

var (
	defaultLogger *Logger
	once          sync.Once

	logCh         = make(chan LogEntry, 2048) // async drain channel — callers never block on buffer writes
	logBuf        []LogEntry                  // drained by background goroutine; guarded by logMutex for reads
	logMutex      sync.RWMutex
	maxLogEntries = 1000

	levelColors = map[string]string{
		"DEBUG": colorGreen,
		"WARN":  colorYellow,
		"ERROR": colorRed,
		"INFO":  colorBlue,
	}

	// -- patterns to obfuscate in log output --------------------------------
	sensitivePatterns = []*regexp.Regexp{
		regexp.MustCompile(`(?i)(password|pass|passwd|pwd|secret|token|key)([=:\s"]+)([^\s"&,]+)`),
	}
)

// init drains logCh into the circular buffer in a dedicated goroutine,
// keeping write contention off the hot request path entirely.
func init() {
	logBuf = make([]LogEntry, 0, maxLogEntries)
	go func() {
		for entry := range logCh {
			logMutex.Lock()
			logBuf = append(logBuf, entry)
			if len(logBuf) > maxLogEntries {
				logBuf = logBuf[len(logBuf)-maxLogEntries:]
			}
			logMutex.Unlock()
		}
	}()
}

// Logger provides leveled logging with thread-safe, zero-contention level reads.
// The level field is stored as an atomic int32 so hot-path shouldLog checks
// never block — level changes (rare) use a store, reads are lock-free.
type Logger struct {
	level atomic.Int32 // stores LogLevel; read lock-free, written only on SetLevel
	mu    sync.RWMutex // reserved for future non-level state
}

// New creates a new Logger instance with the specified log level
func New(level string) *Logger {
	l := &Logger{}
	l.level.Store(int32(ParseLogLevel(level)))
	return l
}

// Init reads the DEBUG environment variable and configures the default logger
func Init() {
	l := getDefaultLogger()
	level := os.Getenv("LOG_LEVEL")
	if level == "" {
		level = "INFO"
	}
	l.SetLevel(level)
	log.SetFlags(log.Ldate | log.Ltime)
}

// IsDebug returns true if the default logger is set to DEBUG level.
// Uses an atomic load — safe to call from concurrent request goroutines.
func IsDebug() bool {
	return LogLevel(getDefaultLogger().level.Load()) <= DEBUG
}

// getDefaultLogger returns the singleton default logger instance
func getDefaultLogger() *Logger {
	once.Do(func() {
		l := &Logger{}
		l.level.Store(int32(INFO))
		defaultLogger = l
	})
	return defaultLogger
}

// ParseLogLevel converts string representations to LogLevel constants
func ParseLogLevel(level string) LogLevel {
	switch strings.ToUpper(level) {
	case "DEBUG":
		return DEBUG
	case "WARN", "WARNING":
		return WARN
	case "ERROR":
		return ERROR
	case "INFO":
		return INFO
	case "NONE":
		return NONE
	default:
		return INFO
	}
}

// SetLogLevel updates the global default logger's minimum level
func SetLogLevel(level string) {
	getDefaultLogger().SetLevel(level)
}

// GetLogLevel retrieves the current global default logger's level as a string
func GetLogLevel() string {
	return getDefaultLogger().GetLevel()
}

// SetLevel updates this logger instance's minimum level atomically
func (l *Logger) SetLevel(level string) {
	l.level.Store(int32(ParseLogLevel(level)))
}

// GetLevel retrieves this logger instance's current level as a string
func (l *Logger) GetLevel() string {
	switch LogLevel(l.level.Load()) {
	case DEBUG:
		return "DEBUG"
	case WARN:
		return "WARN"
	case ERROR:
		return "ERROR"
	case INFO:
		return "INFO"
	case NONE:
		return "NONE"
	default:
		return "INFO"
	}
}

// shouldLog determines whether a message at the specified level should be logged.
// Uses an atomic load so concurrent request goroutines never contend for the level.
func (l *Logger) shouldLog(level LogLevel) bool {
	cur := LogLevel(l.level.Load())
	if cur == NONE || level == NONE {
		return false
	}
	if level == INFO {
		return true
	}
	return level >= cur
}

// addToBuffer enqueues a log entry for async drain — never blocks the caller
// unless the channel is full (2048 entries backlogged), in which case the
// entry is silently dropped to protect request throughput.
func addToBuffer(level, message string) {
	if strings.ToUpper(level) == "NONE" {
		return
	}
	entry := LogEntry{
		Timestamp: time.Now().Format("2006-01-02 15:04:05"),
		Level:     strings.ToLower(level),
		Message:   message,
	}
	// non-blocking send — drop rather than stall a request goroutine
	select {
	case logCh <- entry:
	default:
	}
}

// GetLogs retrieves all current log entries from the buffer
func GetLogs() []LogEntry {
	logMutex.RLock()
	defer logMutex.RUnlock()
	result := make([]LogEntry, len(logBuf))
	copy(result, logBuf)
	return result
}

// ClearLogs removes all entries from the log buffer
func ClearLogs() {
	logMutex.Lock()
	defer logMutex.Unlock()
	logBuf = logBuf[:0]
}

// colorizeLevel wraps the log level string with ANSI color codes
func colorizeLevel(level string) string {
	if color, ok := levelColors[level]; ok {
		return fmt.Sprintf("%s[%-5s]%s", color, level, colorReset)
	}
	return fmt.Sprintf("[%-5s]", level)
}

// obfuscate replaces sensitive values in a string with ***
func obfuscate(s string) string {
	for _, re := range sensitivePatterns {
		s = re.ReplaceAllStringFunc(s, func(match string) string {
			sub := re.FindStringSubmatch(match)
			if len(sub) < 4 {
				return match
			}
			return sub[1] + sub[2] + "***"
		})
	}
	return s
}

// logMessage formats and outputs a log message to stdout and the buffer
func logMessage(level string, format string, v ...interface{}) {
	message := fmt.Sprintf(format, v...)
	log.Printf("%s %s", colorizeLevel(level), message)
	addToBuffer(level, message)
}

// -- instance methods --------------------------------------------------------

// Debug logs debug-level messages
func (l *Logger) Debug(format string, v ...interface{}) {
	if l.shouldLog(DEBUG) {
		logMessage("DEBUG", format, v...)
	}
}

// Info logs informational messages
func (l *Logger) Info(format string, v ...interface{}) {
	if l.shouldLog(INFO) {
		logMessage("INFO", format, v...)
	}
}

// Warn logs warning messages
func (l *Logger) Warn(format string, v ...interface{}) {
	if l.shouldLog(WARN) {
		logMessage("WARN", format, v...)
	}
}

// Error logs error messages
func (l *Logger) Error(format string, v ...interface{}) {
	if l.shouldLog(ERROR) {
		logMessage("ERROR", format, v...)
	}
}

// -- package-level convenience functions -------------------------------------

// Debug logs debug-level messages using the default logger
func Debug(format string, v ...interface{}) { getDefaultLogger().Debug(format, v...) }

// Info logs info-level messages using the default logger
func Info(format string, v ...interface{}) { getDefaultLogger().Info(format, v...) }

// Warn logs warning-level messages using the default logger
func Warn(format string, v ...interface{}) { getDefaultLogger().Warn(format, v...) }

// Error logs error-level messages using the default logger
func Error(format string, v ...interface{}) { getDefaultLogger().Error(format, v...) }

// DebugSafe logs a debug message with sensitive values obfuscated
func DebugSafe(format string, v ...interface{}) {
	if !IsDebug() {
		return
	}
	safe := make([]interface{}, len(v))
	for i, a := range v {
		if s, ok := a.(string); ok {
			safe[i] = obfuscate(s)
		} else {
			safe[i] = a
		}
	}
	logMessage("DEBUG", obfuscate(format), safe...)
}

// InfoSafe logs an info message with sensitive values obfuscated
func InfoSafe(format string, v ...interface{}) {
	safe := make([]interface{}, len(v))
	for i, a := range v {
		if s, ok := a.(string); ok {
			safe[i] = obfuscate(s)
		} else {
			safe[i] = a
		}
	}
	logMessage("INFO", obfuscate(format), safe...)
}
