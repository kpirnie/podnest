// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package config

import (
	"encoding/json"
	"fmt"
	"podnest/internal/logger"
	"podnest/internal/models"
	"regexp"
	"strings"
)

// safeConfigValue allows only characters found in legitimate scalar config
// values (numbers, sizes, durations, on/off, paths, simple space/comma lists).
// Anything else — newlines, ; { } " ' $ backtick etc. — is treated as a
// directive-injection attempt and the value is rejected in favour of the default.
var safeConfigValue = regexp.MustCompile(`^[A-Za-z0-9 ._:/=+,%-]*$`)

// RenderNginxMain renders the nginx.conf from a config JSON blob
func RenderNginxMain(configJSON string) (string, error) {

	// The main nginx.conf is rendered with all possible directives
	cfg, err := unmarshal(configJSON)
	if err != nil {
		logger.Error("failed to unmarshal config JSON for nginx.conf: %v", err)
		return "", err
	}

	// Helper function to get a value from the config, falling back to defaults
	v := func(key string) string { return get(cfg, key, DefaultNginx) }

	logger.Debug("rendering nginx.conf with config: %v", cfg)

	// Render the nginx.conf with the values from the config JSON
	return fmt.Sprintf(`user nginx;
worker_processes     %s;
worker_rlimit_nofile %s;
error_log 			 /dev/stderr warn;
pid       			 /var/run/nginx.pid;

events {
    worker_connections %s;
    multi_accept       %s;
    use                epoll;
}

http {
    include      /etc/nginx/mime.types;
    default_type application/octet-stream;

    sendfile            on;
    tcp_nopush          on;
    tcp_nodelay         on;
    keepalive_timeout   %s;
    keepalive_requests  %s;
    types_hash_max_size 2048;
    server_tokens       off;

    client_body_buffer_size     %s;
    client_header_buffer_size   %s;
    client_max_body_size        %s;
    large_client_header_buffers %s;

    open_file_cache          %s;
    open_file_cache_valid    %s;
    open_file_cache_min_uses %s;
    open_file_cache_errors   on;

    gzip              %s;
    gzip_vary         on;
    gzip_proxied      any;
    gzip_comp_level   %s;
    gzip_min_length   %s;
    gzip_buffers      16 8k;
    gzip_types
        application/atom+xml application/javascript application/json
        application/ld+json application/manifest+json application/rss+xml
        application/vnd.ms-fontobject application/x-font-ttf
		font/woff font/woff2
        application/xhtml+xml application/xml font/opentype
        image/svg+xml image/x-icon text/css text/plain;

	brotli            %s;
    brotli_comp_level %s;
    brotli_min_length %s;
    brotli_types
        application/atom+xml application/javascript application/json
        application/ld+json application/manifest+json application/rss+xml
        application/vnd.ms-fontobject application/x-font-ttf
		font/woff font/woff2
        application/xhtml+xml application/xml font/opentype
        image/svg+xml image/x-icon text/css text/plain;

    zstd            %s;
    zstd_comp_level %s;
    zstd_min_length %s;
    zstd_types
        application/atom+xml application/javascript application/json
        application/ld+json application/manifest+json application/rss+xml
        application/vnd.ms-fontobject application/x-font-ttf
		font/woff font/woff2
        application/xhtml+xml application/xml font/opentype
        image/svg+xml image/x-icon text/css text/plain;

    fastcgi_ignore_headers     Cache-Control Expires Set-Cookie;

    limit_req_zone  $binary_remote_addr zone=wp_login:10m rate=%s;
    limit_req_zone  $binary_remote_addr zone=xmlrpc:10m   rate=%s;
    limit_req_zone  $binary_remote_addr zone=general:10m  rate=%s;
    limit_conn_zone $binary_remote_addr zone=addr:10m;

    set_real_ip_from  127.0.0.1;
    set_real_ip_from  10.0.0.0/8;
    set_real_ip_from  172.16.0.0/12;
    set_real_ip_from  192.168.0.0/16;
    real_ip_header    %s;
    real_ip_recursive on;

    log_format main '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    'rt=$request_time';
    access_log 	/dev/stdout main;

    include 	/etc/nginx/conf.d/*.conf;
}
`,
		v("worker_processes"),
		v("worker_rlimit_nofile"),
		v("worker_connections"),
		v("multi_accept"),
		v("keepalive_timeout"),
		v("keepalive_requests"),
		v("client_body_buffer_size"),
		v("client_header_buffer_size"),
		v("client_max_body_size"),
		v("large_client_header_buffers"),
		v("open_file_cache"),
		v("open_file_cache_valid"),
		v("open_file_cache_min_uses"),
		v("gzip"),
		v("gzip_comp_level"),
		v("gzip_min_length"),
		v("brotli"),
		v("brotli_comp_level"),
		v("brotli_min_length"),
		v("zstd"),
		v("zstd_comp_level"),
		v("zstd_min_length"),
		v("rate_limit_login"),
		v("rate_limit_xmlrpc"),
		v("rate_limit_general"),
		v("real_ip_header"),
	), nil
}

