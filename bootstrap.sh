#!/usr/bin/env bash
#############################################
# PodNest — pdnctl bootstrap
# Run as root:  bash bootstrap.sh
# Pulls the latest pdnctl release binary and
# installs it to /usr/local/bin — nothing else
#############################################
set -euo pipefail

# must be root — pdnctl itself requires it anyway
[ "$(id -u)" -eq 0 ] || { echo "ERROR: run as root"; exit 1; }

# detect the host architecture
case "$(uname -m)" in
  x86_64)        PN_ARCH=amd64 ;;
  aarch64|arm64) PN_ARCH=arm64 ;;
  *) echo "ERROR: unsupported architecture: $(uname -m)"; exit 1 ;;
esac

# pull the latest release binary, make it executable, move it into place
PN_URL="https://github.com/kpirnie/podnest/releases/latest/download/pdnctl-linux-$PN_ARCH"
curl -fsSL -o /tmp/pdnctl "$PN_URL"
chmod +x /tmp/pdnctl
mv /tmp/pdnctl /usr/local/bin/pdnctl

cat <<EOF

>>> pdnctl installed to /usr/local/bin/pdnctl

>>> Here's the next steps for you:

    Fresh install:
    pdnctl install --user XXXXX --version [latest|dev|beta]

    Update (or switch channels):
    pdnctl update [--version latest|dev|beta]

    Manage the service:
    pdnctl stop|start|restart|status

    Remove it all:
    pdnctl uninstall [--purge]
EOF
