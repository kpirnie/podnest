# -- stage 1: build -----------------------------------------------------------
FROM docker.io/library/golang:1.26-alpine AS builder

RUN apk add --no-cache gcc musl-dev

WORKDIR /build

COPY go.mod go.sum ./
RUN go mod download

COPY . .

ARG VERSION=dev

RUN CGO_ENABLED=1 GOOS=linux go build \
    -ldflags="-s -w -extldflags '-static' -X podnest/internal/version.AppVersion=${VERSION}" \
    -o podnest ./main.go

# -- stage 2: final -----------------------------------------------------------
FROM docker.io/library/alpine:latest

RUN apk add --no-cache ca-certificates tzdata podman restic

RUN mkdir -p /opt/podnest/sites /opt/podnest/data

# pre-create the podman socket path as a file so bind mounts work correctly
RUN mkdir -p /run/podman && touch /run/podman/podman.sock

COPY --from=builder /build/podnest /usr/local/bin/podnest

EXPOSE 8080

ENTRYPOINT ["podnest"]

CMD ["serve", "--app-path", "/opt/podnest", "--port", "8080", "--socket", "/run/podman/podman.sock"]
