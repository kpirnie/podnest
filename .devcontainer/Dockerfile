FROM docker.io/golang:1.27.4-trixie

# install the build toolchain, podman, and restic
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        aardvark-dns \
        ca-certificates \
        catatonit \
        crun \
        curl \
        gcc \
        git \
        gnupg \
        iptables \
        libc6-dev \
        nftables \
        pkg-config \
        podman \
        restic \
        xz-utils \
    && rm -rf /var/lib/apt/lists/*

# install the latest node 26 from the official tarball, verified against its checksum
RUN set -eu; \
    case "$(dpkg --print-architecture)" in \
        amd64) arch=x64 ;; \
        arm64) arch=arm64 ;; \
        *) echo "unsupported architecture: $(dpkg --print-architecture)" >&2; exit 1 ;; \
    esac; \
    cd /tmp; \
    base=https://nodejs.org/dist/latest-v26.x; \
    curl -fsSLO "$base/SHASUMS256.txt"; \
    tarball="$(grep -o "node-v[0-9.]*-linux-$arch\.tar\.xz" SHASUMS256.txt | head -n1)"; \
    curl -fsSLO "$base/$tarball"; \
    grep " $tarball\$" SHASUMS256.txt | sha256sum -c -; \
    tar -xJf "$tarball" -C /usr/local --strip-components=1 --no-same-owner; \
    rm -f "$tarball" SHASUMS256.txt; \
    npm install -g npm@12

# configure podman for running nested inside the dev container
RUN mkdir -p /var/lib/containers /run/podman \
    && printf '[storage]\ndriver = "vfs"\nrunroot = "/run/containers/storage"\ngraphroot = "/var/lib/containers/storage"\n' > /etc/containers/storage.conf \
    && printf '[engine]\ncgroup_manager = "cgroupfs"\nevents_logger = "file"\n' > /etc/containers/containers.conf

# git settings for working on a mounted repo
RUN git config --system core.fsmonitor false \
    && git config --system core.untrackedCache true \
    && git config --system core.preloadIndex true \
    && git config --system core.filemode false \
    && git config --system core.autocrlf input

# make sure we have the proper folders setup
RUN mkdir -p /opt/podnest/sites /opt/podnest/data