// RenderNginxSite renders the per-site server block (conf.d/site.conf).
// When varnishEnabled is true, nginx listens on VarnishNginxPort instead of 80.
func RenderNginxSite(configJSON string, siteType int, varnishEnabled bool) (string, error) {
	listenPort := 80
	if varnishEnabled {
		listenPort = models.VarnishNginxPort
	}
	switch siteType {
	case models.SiteTypeNode:
		logger.Debug("rendering nginx.conf for Node.js site")
		return renderNginxProxy(configJSON, models.NodeInternalPort, listenPort)
	case models.SiteTypeDotNet:
		logger.Debug("rendering nginx.conf for .NET site")
		return renderNginxProxy(configJSON, models.DotNetInternalPort, listenPort)
	case models.SiteTypeStatic:
		logger.Debug("rendering nginx.conf for static site")
		return renderNginxStatic(configJSON, listenPort)
	default:
		logger.Debug("rendering nginx.conf for PHP site")
		return renderNginxPHP(configJSON, listenPort)
	}
}

// RenderPHPFPM renders the www.conf for php-fpm.
// siteUID is the numeric UID of the SFTP user so that PHP-created files
// are owned by the same account the SFTP user authenticates as.
func RenderPHPFPM(configJSON string, siteUID int) (string, error) {

	// The www.conf is only rendered for PHP sites, and contains the process manager settings
	cfg, err := unmarshal(configJSON)
	if err != nil {
		logger.Error("failed to unmarshal config JSON for php-fpm: %v", err)
		return "", err
	}

	// Helper function to get a value from the config, falling back to defaults
	v := func(key string) string { return get(cfg, key, DefaultPHP) }

	logger.Debug("rendering php-fpm.conf with config: %v", cfg)

	return fmt.Sprintf(`[www]
user  = %d
group = %d

listen              	= 127.0.0.1:9000
listen.allowed_clients  = 127.0.0.1

pm                      = %s
pm.max_children         = %s
pm.start_servers        = %s
pm.min_spare_servers    = %s
pm.max_spare_servers    = %s
pm.max_requests         = %s
pm.process_idle_timeout = %s

request_terminate_timeout = 300
request_slowlog_timeout   = 5s
slowlog                   = /proc/self/fd/2

pm.status_path = /fpm-status
ping.path      = /fpm-ping

clear_env = no
`,
		siteUID,
		siteUID,
		v("pm"),
		v("pm_max_children"),
		v("pm_start_servers"),
		v("pm_min_spare_servers"),
		v("pm_max_spare_servers"),
		v("pm_max_requests"),
		v("pm_process_idle_timeout"),
	), nil
}

