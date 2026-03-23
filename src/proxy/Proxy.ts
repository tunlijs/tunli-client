import http from 'http'
import net from 'net'
import {io} from 'socket.io-client'
import type {ProfileConfig} from "#types/types";
import {AppEventEmitter} from "#cli-app/AppEventEmitter";
import {PING_INTERVAL} from "#lib/defs";

export const createProxy = async (
  config: ProfileConfig,
  appEventEmitter: AppEventEmitter
): Promise<{ disconnect: () => void }> => {

  const apiClient = config.apiClient
  const connectInfoResult = await apiClient.connectInfo()

  if (connectInfoResult.error) throw connectInfoResult.error

  const TUNNEL_HOST = connectInfoResult.data.socketUrl
  const TUNNEL_SOCKET_PATH = connectInfoResult.data.capturePath

  const token = config.serverConfig.authToken

  appEventEmitter.emit('ready', {
    proxyIdent: config.proxy.proxyIdent,
    proxyURL: config.proxy.proxyURL,
    target: config.target,
  })

  const socket = io(TUNNEL_HOST, {
    path: TUNNEL_SOCKET_PATH,
    auth: {token},
    extraHeaders: {
      'x-tunnel-id': config.proxy.proxyIdent,
    },
  })

  let pingInterval: ReturnType<typeof setInterval> | undefined

  const ping = () => {
    const start = Date.now()
    socket.volatile.emit('ping', () => appEventEmitter.emit('latency', Date.now() - start))
  }

  socket.on('connect', () => {
    appEventEmitter.emit('connect')
    ping()
    pingInterval = setInterval(ping, PING_INTERVAL)
  })
  socket.on('disconnect', (r) => {
    clearInterval(pingInterval)
    appEventEmitter.emit('disconnect', r)
  })
  socket.on('connect_error', (e) => appEventEmitter.emit('connect_error', e))

  interface TunnelRequestMeta {
    method: string
    headers: Record<string, string>
    path: string
  }

  socket.on('request', (requestId: string, meta: TunnelRequestMeta) => {
    const isUpgrade = meta.headers['upgrade']?.toLowerCase() === 'websocket'

    appEventEmitter.emit('request', {
      isUpgrade,
      requestId,
      ...meta,
    })

    if (isUpgrade) {
      forwardUpgrade(requestId, meta)
      return
    }

    const bodyChunks: Buffer[] = []

    const onPipe = (id: string, chunk: Buffer) => {
      if (id === requestId) bodyChunks.push(Buffer.from(chunk))
    }
    const onPipeError = (id: string, _err: string) => {
      if (id === requestId) cleanup()
    }
    const onPipeEnd = (id: string) => {
      if (id !== requestId) return
      cleanup()
      forward()
    }

    const cleanup = () => {
      socket.off('request-pipe', onPipe)
      socket.off('request-pipe-end', onPipeEnd)
      socket.off('request-pipe-error', onPipeError)
    }

    socket.on('request-pipe', onPipe)
    socket.on('request-pipe-end', onPipeEnd)
    socket.on('request-pipe-error', onPipeError)

    const forward = () => {
      const localReq = http.request(
        {
          host: config.target.host,
          port: config.target.port,
          method: meta.method,
          path: meta.path,
          headers: meta.headers
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
          localRes.on('data', (chunk: Buffer) => socket.emit('response-pipe', requestId, chunk))
          localRes.on('end', () => socket.emit('response-pipe-end', requestId))
          localRes.on('error', (e: Error) => socket.emit('response-pipe-error', requestId, e.message))
        },
      )

      localReq.on('error', (e: Error) => {
        appEventEmitter.emit('request-error', e, {
          isUpgrade: false,
          requestId
        })
        socket.emit('request-error', requestId, e.message)
      })

      if (bodyChunks.length) localReq.write(Buffer.concat(bodyChunks))
      localReq.end()
    }
  })

  function forwardUpgrade(requestId: string, meta: TunnelRequestMeta) {
    const tcpSocket = net.connect(config.target.port, config.target.host)

    tcpSocket.once('connect', () => {
      const rawHeaders = Object.entries(meta.headers)
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

  return {disconnect: () => socket.disconnect()}
}
