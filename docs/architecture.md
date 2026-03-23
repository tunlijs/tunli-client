# Architecture

## Two-binary model

Tunli ships as two separate SEA (Single Executable Application) binaries:

| Binary | Location | Purpose |
|--------|----------|---------|
| `tunli` (launcher) | `/usr/local/bin/tunli` | Stable entry point, user installs once |
| `tunli-main` | `~/.tunli/bin/tunli-main` | CLI + daemon logic, gets updated |

Users only ever interact with `tunli`. The launcher spawns `tunli-main` as a child process and proxies stdio. This separation means the binary on `$PATH` never changes — only the inner binary is replaced during updates, which avoids permission issues and makes atomic swaps safe.

### Why not a single binary?

A SEA binary cannot replace itself on disk while running. On macOS in particular, overwriting the currently executing binary and then spawning it again fails. The launcher side-steps this by being the stable process that performs the rename and then spawns the fresh binary.

---

## Launcher lifecycle

**Source:** `src/launcher-main.ts`

```
tunli (launcher)
│
├─ first run: ~/.tunli/bin/tunli-main does not exist
│   └─ downloadBinaryUpdate() → saves to ~/.tunli/bin/tunli-main.update
│       └─ renameSync(tunli-main.update → tunli-main)
│
└─ normal run / restart loop
    ├─ proxyChildProcess(tunli-main, argv)
    │   └─ spawn tunli-main with IPC channel
    │
    └─ on IPC message 'restart':
        └─ onBeforeRestart()
            ├─ if tunli-main.update exists → applyUpdate()
            │   ├─ dumpAndStopDaemon()   (write dump.json, stop daemon)
            │   └─ renameSync(tunli-main.update → tunli-main)
            └─ respawn tunli-main
```

The launcher never exits between restarts — it is the persistent supervisor.

---

## Daemon

**Source:** `src/daemon/DaemonServer.ts`, `src/daemon/DaemonClient.ts`

The daemon is a long-lived background process that owns all active tunnel connections. It listens on a Unix socket at `~/.tunli/daemon.sock`.

### Starting the daemon

`DaemonClient.spawnDaemon()` spawns `tunli-main` with `TUNLI_DAEMON=1`. `sea-main.ts` routes to `daemon-main.ts` when this env var is set.

`DaemonClient.ensureRunning()` starts the daemon if it is not already running and waits up to 5 seconds for the socket to become available.

### Protocol

All messages are newline-delimited JSON over the Unix socket.

**Requests (CLI → daemon):**

| Type | Description |
|------|-------------|
| `start` | Start a new tunnel |
| `stop` | Stop a named tunnel |
| `list` | List active tunnels |
| `dump` | Serialize all active tunnel configs |
| `attach` | Subscribe to live events for a tunnel |
| `shutdown` | Stop the daemon |

**Responses (daemon → CLI):**

Single-message responses (`started`, `stopped`, `list`, `dump`, `ok`, `error`) close the connection after one line.

`attach` is different: it keeps the socket open and streams `event` messages (connect, disconnect, request, response, latency, …) until the tunnel stops or the process exits.

---

## Tunnel dump & restore

When the daemon needs to stop (update or `daemon reload`), active tunnel configs are persisted so they can be re-established automatically.

**Dump:** `dumpAndStopDaemon()` in `src/lib/Flow/applyUpdate.ts`
1. Send `{ type: 'dump' }` to the daemon → receives all `StartRequest` payloads
2. Write to `~/.tunli/dump.json`
3. Send `{ type: 'shutdown' }` and wait for the socket to close

**Restore:** `DaemonServer.#restoreFromDump()` runs immediately after the daemon starts listening
1. Read and delete `~/.tunli/dump.json`
2. Re-call `#startTunnel()` for each entry

**Auto-start after update:** `sea-main.ts` checks for `dump.json` before loading the CLI. If the file exists, `DaemonClient.ensureRunning()` is called first — guaranteeing the daemon is up and tunnels are restored before any command runs.

---

## Update flow

**Source:** `src/lib/Flow/downloadBinaryUpdate.ts`, `src/lib/Flow/applyUpdate.ts`

```
tunli update  (or Dashboard Ctrl+U)
│
├─ downloadBinaryUpdate(onProgress)
│   ├─ fetch tunli-main-{linux,macos}.tar.gz from GitHub Releases
│   ├─ extract to /tmp/tunli-main
│   └─ copyFile → ~/.tunli/bin/tunli-main.update
│
└─ applyUpdate()  (called by launcher's onBeforeRestart when .update exists)
    ├─ dumpAndStopDaemon()
    └─ renameSync(tunli-main.update → tunli-main)
```

`downloadBinaryUpdate` reports progress via an `UpdateResult` callback:
- `{ status: 'progress', message }` — intermediate steps
- `{ status: 'success' }` — download complete, `.update` file is ready
- `{ status: 'failed', reason }` — something went wrong

The actual binary swap happens in the launcher process (not inside `tunli-main`) so the file being executed is never the one being renamed.

---

## Build system

| Script | Output | SEA config |
|--------|--------|-----------|
| `scripts/build-main.sh` | `dist-sea/tunli-main` | `sea-config-main.json` |
| `scripts/build-launcher.sh` | `dist-sea/tunli-launcher` | `sea-config-launcher.json` |

`npm run build:sea` runs both. `npm run build:main` and `npm run build:launcher` build individually.

The GitHub Actions release workflow builds both binaries on Linux and macOS, then renames the launcher artifact from `tunli-launcher` to `tunli` before uploading — so release assets are named `tunli-{linux,macos}.tar.gz` (launcher) and `tunli-main-{linux,macos}.tar.gz` (main binary).
