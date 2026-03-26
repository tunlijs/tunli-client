# Changelog

## [0.5.1] - 2026-03-26

### Fixes
- `tunli update`: daemon is no longer implicitly stopped during the update — the binary is swapped first, the daemon is only stopped if the user confirms the restart prompt
- Dashboard update message corrected: "Restart the daemon to apply" instead of "Restart tunli"

## [0.5.0] - 2026-03-26

### `tunli update`
- After a successful update, prompts to restart the daemon (`Restart daemon now to apply the update? [y/N]`) if the daemon was running at the time of the update
- `--restart` — skip prompt, always restart
- `--no-restart` — skip prompt, never restart
- Both flags set together is an error

### Daemon version check
- On every command (except `--help`, `--version`, and `tunli daemon …`), the CLI queries the running daemon's version and compares it to the binary version
- If they differ, an error is shown and the process exits: `Daemon version mismatch: binary is X, daemon is Y. Run \`tunli daemon restart\` to apply the update.`
- The daemon captures its version at startup so the check is reliable even after the binary has been swapped on disk

### Fixes
- `tunli register` and `tunli auth` without `--relay` / `--name` now correctly fall back to the default server URL and name — `Option.default()` values are not forwarded by the CLI parser, so the fallback is now applied explicitly in the command

## [0.4.2] - 2026-03-26

### Fixes
- Tunnel restore after `daemon restart` / update no longer reports "No active tunnels" — daemon now restores the dump before opening the socket, so `DaemonClient.start()` only returns once all tunnels are back

## [0.4.1] - 2026-03-26

### Fixes
- DEP0169 (`url.parse`) deprecation warning no longer printed by `tunli share` / `tunli connect` — `process.removeAllListeners('warning')` is now called before the selective filter, since Node.js emits warnings via its own internal listener
- Version check now uses proper semver comparison instead of strict equality — a remote version equal to the local version no longer triggers an update prompt

## [0.4.0] - 2026-03-26

### New commands
- `tunli up` — start all profiles defined in the local `.tunli/config.json`; skips profiles that are already running
- `tunli down` — stop all tunnels belonging to local config profiles, without touching the daemon

### Dashboard
- Pre-start tunnel picker: if multiple tunnels are active and no profile argument is given, an interactive list is shown before opening the dashboard (↑↓ + Enter)
- Ctrl+T opens a tunnel switcher modal inside the dashboard to switch between active tunnels without restarting
- Header shows "(Ctrl+T switch · Ctrl+C quit)" hint when multiple tunnels are available

### `tunli daemon`
- `restart` now preserves active tunnels (dumps state, restarts daemon, restores tunnels — previously the behaviour of `reload`)
- `reload` is kept as an alias for `restart`
- `stop` now requires `--force` / `-f` if tunnels are active, with an explanatory message pointing to `daemon reload`
- `status` now includes the number of active tunnels

### `tunli stop`
- Accepts multiple profile names: `tunli stop api frontend worker`

### `tunli http`
- `--foreground` alias: `--fg`
- `--dashboard` alias: `--db`

### Output improvements
- `tunli http` / `tunli start`: structured output on connect — `✓ Connected`, `✓ Public URL`, `✓ Target URL`
- Re-running a tunnel that is already active shows the same structured output with "Already running" instead of an error

### Profile naming
- Ad-hoc tunnels (no `--save`) are now named `adjective-port` (e.g. `swift-3000`) instead of `http://localhost:3000`
- Adjective is derived from a hash of `host:port`, so different hosts on the same port get distinct names

## [0.3.0] - 2026-03-24

### Share / Connect (private peer-to-peer tunnels)
- `tunli share <port>` — share a local port privately; outputs a public key for the other party
- `tunli connect <pubkey>` — connect to a remote share, opens a local TCP port (random or `--port`)
- Connecting client's public key shown on host side at connect/disconnect
- `docs/share-relay-spec.md` — relay server implementation spec (Socket.IO `/share` namespace)

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
