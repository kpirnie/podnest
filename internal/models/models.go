package models

import (
	"crypto/rand"
	"encoding/hex"
	"podnest/internal/logger"
	"time"
)

// container image references — single source of truth for all image URLs
const (

	// from GitHub Container Registry (kpirnie's repos)
	ImgNginx    = "ghcr.io/kpirnie/nginx:latest"
	ImgSFTP     = "ghcr.io/kpirnie/sftp:latest"
	ImgPHPBase  = "ghcr.io/kpirnie/php:"
	ImgFail2Ban = "ghcr.io/kpirnie/fail2ban:latest"

	// from Docker Hub library
	ImgDB      = "docker.io/library/mariadb:latest"
	ImgRedis   = "docker.io/library/redis:alpine"
	ImgPMA     = "docker.io/phpmyadmin/phpmyadmin:latest"
	ImgNode    = "docker.io/library/node:"
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
)

var SiteTypeMap = map[int]string{
	SiteTypeWordPress:    "PHP",
	SiteTypePHP:          "", // this was the PHP type
	SiteTypeStatic:       "Static HTML",
	SiteTypeNode:         "Node.js",
	SiteTypeDotNet:       ".NET",
	SiteTypeReverseProxy: "Reverse Proxy",
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

// internal service ports
const (
	NodeInternalPort   = 3000
	DotNetInternalPort = 8080
	PHPMyAdminPort     = 8082
)

// nginx internal listen port when Varnish sits in front of it; safe within
// each pod's isolated network namespace regardless of how many pods exist
const VarnishNginxPort = 8080

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
	TOTPEnabled bool
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

// backup destination types
const (
	BackupTypeLocal = 1
	BackupTypeS3    = 2
)

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

// GenerateUHash produces a cryptographically random 64-char hex string
func GenerateUHash() (string, error) {

	// 32 bytes = 64 hex characters
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		logger.Error("Error generating user hash:%v ", err)
		return "", err
	}

	// Log the generated hash for debugging purposes
	logger.Info("Generated user hash")
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
	logger.Info("Generated session ID")
	return hex.EncodeToString(b), nil
}

// PHPImage returns the WordPress FPM Alpine image for WordPress sites;
// the official WordPress image includes mysqli which WordPress requires
func PHPImage(phpVersion int) string {
	ver, ok := PHPVersionMap[phpVersion]
	if !ok {
		ver = "8.2"
	}
	return ImgPHPBase + ver + "-latest"
}

// PHPOnlyImage returns the serversideup FPM Alpine image for plain PHP sites;
// includes pdo_mysql, redis, and other extensions non-WordPress apps need
func PHPOnlyImage(phpVersion int) string {
	return PHPImage(phpVersion)
}

// NodeImage returns the node alpine image for a given runtime_version int
func NodeImage(version int) string {
	ver, ok := NodeVersionMap[version]
	if !ok {
		ver = "22"
	}
	logger.Info("Generated Node.js image tag")
	return ImgNode + ver + "-alpine"
}

// DotNetImage returns the aspnet image for a given runtime_version int
func DotNetImage(version int) string {
	ver, ok := DotNetVersionMap[version]
	if !ok {
		ver = "8.0"
	}
	logger.Info("Generated .NET image tag")
	return ImgDotNet + ver
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
	}
	return ""
}
