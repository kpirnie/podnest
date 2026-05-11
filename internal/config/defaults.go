package config

import (
	"encoding/json"
	"fmt"

	"podnest/internal/logger"
	"podnest/internal/models"
)

// setup and hold the default nginx config for new sites
var DefaultNginx = map[string]string{
	"worker_processes":            "auto",
	"worker_connections":          "1024",
	"worker_rlimit_nofile":        "65535",
	"multi_accept":                "on",
	"keepalive_timeout":           "65",
	"keepalive_requests":          "1000",
	"client_max_body_size":        "64m",
	"client_body_buffer_size":     "16k",
	"client_header_buffer_size":   "1k",
	"large_client_header_buffers": "4 8k",
	"open_file_cache":             "max=10000 inactive=30s",
	"open_file_cache_valid":       "60s",
	"open_file_cache_min_uses":    "2",
	"gzip":                        "on",
	"gzip_comp_level":             "6",
	"gzip_min_length":             "256",
	"fastcgi_cache_size":          "256m",
	"fastcgi_cache_inactive":      "60m",
	"fastcgi_cache_valid":         "200 60m",
	"rate_limit_login":            "5r/m",
	"rate_limit_xmlrpc":           "2r/m",
	"rate_limit_general":          "50r/s",
	"limit_conn_addr":             "10",
	"real_ip_header":              "X-Forwarded-For",
}

// setup and hold the default php config for new sites
var DefaultPHP = map[string]string{
	"memory_limit":                    "256M",
	"max_execution_time":              "30",
	"max_input_time":                  "30",
	"post_max_size":                   "32M",
	"upload_max_filesize":             "32M",
	"max_input_vars":                  "1000",
	"expose_php":                      "Off",
	"display_errors":                  "Off",
	"log_errors":                      "On",
	"opcache_enable":                  "1",
	"opcache_memory_consumption":      "64",
	"opcache_interned_strings_buffer": "8",
	"opcache_max_accelerated_files":   "4000",
	"opcache_revalidate_freq":         "15",
	"opcache_validate_timestamps":     "1",
	"opcache_fast_shutdown":           "1",
	"pm":                              "dynamic",
	"pm_max_children":                 "10",
	"pm_start_servers":                "2",
	"pm_min_spare_servers":            "1",
	"pm_max_spare_servers":            "3",
	"pm_max_requests":                 "500",
	"pm_process_idle_timeout":         "10s",
	"session_use_strict_mode":         "1",
	"session_cookie_httponly":         "1",
	"session_cookie_secure":           "1",
	"session_cookie_samesite":         "Lax",
}

// setup and hold the default mariadb config for new sites
var DefaultMariaDB = map[string]string{
	"innodb_buffer_pool_size":        "1G",
	"innodb_buffer_pool_instances":   "2",
	"innodb_log_file_size":           "256M",
	"innodb_log_buffer_size":         "64M",
	"innodb_flush_log_at_trx_commit": "2",
	"innodb_flush_method":            "O_DIRECT",
	"innodb_file_per_table":          "ON",
	"innodb_read_io_threads":         "4",
	"innodb_write_io_threads":        "4",
	"innodb_io_capacity":             "1000",
	"innodb_io_capacity_max":         "2000",
	"innodb_stats_persistent":        "ON",
	"innodb_autoinc_lock_mode":       "2",
	"max_allowed_packet":             "256M",
	"max_connections":                "100",
	"max_connect_errors":             "1000000",
	"wait_timeout":                   "300",
	"interactive_timeout":            "300",
	"table_open_cache":               "2000",
	"table_definition_cache":         "1000",
	"thread_cache_size":              "20",
	"tmp_table_size":                 "64M",
	"max_heap_table_size":            "64M",
	"join_buffer_size":               "2M",
	"sort_buffer_size":               "2M",
	"read_buffer_size":               "1M",
	"read_rnd_buffer_size":           "2M",
	"bulk_insert_buffer_size":        "64M",
	"slow_query_log":                 "1",
	"long_query_time":                "1",
	"log_queries_not_using_indexes":  "1",
	"local_infile":                   "0",
	"skip_name_resolve":              "1",
	"query_cache_type":               "0",
	"performance_schema":             "OFF",
}

