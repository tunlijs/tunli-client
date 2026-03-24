/**
 * Share client (Bob side) — Bob runs `tunli connect <pubkey>`.
 *
 * Connects to the relay's `/share` Socket.IO namespace and requests
 * a connection to Alice's share by her public key. Once the relay
 * confirms the session, a local TCP server is started on `localPort`
 * (0 = OS-assigned). Any TCP client connecting to that port (e.g. an
 * SSH client) gets its data piped through the relay to Alice's machine.
 *
 * Required relay events (server → client):
 *   share-connected {sessionId}          — relay confirmed the session
 *   share-error     {message}            — connection refused / not found
 *   share-data      {sessionId, data}    — data from Alice
 *   share-end       {sessionId}          — Alice disconnected
 *
 * Required relay events (client → server):
 *   share-connect {targetPublicKey, publicKey} — request connection to Alice; publicKey is Bob's own key so Alice can identify the caller
 *   share-data    {sessionId, data}
 *   share-end     {sessionId}
 */

import net from 'node:net'
import {io, type Socket} from 'socket.io-client'
import type {ServerConfig} from '#types/types'
import type {Identity} from '#identity/identity'
import {encodePublicKey} from '#identity/identity'

export type ShareClientEvent =
  | {type: 'connected'; localPort: number}
  | {type: 'error'; message: string}
  | {type: 'disconnected'}

export const createShareClient = (
  serverConfig: ServerConfig,
  socketUrl: string,
  socketPath: string,
  identity: Identity,
  targetPublicKey: string,
  localPort: number,
  onEvent: (event: ShareClientEvent) => void,
): {disconnect: () => void} => {
  const shareUrl = socketUrl.replace(/\/$/, '') + '/share'
  const socket: Socket = io(shareUrl, {
    path: socketPath,
    auth: {token: serverConfig.authToken},
  })

  // One session per local TCP client connection.
  // Currently the relay creates one session per `share-connect`, so we
  // only track the single active one. Multi-client support can be added
  // on both sides later.
  let sessionId: string | null = null
  let activeTcpClient: net.Socket | null = null
  const server = net.createServer()

  socket.on('connect', () => {
    socket.emit('share-connect', {targetPublicKey, publicKey: encodePublicKey(identity.publicKeyRaw)})
  })

  socket.on('share-connected', ({sessionId: sid}: {sessionId: string}) => {
    sessionId = sid

    if (server.listening) return

    server.listen(localPort, '127.0.0.1', () => {
      const addr = server.address() as net.AddressInfo
      onEvent({type: 'connected', localPort: addr.port})
    })

    server.on('connection', (client: net.Socket) => {
      activeTcpClient = client
      // Notify Alice that a local TCP client has connected — she should now
      // open the TCP connection to her local service.
      socket.emit('share-session-start', {sessionId})

      client.on('data', (chunk: Buffer) => {
        if (sessionId) socket.emit('share-data', {sessionId, data: chunk})
      })

      const closeClient = () => {
        if (sessionId) socket.emit('share-end', {sessionId})
        activeTcpClient = null
      }

      client.on('end', closeClient)
      client.on('error', closeClient)
    })
  })

  socket.on('share-error', ({message}: {message: string}) => onEvent({type: 'error', message}))

  socket.on('share-data', ({data}: {data: Buffer}) => {
    activeTcpClient?.write(Buffer.from(data))
  })

  socket.on('share-end', () => {
    activeTcpClient?.end()
    activeTcpClient = null
    onEvent({type: 'disconnected'})
  })

  return {
    disconnect: () => {
      activeTcpClient?.destroy()
      server.close()
      socket.disconnect()
    },
  }
}
