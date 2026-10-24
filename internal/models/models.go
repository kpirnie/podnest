// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package models

import (
	"crypto/rand"
	"encoding/hex"
	"podnest/internal/logger"
	"time"
)

// container image references — single source of truth for all image URLs
const (

	// from GitHub Container Registry (Kevin's repos)
	ImgNginx    = "ghcr.io/kpirnie/nginx:latest"
	ImgSFTP     = "ghcr.io/kpirnie/sftp:latest"
	ImgPHPBase  = "ghcr.io/kpirnie/php:"
	ImgFail2Ban = "ghcr.io/kpirnie/fail2ban:latest"
	ImgMalscan  = "ghcr.io/kpirnie/malscan:latest"

	// from Docker Hub library
	ImgDB      = "docker.io/library/mariadb:latest"
	ImgRedis   = "docker.io/library/redis:alpine"
	ImgPMA     = "docker.io/phpmyadmin/phpmyadmin:latest"
	ImgNode    = "docker.io/library/node:"
	ImgPython  = "docker.io/library/python:"
	ImgVarnish = "docker.io/library/varnish:latest"

	// from Microsoft Container Registry
	ImgDotNet = "mcr.microsoft.com/dotnet/aspnet:"
)

// security rule list types
const (
	RuleBlacklist = 0
	RuleWhitelist = 1
)

// user roles
const (
	RoleManager = 50
	RoleAdmin   = 99
)

// php versions
var PHPVersionMap = map[int]string{
	3: "8.2",
	4: "8.3",
	5: "8.4",
	6: "8.5",
}

// site statuses
const (
	StatusRunning    = 1
	StatusStopped    = 2
	StatusRestarting = 3
	StatusError      = 4
)

var SiteStatusMap = map[int]string{
	StatusRunning:    "running",
	StatusStopped:    "stopped",
	StatusRestarting: "restarting",
	StatusError:      "error",
}

// site types
const (
	SiteTypeWordPress    = 1
	SiteTypePHP          = 2
	SiteTypeStatic       = 3
	SiteTypeNode         = 4
	SiteTypeDotNet       = 5
	SiteTypeReverseProxy = 6
	SiteTypePython       = 7
)

var SiteTypeMap = map[int]string{
	SiteTypeWordPress:    "PHP",
	SiteTypePHP:          "", // this was the PHP type
	SiteTypeStatic:       "Static HTML",
	SiteTypeNode:         "Node.js",
	SiteTypeDotNet:       ".NET",
	SiteTypeReverseProxy: "Reverse Proxy",
	SiteTypePython:       "Python",
}

// config types
const (
	ConfigNginx   = 1
	ConfigPHP     = 2
	ConfigMariaDB = 3
	ConfigRedis   = 4
	ConfigVarnish = 5
)

// node versions
var NodeVersionMap = map[int]string{
	2: "22",
	4: "24",
	5: "25",
	6: "26",
}

// .NET versions
var DotNetVersionMap = map[int]string{
	1: "8.0",
	2: "9.0",
	3: "10.0",
}

// python versions
var PythonVersionMap = map[int]string{
	1: "3.11",
	2: "3.12",
	3: "3.13",
	4: "3.14",
}

// internal service ports
const (
	NodeInternalPort   = 3000
	DotNetInternalPort = 8080
	PHPMyAdminPort     = 8082
	PythonInternalPort = 8000
)

// nginx internal listen port when Varnish sits in front of it; safe within
// each pod's isolated network namespace regardless of how many pods exist
const VarnishNginxPort = 8080

// FastCGICachePath is the nginx fastcgi cache directory inside the nginx container's /var/cache/nginx tmpfs
const FastCGICachePath = "/var/cache/nginx/fastcgi"

// backup destination types
const (
	BackupTypeLocal = 1
	BackupTypeS3    = 2
)

// node link statuses
const (
	NodeStatusPending = 1
	NodeStatusPaired  = 2
)

// node link operations awaiting a child's acknowledgement
const (
	NodeOpPair   = 1
	NodeOpUpdate = 2
	NodeOpUnpair = 3
)

// Node is a child PodNest instance paired beneath this one.
type Node struct {
	ID      int64
	Name    string
	URL     string
	LinkID  string
	PrivKey string
	Status  int
	Created time.Time
	Updated *time.Time
}

// NodeOp is a pending change to a child link, committed only once the child
// acknowledges it.
type NodeOp struct {
	ID        int64
	NodeID    int64
	Op        int
	NewURL    string
	NewKey    string
	ExpiresAt time.Time
}

// NodeParent is this instance's link to its parent node.
type NodeParent struct {
	LinkID    string
	ParentPub string
	Created   time.Time
	Updated   *time.Time
}

