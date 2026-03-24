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
