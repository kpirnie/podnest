#!/usr/bin/env bash
#############################################
# PodNest — rootless under a dedicated user
# Run as root:  bash podnest.sh
#############################################
set -euo pipefail

# ---- adjust how you see fit ----
PN_USER="${1:-podnest}"
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
    ghcr.io/kpirnie/podnest:latest serve --app-path /opt/podnest --port $PN_PORT --socket /run/podman/podman.sock
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
    sudo -u $PN_USER XDG_RUNTIME_DIR=/run/user/$PNUID systemctl start podnest.service

>>> Stop the service with: 
    sudo -u $PN_USER XDG_RUNTIME_DIR=/run/user/$PNUID systemctl stop podnest.service

>>> Restart the service with: 
    sudo -u $PN_USER XDG_RUNTIME_DIR=/run/user/$PNUID systemctl restart podnest.service
    
>>> Check the service status with:
    sudo -u $PN_USER XDG_RUNTIME_DIR=/run/user/$PNUID systemctl status podnest.service
EOF