// NodeUser is a parent admin carried down to a child node on each SSO hop.
type NodeUser struct {
	NodeUID int64  `json:"uid"`
	FName   string `json:"fname"`
	LName   string `json:"lname"`
	Email   string `json:"email"`
	Phone   string `json:"phone"`
}

// user data structure
type User struct {
	ID          int64
	UName       string
	PWord       string
	UHash       string
	FName       string
	LName       string
	Email       string
	Phone       string
	Role        int
	TOTPSecret  string
	TOTPSalt    string
	TOTPEnabled bool
	NotifyEmail bool
	NotifySMS   bool
	NodeUID     int64 // 0 = local user; >0 = synced from the parent node's user with this ID
	Blocked     bool
	Created     time.Time
	Updated     *time.Time
}

// TOTPPending holds a short-lived token issued between password validation and TOTP verification
type TOTPPending struct {
	Token     string
	UID       int64
	ExpiresAt time.Time
}

// session data structure
type Session struct {
	ID        string
	UID       int64
	ExpiresAt time.Time
	CSRFToken string
}

// site data structure
type Site struct {
	ID             int64
	UID            int64
	ParentID       int64 // 0 = no parent; >0 = ID of the site this was cloned from
	Name           string
	Port           int
	PHPVersion     int
	SiteStatus     int
	SiteType       int
	RuntimeVersion *int
	StartCommand   string
	PMAPort        int
	Created        time.Time
	Updated        *time.Time
}

// ContainerHealth holds the last-known health state for a single container.
type ContainerHealth struct {
	Name   string `json:"name"`
	Status string `json:"status"` // podman container state: "running", "exited", "paused", "created", ...
}

// SFTPCred holds the global SFTP credentials for a site
type SFTPCred struct {
	ID       int64
	SiteID   int64
	Username string
	Password string
	UID      int
	Created  time.Time
	Updated  *time.Time
}

// PMA token data structure
type PMAToken struct {
	Token     string
	SiteID    int64
	ExpiresAt time.Time
}

// domain data structure
type Domain struct {
	ID      int64
	SiteID  int64
	Domain  string
	Created time.Time
	Updated *time.Time
}

// Config holds a single EAV key/value pair for a site config type
type Config struct {
	ID      int64
	SiteID  int64
	Type    int
	Key     string
	Value   string
	Created time.Time
	Updated *time.Time
}

// BackupRepo holds the restic repository configuration for a site
type BackupRepo struct {
	ID           int64
	SiteID       int64
	RepoPassword string
	LocalPath    string
	LocalEnabled bool
	S3Enabled    bool
	LastError    string     `json:"last_error"`
	LastErrorAt  *time.Time `json:"last_error_at"`
	Created      time.Time
	Updated      *time.Time
}

// Backup represents a recorded restic snapshot for a site
type Backup struct {
	ID         int64
	SiteID     int64
	SnapshotID string // restic snapshot ID
	Label      string // human-readable label (e.g. "pre-update")
	BackupType int    // BackupTypeLocal or BackupTypeS3
	SizeBytes  int64
	Domains    []string // site domains at time of backup; first is primary
	Created    time.Time
}

// SiteCron represents a scheduled command for a site
type SiteCron struct {
	ID         int64
	SiteID     int64
	Label      string
	Command    string
	Schedule   string
	Enabled    bool
	LastRun    *time.Time
	LastOutput string
	LastError  string
	Created    time.Time
	Updated    *time.Time
}

// Malware scan statuses stored in kppn_malware_scans.status
const (
	MalwareStatusRunning  = 1
	MalwareStatusClean    = 2
	MalwareStatusInfected = 3
	MalwareStatusError    = 4
)

// MalwareScan represents a single malware scan run against a site's html directory
type MalwareScan struct {
	ID           int64             `json:"id"`
	SiteID       int64             `json:"site_id"`
	Trigger      string            `json:"trigger"`
	Status       int               `json:"status"`
	FilesScanned int               `json:"files_scanned"`
	Infected     int               `json:"infected"`
	Error        string            `json:"error"`
	Started      time.Time         `json:"started"`
	Finished     *time.Time        `json:"finished"`
	Findings     []*MalwareFinding `json:"findings,omitempty"`
}

// MalwareFinding represents one infected file reported by a malware scan;
// Path is relative to the site's html directory
type MalwareFinding struct {
	ID          int64      `json:"id"`
	ScanID      int64      `json:"scan_id"`
	SiteID      int64      `json:"site_id"`
	Path        string     `json:"path"`
	Signature   string     `json:"signature"`
	Quarantined *time.Time `json:"quarantined"`
}

// WPUpdateItem represents one plugin or theme with an update available
type WPUpdateItem struct {
	Name          string `json:"name"`
	Title         string `json:"title"`
	Version       string `json:"version"`
	UpdateVersion string `json:"update_version"`
}

