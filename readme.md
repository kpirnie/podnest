# <img src="https://cdn.kcp.im/logos/podnest.svg" alt="PodNest ~ Secure. Manage. Deploy" width="64" valign="middle"> PodNest

## Secure. Manage. Deploy


[![Build Main](https://img.shields.io/github/actions/workflow/status/kpirnie/podnest/build.yml?branch=main&label=Main&logoColor=white&logo=github&labelColor=000&style=for-the-badge)](https://github.com/kpirnie/podnest/actions?query=workflow%3A%22Build+and+Push%22+branch%3Amain)
[![Build Develop](https://img.shields.io/github/actions/workflow/status/kpirnie/podnest/build.yml?branch=develop&label=Develop&logoColor=white&logo=github&labelColor=000&style=for-the-badge)](https://github.com/kpirnie/podnest/actions?query=workflow%3A%22Build+and+Push%22+branch%3Adevelop)
[![Last Commit](https://img.shields.io/github/last-commit/kpirnie/podnest?style=for-the-badge&labelColor=000)](https://github.com/kpirnie/podnest/commits/main)
[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg?style=for-the-badge&logo=opensourceinitiative&logoColor=white&labelColor=000)](LICENSE)

[![Go](https://img.shields.io/badge/Go-1.26.2-00ADD8?logo=go&logoColor=white&style=for-the-badge&labelColor=000)](https://go.dev/)
[![Alpine](https://img.shields.io/badge/Base-Alpine%20Linux-0D597F?logo=alpinelinux&logoColor=white&style=for-the-badge&labelColor=000)](https://www.alpinelinux.org/)
[![Kevin Pirnie](https://img.shields.io/badge/-KevinPirnie.com-000d2d?style=for-the-badge&labelColor=000&logoColor=white&logo=data:image/svg%2Bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+CiAgPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz4KICA8ZWxsaXBzZSBjeD0iMTIiIGN5PSIxMiIgcng9IjQuNSIgcnk9IjEwIi8+CiAgPGxpbmUgeDE9IjIiIHkxPSIxMiIgeDI9IjIyIiB5Mj0iMTIiLz4KICA8bGluZSB4MT0iNC41IiB5MT0iNi41IiB4Mj0iMTkuNSIgeTI9IjYuNSIvPgogIDxsaW5lIHgxPSI0LjUiIHkxPSIxNy41IiB4Mj0iMTkuNSIgeTI9IjE3LjUiLz4KPC9zdmc+Cg==)](https://kevinpirnie.com/)
[![Support](https://img.shields.io/badge/Support-Available-28a745?logo=handshake&logoColor=white&style=for-the-badge&labelColor=000)](https://kevinpirnie.com/about-kevin-pirnie/lets-talk/)

A hardened, high-performance web hosting pod manager built on Podman. Provision and manage isolated, production-ready site pods from a single web-based management UI — no shell required after initial setup.

---

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [LIVE LOGS](#live-logs) | [USER MANAGEMENT](#user-management) | [BACKUP & RESTORE](#backup--restore) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

---

## Overview

PodNest provisions and manages isolated web hosting environments using Podman. Each site runs in its own dedicated pod — fully isolated, production-hardened, and manageable entirely through the built-in web UI. No shell access is needed after the initial setup.

**Supported site types:**

| Type | Runtimes Available |
|---|---|
| WordPress | PHP 8.2, 8.3, 8.4, 8.5 |
| PHP | PHP 8.2, 8.3, 8.4, 8.5 |
| Static HTML | nginx only |
| Node.js | Node 22, 23, 24 |
| .NET | .NET 8.0, 9.0, 10.0 |

Each pod is provisioned with nginx as the reverse proxy. WordPress and PHP sites also include PHP-FPM, MariaDB, and Redis. Node.js and .NET sites include MariaDB and Redis. Static HTML sites get nginx only.

All sites share a single global SFTP container for file management — one port, no per-site port allocation required.

The recommended and fully supported deployment method is as a container. The binary option is available for those who prefer to compile and run it directly.

[▲ Back to Top](#PodNest)

---

## Requirements

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [LIVE LOGS](#live-logs) | [USER MANAGEMENT](#user-management) | [BACKUP & RESTORE](#backup--restore) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

**For container deployment (recommended):**
- Podman installed and running on the host
- The Podman socket exposed and accessible (see notes below)
- Docker Compose, Podman Compose, or equivalent for compose-based deployments

**For binary deployment:**
- Go 1.22 or later
- `gcc` and `musl-dev` (CGO is required)
- Podman installed and accessible via socket on the host

### Podman Socket Notes

PodNest communicates with the host Podman daemon through its Unix socket. The socket path varies depending on how Podman is running:

- **Root Podman:** `/run/podman/podman.sock` — this is what the container image expects by default
- **Rootless Podman:** `/run/user/<uid>/podman/podman.sock` — this is the binary default when running as a non-root user

Make sure the socket exists and is accessible before starting PodNest. For rootless Podman, socket lingering must be enabled:

```bash
loginctl enable-linger $USER
systemctl --user start podman.socket
```

[▲ Back to Top](#PodNest)

---

## Running as a Container

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [LIVE LOGS](#live-logs) | [USER MANAGEMENT](#user-management) | [BACKUP & RESTORE](#backup--restore) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

This is the **recommended** way to run PodNest. A pre-built image is published to the GitHub Container Registry — no compilation required.

### Available Image Tags

| Tag | Description |
|---|---|
| `latest` | Latest stable release — use this for production |
| `dev` | Tracks the `develop` branch — use at your own risk |

```
ghcr.io/kevinpirnie/podnest:latest
ghcr.io/kevinpirnie/podnest:dev
```

---

### Quick Start — Podman Run

```bash
podman run -d \
  --name podnest \
  --hostname podnest \
  --restart unless-stopped \
  -p 9000:8080 \
  -p 2222:2222 \
  -v /run/podman/podman.sock:/run/podman/podman.sock:ro \
  -v /your/persistent/path:/opt/podnest:z \
  -e TZ=America/New_York \
  ghcr.io/kevinpirnie/podnest:latest
```

Replace `/your/persistent/path` with a host path where site configs, the database, and application data should persist across restarts and container recreations. Without this mount, all data is lost when the container is removed.

Once running, the UI is available at: `http://your-host:9000`

---

### Docker Compose (Recommended)

A `docker-compose-example.yaml` is included in the repository as a starting point. Copy and adjust it to your environment:

```yaml
services:
  podnest:
    image: ghcr.io/kevinpirnie/podnest:latest
    container_name: podnest
    hostname: podnest
    restart: unless-stopped
    ports:
      - 9000:8080
      - 2222:2222
    volumes:
      - /run/podman/podman.sock:/run/podman/podman.sock:ro
      - /your/persistent/path:/opt/podnest:z
    tmpfs:
      - /tmp
    environment:
      - TZ=${TZ:-America/New_York}
      - LOG_LEVEL=${LOG_LEVEL:-INFO}
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8080/login"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

Start it with:

```bash
docker compose up -d
# or with Podman Compose:
podman-compose up -d
```

### Volume Mount and the `:z` Label

The `:z` flag on the `/opt/podnest` volume mount is a SELinux relabeling option required on systems running SELinux in enforcing mode. It is safe to omit on systems that do not use SELinux.

[▲ Back to Top](#PodNest)

---

## Running with systemd (Recommended for Production)

For production deployments on Linux, running PodNest as a systemd service is recommended over podman-compose. It guarantees the Podman socket exists before the container starts, which prevents a known issue where podman-compose can incorrectly create the socket path as a directory instead of a socket file.

Create `/etc/systemd/system/podnest.service`:

```ini
[Unit]
Description=PodNest Management UI
After=network.target podman.socket
Requires=podman.socket

[Service]
Restart=always
RestartSec=5
ExecStartPre=-/usr/bin/podman rm -f podnest
ExecStart=/usr/bin/podman run \
    --name podnest \
    --hostname podnest \
    -p 80:80 \
    -p 443:443 \
    -p 9000:8080 \
    -v /run/podman/podman.sock:/run/podman/podman.sock:rw \
    -v /your/persistent/path:/opt/podnest:z \
    --tmpfs /tmp \
    -e TZ=America/New_York \
    -e LOG_LEVEL=INFO \
    ghcr.io/kpirnie/podnest:latest serve --app-path /opt/podnest --port 8080 --socket /run/podman/podman.sock
ExecStop=/usr/bin/podman stop podnest

[Install]
WantedBy=multi-user.target
```

Replace `/your/persistent/path` with the host path where your site data should persist.

Enable and start the service:

```bash
systemctl daemon-reload
systemctl enable --now podnest.service
systemctl status podnest.service
```

### Podman Socket Notes

A known issue with podman-compose is that if the Podman socket does not exist at the moment the container starts, the mount point is created as a directory instead of a socket file, causing all Podman API calls to fail with `connection refused`. The systemd unit avoids this by declaring `Requires=podman.socket`, which guarantees the socket exists before the container starts.

If you prefer to use podman-compose, ensure the socket exists before starting:

```bash
systemctl start podman.socket
# verify it is a socket file, not a directory
ls -la /run/podman/podman.sock  # must show srw, not drwx
podman-compose -f /home/admin/podnest.yaml up -d
```

---

## Running the Binary

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [LIVE LOGS](#live-logs) | [USER MANAGEMENT](#user-management) | [BACKUP & RESTORE](#backup--restore) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

> Container deployment is the recommended approach. The binary path is here for advanced users who prefer it.

### Build from Source

Clone the repository:

```bash
git clone https://github.com/kpirnie/podnest.git
cd podnest
git checkout develop
```

Build the binary:

```bash
CGO_ENABLED=1 GOOS=linux go build \
  -ldflags="-s -w -extldflags '-static'" \
  -o podnest ./main.go
```

---

### Initialize the Database

When running the binary for the first time, use the `init` command to set up the database and create your admin account interactively:

```bash
./podnest init --app-path /opt/podnest
```

You will be prompted for:

```
Username :
First name:
Last name :
Email     :
Phone     :
Password  : (hidden)
Confirm   : (hidden)
```

This command only needs to be run once. If an admin account already exists, it will exit with an error and direct you to the UI.

---

### Start the Server

```bash
./podnest serve \
  --app-path /opt/podnest \
  --port 8080 \
  --socket /run/podman/podman.sock
```

---

### Available Commands and Flags

Both `init` and `serve` share the following persistent flags:

| Flag | Default | Description |
|---|---|---|
| `--app-path` | `/opt/podnest` | Base path for the database, site configs, and all application data |
| `--port` | `8080` | Port the management UI listens on |
| `--socket` | `/run/user/<uid>/podman/podman.sock` | Path to the Podman socket |

[▲ Back to Top](#PodNest)

---

## First Login

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [LIVE LOGS](#live-logs) | [USER MANAGEMENT](#user-management) | [BACKUP & RESTORE](#backup--restore) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

### Container

When the container starts for the first time with no existing database, a default admin account is automatically created:

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `podnest1234@` |

> **Change this password immediately after your first login.** The default credentials are well-known and should never be left in place on a production instance.

### Binary

If you used `podnest init`, log in with the credentials you provided during setup. The `serve` command will only auto-seed the default admin credentials above if no admin account exists at startup.

[▲ Back to Top](#PodNest)

---

## Directory Structure

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [LIVE LOGS](#live-logs) | [USER MANAGEMENT](#user-management) | [BACKUP & RESTORE](#backup--restore) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

Once PodNest is running with a persistent volume, the following structure is created at your mounted path (or at `--app-path` for binary deployments):

```
/opt/podnest/
├── podnest.db          # SQLite database — users, sites, domains, configs, SFTP creds
├── sftp/               # Global SFTP container config
│   ├── keys/           # Persistent SSH host keys
│   ├── etc-ssh/
│   │   └── sshd_config.d/
│   │       └── chroot.conf
│   └── users.conf      # SFTP user accounts — managed automatically
└── sites/
    └── <site-name>/
        ├── html/           # Web root — your site files go here
        ├── nginx/
        │   ├── nginx.conf
        │   ├── conf.d/
        │   │   └── site.conf
        │   ├── logs/
        │   └── cache/
        ├── php-fpm/        # WordPress and PHP sites only
        │   ├── www.conf
        │   └── php.ini
        ├── db/             # All sites except Static HTML
        │   └── my.cnf
        ├── redis/          # All sites except Static HTML
        │   └── redis.conf
        ├── backups/        # Restic backup repositories
        │   └── local/      # Local restic repo (SFTP accessible, read-only)
        └── .env            # Auto-generated credentials — do not delete
```

The `.env` file inside each site directory holds the auto-generated database and Redis credentials injected into the pod at runtime. Do not delete or manually edit this file unless you know exactly what you are doing.

The `sftp/users.conf` file is managed automatically by PodNest. Do not edit it manually.

[▲ Back to Top](#PodNest)

---

## Managing Sites

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [LIVE LOGS](#live-logs) | [USER MANAGEMENT](#user-management) | [BACKUP & RESTORE](#backup--restore) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

All site management is handled through the PodNest web UI or via the API. Access the UI at `http://your-host:PORT` after startup.

---

### Creating a Site

Navigate to **Sites → New Site** and fill in the required fields:

| Field | Required | Description |
|---|---|---|
| Name | Yes | Unique identifier for the pod — used as the pod and container name. Lowercase, no spaces. |
| Port | Yes | Host port to expose this site on (e.g. `8081`). Must be unique per site. |
| Site Type | Yes | WordPress, PHP, Static HTML, Node.js, or .NET |
| PHP Version | WordPress / PHP only | PHP 8.0–8.5. Defaults to 8.2. |
| Runtime Version | Node.js / .NET only | Node 20/22/23 or .NET 8.0/9.0/10.0 |
| Start Command | Node.js / .NET only | Command used to start your app (e.g. `node index.js`) |
| Domains | No | One or more domains or subdomains to associate with this site |

Clicking **Create** will:
1. Create the site record in the database
2. Seed default configurations for nginx, PHP, MariaDB, and Redis (as applicable to the site type)
3. Scaffold the site directory structure on disk
4. Generate unique database and Redis credentials and write them to `.env`
5. Generate a unique SFTP password and register the site user with the global SFTP container
6. Provision and start the Podman pod with all required containers

---

### Site Actions

From the site detail view, the following actions are available:

| Action | Description |
|---|---|
| **Start** | Starts the site pod and all its containers |
| **Stop** | Gracefully stops the site pod |
| **Restart** | Stops and restarts the site pod |
| **Flush Cache** | Clears the nginx FastCGI cache for the site |
| **Update Images** | Pulls the latest versions of all container images used by the site |
| **Recreate Pod** | Stops and removes the existing pod, pulls the latest images, and provisions a fresh pod using the existing site data and credentials |

---

### Managing Domains

Each site can have one or more domains associated with it. From the site detail view you can add or remove domains at any time. Domain changes are stored in the database and reflected in the nginx configuration.

---

### Deleting a Site

From the site detail view, select **Delete Site** and confirm. This will:

1. Stop the pod
2. Remove the pod and all its containers
3. Remove the site's SFTP user from the global SFTP container
4. Delete the site record, domains, configs, and SFTP credentials from the database

> **Note:** Deleting a site does **not** automatically remove the site directory on the host. Your web root files and database data under `/opt/podnest/sites/<name>/` remain on disk and must be removed manually if desired.

[▲ Back to Top](#PodNest)

---

## SFTP Access

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [LIVE LOGS](#live-logs) | [USER MANAGEMENT](#user-management) | [BACKUP & RESTORE](#backup--restore) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

All sites share a single global SFTP container listening on port **2222**. Each site gets its own isolated user account automatically created when the site is provisioned.

| Field | Value |
|---|---|
| Host | Your server hostname or IP |
| Port | `2222` |
| Username | The site name (e.g. `mysite`) |
| Password | Auto-generated — visible in the site overview tab |

The password is displayed in the **SFTP Access** card on the site detail overview tab. Click the copy button next to the password to copy it to your clipboard.

To regenerate the SFTP password, click **Regenerate Password** on the site overview tab. The new password takes effect immediately with no downtime — no pod restart required.

---

### Directory Access

Users are chrooted to their site directory and have read/write access to:

| Path | Description |
|---|---|
| `html/` | Web root — upload your site files here |
| `nginx/nginx.conf` | nginx main configuration |
| `nginx/conf.d/` | nginx site server block configuration |
| `php-fpm/` | PHP-FPM configuration files |
| `redis/redis.conf` | Redis configuration |
| `db/my.cnf` | MariaDB configuration |
| `backups/local/` | Local restic backup repository — read-only |

The following are **not** accessible via SFTP:

| Path | Reason |
|---|---|
| `.env` | Auto-generated credentials — root only |
| `nginx/logs/` | nginx log directory — managed by nginx |
| `nginx/cache/` | nginx FastCGI cache — managed by nginx |

> **Note:** After editing configuration files via SFTP, a pod restart is required for the changes to take effect inside the running containers.

[▲ Back to Top](#PodNest)

---

## Built-in Reverse Proxy

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [LIVE LOGS](#live-logs) | [USER MANAGEMENT](#user-management) | [BACKUP & RESTORE](#backup--restore) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

PodNest includes a built-in reverse proxy that routes incoming traffic by domain to the appropriate site pod — no separate nginx layer required.

### How it works

| Port | Behavior |
|---|---|
| `80` | Proxies HTTP traffic by domain; also handles Let's Encrypt HTTP-01 challenges |
| `443` | Proxies HTTPS traffic; issues real certs via Let's Encrypt for publicly reachable domains |

Domains are matched against the domains registered to each site in the UI. Unregistered domains return a `404`.

### SSL / Let's Encrypt

Certificates are issued automatically when:

- The domain is registered to a running site in PodNest
- Port 80 and 443 are publicly reachable from the internet

Certs are stored at `/opt/podnest/certs/` and persist across container restarts.

For servers not publicly reachable, PodNest falls back to a self-signed certificate automatically. The self-signed cert is generated once and persisted to `/opt/podnest/certs/self-signed.crt`.

### Requirements

Expose ports 80 and 443 from your compose file:

```yaml
ports:
  - 80:80
  - 443:443
  - 9000:8080
```

[▲ Back to Top](#PodNest)

---

## Site Configurations

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [LIVE LOGS](#live-logs) | [USER MANAGEMENT](#user-management) | [BACKUP & RESTORE](#backup--restore) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

Each site has up to four configuration sections, editable directly in the UI. Changes are saved to the database and written to disk immediately — no manual file editing required. A pod restart is needed for changes to take effect inside the running containers.

---

### Nginx

Applies to all site types.

| Key | Default | Description |
|---|---|---|
| `worker_processes` | `auto` | Number of nginx worker processes |
| `worker_connections` | `4096` | Max connections per worker |
| `worker_rlimit_nofile` | `65535` | Open file descriptor limit per worker |
| `multi_accept` | `on` | Accept multiple connections at once |
| `keepalive_timeout` | `65` | Keep-alive connection timeout (seconds) |
| `keepalive_requests` | `1000` | Max requests per keep-alive connection |
| `client_max_body_size` | `64m` | Max upload size |
| `client_body_buffer_size` | `16k` | Client request body buffer |
| `client_header_buffer_size` | `1k` | Client request header buffer |
| `large_client_header_buffers` | `4 8k` | Buffers for large client headers |
| `open_file_cache` | `max=65535 inactive=30s` | Open file descriptor cache |
| `open_file_cache_valid` | `60s` | Cache validation interval |
| `open_file_cache_min_uses` | `2` | Min uses before caching a file |
| `gzip` | `on` | Enable gzip compression |
| `gzip_comp_level` | `6` | Compression level (1–9) |
| `gzip_min_length` | `256` | Minimum response size to compress |
| `fastcgi_cache_size` | `2g` | FastCGI cache zone size |
| `fastcgi_cache_inactive` | `60m` | Remove cached items unused for this duration |
| `fastcgi_cache_valid` | `200 60m` | Cache 200 responses for 60 minutes |
| `rate_limit_login` | `5r/m` | Rate limit for login endpoints |
| `rate_limit_xmlrpc` | `2r/m` | Rate limit for xmlrpc.php |
| `rate_limit_general` | `50r/s` | General request rate limit |
| `limit_conn_addr` | `25` | Max concurrent connections per IP |
| `real_ip_header` | `X-Forwarded-For` | Header used to identify the real client IP |

---

### PHP

Applies to WordPress and PHP site types only.

| Key | Default | Description |
|---|---|---|
| `memory_limit` | `256M` | PHP memory limit per request |
| `max_execution_time` | `300` | Max script execution time (seconds) |
| `max_input_time` | `300` | Max time to parse input data (seconds) |
| `post_max_size` | `64M` | Max POST data size |
| `upload_max_filesize` | `64M` | Max file upload size |
| `max_input_vars` | `5000` | Max number of input variables |
| `expose_php` | `Off` | Hide PHP version from response headers |
| `display_errors` | `Off` | Suppress error output to browser |
| `log_errors` | `On` | Log errors to the error log |
| `opcache_enable` | `1` | Enable OPcache |
| `opcache_memory_consumption` | `256` | OPcache shared memory size (MB) |
| `opcache_interned_strings_buffer` | `16` | Interned strings buffer (MB) |
| `opcache_max_accelerated_files` | `10000` | Max cached script files |
| `opcache_revalidate_freq` | `2` | Script revalidation frequency (seconds) |
| `opcache_validate_timestamps` | `0` | Disable timestamp validation (production) |
| `opcache_fast_shutdown` | `1` | Enable fast shutdown sequence |
| `pm` | `dynamic` | PHP-FPM process manager mode |
| `pm_max_children` | `50` | Max PHP-FPM worker processes |
| `pm_start_servers` | `10` | Workers started on boot |
| `pm_min_spare_servers` | `5` | Minimum idle workers |
| `pm_max_spare_servers` | `25` | Maximum idle workers |
| `pm_max_requests` | `500` | Requests per worker before recycling |
| `pm_process_idle_timeout` | `10s` | Idle worker timeout |
| `session_use_strict_mode` | `1` | Reject uninitialized session IDs |
| `session_cookie_httponly` | `1` | HttpOnly flag on session cookie |
| `session_cookie_secure` | `1` | Secure flag on session cookie |
| `session_cookie_samesite` | `Lax` | SameSite policy on session cookie |

---

### MariaDB

Applies to all site types except Static HTML.

| Key | Default | Description |
|---|---|---|
| `innodb_buffer_pool_size` | `2G` | InnoDB buffer pool size |
| `innodb_buffer_pool_instances` | `4` | Number of buffer pool instances |
| `innodb_log_file_size` | `512M` | Redo log file size |
| `innodb_log_buffer_size` | `32M` | Redo log buffer size |
| `innodb_flush_log_at_trx_commit` | `1` | Flush log on every commit (ACID) |
| `innodb_flush_method` | `O_DIRECT` | I/O flush method |
| `innodb_file_per_table` | `ON` | Separate tablespace per table |
| `innodb_read_io_threads` | `8` | Read I/O threads |
| `innodb_write_io_threads` | `8` | Write I/O threads |
| `innodb_io_capacity` | `2000` | I/O operations per second capacity |
| `innodb_io_capacity_max` | `4000` | Max I/O operations per second |
| `max_connections` | `200` | Maximum client connections |
| `max_connect_errors` | `1000000` | Max connection errors before blocking a host |
| `wait_timeout` | `600` | Non-interactive connection timeout (seconds) |
| `interactive_timeout` | `600` | Interactive connection timeout (seconds) |
| `table_open_cache` | `4000` | Open table cache size |
| `table_definition_cache` | `2000` | Table definition cache size |
| `thread_cache_size` | `100` | Cached threads for reuse |
| `tmp_table_size` | `64M` | Max in-memory temp table size |
| `max_heap_table_size` | `64M` | Max MEMORY table size |
| `join_buffer_size` | `4M` | Join buffer size |
| `sort_buffer_size` | `4M` | Sort buffer size |
| `slow_query_log` | `1` | Enable slow query log |
| `long_query_time` | `2` | Slow query threshold (seconds) |
| `local_infile` | `0` | Disable LOAD DATA LOCAL INFILE |
| `skip_name_resolve` | `1` | Skip DNS lookups on connections |

---

### Redis

Applies to all site types except Static HTML.

| Key | Default | Description |
|---|---|---|
| `maxmemory` | `1024mb` | Maximum memory Redis will use |
| `maxmemory_policy` | `allkeys-lru` | Eviction policy when memory limit is reached |
| `tcp_keepalive` | `300` | TCP keepalive interval (seconds) |
| `hz` | `20` | Redis background task frequency |
| `dynamic_hz` | `yes` | Dynamically adjust hz based on load |
| `io_threads` | `4` | I/O thread count |
| `io_threads_do_reads` | `yes` | Use I/O threads for reads |
| `lazyfree_lazy_eviction` | `yes` | Non-blocking eviction |
| `lazyfree_lazy_expire` | `yes` | Non-blocking key expiration |
| `save` | *(empty)* | RDB persistence disabled by default |
| `appendonly` | `no` | AOF persistence disabled by default |

---

### Resetting a Configuration

Any configuration section can be reset to its original defaults from the UI. This overwrites all current values for that section and immediately rewrites the config file to disk. A pod restart is required for the reset to take effect.

[▲ Back to Top](#PodNest)

---

## Live Logs

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [LIVE LOGS](#live-logs) | [USER MANAGEMENT](#user-management) | [BACKUP & RESTORE](#backup--restore) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

PodNest streams live container logs directly to the UI via WebSocket. From the site detail view, select the **Logs** tab and choose which container to tail:

| Container | Description |
|---|---|
| `nginx` | nginx access and error logs (default) |
| `php` | PHP-FPM logs |
| `db` | MariaDB logs |
| `redis` | Redis logs |
| `app` | Application container logs (Node.js / .NET) |

The log stream defaults to the last 100 lines and follows in real time. The tail length can be adjusted up to a maximum of 5000 lines.

[▲ Back to Top](#PodNest)

---

## User Management

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [LIVE LOGS](#live-logs) | [USER MANAGEMENT](#user-management) | [BACKUP & RESTORE](#backup--restore) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

PodNest has two user roles:

| Role | Level | Description |
|---|---|---|
| Manager | 50 | Can create and manage their own sites only |
| Admin | 99 | Full access — all sites and all users |

User management is accessible to Admin-role users only under the **Admin** section of the UI.

---

### Creating a User

| Field | Required | Description |
|---|---|---|
| Username | Yes | Unique login name |
| Password | Yes | Initial password |
| First Name | No | Display name |
| Last Name | No | Display name |
| Email | Yes | Contact email |
| Phone | No | Contact phone |
| Role | No | Manager (default) or Admin |

---

### Updating a User

First name, last name, email, phone, and role can all be updated. Password can optionally be changed at the same time — doing so will invalidate all existing sessions for that user, forcing a fresh login. Only an Admin can change another user's role or username.

---

### Changing a Username

Admins can change any user's username from the edit user modal. Usernames must be unique. The change takes effect immediately and the user will need to log in with their new username on the next login.

---

### Deleting a User

Admins can delete any user account except their own. If the user owns any sites, the deletion will be blocked — those sites must be deleted first.

---

### Two-Factor Authentication (TOTP)

PodNest supports TOTP-based two-factor authentication (RFC 6238, compatible with Google Authenticator, Authy, 1Password, Bitwarden, and any standard TOTP app).

#### Enabling TOTP

1. Open the edit user modal for any user (Admin) or your own profile
2. In the **Two-Factor Authentication** section, click **Enable TOTP**
3. Scan the displayed QR code with your authenticator app — or copy the manual key shown below it
4. Enter the 6-digit code from your app and click **Confirm & Enable**

TOTP is activated immediately on confirmation. From this point forward, logging in requires both your password and a valid TOTP code.

#### Login with TOTP

After entering your username and password, you will be redirected to a second step where you must enter the current 6-digit code from your authenticator app. The code is valid for 30 seconds with a ±30 second clock skew tolerance.

#### Disabling TOTP

Open the edit user modal and click **Disable TOTP** in the Two-Factor Authentication section. This removes the TOTP secret immediately — no code required to disable.

[▲ Back to Top](#PodNest)

---

## Backup & Restore

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [LIVE LOGS](#live-logs) | [USER MANAGEMENT](#user-management) | [BACKUP & RESTORE](#backup--restore) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

PodNest includes a fully integrated backup and restore system powered by [restic](https://restic.net/). Backups are incremental, deduplicated, and encrypted at rest. Each site maintains its own isolated restic repository per destination.

---

### What Gets Backed Up

Every backup snapshot contains a complete, self-contained copy of the site:

| Content | Description |
|---|---|
| `html/` | Full web root |
| `nginx/` | nginx configuration (excluding cache) |
| `php-fpm/` | PHP-FPM configuration |
| `redis/` | Redis configuration |
| `.env` | Site credentials |
| `db_dump.sql` | Full database dump via `mariadb-dump` |

The MariaDB binary data directory (`db/`) and the nginx cache are explicitly excluded — the database is captured via a live dump instead, which is safe to run without stopping the site.

---

### Backup Destinations

Each site can back up to one or both of the following destinations:

**Local** — stored at `sites/<site-name>/backups/local/` inside the site directory. Accessible read-only via SFTP at `backups/local/` within the site's SFTP chroot.

**S3** — stored in an S3-compatible object storage bucket. Supports AWS S3, Backblaze B2, MinIO, Wasabi, iDrive E2, and any S3-compatible endpoint. S3 credentials are configured globally under **Settings → S3 Backup Storage** and apply to all sites.

Destinations are enabled or disabled per site from the **Backups** tab on the site detail view.

---

### Configuring Backup Settings

Navigate to **Settings** and scroll to the **Backup Schedule** and **S3 Backup Storage** sections.

**Backup Schedule**

| Setting | Description |
|---|---|
| Cron Schedule | Standard 5-field cron expression (e.g. `0 2 * * *` for daily at 2am). Leave blank to disable automatic backups. |
| Retain Backups (days) | Snapshots older than this many days are pruned automatically after each backup run. Default: `30`. |

The schedule applies globally — all sites with at least one destination enabled are backed up on each scheduled run.

**S3 Backup Storage**

| Setting | Description |
|---|---|
| Endpoint URL | Full URL to the S3-compatible endpoint (e.g. `https://s3.amazonaws.com`) |
| Bucket | The bucket name to store backups in. Each site uses a separate prefix within the bucket. |
| Region | AWS region or equivalent (default: `us-east-1`) |
| Access Key ID | S3 access key |
| Secret Access Key | S3 secret key — stored encrypted, never returned in full after saving |

---

### Running a Manual Backup

From the **Backups** tab on any site detail view, click **Back Up Now**. A progress modal will be displayed while the backup runs. The snapshot list updates automatically when the backup completes.

---

### Restoring from a Snapshot

From the **Backups** tab, click the restore icon on any listed snapshot and confirm. During the restore:

1. A maintenance page is displayed to site visitors
2. The file tree is restored from the snapshot
3. The database is restored from the embedded dump
4. File permissions are corrected automatically
5. The maintenance page is removed and nginx reloads

The site remains live throughout — only the content is replaced. The restore typically completes in under a minute for small to medium sites.

---

### Downloading a Backup

Click the download icon on any snapshot to export a complete, portable `.tar.gz` archive. The archive contains the full file tree and database dump and can be used to restore the site manually on any system without needing restic.

The filename format is `{sitename}-{date}-{id}.tar.gz`.

> Large sites with many uploaded files may take a moment to generate. A progress modal will be displayed and the download will start automatically.

---

### Deleting a Snapshot

Click the delete icon on any snapshot and confirm. The snapshot is permanently removed from all configured repositories and the restic repos are pruned immediately. This action cannot be undone.

---

### Backup API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/sites/{id}/backup-repo` | Get the backup destination config for a site |
| `PUT` | `/api/sites/{id}/backup-repo` | Update backup destination flags (local/S3 enabled) |
| `GET` | `/api/sites/{id}/backups` | List all backup snapshots for a site |
| `POST` | `/api/sites/{id}/backups` | Trigger an immediate backup |
| `POST` | `/api/sites/{id}/backups/{bid}/restore` | Restore from a snapshot |
| `GET` | `/api/sites/{id}/backups/{bid}/download` | Download snapshot as `.tar.gz` |
| `DELETE` | `/api/sites/{id}/backups/{bid}` | Delete a snapshot |
| `GET` | `/api/sites/{id}/backups/restore-status` | Check if a restore is currently in progress |
| `GET` | `/api/settings/backup` | Get backup and S3 settings (admin only) |
| `PUT` | `/api/settings/backup` | Update backup and S3 settings (admin only) |

[▲ Back to Top](#PodNest)

---

## API Reference

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [LIVE LOGS](#live-logs) | [USER MANAGEMENT](#user-management) | [BACKUP & RESTORE](#backup--restore) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

PodNest exposes a JSON REST API under `/api/`. All API endpoints require a valid session, obtained by logging in via the UI or the `/login` endpoint. The session is maintained via a cookie that must be included in all subsequent requests.

All request and response bodies are JSON. Successful responses return the appropriate HTTP status code (`200 OK`, `201 Created`, `204 No Content`). Errors return a JSON object with an `error` field.

---

### Authentication

**Login**

```
POST /login
```

```json
{
  "username": "admin",
  "password": "podnest1234@"
}
```

A successful login sets a session cookie. Include this cookie in all subsequent API requests.

**Logout**

```
POST /logout
```

Clears the session cookie and invalidates the server-side session.

---

### Sites

**List all sites**

```
GET /api/sites
```

Admins receive all sites. Managers receive only the sites they own.

**Response:**

```json
[
  {
    "ID": 1,
    "UID": 1,
    "Name": "my-wordpress-site",
    "Port": 8081,
    "PHPVersion": 3,
    "SiteStatus": 1,
    "SiteType": 1,
    "RuntimeVersion": null,
    "StartCommand": "",
    "PMAPort": 18081,
    "Created": "2026-04-30T12:00:00Z",
    "Updated": null
  }
]
```

---

**Get a site**

```
GET /api/sites/{id}
```

**Response:**

```json
{
  "site": { ... },
  "domains": [
    { "ID": 1, "SiteID": 1, "Domain": "example.com", "Created": "...", "Updated": null }
  ],
  "sftp": {
    "ID": 1,
    "SiteID": 1,
    "Username": "my-wordpress-site",
    "Password": "generatedpassword",
    "UID": 3001,
    "Created": "...",
    "Updated": null
  }
}
```

---

**Create a site**

```
POST /api/sites
```

**Request body:**

```json
{
  "name": "my-wordpress-site",
  "port": 8081,
  "site_type": 1,
  "php_version": 3,
  "runtime_version": null,
  "start_command": "",
  "domains": ["example.com", "www.example.com"]
}
```

**Site type values:** `1` = WordPress, `2` = PHP, `3` = Static HTML, `4` = Node.js, `5` = .NET

**PHP version values:** `3` = 8.2 *(default)*, `4` = 8.3, `5` = 8.4, `6` = 8.5

**Node runtime version values:** `2` = 22 *(default)*, `3` = 23, `4` = 24

**.NET runtime version values:** `1` = 8.0 *(default)*, `2` = 9.0, `3` = 10.0

`start_command` is only relevant for Node.js and .NET site types.

Returns `201 Created` with the new site object on success.

---

**Update a site**

```
PUT /api/sites/{id}
```

All fields are optional — only supplied fields are updated.

**Request body:**

```json
{
  "name": "renamed-site",
  "port": 8082,
  "php_version": 4,
  "site_type": 1,
  "runtime_version": null,
  "start_command": ""
}
```

---

**Delete a site**

```
DELETE /api/sites/{id}
```

Stops and removes the pod, removes the SFTP user, then deletes the site, domains, configs, and SFTP credentials from the database. The site directory on the host is **not** removed automatically.

Returns `204 No Content` on success.

---

### Site Actions

**Start**

```
POST /api/sites/{id}/start
```

```json
{ "status": "running" }
```

**Stop**

```
POST /api/sites/{id}/stop
```

```json
{ "status": "stopped" }
```

**Restart**

```
POST /api/sites/{id}/restart
```

```json
{ "status": "running" }
```

**Flush nginx cache**

```
POST /api/sites/{id}/flush
```

```json
{ "status": "flushed" }
```

**Update container images**

```
POST /api/sites/{id}/update
```

```json
{ "status": "images updated" }
```

**Recreate pod**

```
POST /api/sites/{id}/recreate
```

```json
{ "status": "running" }
```

**Get site status**

```
GET /api/sites/{id}/status
```

Returns the raw pod inspect payload from Podman, including pod state and per-container states.

**Regenerate SFTP password**

```
POST /api/sites/{id}/sftp-regen
```

Generates a new cryptographically random SFTP password for the site and applies it to the running global SFTP container immediately with zero downtime. The new password is persisted to the database and displayed in the site overview tab.

```json
{ "status": "ok" }
```

**Issue phpMyAdmin token**

```
POST /api/sites/{id}/pma-token
```

Generates a short-lived one-time token for phpMyAdmin access. Returns the URL to open in a new tab. Token expires after 10 minutes or first use.

```json
{ "url": "/pma/1?tok=abc123..." }
```

---

### Domains

**List domains for a site**

```
GET /api/sites/{id}/domains
```

**Add a domain**

```
POST /api/sites/{id}/domains
```

```json
{ "domain": "www.example.com" }
```

**Delete a domain**

```
DELETE /api/sites/{id}/domains/{did}
```

Returns `204 No Content` on success.

---

### Configs

**Get all configs for a site**

```
GET /api/sites/{id}/configs
```

Returns a map of config type integer to key/value pairs:

```json
{
  "1": { "worker_processes": "auto", "gzip": "on" },
  "2": { "memory_limit": "256M", "pm": "dynamic" },
  "3": { "max_connections": "200", "innodb_buffer_pool_size": "2G" },
  "4": { "maxmemory": "1024mb", "maxmemory_policy": "allkeys-lru" }
}
```

**Config type values:** `1` = Nginx, `2` = PHP, `3` = MariaDB, `4` = Redis

**Update a config**

```
PUT /api/sites/{id}/configs/{type}
```

Send only the keys you want to change. Setting a key to an empty string removes it from the config. Changes are merged over the existing config and written to disk immediately. Restart the pod to apply.

**Reset a config to defaults**

```
POST /api/sites/{id}/configs/{type}/reset
```

Overwrites the entire config section with built-in defaults and rewrites the file to disk immediately. Restart the pod to apply.

---

### Users

> All user endpoints require Admin role.

**List all users**

```
GET /api/users
```

**Get a user**

```
GET /api/users/{id}
```

**Create a user**

```
POST /api/users
```

```json
{
  "uname": "jdoe",
  "password": "securepassword",
  "fname": "John",
  "lname": "Doe",
  "email": "jdoe@example.com",
  "phone": "555-1234",
  "role": 50
}
```

**Update a user**

```
PUT /api/users/{id}
```

All fields are optional. Admin-only fields: `uname` (must be unique), `role`. Providing `password` immediately invalidates all existing sessions for that user.

```json
{
  "uname": "newusername",
  "fname": "Jane",
  "lname": "Doe",
  "email": "jane@example.com",
  "phone": "555-5678",
  "role": 99,
  "password": "newpassword"
}
```

**Setup TOTP**

```
POST /api/users/{id}/totp/setup
```

Generates a new TOTP secret and returns the provisioning URI. Admin or self only.

```json
{
  "secret": "BASE32SECRETKEY",
  "uri": "otpauth://totp/PodNest:username?secret=...&issuer=PodNest"
}
```

**Confirm and activate TOTP**

```
POST /api/users/{id}/totp/confirm
```

Verifies the provided 6-digit code against the pending secret and activates TOTP for the user. Admin or self only.

```json
{ "code": "123456" }
```

Returns `200 OK` with `{ "status": "ok" }` on success.

**Disable TOTP**

```
DELETE /api/users/{id}/totp
```

Removes the TOTP secret and disables two-factor authentication for the user. Admin or self only.

Returns `200 OK` with `{ "status": "ok" }` on success.

**Delete a user**

```
DELETE /api/users/{id}
```

Returns `204 No Content` on success.

---

### Live Log Stream (WebSocket)

```
GET /api/sites/{id}/logs?container=nginx&tail=100
```

Upgrades to a WebSocket connection and streams live logs from the specified container.

**Query parameters:**

| Parameter | Default | Options | Description |
|---|---|---|---|
| `container` | `nginx` | `nginx`, `php`, `db`, `redis`, `app` | Which container to tail |
| `tail` | `100` | `1`–`5000` | Number of historical lines to include before following |

[▲ Back to Top](#PodNest)

---

## License

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [LIVE LOGS](#live-logs) | [USER MANAGEMENT](#user-management) | [BACKUP & RESTORE](#backup--restore) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

PodNest is licensed under the [MIT License](LICENSE). See the `LICENSE` file in the repository for the full license text.

[▲ Back to Top](#PodNest)

---

## Support

This project is provided as-is through GitHub. **Paid support is available** for those who need hands-on help with setup, configuration, customization, or troubleshooting. Reach out through [https://kevinpirnie.com/about-kevin-pirnie/lets-talk/](https://kevinpirnie.com/about-kevin-pirnie/lets-talk/) to inquire about support options.

[▲ Back to Top](#PodNest)

---

## Planned / In The Works

The following features are actively planned or currently in development. This list represents the roadmap for PodNest — contributions and feedback are welcome.

### Infrastructure

| Feature | Description |
|---|---|
| **Varnish Cache** | Optional per-site Varnish container for full-page caching, configurable VCL, sits in front of nginx within the pod |

### Site Management

| Feature | Description |
|---|---|
| **Cloning / One-Click Staging** | Duplicate a live site to a staging environment with a single click — files, database, and all |
| **PHP Version Switching** | Change a site's PHP version and recreate the pod without losing data |
| **Custom Environment Variables** | Per-site environment variables injected into containers at runtime |

### Operations

| Feature | Description |
|---|---|
| **Resource Monitoring** | Per-pod CPU, memory, and disk usage visible in the UI |
| **Uptime / Health Monitoring** | Per-site health checks with configurable alerting |
| **Scheduled Restarts** | Cron-style restart scheduling per site |

### Developer

| Feature | Description |
|---|---|
| **Git Deploy** | Push-to-deploy via webhook integration |

[▲ Back to Top](#PodNest)