// RenderPHPIni renders the php.ini override file
func RenderPHPIni(configJSON string) (string, error) {

	// The php.ini override file is only rendered for PHP sites, and contains the PHP settings
	cfg, err := unmarshal(configJSON)
	if err != nil {
		logger.Error("failed to unmarshal config JSON for php.ini: %v", err)
		return "", err
	}

	// Helper function to get a value from the config, falling back to defaults
	v := func(key string) string { return get(cfg, key, DefaultPHP) }

	logger.Debug("rendering php.ini with config: %v", cfg)

	return fmt.Sprintf(`expose_php             = %s
display_errors         = %s
display_startup_errors = Off
log_errors             = %s
error_log              = /proc/self/fd/2
error_reporting        = E_ALL & ~E_DEPRECATED & ~E_STRICT
disable_functions      = exec,passthru,shell_exec,system,popen,pcntl_exec,dl,parse_ini_file,show_source,symlink,putenv

memory_limit        = %s
max_execution_time  = %s
max_input_time      = %s
post_max_size       = %s
upload_max_filesize = %s
max_input_vars      = %s

session.use_strict_mode  = %s
session.cookie_httponly  = %s
session.cookie_secure    = %s
session.cookie_samesite  = %s
session.use_only_cookies = 1

opcache.enable                  = %s
opcache.memory_consumption      = %s
opcache.interned_strings_buffer = %s
opcache.max_accelerated_files   = %s
opcache.revalidate_freq         = %s
opcache.validate_timestamps     = %s
opcache.fast_shutdown           = %s
opcache.save_comments           = 1
opcache.enable_file_override    = 1
`,
		v("expose_php"),
		v("display_errors"),
		v("log_errors"),
		v("memory_limit"),
		v("max_execution_time"),
		v("max_input_time"),
		v("post_max_size"),
		v("upload_max_filesize"),
		v("max_input_vars"),
		v("session_use_strict_mode"),
		v("session_cookie_httponly"),
		v("session_cookie_secure"),
		v("session_cookie_samesite"),
		v("opcache_enable"),
		v("opcache_memory_consumption"),
		v("opcache_interned_strings_buffer"),
		v("opcache_max_accelerated_files"),
		v("opcache_revalidate_freq"),
		v("opcache_validate_timestamps"),
		v("opcache_fast_shutdown"),
	), nil
}

// RenderMariaDB renders the my.cnf
func RenderMariaDB(configJSON string) (string, error) {

	// The my.cnf is only rendered for MariaDB sites, and contains the database settings
	cfg, err := unmarshal(configJSON)
	if err != nil {
		logger.Error("failed to unmarshal config JSON for MariaDB: %v", err)
		return "", err
	}

	// Helper function to get a value from the config, falling back to defaults
	v := func(key string) string { return get(cfg, key, DefaultMariaDB) }

	logger.Debug("rendering my.cnf with config: %v", cfg)

	return fmt.Sprintf(`[mysqld]
bind-address        = 127.0.0.1
skip-name-resolve   = %s
local_infile        = %s

max_connections     = %s
max_connect_errors  = %s
wait_timeout        = %s
interactive_timeout = %s
max_allowed_packet  = %s

innodb_buffer_pool_size       = %s
innodb_buffer_pool_instances  = %s
innodb_log_file_size          = %s
innodb_log_buffer_size        = %s
innodb_flush_log_at_trx_commit = %s
innodb_flush_method           = %s
innodb_file_per_table         = %s
innodb_stats_on_metadata      = 0
innodb_read_io_threads        = %s
innodb_write_io_threads       = %s
innodb_io_capacity            = %s
innodb_io_capacity_max        = %s
innodb_autoinc_lock_mode      = 2

table_open_cache       = %s
table_definition_cache = %s
thread_cache_size      = %s
tmp_table_size         = %s
max_heap_table_size    = %s
join_buffer_size       = %s
sort_buffer_size       = %s

slow_query_log                 = %s
slow_query_log_file            = /var/lib/mysql/slow.log
long_query_time                = %s
log_queries_not_using_indexes  = %s

read_buffer_size               = %s
read_rnd_buffer_size           = %s
bulk_insert_buffer_size        = %s

query_cache_type               = %s
performance_schema             = %s
`,
		v("skip_name_resolve"),
		v("local_infile"),
		v("max_connections"),
		v("max_connect_errors"),
		v("wait_timeout"),
		v("interactive_timeout"),
		v("max_allowed_packet"),
		v("innodb_buffer_pool_size"),
		v("innodb_buffer_pool_instances"),
		v("innodb_log_file_size"),
		v("innodb_log_buffer_size"),
		v("innodb_flush_log_at_trx_commit"),
		v("innodb_flush_method"),
		v("innodb_file_per_table"),
		v("innodb_read_io_threads"),
		v("innodb_write_io_threads"),
		v("innodb_io_capacity"),
		v("innodb_io_capacity_max"),
		v("table_open_cache"),
		v("table_definition_cache"),
		v("thread_cache_size"),
		v("tmp_table_size"),
		v("max_heap_table_size"),
		v("join_buffer_size"),
		v("sort_buffer_size"),
		v("slow_query_log"),
		v("long_query_time"),
		v("log_queries_not_using_indexes"),
		v("read_buffer_size"),
		v("read_rnd_buffer_size"),
		v("bulk_insert_buffer_size"),
		v("query_cache_type"),
		v("performance_schema"),
	), nil
}

