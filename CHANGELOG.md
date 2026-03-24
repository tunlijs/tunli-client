# Changelog

## [Unreleased]

### Dashboard
- Request runtime displayed per log entry, color-coded (green <100ms, yellow <500ms, red ≥500ms)
- Path and status columns dynamically sized to longest entry
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
