import net from 'net'
import {DAEMON_SOCKET_PATH} from '#lib/defs'
import type {DaemonRequest, DaemonResponse, TunnelInfo} from '#daemon/protocol'
import type {AppEventEmitter} from '#cli-app/AppEventEmitter'
import {DaemonClient, resolveDaemonFile} from '@tunli/daemon'

const DAEMON_MAIN_PATH = resolveDaemonFile(import.meta, '../daemon-main')

let _daemonClient: DaemonClient<DaemonRequest, DaemonResponse> | null = null

export function daemonClient(): DaemonClient<DaemonRequest, DaemonResponse> {
  return _daemonClient ??= new DaemonClient<DaemonRequest, DaemonResponse>(DAEMON_SOCKET_PATH, DAEMON_MAIN_PATH, 'TUNLI_DAEMON')
}

// Attach to a running tunnel, streaming events into the given AppEventEmitter.
// Resolves with tunnel info when attach-ok is received.
// The socket stays open; events flow until the tunnel stops or process exits.
// Call disconnect() to close the socket early (e.g. when switching tunnels).
export function attachTunnel(profileName: string, appEmitter: AppEventEmitter): {
  promise: Promise<{ status: TunnelInfo['status']; requestCount: number; lastLatency?: number }>;
  disconnect: () => void
} {
  let socketRef: net.Socket | null = null
  const promise = new Promise<{
    status: TunnelInfo['status'];
    requestCount: number;
    lastLatency?: number
  }>((resolve, reject) => {
    const socket = net.connect(DAEMON_SOCKET_PATH)
    socketRef = socket
    let buffer = ''

    socket.on('connect', () => {
      socket.write(JSON.stringify({type: 'attach', profileName} satisfies DaemonRequest) + '\n')
    })

    socket.on('data', (chunk) => {
      buffer += chunk.toString()
      let nl: number
      while ((nl = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nl)
        buffer = buffer.slice(nl + 1)
        try {
          const msg = JSON.parse(line) as DaemonResponse
          if (msg.type === 'attach-ok') {
            resolve({
              status: msg.status,
              requestCount: msg.requestCount, ...(msg.lastLatency !== undefined && {lastLatency: msg.lastLatency})
            });
            continue
          }
          if (msg.type === 'error') {
            reject(new Error(msg.message));
            socket.destroy();
            return
          }
          if (msg.type !== 'event') continue

          switch (msg.event) {
            case 'connect':
              appEmitter.emit('connect');
              break
            case 'disconnect':
              appEmitter.emit('disconnect', msg.reason as never);
              break
            case 'connect_error':
              appEmitter.emit('connect_error', new Error(msg.message));
              break
            case 'ready':
              appEmitter.emit('ready', msg);
              break
            case 'request':
              appEmitter.emit('request', msg.data);
              break
            case 'response':
              appEmitter.emit('response', msg.req, msg.res);
              break
            case 'request-error':
              appEmitter.emit('request-error', new Error(msg.message), msg.meta);
              break
            case 'client-blocked':
              appEmitter.emit('client-blocked', msg.ip);
              break
            case 'latency':
              appEmitter.emit('latency', msg.ms);
              break
          }
        } catch { /* malformed line */
        }
      }
    })

    socket.on('error', reject)
    socket.on('close', () => appEmitter.emit('disconnect', 'daemon-closed' as never))
  })
  return {
    promise, disconnect: () => {
      socketRef?.destroy();
      socketRef = null
    }
  }
}
