import net from 'net'
import {spawn} from 'child_process'
import {fileURLToPath} from 'url'
import {dirname, join} from 'path'
import {isSea} from 'node:sea'
import {DAEMON_SOCKET_PATH} from '#lib/defs'
import type {DaemonRequest, DaemonResponse, TunnelInfo} from '#daemon/protocol'
import type {AppEventEmitter} from '#cli-app/AppEventEmitter'
import {logInfo} from "#logger/logger";

// Resolves daemon-main.ts (dev) or daemon-main.js (production) relative to this file.
// src/daemon/DaemonClient.ts → src/daemon-main.ts  (one level up)
const ext = import.meta.url.endsWith('.ts') ? '.ts' : '.js'
const DAEMON_MAIN_PATH = join(dirname(fileURLToPath(import.meta.url)), `../daemon-main${ext}`)

export class DaemonClient {

  async send(request: DaemonRequest): Promise<DaemonResponse> {
    return new Promise((resolve, reject) => {
      const socket = net.connect(DAEMON_SOCKET_PATH)
      let buffer = ''

      socket.on('connect', () => {
        socket.write(JSON.stringify(request) + '\n')
      })

      socket.on('data', (chunk) => {
        buffer += chunk.toString()
        const nl = buffer.indexOf('\n')
        if (nl === -1) return
        socket.destroy()
        try {
          resolve(JSON.parse(buffer.slice(0, nl)) as DaemonResponse)
        } catch {
          reject(new Error('Invalid daemon response'))
        }
      })

      socket.on('error', reject)
    })
  }

  static isRunning(): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = net.connect(DAEMON_SOCKET_PATH)
      socket.on('connect', () => {
        socket.destroy();
        resolve(true)
      })
      socket.on('error', () => resolve(false))
    })
  }

  static spawnDaemon(): void {

    if (isSea()) {
      // SEA binary: spawn itself with TUNLI_DAEMON=1 to enter daemon mode
      spawn(process.execPath, [], {
        env: {...process.env, TUNLI_DAEMON: '1'},
        detached: true,
        stdio: 'ignore',
      }).unref()
      return
    }

    // Dev / plain-JS mode:
    //   tsx as binary: node /path/tsx daemon-main.ts
    //   tsx as loader: node --import tsx/esm daemon-main.ts
    //   production:    node daemon-main.js
    const isTsxBinary = (process.argv[1] ?? '').includes('tsx')
    const nodeArgs = isTsxBinary
      ? [process.argv[1]!, DAEMON_MAIN_PATH]
      : [...process.execArgv, DAEMON_MAIN_PATH]
    spawn(process.execPath, nodeArgs, {detached: true, stdio: 'ignore'}).unref()
  }

  // Attach to a running tunnel, streaming events into the given AppEventEmitter.
  // Resolves with tunnel info when attach-ok is received.
  // The socket stays open; events flow until the tunnel stops or process exits.
  static attach(profileName: string, appEmitter: AppEventEmitter): Promise<{ status: TunnelInfo['status']; requestCount: number; lastLatency?: number }> {
    return new Promise((resolve, reject) => {
      const socket = net.connect(DAEMON_SOCKET_PATH)
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
            logInfo(line)
            const msg = JSON.parse(line) as DaemonResponse
            if (msg.type === 'attach-ok') {
              resolve({status: msg.status, requestCount: msg.requestCount, ...(msg.lastLatency !== undefined && {lastLatency: msg.lastLatency})});
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
  }

  static async start(): Promise<void> {
    DaemonClient.spawnDaemon()
    const deadline = Date.now() + 5000
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 100))
      if (await DaemonClient.isRunning()) return
    }
    throw new Error('Daemon did not start within 5 seconds')
  }

  static async stop(): Promise<void> {
    await new DaemonClient().send({type: 'shutdown'})
    const deadline = Date.now() + 5000
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 100))
      if (!await DaemonClient.isRunning()) return
    }
    throw new Error('Daemon did not stop within 5 seconds')
  }

  static async ensureRunning(): Promise<void> {
    if (await DaemonClient.isRunning()) return
    await DaemonClient.start()
  }
}