// RenderRedis renders the redis.conf
func RenderRedis(configJSON, redisPassword string) (string, error) {

	// The redis.conf is only rendered for Redis sites, and contains the Redis settings
	cfg, err := unmarshal(configJSON)
	if err != nil {
		logger.Error("failed to unmarshal config JSON for Redis: %v", err)
		return "", err
	}

	// Helper function to get a value from the config, falling back to defaults
	v := func(key string) string { return get(cfg, key, DefaultRedis) }

	logger.Debug("rendering redis.conf with config: %v", cfg)

	return fmt.Sprintf(`bind 127.0.0.1
requirepass %s

maxmemory        %s
maxmemory-policy %s

save %s
appendonly %s

tcp-keepalive %s
hz            %s
dynamic-hz    %s

lazyfree-lazy-eviction   %s
lazyfree-lazy-expire     %s

io-threads          %s
io-threads-do-reads %s
`,
		redisPassword,
		v("maxmemory"),
		v("maxmemory_policy"),
		v("save"),
		v("appendonly"),
		v("tcp_keepalive"),
		v("hz"),
		v("dynamic_hz"),
		v("lazyfree_lazy_eviction"),
		v("lazyfree_lazy_expire"),
		v("io_threads"),
		v("io_threads_do_reads"),
	), nil
}

// VarnishEnabled reports whether varnish is enabled in a config JSON blob
func VarnishEnabled(configJSON string) bool {
	if configJSON == "" {
		return false
	}
	cfg, err := unmarshal(configJSON)
	if err != nil {
		return false
	}
	return strings.ToLower(cfg["enabled"]) == "true"
}

// VarnishMemorySize returns the memory_size value from a varnish config JSON blob
func VarnishMemorySize(configJSON string) string {
	if configJSON == "" {
		return DefaultVarnish["memory_size"]
	}
	cfg, err := unmarshal(configJSON)
	if err != nil {
		return DefaultVarnish["memory_size"]
	}
	return get(cfg, "memory_size", DefaultVarnish)
}

