# Changelog

## [Unreleased]

### Identity
- Ed25519 keypair generated once at `tunli register` time, stored in `~/.tunli/identity.key` (private, mode 0600) and `~/.tunli/identity.pub`
- Public key encoded as `tunli1<base64url>` — recognisable, copy-paste-safe
- Short fingerprint (8-char hex) for display
- `tunli identity` — show public key and fingerprint
- Foundation for private peer-to-peer tunnels (`tunli share` / `tunli connect`)

### `tunli http` foreground mode
- `--foreground` — run the tunnel in the CLI process without a background daemon; exits when the process is killed
- `--dashboard` — foreground mode with the live TUI dashboard attached
- `--logs` — foreground mode with live log output to stdout

## [0.2.0] - 2026-03-24

### Dashboard
- Request runtime per log entry, color-coded (green <100ms, yellow <500ms, red ≥500ms)
- Path and status columns dynamically sized to longest entry
- Pause access log with Ctrl+P — new entries are buffered and flushed on resume
- Keyboard navigation through log entries (↑↓), Enter opens detail view, Esc exits
- Detail modal: request/response headers, status, duration, timestamp
- `dev:dashboard` script for UI development with simulated fake data (`npm run dev:dashboard`)

## [0.1.0] - 2026-03-23

Initial release after full rewrite.

### Core
- Daemon-based tunnel management via Unix socket
- HTTP & WebSocket tunneling
- Profiles & environments
- Global and local (per-project) configuration
- CIDR allow/deny access control
- Self-hosted relay server support
- React + Ink TUI dashboard

### Distribution
- Two-binary SEA distribution: stable launcher (`tunli`) + auto-updated main binary (`tunli-main`)
- Launcher auto-downloads `tunli-main` from GitHub Releases on first run
- Separate `build-main.sh` / `build-launcher.sh` scripts; matrix release workflow for Linux and macOS

### Updates
- `tunli update` — download and apply the latest binary release
- Dashboard Ctrl+U triggers in-place update with live progress output
- `UpdateResult` type replaces boolean callbacks: `progress` / `success` / `failed`

### Daemon lifecycle
- `tunli daemon reload` — dump active tunnels, restart daemon, restore tunnels
- Tunnel dump & restore: active tunnels serialized to `~/.tunli/dump.json` before daemon stops; new daemon instance reads and restores them on startup
- After an update-triggered restart `tunli-main` auto-starts the daemon if a dump file is present

### Dashboard
- Restart feedback: "Restarting…" shown immediately when Ctrl+R is pressed

### Proxy
- Connection pool size negotiated with server via `connectInfo` response
