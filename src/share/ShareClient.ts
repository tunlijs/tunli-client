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
import type {Logger, ServerConfig} from '#types/types'
import type {Identity} from '#identity/identity'
import {encodePublicKey} from '#identity/identity'

export type ShareClientEvent =
  | {type: 'connected'; localPort: number}
  | {type: 'error'; message: string}
  | {type: 'disconnected'}

export const createShareClient = (
  logger: Logger,
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
    logger.debug(`[ShareClient] socket connected, requesting share for ${targetPublicKey}`)
    socket.emit('share-connect', {targetPublicKey, publicKey: encodePublicKey(identity.publicKeyRaw)})
  })

  socket.on('disconnect', (reason: string) => {
    logger.debug(`[ShareClient] socket disconnected: ${reason}`)
  })

  socket.on('connect_error', (err: Error) => {
    logger.debug(`[ShareClient] socket connect_error: ${err.message}`)
  })

  socket.on('share-connected', ({sessionId: sid}: { sessionId: string }) => {
    logger.debug(`[ShareClient] share-connected, sessionId=${sid}`)
    sessionId = sid

    if (server.listening) return

    server.listen(localPort, '127.0.0.1', () => {
      const addr = server.address() as net.AddressInfo
      logger.debug(`[ShareClient] local TCP server listening on port ${addr.port}`)
      onEvent({type: 'connected', localPort: addr.port})
    })

    server.on('connection', (client: net.Socket) => {
      logger.debug(`[ShareClient] local TCP client connected, emitting share-session-start sessionId=${sessionId}`)
      activeTcpClient = client
      // Notify Alice that a local TCP client has connected — she should now
      // open the TCP connection to her local service.
      socket.emit('share-session-start', {sessionId})

      client.on('data', (chunk: Buffer) => {
        logger.debug(`[ShareClient] → relay: ${chunk.length} bytes (sessionId=${sessionId})`)
        if (sessionId) socket.emit('share-data', {sessionId, data: chunk})
      })

      const closeClient = (reason: string) => {
        logger.debug(`[ShareClient] session close — initiator: local (${reason}), emitting share-end sessionId=${sessionId}`)
        if (sessionId) socket.emit('share-end', {sessionId})
        activeTcpClient = null
        sessionId = null
        logger.debug(`[ShareClient] re-registering with relay after session end`)
        socket.emit('share-connect', {targetPublicKey, publicKey: encodePublicKey(identity.publicKeyRaw)})
      }

      client.on('end', () => {
        closeClient('TCP end')
      })
      client.on('error', (err: Error) => {
        closeClient(`TCP error: ${err.message}`)
      })
    })
  })

  socket.on('share-error', ({message}: { message: string }) => {
    logger.debug(`[ShareClient] share-error: ${message}`)
    onEvent({type: 'error', message})
  })

  socket.on('share-data', ({data}: { data: Buffer }) => {
    logger.debug(`[ShareClient] ← relay: ${Buffer.from(data).length} bytes`)
    activeTcpClient?.write(Buffer.from(data))
  })

  socket.on('share-end', () => {
    logger.debug(`[ShareClient] session close — initiator: remote (relay share-end), closing local TCP client`)
    activeTcpClient?.end()
    activeTcpClient = null
    sessionId = null
    logger.debug(`[ShareClient] re-registering with relay after session end`)
    socket.emit('share-connect', {targetPublicKey, publicKey: encodePublicKey(identity.publicKeyRaw)})
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
