import http from 'http'
import https from 'https'
import net from 'net'
import tls from 'tls'
import {io, type Socket} from 'socket.io-client'
import type {ProfileConfig} from "#types/types";
import {AppEventEmitter} from "#cli-app/AppEventEmitter";
import {CLIENT_VERSION, MIN_SERVER_VERSION, PING_INTERVAL, REPLAY_BODY_LIMIT} from "#lib/defs";
import {isVersionCompatible} from "#utils/versionFunctions";
import {ERROR_MESSAGES} from "#lib/errorMessages";
import {ServerTooOldError, VersionIncompatibleError} from "#lib/errors";

interface TunnelRequestMeta {
  method: string
  headers: Record<string, string>
  path: string
}

export const createProxy = async (
  config: ProfileConfig,
  appEventEmitter: AppEventEmitter
): Promise<{ disconnect: () => void }> => {

  const apiClient = config.apiClient
  const connectInfoResult = await apiClient.connectInfo()

  if (connectInfoResult.error) throw connectInfoResult.error

  const {
    socketUrl: TUNNEL_HOST,
    capturePath: TUNNEL_SOCKET_PATH,
    connectionPoolSize,
    serverVersion,
    minClientVersion
  } = connectInfoResult.data

  if (!serverVersion || !isVersionCompatible(serverVersion, MIN_SERVER_VERSION)) {
    throw new ServerTooOldError(ERROR_MESSAGES.SERVER_TOO_OLD(MIN_SERVER_VERSION, serverVersion))
  }

  if (minClientVersion && !isVersionCompatible(CLIENT_VERSION, minClientVersion)) {
    throw new VersionIncompatibleError(ERROR_MESSAGES.VERSION_INCOMPATIBLE(minClientVersion, CLIENT_VERSION))
  }

  const token = config.serverConfig.authToken

  appEventEmitter.emit('ready', {
    proxyIdent: config.proxy.proxyIdent,
    proxyURL: config.proxy.proxyURL,
    target: config.target,
  })

  const createSocket = (): Socket => io(TUNNEL_HOST, {
    path: TUNNEL_SOCKET_PATH,
    auth: {
      token,
      targetHost: config.target.host,
      ...(config.allowedCidr.length && {allowCidr: config.allowedCidr.map(String)}),
      ...(config.deniedCidr.length && {denyCidr: config.deniedCidr.map(String)}),
    },
    extraHeaders: {
      'x-tunnel-id': config.proxy.proxyIdent,
    },
  })

  let connectedCount = 0
  let pingInterval: ReturnType<typeof setInterval> | undefined
  let pingSocket: Socket | undefined

  const ping = () => {
    if (!pingSocket) return
    const start = Date.now()
    pingSocket.volatile.emit('ping', () => appEventEmitter.emit('latency', Date.now() - start))
  }

  const sockets = Array.from({length: connectionPoolSize}, createSocket)

  for (const socket of sockets) {
    socket.on('connect', () => {
      connectedCount++
      if (connectedCount === 1) {
        pingSocket = socket
        appEventEmitter.emit('connect')
        ping()
        pingInterval = setInterval(ping, PING_INTERVAL)
      }
    })

    socket.on('disconnect', (r) => {
      if (pingSocket === socket) {
        pingSocket = sockets.find(s => s.connected && s !== socket)
        if (!pingSocket) {
          clearInterval(pingInterval)
          pingInterval = undefined
        }
      }
      connectedCount--
      if (connectedCount === 0) {
        appEventEmitter.emit('disconnect', r)
      }
    })

    socket.on('client-blocked', (ip: string) => appEventEmitter.emit('client-blocked', ip))
    socket.on('connect_error', (e) => appEventEmitter.emit('connect_error', e))

    socket.on('request', (requestId: string, meta: TunnelRequestMeta) => {
      const isUpgrade = meta.headers['upgrade']?.toLowerCase() === 'websocket'

      appEventEmitter.emit('request', {
        isUpgrade,
        requestId,
        ...meta,
      })

      if (isUpgrade) {
        forwardUpgrade(socket, requestId, meta)
        return
      }

      // Forward chunks as they arrive. Buffering the whole request makes file
      // uploads consume memory proportional to the file size.
      const contentType = (meta.headers['content-type'] ?? '').toLowerCase()
      const isExcluded = contentType.includes('multipart/form-data') || contentType.includes('application/octet-stream')
      const bodyChunks: Buffer[] = []
      let bodySize = 0
      let requestFinished = false
      let pendingCapture: (() => void) | null = null
      const forwardStart = Date.now()
      const requestFn = config.target.protocol === 'https' ? https.request : http.request
      const localReq = requestFn(
        {
          host: config.target.host,
          port: config.target.port,
          method: meta.method,
          path: meta.path,
          headers: {...meta.headers, host: config.target.host},
          ...(config.target.protocol === 'https' && {
            rejectUnauthorized: false,
            servername: config.target.host
          }),
        },
        (localRes) => {
          socket.emit('response', requestId, {
            statusCode: localRes.statusCode,
            statusMessage: localRes.statusMessage,
            headers: localRes.headers,
            httpVersion: localRes.httpVersion,
          })
          appEventEmitter.emit('response', {
              host: config.target.host,
              port: config.target.port,
              method: meta.method,
              path: meta.path,
              headers: meta.headers,
              requestId: requestId
            },
            {
              statusCode: localRes.statusCode ?? 200,
              statusMessage: localRes.statusMessage ?? 'OK',
              headers: localRes.headers,
              httpVersion: localRes.httpVersion,
            })
          const responseMeta = {status: localRes.statusCode ?? 200, durationMs: Date.now() - forwardStart}
          const emitCaptured = () => {
            const body = (!isExcluded && bodySize > 0 && bodySize <= REPLAY_BODY_LIMIT)
              ? Buffer.concat(bodyChunks).toString('utf-8')
              : null
            appEventEmitter.emit('captured-request', {
              requestId,
              method: meta.method,
              path: meta.path,
              headers: meta.headers,
              body,
              bodyUnavailable: isExcluded || bodySize > REPLAY_BODY_LIMIT,
              response: responseMeta,
            })
          }
          // The local target may respond before the full request body has been
          // forwarded (e.g. it rejects early without reading the body). Defer
          // capturing bodyChunks/bodySize until the body is fully known so the
          // captured-request event isn't a truncated snapshot.
          if (requestFinished) emitCaptured()
          else pendingCapture = emitCaptured
          localRes.on('data', (chunk: Buffer) => socket.emit('response-pipe', requestId, chunk))
          localRes.on('end', () => socket.emit('response-pipe-end', requestId))
          localRes.on('error', (e: Error) => socket.emit('response-pipe-error', requestId, e.message))
        },
      )

      const onPipe = (id: string, chunk: Buffer) => {
        if (id !== requestId) return
        const data = Buffer.from(chunk)
        bodySize += data.length
        if (!isExcluded && bodySize <= REPLAY_BODY_LIMIT) bodyChunks.push(data)
        localReq.write(data)
      }
      const onPipes = (id: string, chunks: Array<{chunk: Buffer}>) => {
        if (id !== requestId) return
        for (const {chunk} of chunks) onPipe(id, chunk)
      }
      const onPipeError = (id: string, err: string) => {
        if (id !== requestId) return
        cleanup()
        // The body failed to fully arrive from the tunnel, so drop any deferred
        // captured-request emission rather than record it as if the body were complete.
        pendingCapture = null
        localReq.destroy(new Error(err))
      }
      const onPipeEnd = (id: string) => {
        if (id !== requestId) return
        cleanup()
        requestFinished = true
        localReq.end()
        if (pendingCapture) {
          pendingCapture()
          pendingCapture = null
        }
      }

      const cleanup = () => {
        socket.off('request-pipe', onPipe)
        socket.off('request-pipes', onPipes)
        socket.off('request-pipe-end', onPipeEnd)
        socket.off('request-pipe-error', onPipeError)
      }

      socket.on('request-pipe', onPipe)
      socket.on('request-pipes', onPipes)
      socket.on('request-pipe-end', onPipeEnd)
      socket.on('request-pipe-error', onPipeError)
      localReq.on('error', (e: Error) => {
        cleanup()
        appEventEmitter.emit('request-error', e, {isUpgrade: false, requestId})
        socket.emit('request-error', requestId, e.message)
      })
    })
  }

  function forwardUpgrade(socket: Socket, requestId: string, meta: TunnelRequestMeta) {
    const tcpSocket = config.target.protocol === 'https'
      ? tls.connect(config.target.port, config.target.host, {
        rejectUnauthorized: false,
        servername: config.target.host,
      })
      : net.connect(config.target.port, config.target.host)

    tcpSocket.once('connect', () => {
      const headers = {...meta.headers, host: config.target.host}
      const rawHeaders = Object.entries(headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n')
      tcpSocket.write(`${meta.method} ${meta.path} HTTP/1.1\r\n${rawHeaders}\r\n\r\n`)
    })

    // Parse the HTTP 101 response, then switch to raw forwarding
    let headerBuf = ''
    let headersComplete = false

    const onData = (chunk: Buffer) => {
      if (headersComplete) return
      headerBuf += chunk.toString('binary')
      const headerEnd = headerBuf.indexOf('\r\n\r\n')
      if (headerEnd === -1) return

      headersComplete = true
      const lines = headerBuf.slice(0, headerEnd).split('\r\n')
      const [, statusCodeStr, ...statusParts] = lines[0]!.split(' ')
      const headers: Record<string, string> = {}
      for (const line of lines.slice(1)) {
        const colon = line.indexOf(':')
        if (colon > -1) headers[line.slice(0, colon).trim().toLowerCase()] = line.slice(colon + 1).trim()
      }
      const responseData = {
        statusCode: Number(statusCodeStr),
        statusMessage: statusParts.join(' '),
        headers,
      }
      socket.emit('response', requestId, responseData)

      // Remaining bytes after headers = start of WS frame data
      const remaining = Buffer.from(headerBuf.slice(headerEnd + 4), 'binary')
      if (remaining.length) socket.emit('response-pipe', requestId, remaining)

      tcpSocket.off('data', onData)
      tcpSocket.on('data', (data: Buffer) => socket.emit('response-pipe', requestId, data))
    }

    tcpSocket.on('data', onData)
    tcpSocket.on('end', () => socket.emit('response-pipe-end', requestId))
    tcpSocket.on('error', (e: Error) => {
      appEventEmitter.emit('request-error', e, {
        isUpgrade: true,
        requestId
      })
      socket.emit('request-error', requestId, e.message)
    })

    // end-user WS frames → local app
    const onPipe = (id: string, chunk: Buffer) => {
      if (id === requestId) tcpSocket.write(chunk)
    }
    const onPipeEnd = (id: string) => {
      if (id === requestId) {
        socket.off('request-pipe', onPipe);
        tcpSocket.end()
      }
    }
    socket.on('request-pipe', onPipe)
    socket.once('request-pipe-end', onPipeEnd)
    tcpSocket.once('close', () => socket.off('request-pipe', onPipe))
  }

  return {disconnect: () => sockets.forEach(s => s.disconnect())}
}
