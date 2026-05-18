# <img src="https://cdn.kcp.im/logos/podnest.svg" alt="PodNest ~ Secure. Manage. Deploy" width="64" valign="middle"> PodNest

## Secure. Manage. Deploy.

[![Build Main](https://img.shields.io/github/actions/workflow/status/kpirnie/podnest/build.yml?branch=main&label=Main&logoColor=white&logo=github&labelColor=000&style=for-the-badge)](https://github.com/kpirnie/podnest/actions?query=workflow%3A%22Build+and+Push%22+branch%3Amain)
[![Build Develop](https://img.shields.io/github/actions/workflow/status/kpirnie/podnest/build.yml?branch=develop&label=Develop&logoColor=white&logo=github&labelColor=000&style=for-the-badge)](https://github.com/kpirnie/podnest/actions?query=workflow%3A%22Build+and+Push%22+branch%3Adevelop)
[![Last Commit](https://img.shields.io/github/last-commit/kpirnie/podnest?style=for-the-badge&labelColor=000)](https://github.com/kpirnie/podnest/commits/main)
[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg?style=for-the-badge&logo=opensourceinitiative&logoColor=white&labelColor=000)](LICENSE)

[![Go](https://img.shields.io/badge/Go-1.24+-00ADD8?logo=go&logoColor=white&style=for-the-badge&labelColor=000)](https://go.dev/)
[![Alpine](https://img.shields.io/badge/Base-Alpine%20Linux-0D597F?logo=alpinelinux&logoColor=white&style=for-the-badge&labelColor=000)](https://www.alpinelinux.org/)
[![Kevin Pirnie](https://img.shields.io/badge/-KevinPirnie.com-000d2d?style=for-the-badge&labelColor=000&logoColor=white&logo=data:image/svg%2Bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+CiAgPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz4KICA8ZWxsaXBzZSBjeD0iMTIiIGN5PSIxMiIgcng9IjQuNSIgcnk9IjEwIi8+CiAgPGxpbmUgeDE9IjIiIHkxPSIxMiIgeDI9IjIyIiB5Mj0iMTIiLz4KICA8bGluZSB4MT0iNC41IiB5MT0iNi41IiB4Mj0iMTkuNSIgeTI9IjYuNSIvPgogIDxsaW5lIHgxPSI0LjUiIHkxPSIxNy41IiB4Mj0iMTkuNSIgeTI9IjE3LjUiLz4KPC9zdmc+Cg==)](https://kevinpirnie.com/)
[![Support](https://img.shields.io/badge/Support-Available-28a745?logo=handshake&logoColor=white&style=for-the-badge&labelColor=000)](https://kevinpirnie.com/about-kevin-pirnie/lets-talk/)

A hardened, high-performance web hosting pod manager built on Podman. Provision and manage isolated, production-ready site pods from a single web-based management UI — no shell required after initial setup.

---

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [SECURITY RULES](#security-rules) | [WAF](#waf) | [LIVE LOGS](#live-logs) | [WP-CLI TERMINAL](#wp-cli-terminal) | [PHPMYADMIN](#phpmyadmin) | [USER MANAGEMENT](#user-management) | [SETTINGS](#settings) | [BACKUP & RESTORE](#backup--restore) | [SECURITY](#security) | [UPDATING](#updating) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

---

## Overview

Each pod is provisioned with nginx as the reverse proxy and optionally Varnish as an in-memory HTTP cache layer in front of nginx. WordPress and PHP sites also include PHP-FPM, MariaDB, and Redis. Node.js and .NET sites include MariaDB and Redis. Static HTML sites get nginx and optionally Varnish only.

**Supported site types:**

| Type | Runtimes Available |
|---|---|
| WordPress | PHP 8.2, 8.3, 8.4, 8.5 |
| PHP | PHP 8.2, 8.3, 8.4, 8.5 |
| Static HTML | nginx only |
| Node.js | Node 22, 24, 25, 26 |
| .NET | .NET 8.0, 9.0, 10.0 |

Each pod is provisioned with nginx as the reverse proxy. WordPress and PHP sites also include PHP-FPM, MariaDB, and Redis. Node.js and .NET sites include MariaDB and Redis. Static HTML sites get nginx only.

All sites share a single global SFTP container for file management — one port, no per-site port allocation required. A global Fail2Ban container monitors SFTP access and automatically bans IPs that repeatedly fail authentication.

The recommended and fully supported deployment method is as a container. The binary option is available for those who prefer to compile and run it directly.

[▲ Back to Top](#PodNest)

---

## Requirements

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [SECURITY RULES](#security-rules) | [WAF](#waf) | [LIVE LOGS](#live-logs) | [WP-CLI TERMINAL](#wp-cli-terminal) | [PHPMYADMIN](#phpmyadmin) | [USER MANAGEMENT](#user-management) | [SETTINGS](#settings) | [BACKUP & RESTORE](#backup--restore) | [SECURITY](#security) | [UPDATING](#updating) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

**For container deployment (recommended):**
- Podman installed and running on the host
- The Podman socket exposed and accessible (see notes below)
- Docker Compose, Podman Compose, or equivalent for compose-based deployments

**For binary deployment:**
- Go 1.22 or later
- `gcc` and `musl-dev` (CGO is required for SQLite)
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

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [SECURITY RULES](#security-rules) | [WAF](#waf) | [LIVE LOGS](#live-logs) | [WP-CLI TERMINAL](#wp-cli-terminal) | [PHPMYADMIN](#phpmyadmin) | [USER MANAGEMENT](#user-management) | [SETTINGS](#settings) | [BACKUP & RESTORE](#backup--restore) | [SECURITY](#security) | [UPDATING](#updating) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

This is the **recommended** way to run PodNest. A pre-built image is published to the GitHub Container Registry — no compilation required.

### Available Image Tags

| Tag | Description |
|---|---|
| `latest` | Latest stable release — use this for production |
| `dev` | Tracks the `develop` branch — use at your own risk |
| `beta` | Tracks the `beta` branch — preview features, not production-ready |

```
ghcr.io/kpirnie/podnest:latest
ghcr.io/kpirnie/podnest:dev
ghcr.io/kpirnie/podnest:beta
```

---

### Quick Start — Podman Run

```bash
podman run -d \
  --name podnest \
  --hostname podnest \
  --restart unless-stopped \
  -p 80:80 \
  -p 443:443 \
  -p 9000:8080 \
  -v /run/podman/podman.sock:/run/podman/podman.sock:rw \
  -v /your/persistent/path:/opt/podnest:z \
  --tmpfs /tmp \
  -e TZ=America/New_York \
  -e LOG_LEVEL=INFO \
  ghcr.io/kpirnie/podnest:latest serve --app-path /opt/podnest --port 8080 --socket /run/podman/podman.sock
```

Replace `/your/persistent/path` with a host path where site configs, the database, and application data should persist across restarts and container recreations. Without this mount, all data is lost when the container is removed.

Once running, the UI is available at: `http://your-host:9000`

---

### Docker Compose

A `docker-compose-example.yaml` is included in the repository as a starting point. Copy and adjust it to your environment:

```yaml
services:
  podnest:
    image: ghcr.io/kpirnie/podnest:latest
    container_name: podnest
    hostname: podnest
    restart: unless-stopped
    ports:
      - 80:80
      - 443:443
      - 9000:8080
    volumes:
      - /run/podman/podman.sock:/run/podman/podman.sock:rw
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

---

### Running with systemd (Recommended for Production)

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

A `podnest.service` example file is included in the repository.

### Podman Socket Warning

A known issue with podman-compose is that if the Podman socket does not exist at the moment the container starts, the mount point is created as a directory instead of a socket file, causing all Podman API calls to fail. The systemd unit avoids this by declaring `Requires=podman.socket`.

If you prefer to use podman-compose, ensure the socket exists before starting:

```bash
systemctl start podman.socket
# verify it is a socket file, not a directory
ls -la /run/podman/podman.sock  # must show srw, not drwx
podman-compose up -d
```

### Pod Auto-Recovery After Host Reboot

When a host running PodNest reboots, PodNest restarts automatically via systemd. On startup, PodNest queries the database for all sites that were running at last shutdown and automatically restarts their pods. Sites whose pods no longer exist are marked as stopped so the UI reflects the correct state. No manual intervention is required after a host reboot.

[▲ Back to Top](#PodNest)

---

## Running the Binary

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [SECURITY RULES](#security-rules) | [WAF](#waf) | [LIVE LOGS](#live-logs) | [WP-CLI TERMINAL](#wp-cli-terminal) | [PHPMYADMIN](#phpmyadmin) | [USER MANAGEMENT](#user-management) | [SETTINGS](#settings) | [BACKUP & RESTORE](#backup--restore) | [SECURITY](#security) | [UPDATING](#updating) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

> Container deployment is the recommended approach. The binary path is here for advanced users who prefer it.

### Build from Source

Clone the repository:

```bash
git clone https://github.com/kpirnie/podnest.git
cd podnest
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

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [SECURITY RULES](#security-rules) | [WAF](#waf) | [LIVE LOGS](#live-logs) | [WP-CLI TERMINAL](#wp-cli-terminal) | [PHPMYADMIN](#phpmyadmin) | [USER MANAGEMENT](#user-management) | [SETTINGS](#settings) | [BACKUP & RESTORE](#backup--restore) | [SECURITY](#security) | [UPDATING](#updating) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

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

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [SECURITY RULES](#security-rules) | [WAF](#waf) | [LIVE LOGS](#live-logs) | [WP-CLI TERMINAL](#wp-cli-terminal) | [PHPMYADMIN](#phpmyadmin) | [USER MANAGEMENT](#user-management) | [SETTINGS](#settings) | [BACKUP & RESTORE](#backup--restore) | [SECURITY](#security) | [UPDATING](#updating) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

Once PodNest is running with a persistent volume, the following structure is created at your mounted path (or at `--app-path` for binary deployments):

```
/opt/podnest/
├── podnest.db          # SQLite database — users, sites, domains, configs, SFTP creds
├── certs/              # TLS certificates (Let's Encrypt and self-signed fallback)
├── logs/               # Application-level logs
├── fail2ban/           # Fail2Ban config and jail data
├── waf/
│   └── crs/        # Downloaded OWASP CRS rule files — auto-updated on startup
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
        ├── varnish/        # All site types (disabled by default)
        │   └── default.vcl
        ├── backups/        # Restic backup repositories
        │   └── local/      # Local restic repo (SFTP accessible, read-only)
        └── .env            # Auto-generated credentials — do not delete
```

The `.env` file inside each site directory holds the auto-generated database and Redis credentials injected into the pod at runtime. Do not delete or manually edit this file unless you know exactly what you are doing.

The `sftp/users.conf` file is managed automatically by PodNest. Do not edit it manually.

[▲ Back to Top](#PodNest)

---

## Managing Sites

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [SECURITY RULES](#security-rules) | [WAF](#waf) | [LIVE LOGS](#live-logs) | [WP-CLI TERMINAL](#wp-cli-terminal) | [PHPMYADMIN](#phpmyadmin) | [USER MANAGEMENT](#user-management) | [SETTINGS](#settings) | [BACKUP & RESTORE](#backup--restore) | [SECURITY](#security) | [UPDATING](#updating) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

All site management is handled through the PodNest web UI or via the API. Access the UI at `http://your-host:PORT` after startup.

---

### Creating a Site

Navigate to **Sites → New Site** and fill in the required fields:

| Field | Required | Description |
|---|---|---|
| Name | Yes | Unique identifier for the pod — used as the pod and container name. Lowercase, alphanumeric and hyphens only. |
| Port | Yes | Host port to expose this site on (e.g. `8081`). Must be unique per site. Auto-assigned if left blank. |
| Site Type | Yes | WordPress, PHP, Static HTML, Node.js, or .NET |
| PHP Version | WordPress / PHP only | PHP 8.2–8.5. Defaults to 8.2. |
| Runtime Version | Node.js / .NET only | Node 22/23/24 or .NET 8.0/9.0/10.0 |
| Start Command | Node.js / .NET only | Command used to start your app (e.g. `node index.js`) |
| Domains | No | One or more domains or subdomains to associate with this site |
| Install WordPress | WordPress only | Auto-installs WordPress into the web root on creation |

Clicking **Create** will:
1. Create the site record in the database
2. Seed default configurations for nginx, PHP, MariaDB, and Redis (as applicable to the site type)
3. Scaffold the site directory structure on disk
4. Generate unique database and Redis credentials and write them to `.env`
5. Generate a unique SFTP password and register the site user with the global SFTP container
6. Provision and start the Podman pod with all required containers
7. Obtain SSL certificates for any registered domains (if the reverse proxy is configured and the domains are publicly reachable)

---

### Site Actions

From the site detail view, the following actions are available:

| Action | Description |
|---|---|
| **Start** | Starts the site pod and all its containers |
| **Stop** | Gracefully stops the site pod |
| **Restart** | Stops and restarts the site pod |
| **Flush Cache** | Clears the PHP OPcache, Redis, and Varnish cache (if enabled) for the site |
| **Update Images** | Pulls the latest versions of all container images used by the site |
| **Recreate Pod** | Stops and removes the existing pod, pulls the latest images, and provisions a fresh pod using the existing site data and credentials |

---

### Managing Domains

Each site can have one or more domains associated with it. From the site detail view you can add or remove domains at any time. Domain changes are stored in the database, reflected in the reverse proxy routing, and SSL certificate acquisition is triggered automatically for any new domain.

---

### Deleting a Site

From the site detail view, select **Delete Site** and confirm. This will:

1. Stop the pod
2. Remove the pod and all its containers
3. Remove the site's SFTP user from the global SFTP container
4. Evict the site's domains from the reverse proxy cache
5. Delete the site record, domains, configs, and SFTP credentials from the database

> **Note:** Deleting a site does **not** automatically remove the site directory on the host. Your web root files and database data under `/opt/podnest/sites/<name>/` remain on disk and must be removed manually if desired.

[▲ Back to Top](#PodNest)

---

## SFTP Access

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [SECURITY RULES](#security-rules) | [WAF](#waf) | [LIVE LOGS](#live-logs) | [WP-CLI TERMINAL](#wp-cli-terminal) | [PHPMYADMIN](#phpmyadmin) | [USER MANAGEMENT](#user-management) | [SETTINGS](#settings) | [BACKUP & RESTORE](#backup--restore) | [SECURITY](#security) | [UPDATING](#updating) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

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

> **Note:** After editing configuration files via SFTP, a pod restart is required for the changes to take effect inside the running containers.

---

### Fail2Ban Integration

A global Fail2Ban container monitors the SFTP log for repeated authentication failures and automatically bans offending IPs at the host firewall level. Banning and unbanning is handled entirely by Fail2Ban — no manual intervention is required.

[▲ Back to Top](#PodNest)

---

## Built-in Reverse Proxy

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [SECURITY RULES](#security-rules) | [WAF](#waf) | [LIVE LOGS](#live-logs) | [WP-CLI TERMINAL](#wp-cli-terminal) | [PHPMYADMIN](#phpmyadmin) | [USER MANAGEMENT](#user-management) | [SETTINGS](#settings) | [BACKUP & RESTORE](#backup--restore) | [SECURITY](#security) | [UPDATING](#updating) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

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

Expose ports 80 and 443 from your compose file or run command:

```yaml
ports:
  - 80:80
  - 443:443
  - 9000:8080
```

### Admin Domain

You can configure a dedicated admin domain for the PodNest management UI under **Settings → Admin Domain**. Once set, the UI is accessible at `https://your-admin-domain` through the reverse proxy, and a Let's Encrypt certificate is automatically obtained for it.

[▲ Back to Top](#PodNest)

---

## Site Configurations

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [SECURITY RULES](#security-rules) | [WAF](#waf) | [LIVE LOGS](#live-logs) | [WP-CLI TERMINAL](#wp-cli-terminal) | [PHPMYADMIN](#phpmyadmin) | [USER MANAGEMENT](#user-management) | [SETTINGS](#settings) | [BACKUP & RESTORE](#backup--restore) | [SECURITY](#security) | [UPDATING](#updating) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

Each site has up to five configuration sections, editable directly in the UI. Changes are saved to the database and applied immediately — no manual file editing required.

Configurations can also be exported to a JSON file and imported back — useful for applying the same config to multiple sites or backing up your tuning.

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

### Varnish

Available for all site types. Varnish is disabled by default. When enabled, it sits in front of nginx inside the pod, caching HTTP responses in memory. Requires a pod recreate to enable or disable — all other setting changes hot-reload without recreate.

| Key | Default | Description |
|---|---|---|
| `enabled` | `false` | Enable Varnish cache — requires pod recreate to take effect |
| `memory_size` | `256m` | Varnish storage allocation (e.g. `256m`, `1g`) |
| `ttl` | `120s` | Default cache TTL for cacheable responses |
| `grace` | `30s` | Serve stale content for this duration if the backend is unavailable |
| `connect_timeout` | `5s` | Backend connection timeout |
| `first_byte_timeout` | `60s` | Time to wait for the first byte from the backend |
| `between_bytes_timeout` | `10s` | Time to wait between bytes from the backend |
| `bypass_query_strings` | `true` | Bypass cache for any request with a query string |
| `bypass_paths` | `/wp-admin,/wp-login.php,/xmlrpc.php,/wp-cron.php,/wp-json,/feed` | Comma-separated URL path prefixes that always bypass the cache |
| `bypass_cookies` | `wordpress_logged_in,woocommerce_,wp_woocommerce,wordpress_sec` | Comma-separated cookie name patterns — requests carrying these cookies bypass the cache |
| `bypass_extensions` | *(empty)* | Comma-separated file extensions that bypass the cache (e.g. `.php`) |

---

### Resetting a Configuration

Any configuration section can be reset to its original defaults from the UI. This overwrites all current values for that section and immediately rewrites the config file to disk. A pod restart is required for the reset to take effect.

[▲ Back to Top](#PodNest)

---

## Security Rules

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [SECURITY RULES](#security-rules) | [WAF](#waf) | [LIVE LOGS](#live-logs) | [WP-CLI TERMINAL](#wp-cli-terminal) | [PHPMYADMIN](#phpmyadmin) | [USER MANAGEMENT](#user-management) | [SETTINGS](#settings) | [BACKUP & RESTORE](#backup--restore) | [SECURITY](#security) | [UPDATING](#updating) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

PodNest provides IP and User-Agent (UA) filtering at two levels: global rules that apply to all sites, and per-site rules that apply to individual sites only. Rules are enforced by the built-in reverse proxy and take effect immediately — no restart required.

---

### IP Rules

IP rules allow you to whitelist or blacklist individual IP addresses and CIDR ranges.

| List | Behavior |
|---|---|
| **Whitelist** | Always allow — bypasses all other IP-based blocking |
| **Blacklist** | Always block — returns `403 Forbidden` |

Whitelist takes precedence over the blacklist. If an IP matches both, it is allowed.

Rules are entered as a newline-separated list — one IP or CIDR per line:

```
192.168.1.100
10.0.0.0/8
203.0.113.42
```

---

### User-Agent Rules

UA rules allow you to whitelist or blacklist HTTP clients by their `User-Agent` header string.

| List | Behavior |
|---|---|
| **Whitelist** | Always allow — bypasses all other UA-based blocking |
| **Blacklist** | Always block — returns `403 Forbidden` |

Rules are entered as a newline-separated list — one string per line. Matching is case-insensitive substring matching:

```
Googlebot
bingbot
curl/
BadBot2000
```

---

### Global vs Per-Site Rules

**Global rules** (under **Admin → Security**) apply to all sites handled by the reverse proxy. Use these for broad blocks — known bad actors, country-level CIDRs, abusive crawlers.

**Per-site rules** (under **Sites → [site] → Security**) apply only to that site. Use these for site-specific access control — staging environments, client IP allowlists, blocking specific scrapers targeting one site.

Both sets of rules are evaluated together — a request blocked by either global or per-site rules is denied.

---

### Import / Export

IP and UA rule sets can be exported to CSV and imported from CSV, separately at both the global and per-site levels. Use this to apply a common baseline rule set across multiple sites or to back up your current rules.

[▲ Back to Top](#PodNest)

---

## WAF

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [SECURITY RULES](#security-rules) | [WAF](#waf) | [LIVE LOGS](#live-logs) | [WP-CLI TERMINAL](#wp-cli-terminal) | [PHPMYADMIN](#phpmyadmin) | [USER MANAGEMENT](#user-management) | [SETTINGS](#settings) | [BACKUP & RESTORE](#backup--restore) | [SECURITY](#security) | [UPDATING](#updating) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

PodNest includes a built-in Web Application Firewall (WAF) powered by [Coraza](https://coraza.io/) with the [OWASP Core Rule Set (CRS)](https://coreruleset.org/). The WAF inspects every proxied request and can detect or block common web attacks including SQL injection, XSS, LFI, RFI, RCE, and scanner activity.

---

### CRS Rule Management

On startup, PodNest automatically downloads the latest OWASP CRS release from GitHub and stores it at `{app-path}/waf/crs/`. Local rules always take priority over the fallback ruleset embedded in the Coraza module. If no local install is present at startup, the embedded ruleset is used as a fallback until the download completes.

The installed CRS version is recorded in `{app-path}/waf/crs/.version`. PodNest checks this file on each startup and skips the download when already up to date.

---

### Global WAF Settings

Global WAF settings are managed under **Admin → Settings → WAF** and apply to all sites unless overridden at the site level.

| Setting | Description |
|---|---|
| **Enabled** | Master switch — disables all WAF inspection when off |
| **Mode** | `Detect` logs matches without blocking; `Prevent` returns `403 Forbidden` on a match |
| **Paranoia Level** | CRS paranoia level `1`–`4`. Higher levels apply stricter rules but increase false-positive risk. Level `1` is recommended for most deployments. |
| **Audit Log** | Enables detailed per-match audit logging to the WAF log |
| **Global Exclusions** | Newline-separated list of CRS rule IDs (numeric) or tag names to disable globally. Use this to silence known false positives. |

---

### Per-Site WAF Overrides

Each site can override the global WAF behaviour independently under **Sites → [site] → Security → WAF**.

| Setting | Description |
|---|---|
| **Override** | `Inherit` — follow global enabled state; `On` — force WAF on for this site regardless of global; `Off` — bypass WAF entirely for this site |
| **Site Exclusions** | Newline-separated list of rule IDs or tags to disable for this site only — merged with global exclusions |

When a site has its own exclusions defined, a dedicated Coraza engine is compiled for that site. Sites without per-site exclusions share the global engine.

---

### WAF Log

The WAF writes a structured log to `{app-path}/logs/waf.log`. Each line contains the timestamp, action (`DETECT` or `BLOCK`), host, path, matched rule ID, client IP, and User-Agent. This log is compatible with Fail2Ban filters.

A live WAF log stream is also available per site via WebSocket at `/api/sites/{id}/logs/waf`.

---

### Exclusion Format

Both global and per-site exclusion lists accept one entry per line:

```
# disable by rule ID
942100
941150

# disable by CRS tag
OWASP_CRS/WEB_ATTACK/SQL_INJECTION
```

Lines beginning with `#` and blank lines are ignored.

[▲ Back to Top](#PodNest)

---

## Live Logs

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [SECURITY RULES](#security-rules) | [WAF](#waf) | [LIVE LOGS](#live-logs) | [WP-CLI TERMINAL](#wp-cli-terminal) | [PHPMYADMIN](#phpmyadmin) | [USER MANAGEMENT](#user-management) | [SETTINGS](#settings) | [BACKUP & RESTORE](#backup--restore) | [SECURITY](#security) | [UPDATING](#updating) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

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

## WP-CLI Terminal

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [SECURITY RULES](#security-rules) | [WAF](#waf) | [LIVE LOGS](#live-logs) | [WP-CLI TERMINAL](#wp-cli-terminal) | [PHPMYADMIN](#phpmyadmin) | [USER MANAGEMENT](#user-management) | [SETTINGS](#settings) | [BACKUP & RESTORE](#backup--restore) | [SECURITY](#security) | [UPDATING](#updating) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

WordPress sites include a built-in WP-CLI terminal accessible directly from the UI. From the site detail view, select the **WP-CLI** tab to open a browser-based terminal that streams command output in real time over WebSocket.

WP-CLI is only available for **WordPress** site types.

### Usage

Type any WP-CLI command without the `wp` prefix and press Enter:

```
plugin list
plugin update --all
core update
cache flush
user list
option get siteurl
```

PodNest automatically prepends `wp` and runs the command inside the site's PHP container as the correct user. Output streams back to the terminal in real time.

### Notes

- The site pod must be running for the WP-CLI terminal to function
- Commands run inside the PHP-FPM container, not the nginx container — this is the correct context for WP-CLI
- Long-running commands (e.g. large plugin updates) stream output continuously until complete

[▲ Back to Top](#PodNest)

---

## phpMyAdmin

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [SECURITY RULES](#security-rules) | [WAF](#waf) | [LIVE LOGS](#live-logs) | [WP-CLI TERMINAL](#wp-cli-terminal) | [PHPMYADMIN](#phpmyadmin) | [USER MANAGEMENT](#user-management) | [SETTINGS](#settings) | [BACKUP & RESTORE](#backup--restore) | [SECURITY](#security) | [UPDATING](#updating) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

WordPress, PHP, Node.js, and .NET sites include a phpMyAdmin instance for database management, accessible directly from the PodNest UI. Static HTML sites do not include a database and therefore do not have phpMyAdmin available.

### Accessing phpMyAdmin

From the site detail overview tab, click the **phpMyAdmin** button. PodNest generates a short-lived one-time access token (valid for 10 minutes or first use) and opens phpMyAdmin in a new tab. No username or password is required — the session is pre-authenticated.

phpMyAdmin is proxied through PodNest at `/pma/{site-id}`. It is never directly exposed on the network.

### Notes

- The site pod must be running for phpMyAdmin to be accessible
- The one-time token expires after 10 minutes — clicking the button again generates a fresh token
- phpMyAdmin session cookies are scoped per-site and expire after 2 hours of inactivity

[▲ Back to Top](#PodNest)

---

## User Management

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [SECURITY RULES](#security-rules) | [WAF](#waf) | [LIVE LOGS](#live-logs) | [WP-CLI TERMINAL](#wp-cli-terminal) | [PHPMYADMIN](#phpmyadmin) | [USER MANAGEMENT](#user-management) | [SETTINGS](#settings) | [BACKUP & RESTORE](#backup--restore) | [SECURITY](#security) | [UPDATING](#updating) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

PodNest has two user roles:

| Role | Level | Description |
|---|---|---|
| Manager | 50 | Can create and manage their own sites only |
| Admin | 99 | Full access — all sites, all users, all settings |

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

### Deleting a User

Admins can delete any user account except their own. If the user owns any sites, the deletion will be blocked — those sites must be deleted or reassigned first.

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

#### Backup Codes

On TOTP confirmation, a set of one-time backup codes is generated and displayed. Store these in a safe place — they can be used to log in if you lose access to your authenticator app. Each backup code can only be used once.

#### Disabling TOTP

Open the edit user modal and click **Disable TOTP** in the Two-Factor Authentication section. This removes the TOTP secret immediately — no code is required to disable.

[▲ Back to Top](#PodNest)

---

## Settings

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [SECURITY RULES](#security-rules) | [WAF](#waf) | [LIVE LOGS](#live-logs) | [WP-CLI TERMINAL](#wp-cli-terminal) | [PHPMYADMIN](#phpmyadmin) | [USER MANAGEMENT](#user-management) | [SETTINGS](#settings) | [BACKUP & RESTORE](#backup--restore) | [SECURITY](#security) | [UPDATING](#updating) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

The **Settings** panel is accessible to Admin users only. Settings are divided into three sections.

---

### General

| Setting | Description |
|---|---|
| **Admin Domain** | The domain used to access the PodNest management UI through the reverse proxy. Once set, a Let's Encrypt certificate is automatically obtained. Leave blank to access the UI directly by port. |

---

### Backup Schedule

| Setting | Description |
|---|---|
| **Cron Schedule** | Standard 5-field cron expression (e.g. `0 2 * * *` for daily at 2am). Leave blank to disable automatic scheduled backups. |
| **Retain Backups (days)** | Snapshots older than this many days are pruned automatically after each scheduled backup run. Default: `30`. |

---

### S3 Backup Storage

Applies globally to all sites that have S3 backup destination enabled.

| Setting | Description |
|---|---|
| **Endpoint URL** | Full URL to the S3-compatible endpoint (e.g. `https://s3.amazonaws.com`) |
| **Bucket** | The bucket name. Each site uses a separate prefix within the bucket. |
| **Region** | AWS region or equivalent (default: `us-east-1`) |
| **Access Key ID** | S3 access key |
| **Secret Access Key** | S3 secret key — stored encrypted, never returned in full after saving |

---

### Settings Export / Import

The entire settings set (general + backup) can be exported to a JSON file and imported back. This is useful for migrating a PodNest instance or restoring settings after a fresh install.

[▲ Back to Top](#PodNest)

---

## Backup & Restore

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [SECURITY RULES](#security-rules) | [WAF](#waf) | [LIVE LOGS](#live-logs) | [WP-CLI TERMINAL](#wp-cli-terminal) | [PHPMYADMIN](#phpmyadmin) | [USER MANAGEMENT](#user-management) | [SETTINGS](#settings) | [BACKUP & RESTORE](#backup--restore) | [SECURITY](#security) | [UPDATING](#updating) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

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

### Running a Manual Backup

From the **Backups** tab on any site detail view, click **Back Up Now**. A progress modal will be displayed while the backup runs. The snapshot list updates automatically when the backup completes.

---

### Scheduled Backups

Configure a cron schedule under **Settings → Backup Schedule**. All sites with at least one destination enabled are backed up on each scheduled run. If a scheduled backup fails for any site, a warning banner is displayed on that site's **Backups** tab showing the error message and the time of the failure. The banner clears automatically on the next successful backup run.

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

[▲ Back to Top](#PodNest)

---

## Security

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [SECURITY RULES](#security-rules) | [WAF](#waf) | [LIVE LOGS](#live-logs) | [WP-CLI TERMINAL](#wp-cli-terminal) | [PHPMYADMIN](#phpmyadmin) | [USER MANAGEMENT](#user-management) | [SETTINGS](#settings) | [BACKUP & RESTORE](#backup--restore) | [SECURITY](#security) | [UPDATING](#updating) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

PodNest is built with security in mind at every layer. The following protections are active out of the box.

---

### Login Rate Limiting

The login endpoint is rate-limited per client IP. After **5 failed attempts within 5 minutes**, the IP is locked out for **15 minutes**. Lockouts are tracked in memory and reset automatically — no manual intervention is required. A successful login clears the failure count for that IP.

---

### Two-Factor Authentication

TOTP-based 2FA is available for all user accounts. See [User Management → Two-Factor Authentication](#two-factor-authentication-totp) for setup instructions. Enabling TOTP on the admin account is strongly recommended.

---

### Session Management

- Sessions are valid for **8 hours** from login
- Expired sessions are automatically purged from the database hourly
- Changing a user's password immediately invalidates all of their active sessions
- Sessions are stored server-side — the browser cookie is a random token with no embedded data

---

### HTTP Security Headers

All responses from the PodNest management panel include the following security headers:

| Header | Value |
|---|---|
| `X-Frame-Options` | `SAMEORIGIN` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), usb=()` |
| `Content-Security-Policy` | Locks scripts, styles, fonts, images, and connections to known sources only |

The Content Security Policy allows only trusted sources: `cdn.jsdelivr.net` (UIKit), `cdn.kcp.im` (logos), `fonts.googleapis.com` and `fonts.gstatic.com` (fonts), and same-origin API connections including WebSocket. The phpMyAdmin proxy path is intentionally excluded from the CSP to avoid breaking the phpMyAdmin interface.

---

### API Authorization

All API endpoints require a valid session. Admin-only endpoints (`/api/users`, `/api/settings`, `/api/security/...`) enforce the Admin role at the router level as well as inside each handler. Manager-role users can only access their own sites — attempting to access another user's site returns `403 Forbidden`.

[▲ Back to Top](#PodNest)

---

## Updating

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [SECURITY RULES](#security-rules) | [WAF](#waf) | [LIVE LOGS](#live-logs) | [WP-CLI TERMINAL](#wp-cli-terminal) | [PHPMYADMIN](#phpmyadmin) | [USER MANAGEMENT](#user-management) | [SETTINGS](#settings) | [BACKUP & RESTORE](#backup--restore) | [SECURITY](#security) | [UPDATING](#updating) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

### Update Notifications

When a new release is published on GitHub, Admin users will see a notification banner at the top of the management UI indicating the new version number with links to the release notes and update instructions. The banner checks GitHub's releases API at most once every 12 hours and is only visible to Admin-role users.

### How to Update

See [UPDATE.md](UPDATE.md) for full step-by-step instructions for your deployment method (systemd, Docker Compose, or manual Podman run). Updating is a pull-and-restart — your site data is never touched.

[▲ Back to Top](#PodNest)

---

## API Reference

[OVERVIEW](#overview) | [REQUIREMENTS](#requirements) | [RUNNING AS A CONTAINER](#running-as-a-container) | [RUNNING THE BINARY](#running-the-binary) | [FIRST LOGIN](#first-login) | [DIRECTORY STRUCTURE](#directory-structure) | [MANAGING SITES](#managing-sites) | [SFTP ACCESS](#sftp-access) | [BUILT-IN REVERSE PROXY](#built-in-reverse-proxy) | [SITE CONFIGURATIONS](#site-configurations) | [SECURITY RULES](#security-rules) | [WAF](#waf) | [LIVE LOGS](#live-logs) | [WP-CLI TERMINAL](#wp-cli-terminal) | [PHPMYADMIN](#phpmyadmin) | [USER MANAGEMENT](#user-management) | [SETTINGS](#settings) | [BACKUP & RESTORE](#backup--restore) | [SECURITY](#security) | [UPDATING](#updating) | [API REFERENCE](#api-reference) | [LICENSE](#license) | [SUPPORT](#support)

PodNest exposes a JSON REST API under `/api/`. All endpoints require a valid session obtained by logging in via the UI or the `/login` endpoint. The session is maintained via a cookie that must be included in all subsequent requests.

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

A successful login sets a session cookie. If TOTP is enabled for the user, the response will indicate a redirect to `/login/totp` is required before the session is established.

**Logout**

```
POST /logout
```

Clears the session cookie and invalidates the server-side session.

---

### Sites

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/sites` | Session | List sites (admin: all; manager: own only) |
| `POST` | `/api/sites` | Session | Create a new site |
| `GET` | `/api/sites/{id}` | Session | Get a site with domains and SFTP credentials |
| `PUT` | `/api/sites/{id}` | Session | Update site fields |
| `DELETE` | `/api/sites/{id}` | Session | Delete site, pod, and all associated records |
| `POST` | `/api/sites/{id}/start` | Session | Start the site pod |
| `POST` | `/api/sites/{id}/stop` | Session | Stop the site pod |
| `POST` | `/api/sites/{id}/restart` | Session | Restart the site pod |
| `POST` | `/api/sites/{id}/flush` | Session | Flush the pod cache |
| `POST` | `/api/sites/{id}/update` | Session | Pull latest container images |
| `POST` | `/api/sites/{id}/recreate` | Session | Recreate the pod from scratch |
| `GET` | `/api/sites/{id}/status` | Session | Raw pod inspect payload from Podman |
| `POST` | `/api/sites/{id}/pma-token` | Session | Issue a one-time phpMyAdmin access token |
| `POST` | `/api/sites/{id}/sftp-regen` | Session | Regenerate the SFTP password |

**Site type values:** `1` = WordPress, `2` = PHP, `3` = Static HTML, `4` = Node.js, `5` = .NET

**PHP version values:** `3` = 8.2 *(default)*, `4` = 8.3, `5` = 8.4, `6` = 8.5

**Node runtime version values:** `2` = 22 *(default)*, `4` = 24, `5` = 25, `6` = 26

**.NET runtime version values:** `1` = 8.0 *(default)*, `2` = 9.0, `3` = 10.0

---

### Domains

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/sites/{id}/domains` | Session | List domains for a site |
| `POST` | `/api/sites/{id}/domains` | Session | Add a domain |
| `DELETE` | `/api/sites/{id}/domains/{did}` | Session | Remove a domain |

---

### Configs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/sites/{id}/configs` | Session | Get all config sections as a map |
| `PUT` | `/api/sites/{id}/configs/{type}` | Session | Merge-update a config section |
| `POST` | `/api/sites/{id}/configs/{type}/reset` | Session | Reset a config section to defaults |
| `GET` | `/api/sites/{id}/configs/{type}/export` | Session | Export a config section as JSON |
| `POST` | `/api/sites/{id}/configs/{type}/import` | Session | Import a config section from JSON |

**Config type values:** `1` = Nginx, `2` = PHP, `3` = MariaDB, `4` = Redis, `5` = Varnish

---

### WAF

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/settings/waf` | Admin | Get global WAF settings |
| `PUT` | `/api/settings/waf` | Admin | Update global WAF settings and recompile the engine |
| `GET` | `/api/sites/{id}/waf` | Session | Get per-site WAF override |
| `PUT` | `/api/sites/{id}/waf` | Session | Update per-site WAF override and recompile the site engine |

---

### Security Rules

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/security/ip` | Admin | Get global IP rules |
| `PUT` | `/api/security/ip` | Admin | Save global IP rules |
| `GET` | `/api/security/ua` | Admin | Get global UA rules |
| `PUT` | `/api/security/ua` | Admin | Save global UA rules |
| `GET` | `/api/security/ip/export` | Admin | Export global IP rules as CSV |
| `POST` | `/api/security/ip/import` | Admin | Import global IP rules from CSV |
| `GET` | `/api/security/ua/export` | Admin | Export global UA rules as CSV |
| `POST` | `/api/security/ua/import` | Admin | Import global UA rules from CSV |
| `GET` | `/api/sites/{id}/security/ip` | Session | Get per-site IP rules |
| `PUT` | `/api/sites/{id}/security/ip` | Session | Save per-site IP rules |
| `GET` | `/api/sites/{id}/security/ua` | Session | Get per-site UA rules |
| `PUT` | `/api/sites/{id}/security/ua` | Session | Save per-site UA rules |
| `GET` | `/api/sites/{id}/security/ip/export` | Session | Export per-site IP rules as CSV |
| `POST` | `/api/sites/{id}/security/ip/import` | Session | Import per-site IP rules from CSV |
| `GET` | `/api/sites/{id}/security/ua/export` | Session | Export per-site UA rules as CSV |
| `POST` | `/api/sites/{id}/security/ua/import` | Session | Import per-site UA rules from CSV |

---

### Users

> All user endpoints require Admin role.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users` | Admin | List all users |
| `POST` | `/api/users` | Admin | Create a user |
| `GET` | `/api/users/{id}` | Admin | Get a user |
| `PUT` | `/api/users/{id}` | Admin | Update a user |
| `DELETE` | `/api/users/{id}` | Admin | Delete a user |
| `POST` | `/api/users/{id}/totp/setup` | Admin / Self | Generate TOTP secret and provisioning URI |
| `POST` | `/api/users/{id}/totp/confirm` | Admin / Self | Confirm TOTP code and activate 2FA |
| `DELETE` | `/api/users/{id}/totp` | Admin / Self | Disable TOTP for a user |

---

### Settings

> All settings endpoints require Admin role.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/settings` | Admin | Get general settings |
| `PUT` | `/api/settings` | Admin | Update general settings |
| `GET` | `/api/settings/export` | Admin | Export all settings as JSON |
| `POST` | `/api/settings/import` | Admin | Import settings from JSON |
| `GET` | `/api/settings/backup` | Admin | Get backup and S3 settings |
| `PUT` | `/api/settings/backup` | Admin | Update backup and S3 settings |

---

### Backups

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/sites/{id}/backup-repo` | Session | Get backup destination config |
| `PUT` | `/api/sites/{id}/backup-repo` | Session | Update backup destination flags |
| `GET` | `/api/sites/{id}/backups` | Session | List all snapshots for a site |
| `POST` | `/api/sites/{id}/backups` | Session | Trigger an immediate backup |
| `POST` | `/api/sites/{id}/backups/{bid}/restore` | Session | Restore from a snapshot |
| `GET` | `/api/sites/{id}/backups/{bid}/download` | Session | Download snapshot as `.tar.gz` |
| `DELETE` | `/api/sites/{id}/backups/{bid}` | Session | Delete a snapshot |
| `GET` | `/api/sites/{id}/backups/restore-status` | Session | Check if a restore is in progress |

---

### Live Log Stream (WebSocket)

```
GET /api/sites/{id}/logs?container=nginx&tail=100
```

Upgrades to a WebSocket connection and streams live logs from the specified container.

| Parameter | Default | Options | Description |
|---|---|---|---|
| `container` | `nginx` | `nginx`, `php`, `db`, `redis`, `app` | Which container to tail |
| `tail` | `100` | `1`–`5000` | Number of historical lines before following |

---

### WAF Log Stream (WebSocket)

```
GET /api/sites/{id}/logs/waf
```

Upgrades to a WebSocket connection and streams live WAF events from `waf.log` for the matching site domain. Each frame is a structured log line containing timestamp, action, host, path, rule ID, client IP, and User-Agent.

---

### WP-CLI WebSocket Terminal

```
GET /api/sites/{id}/wpcli
```

Upgrades to a WebSocket connection. Send a text message containing the WP-CLI command (without the `wp` prefix). The response streams the command output back as text frames until the command completes. WordPress sites only.

[▲ Back to Top](#PodNest)

---

## License

PodNest is licensed under the [MIT License](LICENSE). See the `LICENSE` file in the repository for the full license text.

[▲ Back to Top](#PodNest)

---

## Support

This project is provided as-is through GitHub. **Paid support is available** for those who need hands-on help with setup, configuration, customization, or troubleshooting. Reach out through [https://kevinpirnie.com/about-kevin-pirnie/lets-talk/](https://kevinpirnie.com/about-kevin-pirnie/lets-talk/) to inquire about support options.

[▲ Back to Top](#PodNest)

---

## Planned / In The Works

The following features are actively planned or currently in development. Contributions and feedback are welcome.

### Site Management

| Feature | Description |
|---|---|
| **Site Traffic** | Per-site traffic analytics collected in the background: total requests (today vs yesterday), top 10 IPs and User-Agents by request count, status code breakdown (2xx/3xx/4xx/5xx), and total bandwidth served. |
| **Cloning / One-Click Staging** | Duplicate a live site to a staging environment with a single click — files, database, and all |
| **Version Switching** | Change a site's PHP, .Net, or Node version and recreate the pod without losing data |
| **Bulk Site Operations** | Start, stop, restart, and recreate selectable pods at once |

### Operations

| Feature | Description |
|---|---|
| **Resource Monitoring** | Per-pod CPU, memory, and disk usage visible in the UI |
| **Site Health Monitoring** | Per-site health checks with status tracking and alerting |
| **Audit Log** | Per-user action tracking for all panel operations |

### Developer

| Feature | Description |
|---|---|
| **Git Deploy** | Push-to-deploy via webhook integration |
| **Public API** | A token-authenticated REST API for external integrations — create and manage sites, trigger backups, update domains, and query site status programmatically without a browser session. |

[▲ Back to Top](#PodNest)