// RenderVarnish renders the Varnish VCL configuration file from a config JSON blob
func RenderVarnish(configJSON string) (string, error) {
	cfg, err := unmarshal(configJSON)
	if err != nil {
		logger.Error("failed to unmarshal config JSON for Varnish: %v", err)
		return "", err
	}

	v := func(key string) string { return get(cfg, key, DefaultVarnish) }

	// build the vcl_recv bypass blocks from the configurable ignore types
	var bypasses strings.Builder

	if v("bypass_query_strings") == "true" {
		bypasses.WriteString("\n\t# bypass if a query string is present\n\tif (req.url ~ \"\\?\") {\n\t\treturn (pass);\n\t}\n")
	}

	if pattern := buildCSVPattern(v("bypass_paths")); pattern != "" {
		bypasses.WriteString(fmt.Sprintf(
			"\n\t# bypass configured paths\n\tif (req.url ~ \"^(%s)\") {\n\t\treturn (pass);\n\t}\n",
			pattern,
		))
	}

	if pattern := buildCSVPattern(v("bypass_cookies")); pattern != "" {
		bypasses.WriteString(fmt.Sprintf(
			"\n\t# bypass for configured cookies (logged-in users, session holders, etc.)\n\tif (req.http.Cookie ~ \"(%s)\") {\n\t\treturn (pass);\n\t}\n",
			pattern,
		))
	}

	if pattern := buildExtPattern(v("bypass_extensions")); pattern != "" {
		bypasses.WriteString(fmt.Sprintf(
			"\n\t# bypass configured file extensions\n\tif (req.url ~ \"\\.(%s)(\\?|$)\") {\n\t\treturn (pass);\n\t}\n",
			pattern,
		))
	}

	logger.Debug("rendering varnish VCL with config: %v", cfg)

	return fmt.Sprintf(`vcl 4.1;

import std;

backend default {
    .host                  = "127.0.0.1";
    .port                  = "%d";
    .connect_timeout       = %s;
    .first_byte_timeout    = %s;
    .between_bytes_timeout = %s;
}

sub vcl_recv {

	# pass the real client IP to the backend
    if (req.http.X-Forwarded-For) {
        set req.http.X-Forwarded-For = req.http.X-Forwarded-For + ", " + client.ip;
    } else {
        set req.http.X-Forwarded-For = client.ip;
    }

    # always pass non-cacheable HTTP methods
    if (req.method != "GET" && req.method != "HEAD") {
        return (pass);
    }
%s
    # strip cookies from cacheable requests to allow caching
    unset req.http.Cookie;
}

sub vcl_backend_response {
    set beresp.ttl   = %s;
    set beresp.grace = %s;

    # a response that sets a cookie is user-specific — the request-side
    # bypass list only covers cookies already known to this site's config
    if (beresp.http.Set-Cookie) {
        set beresp.uncacheable = true;
        set beresp.ttl = 0s;
        return (deliver);
    }

    # do not cache server errors
    if (beresp.status >= 500) {
        set beresp.uncacheable = true;
        set beresp.ttl = 0s;
    }
}

sub vcl_deliver {
    if (obj.hits > 0) {
        set resp.http.X-Cache = "VAR-HIT";
    } else {
        set resp.http.X-Cache = "VAR-MISS";
    }
    unset resp.http.Via;
    unset resp.http.X-Varnish;
}
`,
		models.VarnishNginxPort,
		v("connect_timeout"),
		v("first_byte_timeout"),
		v("between_bytes_timeout"),
		bypasses.String(),
		v("ttl"),
		v("grace"),
	), nil
}

// -- internal ----------------------------------------------------------------

