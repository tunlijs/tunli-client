# Share — Relay Server Requirements

This document describes what the relay server needs to implement to support
`tunli share` / `tunli connect` (private peer-to-peer tunnels).

## Socket.IO namespace

Mount a `/share` namespace on the same Socket.IO server used for HTTP tunnels
(same mount path, e.g. `/socket.io`). Both sides authenticate via the existing
`auth.token` mechanism (Bearer token).

```
io('/share', { path: '/socket.io', auth: { token } })
```

## Events: Share Host (Alice) → Relay

| Event            | Payload                             | Description                                                                                                    |
|------------------|-------------------------------------|----------------------------------------------------------------------------------------------------------------|
| `share-register` | `{publicKey: string}`               | Register as a share host. The relay stores `publicKey → socket` mapping. Only one active share per public key. |
| `share-data`     | `{sessionId: string, data: Buffer}` | Forward data to the client session.                                                                            |
| `share-end`      | `{sessionId: string}`               | Close the client session.                                                                                      |

## Events: Relay → Share Host (Alice)

| Event                 | Payload                                  | Description                                                                                                                                                                     |
|-----------------------|------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `share-registered`    | —                                        | Registration confirmed.                                                                                                                                                         |
| `share-client`        | `{sessionId: string, publicKey: string}` | A client has connected. `publicKey` is the connecting client's public key. Alice should prepare the session but not open a TCP connection yet — wait for `share-session-start`. |
| `share-session-start` | `{sessionId: string}`                    | Bob's local TCP client (e.g. SSH) has connected. Alice should now open a TCP connection to her local service. Relay forwards from Bob.                                          |
| `share-data`          | `{sessionId: string, data: Buffer}`      | Data from the client, to be forwarded to Alice's local TCP connection.                                                                                                          |
| `share-end`           | `{sessionId: string}`                    | Client disconnected. Alice should close the TCP connection.                                                                                                                     |
| `share-error`         | `{message: string}`                      | Error (e.g. public key already registered).                                                                                                                                     |

## Events: Share Client (Bob) → Relay

| Event                 | Payload                                        | Description                                                                                                                                  |
|-----------------------|------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------|
| `share-connect`       | `{targetPublicKey: string, publicKey: string}` | Request a connection to Alice's share. `publicKey` is Bob's own public key — the relay must forward it to Alice in the `share-client` event. |
| `share-session-start` | `{sessionId: string}`                          | Bob's local TCP client (e.g. SSH) has connected. Relay forwards to Alice.                                                                    |
| `share-data`          | `{sessionId: string, data: Buffer}`            | Forward data to Alice.                                                                                                                       |
| `share-end`           | `{sessionId: string}`                          | Disconnect from the session.                                                                                                                 |

## Events: Relay → Share Client (Bob)

| Event             | Payload               | Description                                                                  |
|-------------------|-----------------------|------------------------------------------------------------------------------|
| `share-connected` | `{sessionId: string}` | Session established. Bob opens a local TCP server and waits for connections. |
| `share-data`      | `{data: Buffer}`      | Data from Alice, to be forwarded to Bob's local TCP client.                  |
| `share-end`       | —                     | Alice disconnected or session ended.                                         |
| `share-error`     | `{message: string}`   | Connection refused (e.g. no active share for that public key).               |

## Session lifecycle

```
Alice                    Relay                    Bob
  |                        |                        |
  |-- share-register ----->|                        |
  |<- share-registered ----|                        |
  |                        |<---- share-connect ----|  (tunli connect)
  |<- share-client --------|                        |
  |                        |---- share-connected -->|
  |                        |                        |
  |                        |<- share-session-start -|  (ssh -p PORT user@localhost)
  |<- share-session-start--|                        |
  |  [opens TCP to :port]  |                        |
  |                        |                        |
  |<-- share-data -------->|<------- share-data --->|  (bidirectional pipe)
  |                        |                        |
  |--- share-end --------->|------- share-end ----->|  (either side can close)
```

## Notes

- The relay is a pure broker — it forwards binary data without inspection.
- A public key can only have one active share registration at a time. A second
  `share-register` from the same key should either replace the old one or return
  `share-error`.
- Session IDs should be unique per relay instance (e.g. `crypto.randomUUID()`).
- No persistence needed — sessions and registrations live only as long as the
  WebSocket connections are open.
- Phase 2 (not yet implemented on the client): allowlist support. Alice can
  restrict which public keys are allowed to connect. The relay already forwards
  Bob's public key in the `share-client` event — the client just needs to add
  the allowlist check.
