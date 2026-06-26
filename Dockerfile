# -- stage 1: build -----------------------------------------------------------
FROM docker.io/golang:1.26.4-alpine AS builder

# add gcc and musl-dev
RUN apk add --no-cache gcc musl-dev

# setup the working directory
WORKDIR /build

# copy in our required go modules
COPY go.mod go.sum ./
RUN go mod download

# copy in the source code
COPY . .

# default version
ARG VERSION=dev

# compile the app
RUN CGO_ENABLED=1 GOOS=linux go build \
    -ldflags="-s -w -extldflags '-static' -X podnest/internal/version.AppVersion=${VERSION}" \
    -o podnest ./main.go

# -- stage 2: final -----------------------------------------------------------
FROM docker.io/library/alpine:latest

# Metadata labels
LABEL maintainer="Kevin Pirnie <iam@kevinpirnie.com>"
LABEL description="A hardened, high-performance web hosting pod manager built on Podman. Provision and manage isolated, production-ready site pods from a single web-based management UI."
LABEL org.opencontainers.image.authors="Kevin Pirnie <iam@kevinpirnie.com>"
LABEL org.opencontainers.image.vendor="PodNest - Kevin Pirnie"
LABEL org.opencontainers.image.url="https://podnest.us/"
LABEL org.opencontainers.image.source="https://github.com/kpirnie/podnest"
LABEL org.opencontainers.image.licenses="MIT"

# install certs, timezone data, podman, and restic
RUN apk add --no-cache ca-certificates tzdata podman restic

# make sure we have the proper foders setup
RUN mkdir -p /opt/podnest/sites /opt/podnest/data

# pre-create the podman socket path as a file so bind mounts work correctly
RUN mkdir -p /run/podman && touch /run/podman/podman.sock

# copy in the built binary
COPY --from=builder /build/podnest /usr/local/bin/podnest

# expose a port
EXPOSE 8080

# setup the entry point
ENTRYPOINT ["podnest"]

# fire up the command
CMD ["serve", "--app-path", "/opt/podnest", "--port", "8080", "--socket", "/run/podman/podman.sock"]
