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

## Features

- Stable public URLs per profile
- HTTP & WebSocket tunneling via a background daemon
- Multiple simultaneous tunnels
- Profiles & environments
- Self-hosted relay servers
- CIDR allow/deny access control
- Private peer-to-peer tunnels (`tunli share` / `tunli connect`) — no public URL, access by key only

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

`tunli 3000` also works — `http` is the default command.

Use `--save <name>` to persist the configuration as a profile. Start it again with `tunli start <profile>`.

**Foreground mode** — run the tunnel directly in the CLI process without a background daemon:

```bash
tunli http 3000 --foreground      # alias: --fg
tunli http 3000 --dashboard       # with live TUI dashboard (alias: --db)
tunli http 3000 --logs            # with live log output to stdout
```

### `tunli start <profile>`

Start a tunnel using a saved profile.

```bash
tunli start myapp
```

### `tunli up` / `tunli down`

Start or stop all profiles defined in the local `.tunli/config.json`. Useful for projects with multiple services.

```bash
tunli up      # start all local profiles (skips already running)
tunli down    # stop all tunnels belonging to local profiles
```

### `tunli list`

Show all active tunnels managed by the daemon.

```bash
tunli list
```

### `tunli dashboard [profile]`

Attach to a running tunnel and show the live TUI dashboard. If multiple tunnels are active and no profile is given, a picker is shown. Press Ctrl+T inside the dashboard to switch between tunnels.

```bash
tunli dashboard
tunli dashboard myapp
```

### `tunli logs [profile]`

Attach to a running tunnel and stream live log output to stdout.

```bash
tunli logs
tunli logs myapp
```

### `tunli stop [profile...]`

Stop one or more running tunnels without stopping the daemon.

```bash
tunli stop myapp
tunli stop api frontend worker
```

### `tunli daemon`

Manage the background daemon process.

```bash
tunli daemon start
tunli daemon stop              # requires --force if tunnels are active
tunli daemon stop --force      # stop immediately, tunnels are closed
tunli daemon restart           # dump tunnels, restart, restore them
tunli daemon status
```

`restart` preserves active tunnels — it dumps state, restarts the daemon, and restores all tunnels. Use `stop` + `start` for a clean restart.

### `tunli register`

Register a new account and store the auth token.

```bash
tunli register
tunli register --force                                        # renew existing token
tunli register --relay https://api.myserver.com --name self   # self-hosted server
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

### `tunli identity`

Show your tunli identity (public key and fingerprint). The keypair is generated automatically on first `tunli register`.

```bash
tunli identity
```

### `tunli share <port> [host]`

Share a local port privately via a peer-to-peer tunnel. No public URL is created — only someone with your public key can connect.

```bash
tunli share 8080
# → Your public key: tunli1abc...
# → Share this: tunli connect tunli1abc...
```

### `tunli connect <pubkey>`

Connect to a remote share by the host's public key. Opens a local TCP port that proxies to the remote service.

```bash
tunli connect tunli1abc...
# → Connected. Service available at localhost:52416
# → For SSH: ssh -p 52416 user@localhost

tunli connect tunli1abc... --port 2222   # fixed local port
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

## Configuration

Tunli stores its config in JSON files:

| Scope  | Location                                               |
|--------|--------------------------------------------------------|
| Global | `~/.tunli/config.json`                                 |
| Local  | `./.tunli/config.json` (per-project, takes precedence) |

A profile holds the target `host`, `port`, `protocol`, saved `proxyURL`, and optional CIDR allow/deny lists.

## License

GPL-3.0
