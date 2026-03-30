# Changelog

## [Unreleased]

### `tunli init`: local config registry
- Running `tunli init` now registers the created config path in the global config (`~/.tunli/config.json`) under `localConfigs`
- Global config gains `localConfigs: string[]` — a registry of all known local config paths across projects
- `tunli init` prints the path of the created config; `--force` logs the removed file before recreating

### Refactor: daemon extraction to `@tunli/daemon`
- `DaemonClient` class replaced by `daemonClient()` singleton function and `attachTunnel()` free function
- `send`, `isRunning`, `spawnDaemon`, `start`, `stop`, `ensureRunning` fully delegated to `@tunli/daemon`; no more inline socket/spawn logic in the client
- `resolveDaemonFile` from `@tunli/daemon` replaces the manual `import.meta.url` path resolution
- All callsites migrated from `new DaemonClient().send(…)` / `DaemonClient.isRunning()` to `daemonClient().send(…)` / `daemonClient().isRunning()`
- `DaemonServer` delegates socket server lifecycle to `@tunli/daemon`

## [0.7.0] - 2026-03-27

### HTTPS target support
- `tunli https <port>` — new command to tunnel to a local HTTPS service; mirrors `tunli http` with protocol set to `https`
- Proxy forwards requests and WebSocket upgrades to HTTPS targets using `https.request` / `tls.connect` with `rejectUnauthorized: false`, correct `host` header, and `servername` to avoid SNI `unrecognized_name` errors
- Replay works for HTTPS targets with the same fixes applied
- Dashboard forwarding URL and daemon tunnel info now include the protocol (`https://…`)
- URL shorthand (e.g. `tunli https://localhost:8443`) correctly routes to the `https` command

### Fixes
- `confirm()`: resolved `false` twice when the readline interface was closed after an answer was given

## [0.6.0] - 2026-03-27

### Request Replay
- Requests are stored per tunnel in an in-memory ring buffer (capacity 200, configurable)
- `tunli replay [profile]` — interactive picker to replay past requests; `--last` replays the most recent one directly; `--id <id>` for scripting
- Dashboard: `[r]` in the detail modal replays the request and shows the new status/duration inline; replayed entries get a `↺` marker in the log list
- Bodies are excluded for multipart/form-data, application/octet-stream, and payloads > 1 MB
- On daemon shutdown, request metadata (without bodies) is persisted to `~/.tunli/replay-meta.json` and restored on next start (TTL 24 h); entries with unavailable bodies are shown but replay is disabled

### Dashboard fixes
- Log list is now limited to available terminal rows — info rows at the top no longer get squished when many requests arrive
- Path column is capped to available terminal width and truncated with `…`; each row uses `wrap="truncate"` to prevent horizontal overflow and garbled output
- Log updates are throttled to 50 ms — batches concurrent requests into a single render, eliminating most header flicker
- Log container is remounted on each update flush, forcing a clean redraw and preventing leftover characters from shorter entries
- Fixed: closing the dashboard while a request was in-flight could crash the daemon (EPIPE on the attach socket with no error handler)
- Update message corrected: "Restart the daemon to apply" instead of "Restart tunli"

### Fixes
- `tunli update`: daemon is no longer implicitly stopped during the update — the binary is swapped first, the daemon is only stopped if the user confirms the restart prompt

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
