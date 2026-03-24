# Roadmap

## 0.4.0

- **Node.js 22 support** — CI currently runs on Node 25 only; target is Node >= 22
- **CLI command interface cleanup** — some commands and flags will be renamed or restructured for consistency
- **Dashboard UI/UX overhaul** — fix existing design issues and inconsistencies in the TUI dashboard

## 0.5.0

- **Shared daemon package** — audit how much of the daemon logic (Unix socket, protocol, process management) overlaps between client and server; extract into a shared library if the overlap justifies it

## 0.6.0

- **Replace React + Ink with custom TUI rendering** — remove the React/Ink dependency and implement terminal UI handling directly, reducing bundle size and removing a significant chunk of the dependency tree

## 0.7.0

- **Replace Socket.IO with raw WebSockets** — removes the Socket.IO dependency on both client and server; requires implementing reconnect handling, ping/latency protocol and tunnel-assignment logic from scratch. Prerequisite for a potential Go client in the future.

## Unscheduled

- **Private peer-to-peer tunnels** — secure sharing between two tunli instances without a public URL. `tunli share <port>` exposes a local service privately; `tunli connect <key>` makes it available locally on the other side. Access controlled via persistent identity keypairs: the relay only brokers the connection after verifying both parties, it never inspects traffic. Authorization model: TOFU (first connect shows up in dashboard for approval) + persistent allowlist. Self-hosters benefit too — relay operator sees nothing.

- **TCP tunneling** — generic raw TCP forwarding over WebSocket (port 443), enabling SSH, PostgreSQL, Redis and other non-HTTP protocols. `tunli tcp 22` registers a TCP tunnel; `tunli tcp-proxy <host> <port>` acts as an SSH `ProxyCommand`. A one-time `~/.ssh/config` entry (`ProxyCommand tunli tcp-proxy %h %p`) makes `ssh user@bar.tunli.app -p443` work transparently. Requires a new binary-stream WebSocket path on the relay server.

- **Local web portal** — browser-based UI for traffic inspection and tunnel status. Targets use cases that don't fit the TUI well (request/response body inspection, richer filtering, history) and makes tunli accessible to team members who don't work in the terminal. Possibly a standalone tool (`tunli-inspector` or similar) that attaches to a running daemon rather than being bundled into the main binary.
