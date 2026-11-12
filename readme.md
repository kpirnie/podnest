# <img src="https://cdn.pnst.us/logos/podnest.svg" alt="PodNest ~ Secure. Manage. Deploy" width="64" valign="middle"> PodNest

## Secure. Manage. Deploy

[![Build Main](https://img.shields.io/github/actions/workflow/status/kpirnie/podnest/build.yml?branch=main&label=Main&logoColor=white&logo=github&labelColor=000&style=for-the-badge)](https://github.com/kpirnie/podnest/actions?query=workflow%3A%22Build+and+Push%22+branch%3Amain)
[![Build Develop](https://img.shields.io/github/actions/workflow/status/kpirnie/podnest/build.yml?branch=develop&label=Develop&logoColor=white&logo=github&labelColor=000&style=for-the-badge)](https://github.com/kpirnie/podnest/actions?query=workflow%3A%22Build+and+Push%22+branch%3Adevelop)
[![Last Commit](https://img.shields.io/github/last-commit/kpirnie/podnest?style=for-the-badge&labelColor=000)](https://github.com/kpirnie/podnest/commits/main)
[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg?style=for-the-badge&logo=opensourceinitiative&logoColor=white&labelColor=000)](LICENSE)

[![Go](https://img.shields.io/badge/Go-1.27+-00ADD8?logo=go&logoColor=white&style=for-the-badge&labelColor=000)](https://go.dev/)
[![Alpine](https://img.shields.io/badge/Base-Alpine%20Linux-0D597F?logo=alpinelinux&logoColor=white&style=for-the-badge&labelColor=000)](https://www.alpinelinux.org/)
[![Kevin Pirnie](https://img.shields.io/badge/-KevinPirnie.com-000d2d?style=for-the-badge&labelColor=000&logoColor=white&logo=data:image/svg%2Bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+CiAgPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz4KICA8ZWxsaXBzZSBjeD0iMTIiIGN5PSIxMiIgcng9IjQuNSIgcnk9IjEwIi8+CiAgPGxpbmUgeDE9IjIiIHkxPSIxMiIgeDI9IjIyIiB5Mj0iMTIiLz4KICA8bGluZSB4MT0iNC41IiB5MT0iNi41IiB4Mj0iMTkuNSIgeTI9IjYuNSIvPgogIDxsaW5lIHgxPSI0LjUiIHkxPSIxNy41IiB4Mj0iMTkuNSIgeTI9IjE3LjUiLz4KPC9zdmc+Cg==)](https://kevinpirnie.com/)
[![Support](https://img.shields.io/badge/Support-Available-28a745?logo=handshake&logoColor=white&style=for-the-badge&labelColor=000)](https://kevinpirnie.com/about-kevin-pirnie/lets-talk/)

A self-hosted web hosting control panel. Create and run WordPress, PHP, Node.js, .NET, Python, static, and reverse-proxy sites — each with its own nginx, PHP-FPM, MariaDB, Redis, Varnish, SFTP account, SSL, backups, cron, and WAF. No shell required after initial setup.

---

[Overview](#overview) · [Requirements](#requirements) · [Host Install (pdnctl)](#host-install-pdnctl) · [Running as a Container](#running-as-a-container) · [Running the Binary](#running-the-binary) · [First Login](#first-login) · [Directory Structure](#directory-structure) · [Documentation](#documentation) · [Development Container](#development-container) · [Security Policy](#security-policy) · [Contributing](#contributing) · [Acknowledgements](#acknowledgements-contributions--accolades) · [License](#license) · [Support](#support)

---

## Overview

Each site pod is provisioned with nginx as the reverse proxy and optionally Varnish as an in-memory HTTP cache layer in front of nginx. WordPress and PHP sites also include PHP-FPM, MariaDB, and Redis, plus a short-lived (60s by default) nginx FastCGI page cache that bypasses wp-admin, logged-in WordPress users, and PHP session holders. Node.js, .NET, and Python sites include MariaDB and Redis. Static HTML sites get nginx and optionally Varnish only. Reverse Proxy sites route traffic to an upstream URL with no containers of their own.

**Supported site types:**

| Type | Runtimes Available |
| --- | --- |
| WordPress | PHP 8.2, 8.3, 8.4, 8.5 |
| PHP | PHP 8.2, 8.3, 8.4, 8.5 |
| Static HTML | nginx only |
| Node.js | Node 22, 24, 25, 26 |
| .NET | .NET 8.0, 9.0, 10.0 |
| Python | Python 3.11, 3.12, 3.13, 3.14 |
| Reverse Proxy | Routes to an upstream URL — no pod provisioned |

All sites share a single global SFTP container for file management. The same container also backs a per-site web file manager — browse, upload, download, in-browser text editing, and permission changes scoped to each site's `html` directory, performed as the site's own user. A global Fail2Ban container monitors SFTP access and the built-in reverse proxy, and automatically bans offending IPs.

**Multi-node linking** — PodNest instances can be linked in a parent/child arrangement. A child node is paired to its parent with a short-lived pairing code (valid for 5 minutes), after which the parent can manage the child, sync its users down to it, and single-sign-on into it. Link operations are signed, and each node's link private key is encrypted at rest with `PN_SECRET_KEY` (see [Secret key](#docker-compose)). A child can drop its parent link at any time with `unparent`.

The recommended and fully supported deployment method is as a container. The binary option is available for those who prefer to compile and run it directly.

> **Full documentation** — feature guides, configuration reference, the security model, and the complete API reference — lives in the [PodNest Knowledge Base](https://podnest.app). This README covers only what you need to get an instance up and running. See [Documentation](#documentation) below for the topic index.

---

## Requirements

**Host:**

- Linux on `amd64` or `arm64` — container images and `pdnctl` are published for both
- Ports `80` and `443` available for the built-in reverse proxy, and `9000` (or your chosen port) for the management UI
- Outbound HTTPS access — used for pulling images, Let's Encrypt, OWASP CRS rule updates, ClamAV and Linux Malware Detect signatures, Spamhaus DROP lists, and the DB-IP Lite country database used for country blocking
- DNS records for your site domains pointing at the host, for Let's Encrypt certificate issuance

**For container deployment (recommended):**

- Podman installed and running on the host
- The Podman socket exposed and accessible (see notes below)
- Docker Compose, Podman Compose, or equivalent for compose-based deployments

**For binary deployment:**

- Go 1.27 or later
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

## Host Install (pdnctl)

`pdnctl` is the host-side manager for PodNest — the **recommended** way to get an instance running. It installs PodNest as a rootless container under a dedicated user, handles updates and channel switching, and wraps the service lifecycle. All the rootless prerequisites (dedicated user, subuid/subgid ranges, unprivileged port floor, lingering, the Podman socket) are handled for you.

Install it with one command as root:

```bash
curl -fsSL https://raw.githubusercontent.com/kpirnie/podnest/main/bootstrap.sh | sudo bash
```

Then set up PodNest. Replace USER with whatever username you would like to utilize, and select a version:

```bash
pdnctl install --user USER --version latest|dev|beta
```

The timezone is pulled from the host, site data lives at `/home/<user>/sites`, and the install details are stored in `/etc/podnest/install.json` — every command after `install` needs zero flags.

`install` also generates `/home/<user>/.pn.env`, holding the `PN_SECRET_KEY` that encrypts node link private keys at rest. It lives outside the site data directory on purpose — back it up with your data, and never change or delete it, or every paired child node will need to be re-paired.

Once running, the UI is available at: `http://your-host:9000`

### Commands

| Command | Description |
| --- | --- |
| `pdnctl install --user <name> --version <latest\|dev\|beta>` | Fresh rootless setup under a dedicated user |
| `pdnctl update` | Self-update the `pdnctl` binary, then pull the newest image on the current channel and restart |
| `pdnctl update --version <latest\|dev\|beta>` | Switch channels — future updates track the new channel |
| `pdnctl pull-images` | Pull updated versions of every image already on the host |
| `pdnctl upgrade` | Create `~/.pn.env` and add it to the service unit if missing, run `update`, pull all images, recreate every site pod on the fresh images, then prune stopped standalone containers and unused images |
| `pdnctl start` / `pdnctl stop` / `pdnctl restart` | Control the PodNest service |
| `pdnctl status` | Show the install summary and service status |
| `pdnctl images` | Show the current Podman images |
| `pdnctl containers` | Show the currently running Podman containers |
| `pdnctl pod-restart <site>` | Restart a specific site's pod |
| `pdnctl unparent` | Drop this node's parent link and every user synced from it |
| `pdnctl uninstall` | Remove PodNest — keeps the user and site data |
| `pdnctl uninstall --purge` | Remove PodNest, the dedicated user, and all site data |

All `pdnctl` commands must be run as root.

`pdnctl update` upgrades itself before touching the service — it pulls the newest `pdnctl` release binary from GitHub and swaps it into place, skipping the download when the running binary is already current. `bootstrap.sh` is only needed for the very first install.

**Updating from the panel** — the panel only has access to the rootless Podman socket, so it cannot update the root-owned `pdnctl` binary itself. When an update is requested from the panel, it drops a request flag in `<app-path>/data`, and a root systemd timer (`pdnctl-update.timer`) runs the hidden `pdnctl update-queued` command, which performs a full `update` only when that flag is present and then clears it — whether or not the update succeeded, so a failing update is not retried over and over.

---

## Running as a Container

Prefer to deploy and manage the container yourself instead of using `pdnctl`? A pre-built multi-architecture image (`linux/amd64` and `linux/arm64`) is published to the GitHub Container Registry — no compilation required.

### Available Image Tags

| Tag | Description |
| --- | --- |
| `latest` | Latest stable release — use this for production |
| `dev` | Tracks the `develop` branch (also tagged `develop`) — use at your own risk |
| `beta` | Tracks the `main` branch — preview features, not production-ready |

```
ghcr.io/kpirnie/podnest:latest
ghcr.io/kpirnie/podnest:dev
ghcr.io/kpirnie/podnest:beta
```

Each release is also tagged with its version (for example `v1.33.29`). Only the most recent release's version tag is kept — when a new release is published, the previous release, its tag, and its image are removed — so pinning to a version tag is not a long-term option.

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
      - /run/podman/podman.sock:/run/podman/podman.sock:rw,bind
      - /your/persistent/path:/opt/podnest:z
    tmpfs:
      - /tmp
    env_file:
      - ~/.pn.env
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

**Secret key (`PN_SECRET_KEY`)** — PodNest encrypts node link private keys at rest with the key in `PN_SECRET_KEY`. Keep the env file outside the `/opt/podnest` volume, so a copy of the data directory alone does not carry it. Create it once before the first start:

```bash
printf 'PN_SECRET_KEY=%s\n' "$(openssl rand -hex 32)" > ~/.pn.env
chmod 600 ~/.pn.env
```

Never change or delete it once set, or every paired child node will need to be re-paired. Without it PodNest still runs, but stores node keys in plaintext and logs a warning at startup. Existing plaintext keys are encrypted automatically on the first start with the key present.

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
    --env-file /root/.pn.env \
    -e TZ=America/New_York \
    -e LOG_LEVEL=INFO \
    ghcr.io/kpirnie/podnest:latest serve --app-path /opt/podnest --port 9000 --socket /run/podman/podman.sock
ExecStop=/usr/bin/podman stop podnest

[Install]
WantedBy=multi-user.target
```

Replace the persistent path with the host path where your site data should persist, and create `/root/.pn.env` as described under **Secret key** above. Enable and start the service:

```bash
systemctl daemon-reload
systemctl enable --now podnest.service
systemctl status podnest.service
```

A `podnest.service` example file is included in the repository. It omits the `--env-file` line and runs with `LOG_LEVEL=DEBUG` — add the env file as shown above and adjust the log level before using it.

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

You will be prompted for username, first name, last name, email, phone, and a password. This only needs to be run once. If an admin account already exists, it exits with an error and directs you to the UI.

### Start the Server

```bash
export PN_SECRET_KEY="$(grep PN_SECRET_KEY ~/.pn.env | cut -d= -f2)"
./podnest serve \
  --app-path /opt/podnest \
  --port 8080 \
  --socket /run/podman/podman.sock
```

`PN_SECRET_KEY` encrypts node link private keys at rest — see **Secret key** under Docker Compose for how to create `~/.pn.env`.

### Available Commands and Flags

Every command shares the following persistent flags:

| Flag | Default | Description |
| --- | --- | --- |
| `--app-path` | `/opt/podnest` | Base path for the database, site configs, and all application data |
| `--port` | `8080` | Port the management UI listens on |
| `--socket` | `/run/user/<uid>/podman/podman.sock` | Path to the Podman socket |

| Command | Description |
| --- | --- |
| `init` | Set up the database and create the admin account interactively |
| `serve` | Start the management UI and API server |
| `reset` | Reset a user's password and/or clear their TOTP from the host shell |
| `security` | Recover panel access when a security rule has locked you out |
| `recreate --all` | Recreate every site pod on freshly pulled images |
| `unparent` | Drop this node's parent link and every user synced from it |

`reset` interactively resets a user's password and/or clears their TOTP — useful when an admin is locked out:

```bash
./podnest reset --app-path /opt/podnest
```

`security` recovers panel access when a security rule has locked you out:

```bash
./podnest security --bypass 203.0.113.7 --app-path /opt/podnest
```

`--bypass` accepts an IP or CIDR and adds it to the security bypass list (skipping all IP/UA/country/ASN/WAF checks, including Spamhaus DROP). Restart the podnest service for it to take effect.

`recreate` rebuilds every site pod in turn on the images already pulled to the host. The `--all` flag is required. Every site is attempted even when an earlier one fails, and a summary error is returned if any did.

```bash
./podnest recreate --all --app-path /opt/podnest
```

---

## First Login

### Container

When the container starts for the first time with no existing database, an admin account named `admin` is created with a randomly generated password, printed once to the service log:

```bash
podman logs podnest 2>&1 | grep "default admin created"
```

> **Change this password after your first login.** It stays in the log history until the log is rotated or the container is recreated.

### Binary

If you used `podnest init`, log in with the credentials you provided during setup. The `serve` command only auto-seeds the generated admin account above if no admin account exists at startup.

---

## Directory Structure

Once PodNest is running with a persistent volume, the following structure is created at your mounted path (or at `--app-path` for binary deployments):

```
/opt/podnest/
├── podnest.db          # SQLite database — users, sites, domains, configs, SFTP creds
├── certs/              # TLS certificates (Let's Encrypt and self-signed fallback)
├── data/               # Runtime flags — e.g. the queued-update request read by the pdnctl update timer
├── logs/               # Proxy access log and WAF log
│   ├── proxy-access.log
│   └── waf.log
├── fail2ban/           # Fail2Ban config and jail data
├── waf/
│   └── crs/            # Downloaded OWASP CRS rule files — auto-updated on startup
├── malscan/            # Malware scanning
│   ├── clamav/         # Persisted ClamAV signatures — only deltas are downloaded per run
│   ├── maldet/         # Persisted Linux Malware Detect signatures
│   └── quarantine/     # Quarantined files, per site ID — outside SFTP reach
├── sftp/               # Global SFTP container config
│   ├── keys/           # Persistent SSH host keys
│   ├── etc-ssh/
│   │   └── sshd_config.d/
│   ├── logs/           # SFTP access logs — watched by Fail2Ban
│   └── users.conf      # SFTP user accounts — managed automatically
├── spamhaus/           # Cached Spamhaus DROP lists — refreshed every 24 hours
│   ├── drop_v4.json
│   ├── drop_v6.json
│   └── asndrop.json
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
        ├── podnest-sso.php # WordPress sites only — managed wp-admin SSO mu-plugin, mounted read-only
        └── .env            # Auto-generated credentials — do not delete
```

The `.env` file inside each site directory holds the auto-generated database and Redis credentials injected into the pod at runtime. Do not delete or manually edit it unless you know exactly what you are doing. The `sftp/users.conf` file is managed automatically by PodNest — do not edit it manually.

---

## Documentation

Day-to-day usage, configuration, and the full API reference are documented in the [PodNest Knowledge Base](https://podnest.app). Topic index:

- **Managing Sites** — creating sites, site actions, container health, cloning, domains
- **Site Push** — push one site's files and/or database onto another site (the target is backed up first)
- **SFTP Access** — global SFTP container, directory access, Fail2Ban integration
- **Built-in Reverse Proxy** — how it works, SSL / Let's Encrypt, admin domain, Reverse Proxy site type
- **Redirects** — per-site redirect rules
- **Basic Auth** — per-site HTTP basic authentication
- **Site Configurations** — nginx, PHP, MariaDB, Redis, Varnish, resetting a config
- **Security Rules** — IP rules, User-Agent rules, country blocking, ASN blocking, ASN lookup, Spamhaus DROP, global vs per-site, import/export
- **WAF** — CRS rule management, global settings, per-site overrides, exclusions, auto-ban (429 cooldowns, bans, permanent bans, global escalation), WAF log
- **Malware Scanning** — nightly ClamAV and Linux Malware Detect scans, manual scans, findings, quarantine, retention and resource settings
- **Live Logs** — per-site and global log streams
- **Audit Log** — record of administrative actions
- **WP-CLI Terminal** — browser terminal for WordPress sites
- **WordPress** — nightly core/plugin/theme update checks, one-click updates, and wp-admin single sign-on
- **phpMyAdmin** — database management
- **Stats & Traffic** — dashboard and per-site stats
- **Resource Monitoring** — host resource watcher and throttling
- **User Management** — users, roles, two-factor authentication
- **Node Linking** — parent/child nodes, pairing codes, user sync, single sign-on into child nodes, unparenting
- **Settings** — general, trusted proxies, backup schedule, S3, notifications, resources, export/import
- **Notifications** — channels and per-user opt-in
- **Cron Jobs** — per-site scheduled jobs
- **Backup & Restore** — what gets backed up, destinations, manual/scheduled backups, restore, import
- **Security** — login rate limiting, 2FA, sessions, CSRF, headers, WebSocket security, API authorization
- **Updating** — update notifications, updating from the panel, and how to update
- **API Reference** — complete REST and WebSocket API

---

## Development Container

The `.devcontainer` folder defines a self-contained development environment with Go, Node, restic, and a nested Podman, for any tool that supports the [Dev Container specification](https://containers.dev/). It does not use the host's Podman socket; all site pods run inside the dev container.

Open the repository in the dev container, then start PodNest from its terminal:

```bash
go run ./main.go serve --app-path /opt/podnest --port 8080 --socket /run/podman/podman.sock
```

Open `http://localhost:8080`. On first start, the `admin` password is printed once in the terminal output (`default admin created`). After frontend changes, run `npm run build` and restart PodNest.

> **For development only.** The container runs as root in privileged mode, so use it only with trusted code. Data in `/opt/podnest` and Podman storage is lost when the container is rebuilt or removed, unless you persist it with mounts.

---

## Security Policy

Please do not open a public issue, pull request, or discussion for a security problem. Report it privately through the repository's **Security** tab (**Report a vulnerability**) or by email — see [SECURITY.md](SECURITY.md) for what to include, what to expect, and what is in scope.

---

## Contributing

Bug reports and feature requests are welcome through [GitHub Issues](https://github.com/kpirnie/podnest/issues) — please use the provided templates. Pull requests use the repository's pull request template. Release notes are published on the [Releases](https://github.com/kpirnie/podnest/releases) page.

---

## Acknowledgements, Contributions, & Accolades

Thanks to everyone who has helped make PodNest more secure, reliable, & all around a better project.

- **[@BuddiesD](https://github.com/BuddiesD)** — reported a race condition that allowed a TOTP backup code to be consumed more than once under concurrent requests ([#8](https://github.com/kpirnie/podnest/issues/8)), and a race condition where saving backup settings during a site's first backup could replace the repository password and break later backups and restores ([#24](https://github.com/kpirnie/podnest/issues/24))s

---

## License

PodNest is licensed under the [MIT License](LICENSE). See the `LICENSE` file in the repository for the full license text.

---

## Support

This project is provided as-is through GitHub. **Paid support is available** for those who need hands-on help with setup, configuration, customization, or troubleshooting. Reach out through [https://kevinpirnie.com/about-kevin-pirnie/lets-talk/](https://kevinpirnie.com/about-kevin-pirnie/lets-talk/) to inquire about support options.