// setup and hold the default redis config for new sites
var DefaultRedis = map[string]string{
	"maxmemory":              "512mb",
	"maxmemory_policy":       "allkeys-lru",
	"tcp_keepalive":          "300",
	"hz":                     "10",
	"dynamic_hz":             "yes",
	"io_threads":             "2",
	"io_threads_do_reads":    "no",
	"lazyfree_lazy_eviction": "yes",
	"lazyfree_lazy_expire":   "yes",
	"save":                   "",
	"appendonly":             "no",
}

// setup and hold the default varnish config for new sites
var DefaultVarnish = map[string]string{
	"enabled":               "false",
	"memory_size":           "512m",
	"ttl":                   "120s",
	"grace":                 "30s",
	"connect_timeout":       "5s",
	"first_byte_timeout":    "60s",
	"between_bytes_timeout": "10s",
	"bypass_query_strings":  "true",
	"bypass_paths":          "/wp-admin,/wp-login.php,/xmlrpc.php,/wp-cron.php,/wp-json,/feed",
	"bypass_cookies":        "wordpress_logged_in,woocommerce_,wp_woocommerce,wordpress_sec",
	"bypass_extensions":     "",
}

// DefaultsForType returns the default config map for a given config type constant
func DefaultsForType(configType int) (map[string]string, error) {
	switch configType {
	case models.ConfigNginx:
		logger.Debug("returning default nginx config")
		return DefaultNginx, nil
	case models.ConfigPHP:
		logger.Debug("returning default php config")
		return DefaultPHP, nil
	case models.ConfigMariaDB:
		logger.Debug("returning default mariadb config")
		return DefaultMariaDB, nil
	case models.ConfigRedis:
		logger.Debug("returning default redis config")
		return DefaultRedis, nil
	case models.ConfigVarnish:
		logger.Debug("returning default varnish config")
		return DefaultVarnish, nil
	default:
		logger.Error("unknown config type: %d", configType)
		return nil, fmt.Errorf("unknown config type: %d", configType)
	}
}

// MarshalDefaults returns the JSON blob for a given config type
func MarshalDefaults(configType int) (string, error) {

	// get the defaults for the type
	defaults, err := DefaultsForType(configType)
	if err != nil {
		logger.Error("failed to get defaults for type %d: %v", configType, err)
		return "", err
	}

	// marshal to JSON
	b, err := json.Marshal(defaults)
	if err != nil {
		logger.Error("failed to marshal defaults for type %d: %v", configType, err)
		return "", fmt.Errorf("failed to marshal defaults for type %d: %w", configType, err)
	}

	// return the JSON string
	return string(b), nil
}

// SeedSiteConfigs inserts default config rows for all four types for a new site
func SeedSiteConfigs(siteID int64, siteType int) ([]*models.Config, error) {

	// all site types get nginx and varnish (disabled by default)
	types := []int{models.ConfigNginx, models.ConfigVarnish}

	// add the other types based on the site type
	switch siteType {
	case models.SiteTypeWordPress, models.SiteTypePHP:
		types = append(types, models.ConfigPHP, models.ConfigMariaDB, models.ConfigRedis)
	case models.SiteTypeNode, models.SiteTypeDotNet:
		types = append(types, models.ConfigMariaDB, models.ConfigRedis)
	case models.SiteTypeStatic:
		// nginx only
	}

	// create the config rows for the site
	var configs []*models.Config

	// loop through the types and create a config row for each
	for _, t := range types {

		// marshal the defaults for the type to a JSON blob
		blob, err := MarshalDefaults(t)
		if err != nil {
			logger.Error("failed to marshal defaults for type %d: %v", t, err)
			return nil, err
		}

		// create the config row and add it to the slice
		configs = append(configs, &models.Config{
			SiteID: siteID,
			Type:   t,
			Config: blob,
		})
	}

	logger.Debug("created config rows for site %d", siteID)

	// return the slice of config rows
	return configs, nil
}
