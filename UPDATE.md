# Updating PodNest

PodNest is distributed as a container image via the GitHub Container Registry.  
Updating is a pull-and-restart — your data is never touched.

---

## Before You Update

- Check the [release notes](https://github.com/kpirnie/podnest/releases) for any breaking changes or migration steps specific to the version you are moving to.
- Your site data and database live in your mounted app path (e.g. `/home/sites`) and are unaffected by the update.

---

## Updating — docker-compose

```bash
docker compose pull
docker compose up -d
```

---

## Updating — systemd service (`podnest.service`)

```bash
podman pull ghcr.io/kpirnie/podnest:latest
systemctl restart podnest
```

---

## Updating — Podman (manual run, no systemd)

```bash
podman pull ghcr.io/kpirnie/podnest:latest
podman stop podnest
podman rm podnest
podman run ...   # your original run command
```

---

## Verifying the Update

Once restarted, the update banner in the admin UI will disappear if you are now on the latest release.  
You can also confirm the running version in the footer of the management UI.