// renderNginxPHP renders the server block for WordPress and PHP sites
func renderNginxPHP(configJSON string, listenPort int) (string, error) {

	// The PHP server block is rendered with the PHP-specific directives, including the FastCGI cache settings
	cfg, err := unmarshal(configJSON)
	if err != nil {
		logger.Error("failed to unmarshal config JSON for Nginx PHP: %v", err)
		return "", err
	}

	// Helper function to get a value from the config, falling back to defaults
	v := func(key string) string { return get(cfg, key, DefaultNginx) }

	logger.Debug("rendering Nginx PHP server block with config: %v", cfg)

	return fmt.Sprintf(`server {
    listen %d;
    server_name _;

	port_in_redirect off;
	server_name_in_redirect off;

    root  /var/www/html;
    index index.php index.html;

	access_log /dev/stdout main;
    error_log  /dev/stderr warn;

	# only allow standard HTTP methods
	if ($request_method !~ ^(GET|HEAD|POST|PUT|DELETE|OPTIONS|PATCH)$) {
		return 405;
	}
	# block requests with no or malformed host header
	if ($host !~* "^[a-z0-9\.\-]+$") {
		return 400;
	}

    limit_conn addr %s;
    limit_req  zone=general burst=100 nodelay;

    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \.php$ {
        try_files $uri =404;
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param PATH_INFO $fastcgi_path_info;
		fastcgi_param HTTPS on;
		fastcgi_param HTTP_X_FORWARDED_PROTO $http_x_forwarded_proto;
        fastcgi_read_timeout    300;
        fastcgi_connect_timeout 60;
        fastcgi_send_timeout    300;
        fastcgi_buffer_size     32k;
        fastcgi_buffers         16 16k;
        fastcgi_busy_buffers_size 32k;
    }

    location = /wp-login.php {
        limit_req  zone=wp_login burst=3 nodelay;
        fastcgi_pass  127.0.0.1:9000;
        include       fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_read_timeout 60;
    }

    location = /xmlrpc.php {
        # deny all;
        limit_req  zone=xmlrpc burst=2 nodelay;
        fastcgi_pass  127.0.0.1:9000;
        include       fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }

    location ~* \.(css|gif|ico|jpe?g|js|png|svg|webp|woff2?)$ {
        expires    max;
        add_header Cache-Control "public, immutable";
        log_not_found off;
    }

    location = /favicon.ico { log_not_found off; access_log off; }
    location = /robots.txt  { log_not_found off; access_log off; allow all; }

    location ~ /\.                          { deny all; }
    location ~* /(?:uploads|files)/.*\.php$ { deny all; }
    location ~* \.(engine|inc|info|install|make|module|profile|po|sh|sql|tpl|xtmpl)$ { deny all; }

    # include per-site nginx rules if present
    include /var/www/html/.nginx.conf*;
}
`,
		listenPort,
		v("limit_conn_addr"),
	), nil
}

// renderNginxProxy renders the server block for Node.js and .NET sites
func renderNginxProxy(configJSON string, upstreamPort int, listenPort int) (string, error) {

	// The proxy server block is rendered with the proxy_pass directive pointing to the appropriate upstream port
	cfg, err := unmarshal(configJSON)
	if err != nil {
		logger.Error("failed to unmarshal config JSON for Nginx proxy: %v", err)
		return "", err
	}

	// Helper function to get a value from the config, falling back to defaults
	v := func(key string) string { return get(cfg, key, DefaultNginx) }

	logger.Debug("rendering Nginx proxy server block with config: %v", cfg)

	return fmt.Sprintf(`server {
    listen %d;
    server_name _;

	port_in_redirect off;
	server_name_in_redirect off;

	access_log /dev/stdout main;
    error_log  /dev/stderr warn;

	# only allow standard HTTP methods
	if ($request_method !~ ^(GET|HEAD|POST|PUT|DELETE|OPTIONS|PATCH)$) {
		return 405;
	}
	# block requests with no or malformed host header
	if ($host !~* "^[a-z0-9\.\-]+$") {
		return 400;
	}

    limit_conn addr %s;
    limit_req  zone=general burst=100 nodelay;

    location / {
        proxy_pass         http://127.0.0.1:%d;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 60;
        proxy_send_timeout 300;
    }

    location ~* \.(css|gif|ico|jpe?g|js|png|svg|webp|woff2?)$ {
        proxy_pass         http://127.0.0.1:%d;
        expires    max;
        add_header Cache-Control "public, immutable";
        log_not_found off;
    }

    location = /favicon.ico { log_not_found off; access_log off; }
    location = /robots.txt  { log_not_found off; access_log off; allow all; }
    location ~ /\. { deny all; }
}
`,
		listenPort,
		v("limit_conn_addr"),
		upstreamPort,
		upstreamPort,
	), nil
}

