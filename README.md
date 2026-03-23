# Tunli

Tunli is a developer-first tunneling tool that gives you full control — use the official server at [tunli.app](https://tunli.app) or run your own with [tunli-server](https://github.com/tunlijs/tunli-server).

## Installation

**Binary (no Node.js required):**

```bash
# Linux
curl -L https://github.com/tunlijs/tunli-client/releases/latest/download/tunli-linux.tar.gz | tar -xz -C /usr/local/bin

# macOS
curl -L https://github.com/tunlijs/tunli-client/releases/latest/download/tunli-macos.tar.gz | tar -xz -C /usr/local/bin
```

Or download manually from the [releases page](https://github.com/tunlijs/tunli-client/releases).

**via npm:**

```bash
npm install -g tunli
```

Requires Node.js >= 22.

> **Note:** The CLI command interface is not yet final. Some commands and flags may be renamed or restructured in v0.2.0 for consistency. See the [Roadmap](ROADMAP.md) for planned changes.

## Features

- Stable public URLs per profile
- HTTP & WebSocket tunneling via a background daemon
- Multiple simultaneous tunnels
- Profiles & environments
- Self-hosted relay servers
- CIDR allow/deny access control

## Quick Start

By default the client connects to the official server — no server setup required.

```bash
# 1. Register (once)
tunli register

# 2. Start a tunnel to your local port
tunli http 3000

# 3. Watch live output
tunli logs
```

`tunli http` hands the tunnel off to the background daemon and exits immediately. Use `tunli logs` or `tunli dashboard` to observe traffic.

## Commands

### `tunli http <port> [host]`

Start a tunnel to a local HTTP service. The daemon is started automatically if it isn't running yet.

```bash
tunli http 3000
tunli http 3000 127.0.0.1
tunli http 3000 --save myapp      # save as a named profile for later reuse
```

Use `--save <name>` to persist the configuration as a profile. You can then start it again with `tunli use <profile>` or `tunli @<profile>`.

### `tunli use <profile>`

Start a tunnel using a saved profile. Profiles are created via `tunli http --save` or managed with `tunli profile`.

```bash
tunli use myapp
tunli @myapp                       # shorthand
```

### `tunli list`

Show all active tunnels managed by the daemon.

```bash
tunli list
```

### `tunli dashboard [profile]`

Attach to a running tunnel and show the live TUI dashboard. Defaults to the first active tunnel.

```bash
tunli dashboard
tunli dashboard myapp
```

### `tunli logs [profile]`

Attach to a running tunnel and stream live log output to stdout. Defaults to the first active tunnel.

```bash
tunli logs
tunli logs myapp
```

### `tunli stop [profile]`

Stop a running tunnel without stopping the daemon. Omit the profile name to stop the first active tunnel.

```bash
tunli stop myapp
tunli stop
```

### `tunli daemon`

Manage the background daemon process. The daemon is also started automatically when needed.

```bash
tunli daemon start
tunli daemon stop
tunli daemon restart
tunli daemon reload    # dump active tunnels, restart daemon, restore them
tunli daemon status
```

### `tunli register`

Register a new account and store the auth token.

```bash
tunli register
tunli register --force                                        # renew existing token
tunli register --server https://api.myserver.com --name self  # self-hosted server
```

### `tunli auth <token>`

Manually store an auth token (e.g. received via invitation).

```bash
tunli auth <token>
```

### `tunli init`

Initialize a local config file in the current directory. Local configs override the global config and are useful for per-project settings.

```bash
tunli init
tunli init --force   # overwrite existing local config
```

### `tunli config`

Show or modify the active configuration.

```bash
tunli config                               # show active config
tunli config get host                      # read a single value
tunli config set host 127.0.0.2            # set a value
tunli config set port 3001 -p staging      # set in a named profile
tunli config delete                        # remove the active config file
tunli config delete -p staging             # remove a specific profile
tunli config dump                          # dump global + local config
tunli config relays                        # list registered relay servers
```

Scope flags (available on most config commands):

```
--global / -g     use the global config (~/.tunli/config.json)
--local  / -l     use the local config  (./.tunli/config.json)
--profile / -p    target a specific profile
```

### `tunli profile`

Manage tunnel profiles.

```bash
tunli profile list
tunli profile use staging       # set staging as the default profile
tunli profile delete staging    # remove a profile
```

### `tunli update`

Download and apply the latest binary release.

```bash
tunli update
```

### `tunli relay`

Manage relay servers.

```bash
tunli relay list
tunli relay use myserver        # switch the active relay server
```

## Architecture & internals

For a deeper look at the two-binary model, daemon protocol, update flow and build system see [docs/architecture.md](docs/architecture.md).

## Architecture

Tunli runs a background daemon (`~/.tunli/daemon.sock`) that manages all active tunnels. The CLI communicates with it via a Unix socket using newline-delimited JSON.

- `tunli http` / `tunli use` — validate config, hand off to daemon, exit
- `tunli daemon` — explicit daemon lifecycle management
- `tunli list` — query active tunnels from the daemon
- `tunli dashboard` / `tunli logs` — attach to the daemon event stream

## Configuration

Tunli stores its config in JSON files:

| Scope  | Location                                               |
|--------|--------------------------------------------------------|
| Global | `~/.tunli/config.json`                                 |
| Local  | `./.tunli/config.json` (per-project, takes precedence) |

A profile holds the target `host`, `port`, `protocol`, saved `proxyURL`, and optional CIDR allow/deny lists.

## License

GPL-3.0
