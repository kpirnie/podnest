# <img src="https://c.pdn.st/logos/podnest.svg" alt="PodNest ~ Secure. Manage. Deploy" width="64" valign="middle"> PodNest

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

[Overview](#overview) · [Requirements](#requirements) · [Running as a Container](#running-as-a-container) · [Running the Binary](#running-the-binary) · [First Login](#first-login) · [Directory Structure](#directory-structure) · [Documentation](#documentation) · [License](#license) · [Support](#support)

---

## Overview

Each pod is provisioned with nginx as the reverse proxy and optionally Varnish as an in-memory HTTP cache layer in front of nginx. WordPress and PHP sites also include PHP-FPM, MariaDB, and Redis. Node.js and .NET sites include MariaDB and Redis. Static HTML sites get nginx and optionally Varnish only. Reverse Proxy sites route traffic to an upstream URL with no containers of their own.

**Supported site types:**

| Type | Runtimes Available |
|---|---|
| WordPress | PHP 8.2, 8.3, 8.4, 8.5 |
| PHP | PHP 8.2, 8.3, 8.4, 8.5 |
| Static HTML | nginx only |
| Node.js | Node 22, 24, 25, 26 |
| .NET | .NET 8.0, 9.0, 10.0 |
| Reverse Proxy | Routes to an upstream URL — no pod provisioned |

All sites share a single global SFTP container for file management. The same container also backs a per-site web file manager — browse, upload, download, in-browser text editing, and permission changes scoped to each site's `html` directory, performed as the site's own user. A global Fail2Ban container monitors SFTP access and automatically bans IPs that repeatedly fail authentication.

The recommended and fully supported deployment method is as a container. The binary option is available for those who prefer to compile and run it directly.

> **Full documentation** — feature guides, configuration reference, the security model, and the complete API reference — lives in the [PodNest Knowledge Base](https://podnest.us). This README covers only what you need to get an instance up and running. See [Documentation](#documentation) below for the topic index.

---

## Requirements

**For container deployment (recommended):**
- Podman installed and running on the host
- The Podman socket exposed and accessible (see notes below)
- Docker Compose, Podman Compose, or equivalent for compose-based deployments

**For binary deployment:**
- Go 1.26 or later
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

> **Binding ports 80/443 rootless** — when running PodNest rootless and letting it bind the standard web ports directly, lower the unprivileged port floor on the host:
>
> ```bash
> sysctl -w net.ipv4.ip_unprivileged_port_start=80
> # persist it:
> echo 'net.ipv4.ip_unprivileged_port_start=80' | sudo tee /etc/sysctl.d/99-podnest.conf
> ```

---

## Running as a Container

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

### Quick Start

Run the following command in shell on your server.  Replace USER with whatever username you would like to utilize.

```bash
curl -fsSL https://raw.githubusercontent.com/kpirnie/podnest/main/setup.sh | sudo bash -s -- --action <install|update> --version <latest|dev|beta> --user <username>
```

Once running, the UI is available at: `http://your-host:9000`

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
# with Podman Compose:
podman-compose up -d
```

**Volume mount and the `:z` label** — the `:z` flag on the `/opt/podnest` mount is a SELinux relabeling option required on systems running SELinux in enforcing mode. It is safe to omit on systems that do not use SELinux.

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
TimeoutStartSec=60
ExecStartPre=-/usr/bin/podman rm -f podnest
ExecStartPre=/bin/bash -c 'for i in $(seq 1 30); do [ -S /run/podman/podman.sock ] && exit 0; sleep 1; done; exit 1'
ExecStart=/usr/bin/podman run \
    --name podnest \
    --hostname podnest \
    --network host \
    -v /run/podman/podman.sock:/run/podman/podman.sock:rw \
    -v /home/sites:/opt/podnest:z \
    --tmpfs /tmp \
    -e TZ=America/New_York \
    -e LOG_LEVEL=INFO \
    ghcr.io/kpirnie/podnest:latest serve --app-path /opt/podnest --port 9000 --socket /run/podman/podman.sock
ExecStop=/usr/bin/podman stop podnest

[Install]
WantedBy=multi-user.target
```

Replace the persistent path with the host path where your site data should persist. Enable and start the service:

```bash
systemctl daemon-reload
systemctl enable --now podnest.service
systemctl status podnest.service
```

A `podnest.service` example file is included in the repository.

**Podman socket warning** — a known issue with podman-compose is that if the Podman socket does not exist at the moment the container starts, the mount point is created as a directory instead of a socket file, causing all Podman API calls to fail. The systemd unit avoids this by declaring `Requires=podman.socket`. If you prefer podman-compose, ensure the socket exists first:

```bash
systemctl start podman.socket
ls -la /run/podman/podman.sock  # must show srw, not drwx
podman-compose up -d
```

**Pod auto-recovery after host reboot** — when a host running PodNest reboots, PodNest restarts via systemd and, on startup, queries the database for all sites that were running at last shutdown and automatically restarts their pods. Sites whose pods no longer exist are marked as stopped. No manual intervention is required after a reboot.

---

## Running the Binary

> Container deployment is the recommended approach. The binary path is here for advanced users who prefer it.

### Build from Source

```bash
git clone https://github.com/kpirnie/podnest.git
cd podnest

CGO_ENABLED=1 GOOS=linux go build \
  -ldflags="-s -w -extldflags '-static'" \
  -o podnest ./main.go
```

### Initialize the Database

When running the binary for the first time, use the `init` command to set up the database and create your admin account interactively:

```bash
./podnest init --app-path /opt/podnest
```

You will be prompted for username, name, email, phone, and a password. This only needs to be run once. If an admin account already exists, it exits with an error and directs you to the UI.

### Start the Server

```bash
./podnest serve \
  --app-path /opt/podnest \
  --port 8080 \
  --socket /run/podman/podman.sock
```

### Available Commands and Flags

Both `init` and `serve` share the following persistent flags:

| Flag | Default | Description |
|---|---|---|
| `--app-path` | `/opt/podnest` | Base path for the database, site configs, and all application data |
| `--port` | `8080` | Port the management UI listens on |
| `--socket` | `/run/user/<uid>/podman/podman.sock` | Path to the Podman socket |

PodNest also provides a `reset` command for recovering account access from the host shell:

```bash
./podnest reset --app-path /opt/podnest
```

`reset` interactively resets a user's password and/or clears their TOTP — useful when an admin is locked out. It accepts the same `--app-path` flag.

There is also a `security` command for recovering panel access when a security rule has locked you out:

```bash
./podnest security --bypass 203.0.113.7 --app-path /opt/podnest
```

`--bypass` accepts an IP or CIDR and adds it to the security bypass list (skipping all IP/UA/country/ASN/WAF checks). Restart the podnest service for it to take effect.

---

## First Login

### Container

When the container starts for the first time with no existing database, a default admin account is automatically created:

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `podnest1234@` |

> **Change this password immediately after your first login.** The default credentials are well-known and should never be left in place on a production instance.

### Binary

If you used `podnest init`, log in with the credentials you provided during setup. The `serve` command will only auto-seed the default admin credentials above if no admin account exists at startup.

---

## Directory Structure

Once PodNest is running with a persistent volume, the following structure is created at your mounted path (or at `--app-path` for binary deployments):

```
/opt/podnest/
├── podnest.db          # SQLite database — users, sites, domains, configs, SFTP creds
├── certs/              # TLS certificates (Let's Encrypt and self-signed fallback)
├── logs/               # Proxy access log and WAF log
│   ├── proxy-access.log
│   └── waf.log
├── fail2ban/           # Fail2Ban config and jail data
├── waf/
│   └── crs/            # Downloaded OWASP CRS rule files — auto-updated on startup
├── sftp/               # Global SFTP container config
│   ├── keys/           # Persistent SSH host keys
│   ├── etc-ssh/
│   │   └── sshd_config.d/
│   ├── logs/           # SFTP access logs — watched by Fail2Ban
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
        ├── db/             # All sites except Static HTML and Reverse Proxy
        │   └── my.cnf
        ├── redis/          # All sites except Static HTML and Reverse Proxy
        │   └── redis.conf
        ├── varnish/        # All site types except Reverse Proxy (disabled by default)
        │   └── default.vcl
        ├── backups/        # Restic backup repositories
        │   └── local/      # Local restic repo (SFTP accessible, read-only)
        └── .env            # Auto-generated credentials — do not delete
```

The `.env` file inside each site directory holds the auto-generated database and Redis credentials injected into the pod at runtime. Do not delete or manually edit it unless you know exactly what you are doing. The `sftp/users.conf` file is managed automatically by PodNest — do not edit it manually.

---

## Documentation

Day-to-day usage, configuration, and the full API reference are documented in the [PodNest Knowledge Base](https://podnest.us). Topic index:

- **Managing Sites** — creating sites, site actions, container health, cloning, domains
- **SFTP Access** — global SFTP container, directory access, Fail2Ban integration
- **Built-in Reverse Proxy** — how it works, SSL / Let's Encrypt, admin domain, Reverse Proxy site type
- **Redirects** — per-site redirect rules
- **Site Configurations** — nginx, PHP, MariaDB, Redis, Varnish, resetting a config
- **Security Rules** — IP rules, User-Agent rules, country blocking, ASN blocking, ASN lookup, global vs per-site, import/export
- **WAF** — CRS rule management, global settings, per-site overrides, exclusions, WAF log
- **Live Logs** — per-site and global log streams
- **WP-CLI Terminal** — browser terminal for WordPress sites
- **phpMyAdmin** — database management
- **Stats & Traffic** — dashboard and per-site stats
- **Resource Monitoring** — host resource watcher and throttling
- **User Management** — users, roles, two-factor authentication
- **Settings** — general, trusted proxies, backup schedule, S3, notifications, resources, export/import
- **Notifications** — channels and per-user opt-in
- **Cron Jobs** — per-site scheduled jobs
- **Backup & Restore** — what gets backed up, destinations, manual/scheduled backups, restore, import
- **Security** — login rate limiting, 2FA, sessions, CSRF, headers, WebSocket security, API authorization
- **Updating** — update notifications and how to update
- **API Reference** — complete REST and WebSocket API

---

## License

PodNest is licensed under the [MIT License](LICENSE). See the `LICENSE` file in the repository for the full license text.

---

## Support

This project is provided as-is through GitHub. **Paid support is available** for those who need hands-on help with setup, configuration, customization, or troubleshooting. Reach out through [https://kevinpirnie.com/about-kevin-pirnie/lets-talk/](https://kevinpirnie.com/about-kevin-pirnie/lets-talk/) to inquire about support options.