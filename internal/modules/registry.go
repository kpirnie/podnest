package modules

import (
	"context"
	"net/http"

	"podnest/internal/models"
)

// SiteTypeModule is implemented by every site-type module.
// The platform calls these methods; no switch statements on SiteType exist outside modules.
type SiteTypeModule interface {
	// TypeID returns the models.SiteType* constant this module handles.
	TypeID() int

	// Label returns the human-readable name shown in the UI.
	Label() string

	// Images returns the ordered list of container images to pull before pod creation.
	Images(site *models.Site) []string

	// Create provisions all containers for a newly created site pod.
	Create(ctx context.Context, client PodmanClient, cfg PodConfig) error

	// SeedConfigs returns the default KV config maps for this site type.
	SeedConfigs() map[int]map[string]string

	// Tabs returns the ordered list of tab descriptors this type contributes to site detail.
	Tabs(site *models.Site) []TabDescriptor

	// ScaffoldDir performs any filesystem setup needed after DB record creation.
	ScaffoldDir(dir string, cfg ScaffoldConfig) error
}

// FeatureModule is implemented by per-site feature modules (WAF, backups, crons, etc.)
type FeatureModule interface {
	// FeatureID returns a unique string key for this feature.
	FeatureID() string

	// AppliesTo reports whether this feature is available for the given site type.
	AppliesTo(siteType int) bool

	// Tabs returns any tab descriptors this feature contributes to site detail.
	Tabs(site *models.Site) []TabDescriptor

	// RegisterRoutes mounts this feature's HTTP handlers onto the provided mux.
	RegisterRoutes(mux *http.ServeMux)

	// OnSiteCreate is called after a site record and pod are created; may be a no-op.
	OnSiteCreate(ctx context.Context, site *models.Site) error

	// OnSiteDelete is called before a site pod and record are removed; may be a no-op.
	OnSiteDelete(ctx context.Context, site *models.Site) error
}

// TabDescriptor describes a single tab contributed by a module to the site detail page.
type TabDescriptor struct {
	// ID is a unique slug used for the ?tab= query param and CSS targeting.
	ID string

	// Label is the text shown in the tab bar.
	Label string

	// Template is the path to the Go template partial for this tab's content panel.
	Template string

	// Data is an optional function returning additional data for this tab's template.
	// Called once per page render; may be nil when all data is in SiteDetailPageData.
	Data func(site *models.Site) (any, error)
}

// PodmanClient is the interface the platform exposes to type modules for container operations.
// Decouples modules from the concrete podman.Client type.
type PodmanClient interface {
	CreatePod(ctx context.Context, name string, site *models.Site) (string, error)
	CreateContainer(ctx context.Context, cfg ContainerConfig) error
	StartContainer(ctx context.Context, name string) error
	PullImage(ctx context.Context, image string) error
	RemovePod(ctx context.Context, name string) error
	WaitForMariaDB(ctx context.Context, containerName, rootPass string) error
	EnsureMariaDBUser(ctx context.Context, containerName, rootPass, dbName, dbUser, dbPass string) error
}

// Mount describes a bind mount or tmpfs for a container.
type Mount struct {
	Type        string
	Source      string
	Destination string
	Options     []string
}

// ContainerConfig holds all parameters needed to create a single container.
type ContainerConfig struct {
	Name       string
	Image      string
	PodName    string
	Env        map[string]string
	Mounts     []Mount
	Command    []string
	Entrypoint []string
	User       string
	WorkingDir string
	CapAdd     []string
	CapDrop    []string
	SecOpts    []string
}

// PodConfig holds everything a type module needs to provision containers.
type PodConfig struct {
	Site       *models.Site
	Configs    map[int]map[string]string
	SiteDir    string
	SiteUID    int
	DBUser     string
	DBPass     string
	DBRootPass string
	RedisPass  string
}

// ScaffoldConfig holds everything a type module needs for filesystem setup.
type ScaffoldConfig struct {
	Site       *models.Site
	Configs    map[int]map[string]string
	SiteUID    int
	DBUser     string
	DBPass     string
	DBRootPass string
	RedisPass  string
}

// registry holds all registered modules; populated at startup in cmd/serve.go.
var (
	typeModules    []SiteTypeModule
	featureModules []FeatureModule
)

// RegisterType registers a site type module; called once per module at startup.
func RegisterType(m SiteTypeModule) {
	typeModules = append(typeModules, m)
}

// RegisterFeature registers a feature module; called once per module at startup.
func RegisterFeature(m FeatureModule) {
	featureModules = append(featureModules, m)
}

// TypeModule returns the registered SiteTypeModule for the given type ID, or nil.
func TypeModule(typeID int) SiteTypeModule {
	for _, m := range typeModules {
		if m.TypeID() == typeID {
			return m
		}
	}
	return nil
}

// AllTypeModules returns all registered site type modules in registration order.
func AllTypeModules() []SiteTypeModule { return typeModules }

// FeaturesFor returns all feature modules that apply to the given site type.
func FeaturesFor(siteType int) []FeatureModule {
	var out []FeatureModule
	for _, f := range featureModules {
		if f.AppliesTo(siteType) {
			out = append(out, f)
		}
	}
	return out
}

// TabsFor returns the ordered list of all tabs (type + feature) for a given site.
func TabsFor(site *models.Site) []TabDescriptor {
	var tabs []TabDescriptor
	if m := TypeModule(site.SiteType); m != nil {
		tabs = append(tabs, m.Tabs(site)...)
	}
	for _, f := range FeaturesFor(site.SiteType) {
		tabs = append(tabs, f.Tabs(site)...)
	}
	return tabs
}
