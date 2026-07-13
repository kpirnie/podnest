#!/usr/bin/env bash
#############################################
# PodNest — rootless under a dedicated user
# Run as root:  bash setup.sh --action <install|update> --version <latest|dev|beta> --user <username>
#############################################
set -euo pipefail

#############################################
# argument handling
# all arguments are required and passed as flags —
# the script prints usage and exits when missing/invalid
#############################################

# print the usage message and exit
usage() {
  cat <<'EOF'
Usage: bash setup.sh --action <install|update> --version <latest|dev|beta> --user <username>

  --action   what to do: install (fresh setup) or update (pull + restart)
  --version  the PodNest image tag: latest, dev, or beta
  --user     the dedicated user PodNest runs under

Examples:
  bash setup.sh --action install --version latest --user podnest
  bash setup.sh --action update --version beta --user podnest
EOF
  exit "${1:-1}"
}

# show help when asked for, or when nothing was passed
[ $# -eq 0 ] && usage 0
case "${1:-}" in -h|--help|"?") usage 0 ;; esac

# parse the flags
PN_ACTION="" PN_VERSION="" PN_USER=""
while [ $# -gt 0 ]; do
  case "$1" in
    --action)  PN_ACTION="${2:-}";  shift 2 ;;
    --version) PN_VERSION="${2:-}"; shift 2 ;;
    --user)    PN_USER="${2:-}";    shift 2 ;;
    -h|--help|"?") usage 0 ;;
    *) echo "ERROR: unknown argument: $1"; usage ;;
  esac
done

# validate the action — must be one of: install, update
case "$PN_ACTION" in
  install|update) ;;
  *) echo "ERROR: --action required — must be one of: install, update"; usage ;;
esac

# validate the version — must be one of: latest, dev, beta
case "$PN_VERSION" in
  latest|dev|beta) ;;
  *) echo "ERROR: --version required — must be one of: latest, dev, beta"; usage ;;
esac

# validate the user — must not be empty
[ -n "$PN_USER" ] || { echo "ERROR: --user required"; usage; }

#############################################
# update: pull :<version>, rewrite the unit's
# image tag, and restart the service
#############################################
if [ "$PN_ACTION" = "update" ]; then
  PNUID=$(id -u "$PN_USER")
  RUN="sudo -u $PN_USER XDG_RUNTIME_DIR=/run/user/$PNUID"
  UNIT="/home/$PN_USER/.config/systemd/user/podnest.service"

  # rewrite the image tag in the installed unit so the service runs the
  # requested version, not whatever tag it was originally set up with
  [ -f "$UNIT" ] || { echo "ERROR: unit file missing at $UNIT"; exit 1; }
  sed -i "s|ghcr.io/kpirnie/podnest:[^ ]*|ghcr.io/kpirnie/podnest:$PN_VERSION|" "$UNIT"

  $RUN podman pull ghcr.io/kpirnie/podnest:$PN_VERSION
  $RUN systemctl --user daemon-reload
  $RUN systemctl --user restart podnest.service
  $RUN systemctl --user status podnest.service --no-pager | head -8
  $RUN podman image prune -f
  exit 0
fi

# setup: install
PN_DATA=/home/$PN_USER/sites        # host-side site data
PN_PORT=9000                       # UI port
PN_TZ=America/New_York
# ----------------------------

#############################################
# 1. Account + rootless prerequisites
#############################################
id "$PN_USER" &>/dev/null || useradd -m -s /usr/sbin/nologin "$PN_USER"

grep -q "^$PN_USER:" /etc/subuid || usermod --add-subuids 200000-265535 "$PN_USER"
grep -q "^$PN_USER:" /etc/subgid || usermod --add-subgids 200000-265535 "$PN_USER"

# rootless proxy needs to bind 80/443
echo 'net.ipv4.ip_unprivileged_port_start=80' > /etc/sysctl.d/99-podnest.conf
sysctl --system >/dev/null

# run user services with no login, and bring the user manager up now
loginctl enable-linger "$PN_USER"

PNUID=$(id -u "$PN_USER")
systemctl start "user@$PNUID.service"

mkdir -p "$PN_DATA"
chown -R "$PN_USER:$PN_USER" "$PN_DATA"

