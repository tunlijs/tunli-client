/**
 * Share host (server side) — Alice runs `tunli share <port>`.
 *
 * Connects to the relay's `/share` Socket.IO namespace and registers
 * with her public key. The relay bridges incoming client connections
 * to this socket. For each session, a TCP connection is opened to the
 * local target (host:port) and data is piped in both directions.
 *
 * Required relay events (server → client):
 *   share-registered            — registration confirmed
 *   share-error  {message}      — registration or session error
 *   share-client {sessionId}    — a client has connected
 *   share-data   {sessionId, data: Buffer} — data from a client
 *   share-end    {sessionId}    — client disconnected
 *
 * Required relay events (client → server):
 *   share-register {publicKey}  — register as share host
 *   share-data     {sessionId, data: Buffer}
 *   share-end      {sessionId}
 */

import net from 'node:net'
import {io, type Socket} from 'socket.io-client'
import type {ServerConfig} from '#types/types'
import {encodePublicKey, type Identity} from '#identity/identity'

export type ShareHostEvent =
  | {type: 'registered'}
  | {type: 'client-connected'; sessionId: string; publicKey: string}
  | {type: 'client-disconnected'; sessionId: string; publicKey: string}
  | {type: 'error'; message: string}

export const createShareHost = (
  serverConfig: ServerConfig,
  socketUrl: string,
  socketPath: string,
  identity: Identity,
  targetHost: string,
  targetPort: number,
  onEvent: (event: ShareHostEvent) => void,
): {disconnect: () => void} => {
  const shareUrl = socketUrl.replace(/\/$/, '') + '/share'
  const socket: Socket = io(shareUrl, {
    path: socketPath,
    auth: {token: serverConfig.authToken},
  })

  const sessions = new Map<string, net.Socket>()
  const sessionKeys = new Map<string, string>() // sessionId → publicKey

  socket.on('connect', () => {
    socket.emit('share-register', {publicKey: encodePublicKey(identity.publicKeyRaw)})
  })

  socket.on('share-registered', () => onEvent({type: 'registered'}))

  socket.on('share-error', ({message}: {message: string}) => onEvent({type: 'error', message}))

  socket.on('share-client', ({sessionId, publicKey}: {sessionId: string; publicKey: string}) => {
    // Bob registered — just remember the key, TCP opens on share-session-start
    sessionKeys.set(sessionId, publicKey)
    onEvent({type: 'client-connected', sessionId, publicKey})
  })

  socket.on('share-session-start', ({sessionId}: {sessionId: string}) => {
    const publicKey = sessionKeys.get(sessionId) ?? 'unknown'

    const tcp = net.connect(targetPort, targetHost)
    sessions.set(sessionId, tcp)

    tcp.on('data', (chunk: Buffer) => socket.emit('share-data', {sessionId, data: chunk}))

    const closeSession = () => {
      if (!sessions.has(sessionId)) return
      sessions.delete(sessionId)
      sessionKeys.delete(sessionId)
      socket.emit('share-end', {sessionId})
      onEvent({type: 'client-disconnected', sessionId, publicKey})
    }

    tcp.on('end', closeSession)
    tcp.on('error', (e: Error) => {
      onEvent({type: 'error', message: `Could not connect to ${targetHost}:${targetPort} — ${e.message}`})
      closeSession()
    })
  })

  socket.on('share-data', ({sessionId, data}: {sessionId: string; data: Buffer}) => {
    sessions.get(sessionId)?.write(Buffer.from(data))
  })

  socket.on('share-end', ({sessionId}: {sessionId: string}) => {
    const tcp = sessions.get(sessionId)
    if (!tcp) return
    const publicKey = sessionKeys.get(sessionId) ?? 'unknown'
    sessions.delete(sessionId)
    sessionKeys.delete(sessionId)
    tcp.end()
    onEvent({type: 'client-disconnected', sessionId, publicKey})
  })

  return {
    disconnect: () => {
      for (const tcp of sessions.values()) tcp.destroy()
      sessions.clear()
      socket.disconnect()
    },
  }
}