// renderNginxStatic renders the server block for static HTML sites
func renderNginxStatic(configJSON string, listenPort int) (string, error) {

	// The static server block is rendered with the try_files directive and no PHP handling
	cfg, err := unmarshal(configJSON)
	if err != nil {
		logger.Error("failed to unmarshal config JSON for Nginx static: %v", err)
		return "", err
	}

	// Helper function to get a value from the config, falling back to defaults
	v := func(key string) string { return get(cfg, key, DefaultNginx) }

	logger.Debug("rendering Nginx static server block with config: %v", cfg)

	return fmt.Sprintf(`server {
    listen %d;
    server_name _;

	port_in_redirect off;
	server_name_in_redirect off;

    root  /var/www/html;
    index index.html index.htm;

	access_log /dev/stdout main;
    error_log  /dev/stderr warn;

	# only allow standard HTTP methods
	if ($request_method !~ ^(GET|HEAD|POST|PUT|DELETE|OPTIONS|PATCH)$) {
		return 405;
	}
	# block requests with no or malformed host header
	if ($host !~* "^[a-z0-9\.\-]+$") {
		return 400;
	}

    limit_conn addr %s;
    limit_req  zone=general burst=100 nodelay;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~* \.(css|gif|ico|jpe?g|js|png|svg|webp|woff2?)$ {
        expires    max;
        add_header Cache-Control "public, immutable";
        log_not_found off;
    }

    location = /favicon.ico { log_not_found off; access_log off; }
    location = /robots.txt  { log_not_found off; access_log off; allow all; }
    location ~ /\. { deny all; }

    # include per-site nginx rules if present
    include /var/www/html/.nginx.conf*;
}
`,
		listenPort,
		v("limit_conn_addr"),
	), nil
}

// unmarshal takes the config JSON and unmarshals it into a simple map[string]string for easy access in the templates
func unmarshal(configJSON string) (map[string]string, error) {

	// hold the config values in a simple map[string]string for easy access in the templates
	var cfg map[string]string

	// Unmarshal the config JSON into the cfg map
	if err := json.Unmarshal([]byte(configJSON), &cfg); err != nil {
		logger.Error("failed to unmarshal config JSON: %v", err)
		return nil, err
	}

	// Log the config values at debug level
	logger.Debug("unmarshaled config JSON: %v", cfg)
	return cfg, nil
}

// get returns the value from cfg, falling back to the defaults map
func get(cfg map[string]string, key string, defaults map[string]string) string {

	logger.Debug("getting config value for key '%s'", key)

	// Return the user value only when it is non-empty AND cannot break out of a
	// single config directive; otherwise fall back to the safe default
	if v, ok := cfg[key]; ok && v != "" {
		if safeConfigValue.MatchString(v) {
			return v
		}
		logger.Warn("config: rejecting unsafe value for key '%s' — using default", key)
	}

	// If the value is not set in cfg, return the default value from defaults if it exists, otherwise return an empty string
	if v, ok := defaults[key]; ok {
		return v
	}

	// If the value is not set in either cfg or defaults, return an empty string
	return ""
}

// buildCSVPattern converts a comma-separated list into a VCL alternation pattern.
// Each entry is regex-escaped — safeConfigValue permits '.', '+' and '%', so an
// unescaped entry could widen a bypass rule to match every request.
func buildCSVPattern(csv string) string {
	var parts []string
	for p := range strings.SplitSeq(csv, ",") {
		if p = strings.TrimSpace(p); p != "" {
			parts = append(parts, regexp.QuoteMeta(p))
		}
	}
	return strings.Join(parts, "|")
}

// buildExtPattern converts a comma-separated extension list (with or without
// leading dots) into a VCL alternation pattern
func buildExtPattern(csv string) string {
	var parts []string
	for p := range strings.SplitSeq(csv, ",") {
		p = strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(p), "."))
		if p != "" {
			parts = append(parts, regexp.QuoteMeta(p))
		}
	}
	return strings.Join(parts, "|")
}
