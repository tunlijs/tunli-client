# Roadmap

## Unscheduled

- **Node.js 22 support** — CI currently runs on Node 25 only; target is Node >= 22

- **Shared daemon package** — audit how much of the daemon logic (Unix socket, protocol, process management) overlaps between client and server; extract into a shared library if the overlap justifies it

### High priority

- **Request editor** (web portal) — edit method, path, headers and body of a captured request before replaying it. Intentionally scoped to the local web portal where an editor UI is practical; too unwieldy for the TUI.

- **`tunli setup` — interactive config wizard** — step-by-step CLI walkthrough for first-time setup and profile creation. Covers relay registration, target configuration, CIDR rules, share settings, and saves the result as a named profile. Replaces the need to remember flag combinations for complex configs.

- **Custom / reserved subdomains** — let users claim a stable subdomain (`myapp.tunli.app`) that persists across restarts and re-registrations. Requires relay-side subdomain management and DNS wildcard setup. The single most-requested feature in comparable tools.

- **`tunli up` — declarative multi-tunnel config** — define multiple tunnels in a YAML/TOML file, start all with `tunli up` and stop all with `tunli down`. Like docker-compose for tunnels. Useful for teams and projects with multiple services.

- **HTTP Basic Auth on tunnel** — `tunli http 8080 --auth user:pass` adds Basic Auth in front of the public URL at the relay level, without touching the local app.

- **Documentation — GitHub Wiki** — move long-form docs out of README into a GitHub Wiki: Getting Started guide (register → first tunnel → first share → SSH example), Self-hosting guide (relay setup, nginx/caddy config), full command reference, architecture overview. README becomes a short entry point with links to the wiki. `docs/` in-repo stays for developer-facing specs.

### Share

- **Share resilience** — the tunnel currently tears down on any error on the host side (TCP connection failure, local service crash, relay reconnect). Improvements: automatic session re-establishment after host-side errors without dropping the client connection, buffering of in-flight data during brief relay disconnects, and a configurable retry strategy on `tunli connect`.

- **Share allowlist** — Alice can restrict which public keys are allowed to connect to her share. Foundation is in place (Bob's public key is already forwarded in `share-client`). Needs UI (dashboard approval prompt or `~/.tunli/share-allowlist.json`) and TOFU flow: first-time connections shown for manual approval, approved keys persisted.

- **`tunli connect` auto-reconnect** — on relay disconnect the client currently dies; the user must restart manually. Should automatically re-establish the relay connection and re-register the session without losing the local TCP port.

- **`tunli share` dashboard** — replace plain log output with a TUI dashboard showing active clients (fingerprint, bytes transferred, connection duration), similar to `tunli http --dashboard`.

- **`tunli share` multi-client** — currently only one TCP client per session at a time; multiple parallel connections (e.g. multiple SSH sessions) should be supported without tearing down the share.

- **Expiring shares** — `tunli share 8080 --expires 2h` generates a time-limited key that the relay invalidates automatically after the given duration.

- **`tunli list` shows shares** — active `tunli share` sessions are currently invisible to `tunli list`; they should appear alongside daemon-managed tunnels.

- **Named share profiles** — `tunli share --save myserver` persists port and settings as a profile; `tunli share myserver` starts it directly, mirroring the `tunli http --save` / `tunli use` pattern.

- **Audit log** — local persistent log of who connected to a share (public key, fingerprint, timestamp, bytes transferred). Viewable via `tunli share log`.

- **`tunli connect --json`** — machine-readable output (`{"port": 52416}`) for use in scripts and tooling.

- **TCP tunneling** — generic raw TCP forwarding over WebSocket (port 443), enabling SSH, PostgreSQL, Redis and other non-HTTP protocols. `tunli tcp 22` registers a TCP tunnel; `tunli tcp-proxy <host> <port>` acts as an SSH `ProxyCommand`. A one-time `~/.ssh/config` entry (`ProxyCommand tunli tcp-proxy %h %p`) makes `ssh user@bar.tunli.app -p443` work transparently. Requires a new binary-stream WebSocket path on the relay server.

### Developer / ecosystem

- **Node.js SDK / agent** — programmatically start and manage tunnels from within a Node.js application (`import { createTunnel } from 'tunli'`). Follows the ngrok SDK pattern.

- **`--inspect` mode** — record all requests including bodies to a local file or stdout without opening the full dashboard. Useful in CI and scripting contexts.

- **CLI command interface cleanup** — some commands and flags will be renamed or restructured for consistency.

- **`tunli help <command>` improvements** — per-command help with examples, key format hints, and common error explanations.

- **`docs/architecture.md` review** — audit and update to reflect the current two-binary model, daemon protocol, share system, and identity system.

### Advanced / larger scope

- **Rate limiting** — limit requests per IP per second/minute on the tunnel level, configurable per profile.

- **Tunnel lifecycle webhooks** — fire an HTTP POST to a configured URL when a tunnel goes up or down. Useful for monitoring and automation.

- **Zero-trust access** — protect tunnel endpoints with email verification or SSO (e.g. OAuth) at the relay level, without requiring changes to the local app. Targets team use cases where sharing a token is not acceptable.

- **Local web portal** — browser-based UI for traffic inspection and tunnel status. Targets use cases that don't fit the TUI well (request/response body inspection, richer filtering, history) and makes tunli accessible to team members who don't work in the terminal. Possibly a standalone tool (`tunli-inspector` or similar) that attaches to a running daemon rather than being bundled into the main binary.

- **Windows support** — the daemon currently uses a Unix socket (`daemon.sock`); Windows would require Named Pipes. Launcher and process management also need platform-specific handling.

- **Replace React + Ink with custom TUI rendering** — remove the React/Ink dependency and implement terminal UI handling directly, reducing bundle size and removing a significant chunk of the dependency tree.

- **Replace Socket.IO with raw WebSockets** — removes the Socket.IO dependency on both client and server; requires implementing reconnect handling, ping/latency protocol and tunnel-assignment logic from scratch. Prerequisite for a potential Go client in the future.

- **Go client** — prerequisite: replace Socket.IO with raw WebSockets. A Go client would ship as a single static binary with no Node.js runtime dependency, significantly reducing install friction.
