#!/bin/sh
set -eu

# move every process into a child cgroup so controllers can be delegated to nested containers
cgroup_root=/sys/fs/cgroup
if [ -f "$cgroup_root/cgroup.controllers" ]; then
    mkdir -p "$cgroup_root/init"
    while IFS= read -r pid; do
        if [ -d "/proc/$pid" ] && ! { printf '%s\n' "$pid" > "$cgroup_root/init/cgroup.procs"; } 2>/dev/null; then
            if [ -d "/proc/$pid" ]; then
                printf 'Unable to move process %s into the dev-container cgroup\n' "$pid" >&2
                exit 1
            fi
        fi
    done < "$cgroup_root/cgroup.procs"
    if IFS= read -r pid < "$cgroup_root/cgroup.procs"; then
        printf 'Unable to delegate cgroup controllers: process %s remains\n' "$pid" >&2
        exit 1
    fi
    if IFS= read -r controllers < "$cgroup_root/cgroup.controllers"; then
        for controller in $controllers; do
            printf '+%s\n' "$controller" > "$cgroup_root/cgroup.subtree_control"
        done
    fi
fi

# start the podman API service unless it is already answering
socket=/run/podman/podman.sock
log=/tmp/podman-service.log
mkdir -p /run/podman
if curl --silent --fail --max-time 2 --unix-socket "$socket" http://localhost/_ping >/dev/null; then
    exit 0
fi

nohup podman system service --time=0 "unix://$socket" >"$log" 2>&1 &
service_pid=$!
for attempt in $(seq 1 30); do
    if curl --silent --fail --max-time 2 --unix-socket "$socket" http://localhost/_ping >/dev/null; then
        printf 'Podman API is ready\n'
        exit 0
    fi
    if ! kill -0 "$service_pid" 2>/dev/null; then
        printf 'Podman API failed to start; see %s\n' "$log" >&2
        cat "$log" >&2
        exit 1
    fi
    sleep 1
done

printf 'Timed out waiting for the Podman API; see %s\n' "$log" >&2
cat "$log" >&2
if kill -0 "$service_pid" 2>/dev/null; then
    kill "$service_pid"
fi
exit 1