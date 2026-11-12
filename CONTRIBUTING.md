# Contributing to PodNest

Thanks for taking the time to contribute. This guide covers how to report problems, set up a development environment, and submit changes.

## Reporting bugs

Open an [issue](https://github.com/kpirnie/podnest/issues) using the bug report template and include:

- What you expected to happen and what actually happened
- Steps to reproduce
- Your PodNest version or commit, and how you run it (pdnctl host install, container, or binary), plus the host OS and Podman version
- The site type involved (WordPress, PHP, static HTML, Node.js, .NET, Python, or Reverse Proxy) and any features in play, such as backups (local or S3), the reverse proxy, WAF, or node pairing
- Relevant log output

Remove passwords, tokens, keys, and private hostnames from anything you post.

**Security problems must not be reported in public issues.** Follow [SECURITY.md](SECURITY.md) instead.

## Suggesting features

Open an issue using the feature request template, describing the problem you want solved, before writing any code. For larger changes this avoids work on something that doesn't fit the project.

## Development setup

The easiest way to get started is the dev container in `.devcontainer`. It works with any tool that supports the [Dev Container specification](https://containers.dev/), and it includes everything below plus a nested Podman, so site pods run inside the container rather than on your host. See [Development Container](readme.md#development-container) in the readme.

To set up on your own machine instead, you need:

- Go 1.27.4 with CGO enabled (gcc and libc headers)
- Node.js 26 and npm 12, for the frontend assets
- Podman, with its API socket running
- restic, for backups and restores

```bash
git clone https://github.com/kpirnie/podnest.git
cd podnest
git checkout develop
npm install
npm run build
go build -o podnest ./main.go
```

## Project layout

| Path | Purpose |
| ---- | ------- |
| `main.go` | Entry point for the `podnest` binary |
| `cmd/` | `podnest` CLI commands (`serve`, `init`, `reset`, `recreate`, and others) |
| `cmd/pdnctl/` | `pdnctl`, the host installer, updater, and service manager |
| `internal/` | Application code: the HTTP server and handlers, reverse proxy, Podman integration, backups, database, auth, and node linking |
| `internal/modules/` | Site-type platforms, containers, and per-site features |
| `web/templates/` | Server-rendered HTML templates |
| `web/static/src/` | Frontend JavaScript and CSS sources |
| `web/static/` | Built frontend assets, vendor files, and images that are served to the browser |
| `fail2ban/` | fail2ban filters and jails |
| `.devcontainer/` | Dev container definition |

## Making changes

1. Fork the repository and create a branch from `develop`: `git checkout -b feature/short-description`
2. Keep the change focused. Don't mix unrelated fixes, refactors, or reformatting into the same pull request.
3. Match the surrounding code: naming, comment style, and error handling.
4. Comment new code properly, following the project's documentation style.
5. If you change anything under `web/static/src/`, run `npm run build` and commit the rebuilt files under `web/static/`. CI does not build the frontend.
6. Run the checks below.

```bash
gofmt -l .
go vet ./...
go build ./...
npm run build
```

Do not commit credentials, `.env` files, or build artifacts such as the compiled `podnest` binary.

## Pull requests

- Target the `develop` branch.
- Use the pull request template. Describe what changed and why, and link any related issue.
- Note how you tested the change.
- Keep the first line of each commit message short and in the imperative mood, for example `Fix crash when the config file is missing`.

Pull requests are reviewed as time allows. You may be asked for changes before a merge.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).