// WPUpdateStatus is the cached core/plugin/theme update state for a WordPress
// site; CoreUpdate is empty when core is current
type WPUpdateStatus struct {
	SiteID      int64           `json:"site_id"`
	CoreVersion string          `json:"core_version"`
	CoreUpdate  string          `json:"core_update"`
	Plugins     []*WPUpdateItem `json:"plugins"`
	Themes      []*WPUpdateItem `json:"themes"`
	Error       string          `json:"error"`
	Checked     *time.Time      `json:"checked"`
}

// ResourceWarning holds the current host resource threshold breach state.
type ResourceWarning struct {
	Active      bool      `json:"active"`
	Resource    string    `json:"resource"`
	CurrentMB   int64     `json:"current_mb"`
	ThresholdMB int64     `json:"threshold_mb"`
	Offender    string    `json:"offender"`
	OffenderMB  int64     `json:"offender_mb"`
	Since       time.Time `json:"since"`
}

// AuditEntry represents a single row in kppn_audit_log.
type AuditEntry struct {
	ID         int64     `json:"id"`
	TS         time.Time `json:"ts"`
	UID        *int64    `json:"uid,omitempty"`
	Username   string    `json:"username"`
	IP         string    `json:"ip"`
	UA         string    `json:"ua"`
	Method     string    `json:"method"`
	Action     string    `json:"action"`
	TargetType string    `json:"target_type"`
	TargetID   string    `json:"target_id"`
	Status     int       `json:"status"`
	Details    string    `json:"details"`
	PriorState string    `json:"prior_state"`
	NewState   string    `json:"new_state"`
}

// GenerateUHash produces a cryptographically random 64-char hex string
func GenerateUHash() (string, error) {

	// 32 bytes = 64 hex characters
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		logger.Error("Error generating user hash:%v ", err)
		return "", err
	}

	// Log the generated hash for debugging purposes
	logger.Debug("Generated user hash")
	return hex.EncodeToString(b), nil
}

// GenerateSessionID produces a cryptographically random session token
func GenerateSessionID() (string, error) {

	// 32 bytes = 64 hex characters
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		logger.Error("Error generating session ID:%v ", err)
		return "", err
	}

	// Log the generated session ID for debugging purposes
	logger.Debug("Generated session ID")
	return hex.EncodeToString(b), nil
}

// PHPImage returns the ghcr.io/kpirnie/php FPM Alpine image for a given
// php_version int; shared by WordPress and plain PHP sites
func PHPImage(phpVersion int) string {
	ver, ok := PHPVersionMap[phpVersion]
	if !ok {
		ver = "8.2"
	}
	return ImgPHPBase + ver + "-latest"
}

// PHPOnlyImage returns the PHP image for plain PHP sites; an alias of
// PHPImage since both site types share the ghcr.io/kpirnie/php image
func PHPOnlyImage(phpVersion int) string {
	return PHPImage(phpVersion)
}

// NodeImage returns the node alpine image for a given runtime_version int
func NodeImage(version int) string {
	ver, ok := NodeVersionMap[version]
	if !ok {
		ver = "22"
	}
	logger.Debug("Generated Node.js image tag")
	return ImgNode + ver + "-alpine"
}

// DotNetImage returns the aspnet image for a given runtime_version int
func DotNetImage(version int) string {
	ver, ok := DotNetVersionMap[version]
	if !ok {
		ver = "8.0"
	}
	logger.Debug("Generated .NET image tag")
	return ImgDotNet + ver
}

// PythonImage returns the python slim image for a given runtime_version int
func PythonImage(version int) string {
	ver, ok := PythonVersionMap[version]
	if !ok {
		ver = "3.14"
	}
	logger.Debug("Generated Python image tag")
	return ImgPython + ver + "-slim"
}

// StatusLabel returns the string label for a site_status int
func StatusLabel(status int) string {
	if label, ok := SiteStatusMap[status]; ok {
		return label
	}
	return "unknown"
}

// RuntimeImage returns the appropriate runtime image for a site type
func RuntimeImage(site *Site) string {

	// Determine the image based on the site type and runtime version
	switch site.SiteType {
	case SiteTypeWordPress:
		return PHPImage(site.PHPVersion)
	case SiteTypePHP:
		return PHPOnlyImage(site.PHPVersion)
	case SiteTypeNode:
		if site.RuntimeVersion != nil {
			return NodeImage(*site.RuntimeVersion)
		}
		return NodeImage(2)
	case SiteTypeDotNet:
		if site.RuntimeVersion != nil {
			return DotNetImage(*site.RuntimeVersion)
		}
		return DotNetImage(1)
	case SiteTypePython:
		if site.RuntimeVersion != nil {
			return PythonImage(*site.RuntimeVersion)
		}
		return PythonImage(4)
	}
	return ""
}