# the user manager must have created this
for i in $(seq 1 10); do [ -d "/run/user/$PNUID" ] && break; sleep 1; done
[ -d "/run/user/$PNUID" ] || { echo "ERROR: /run/user/$PNUID missing (user manager not running)"; exit 1; }

RUN="sudo -u $PN_USER XDG_RUNTIME_DIR=/run/user/$PNUID"

#############################################
# 2. Socket override so it cleans up on stop
#    (prevents the stale-path 'listening but no .sock' issue)
#############################################
install -d -o "$PN_USER" -g "$PN_USER" "/home/$PN_USER/.config/systemd/user/podman.socket.d"
cat > "/home/$PN_USER/.config/systemd/user/podman.socket.d/override.conf" <<'EOF'
[Socket]
RemoveOnStop=yes
EOF
chown -R "$PN_USER:$PN_USER" "/home/$PN_USER/.config/systemd/user/podman.socket.d"

# fix root-owned intermediates created by install -d
chown "$PN_USER:$PN_USER" "/home/$PN_USER/.config" "/home/$PN_USER/.config/systemd" "/home/$PN_USER/.config/systemd/user"

# clear a stale/dangling enable symlink from prior installs
rm -f "/home/$PN_USER/.config/systemd/user/sockets.target.wants/podman.socket"

#############################################
# 3. Bring up the ROOTLESS podman socket
#############################################
$RUN systemctl --user daemon-reload
$RUN systemctl --user enable podman.socket

# clear any stale path, then (re)start and wait for the real socket file
$RUN rm -rf "/run/user/$PNUID/podman/podman.sock"
$RUN systemctl --user restart podman.socket

SOCK="/run/user/$PNUID/podman/podman.sock"
for i in $(seq 1 10); do [ -S "$SOCK" ] && break; sleep 1; done
[ -S "$SOCK" ] || { echo "ERROR: rootless socket missing at $SOCK"; \
  $RUN systemctl --user status podman.socket --no-pager | head; \
  $RUN journalctl --user -u podman.service --no-pager | tail -20; exit 1; }
echo "OK: $SOCK"

#############################################
# 4. PodNest user service unit
#############################################
install -d -o "$PN_USER" -g "$PN_USER" "/home/$PN_USER/.config/systemd/user"
cat > "/home/$PN_USER/.config/systemd/user/podnest.service" <<EOF
[Unit]
Description=PodNest Management UI
After=podman.socket
Requires=podman.socket

[Service]
Restart=always
RestartSec=5
TimeoutStartSec=120
ExecStartPre=-/usr/bin/podman rm -f podnest
ExecStart=/usr/bin/podman run \\
    --name podnest \\
    --hostname podnest \\
    --network host \\
    -v %t/podman/podman.sock:/run/podman/podman.sock:rw \\
    -v %h/sites:/opt/podnest:z \\
    --tmpfs /tmp \\
    -e TZ=$PN_TZ \\
    -e LOG_LEVEL=INFO \\
    ghcr.io/kpirnie/podnest:$PN_VERSION serve --app-path /opt/podnest --port $PN_PORT --socket /run/podman/podman.sock
ExecStop=/usr/bin/podman stop podnest

[Install]
WantedBy=default.target
EOF
chown "$PN_USER:$PN_USER" "/home/$PN_USER/.config/systemd/user/podnest.service"

#############################################
# 5. Enable + start PodNest
#############################################
$RUN systemctl --user daemon-reload
$RUN systemctl --user enable --now podnest.service
$RUN systemctl --user status podnest.service --no-pager | head -8

cat <<EOF

>>> Done. Tail logs with:
    sudo -u $PN_USER XDG_RUNTIME_DIR=/run/user/$PNUID journalctl --user -u podnest -f

>>> Start the service with: 
    sudo -u $PN_USER XDG_RUNTIME_DIR=/run/user/$PNUID systemctl --user start podnest.service

>>> Stop the service with: 
    sudo -u $PN_USER XDG_RUNTIME_DIR=/run/user/$PNUID systemctl --user stop podnest.service

>>> Restart the service with: 
    sudo -u $PN_USER XDG_RUNTIME_DIR=/run/user/$PNUID systemctl --user restart podnest.service
    
>>> Check the service status with:
    sudo -u $PN_USER XDG_RUNTIME_DIR=/run/user/$PNUID systemctl --user status podnest.service
EOF