import http from 'http'
import https from 'https'
import {readFileSync, unlinkSync, writeFileSync} from 'node:fs'
import {
  DAEMON_SOCKET_PATH,
  REPLAY_BUFFER_CAPACITY,
  REPLAY_META_FILEPATH,
  REPLAY_META_TTL_MS,
  RESTART_DUMP_FILEPATH
} from '#lib/defs'
import type {
  DaemonRequest,
  DaemonResponse,
  EventMessage,
  StartRequest,
  StoredRequestMeta,
  TunnelDump,
  TunnelInfo
} from '#daemon/protocol'
import type {Logger, ProfileConfig, TargetConfig} from '#types/types'
import {
  AppEventEmitter,
  type CapturedRequestEvent,
  type Req,
  type ReqErrorMeta,
  type ReqMeta,
  type Res
} from '#cli-app/AppEventEmitter'
import {ApiClient} from '#api-client/ApiClient'
import {ParsedGlobalConfig} from '#config/ParsedGlobalConfig'
import {createProxy} from '#proxy/Proxy'
import {readPackageJson} from '#package-json/packageJson'
import {ReplayBuffer} from '#daemon/ReplayBuffer'
import {DaemonServer as DaemonServerExt, type SocketWrapper} from '@tunli/daemon'

type TunnelHandle = {
  info: TunnelInfo
  startRequest: Omit<StartRequest, 'type'>
  appEmitter: AppEventEmitter
  disconnect: () => void
  lastLatency?: number
  requestCount: number
}


interface DaemonEventMap extends Record<string, Array<unknown>> {
  "stop": [req: Extract<DaemonRequest, { type: 'stop' }>]
  "start": [req: StartRequest];
  "attach": [req: Extract<DaemonRequest, { type: 'attach' }>]
  "list": [req: DaemonRequest]
  "dump": [req: DaemonRequest]
  "shutdown": [req: DaemonRequest]
  "version": [req: DaemonRequest]
  "replay": [req: Extract<DaemonRequest, { type: 'replay' }>]
  "list-requests": [req: Extract<DaemonRequest, { type: 'list-requests' }>]
  //"start": [req: StartRequest, socket: SocketWrapper<DaemonResponse>];
}

//  on(eventName: string, eventHandle: (req: DaemonRequest, socket: SocketWrapper<DaemonResponse>) => void): this {

export class DaemonServer {

  readonly #daemonServer = new DaemonServerExt<DaemonRequest, DaemonResponse, DaemonEventMap>(DAEMON_SOCKET_PATH)
  readonly #apiClient: ApiClient
  readonly #version: string
  readonly #tunnels: Map<string, TunnelHandle> = new Map()
  readonly #replayBuffers: Map<string, ReplayBuffer> = new Map()

  constructor(globalConf: ParsedGlobalConfig, logger: Logger) {
    this.#daemonServer.logger = logger
    this.#apiClient = new ApiClient(globalConf)
    this.#version = readPackageJson()?.version ?? 'unknown'
  }

  async listen(): Promise<void> {

    this.#daemonServer.createServer((_req, socket) => {
      socket.write({type: 'error', message: 'Invalid request'})
    })

    this.#daemonServer.on('start', (req, wrapper) => this.#handleStart(req, wrapper))
    this.#daemonServer.on('stop', (req, wrapper) => this.#handleStop(req, wrapper))
    this.#daemonServer.on('attach', (req, wrapper) => this.#handleAttach(req, wrapper))
    this.#daemonServer.on('list', (req, wrapper) => this.#handleList(req, wrapper))
    this.#daemonServer.on('dump', (req, wrapper) => this.#handleDump(req, wrapper))
    this.#daemonServer.on('shutdown', (_req, wrapper) => {
      wrapper.write({type: 'ok'});
      this.#daemonServer.shutdown()
    })
    this.#daemonServer.on('version', (_req, wrapper) => {
      wrapper.write({type: 'version', version: this.#version})
    })
    this.#daemonServer.on('list-requests', (req, wrapper) => this.#handleListRequests(req, wrapper))
    this.#daemonServer.on('replay', (req, wrapper) => this.#handleReplay(req, wrapper))

    this.#loadReplayMeta()
    await this.#restoreFromDump()
    await this.#daemonServer.listen()
    this.#daemonServer.onShutdown(() => this.#shutdown())
  }

  async #handleStart(req: StartRequest, socket: SocketWrapper<DaemonResponse>): Promise<void> {
    if (this.#tunnels.has(req.profileName)) {
      return socket.write({
        type: 'started',
        profileName: req.profileName,
        proxyURL: req.proxyURL,
        alreadyRunning: true
      })
    }
    try {
      await this.#startTunnel(req)
      socket.write({type: 'started', profileName: req.profileName, proxyURL: req.proxyURL})
    } catch (e) {
      socket.write({type: 'error', message: e instanceof Error ? e.message : String(e)})
    }
  }

  async #startTunnel(req: Omit<StartRequest, 'type'>): Promise<void> {
    const serverConfig = {url: req.serverUrl, authToken: req.authToken}
    const apiClient = this.#apiClient.withServer(serverConfig)

    const profileConfig: ProfileConfig = {
      profileName: req.profileName,
      proxy: {proxyIdent: req.proxyIdent, proxyURL: req.proxyURL},
      target: req.target,
      serverConfig,
      apiClient,
      filepath: req.filepath,
      allowedCidr: req.allowedCidr,
      deniedCidr: req.deniedCidr,
    }

    const info: TunnelInfo = {
      profileName: req.profileName,
      proxyURL: req.proxyURL,
      target: `${req.target.protocol}://${req.target.host}:${req.target.port}`,
      status: 'connecting',
    }

    const appEmitter = new AppEventEmitter()
    const handle: TunnelHandle = {
      info, startRequest: req, appEmitter, disconnect: () => {
      }, requestCount: 0
    }

    appEmitter.on('connect', () => info.status = 'connected')
    appEmitter.on('disconnect', () => info.status = 'disconnected')
    appEmitter.on('connect_error', () => info.status = 'error')
    appEmitter.on('latency', (ms) => handle.lastLatency = ms)
    appEmitter.on('response', () => handle.requestCount++)

    const proxy = await createProxy(profileConfig, appEmitter)
    handle.disconnect = proxy.disconnect
    this.#tunnels.set(req.profileName, handle)

    // Create or reuse replay buffer for this tunnel
    let replayBuf = this.#replayBuffers.get(req.profileName)
    if (!replayBuf) {
      replayBuf = new ReplayBuffer(REPLAY_BUFFER_CAPACITY)
      this.#replayBuffers.set(req.profileName, replayBuf)
    }
    const buf = replayBuf
    appEmitter.on('captured-request', (data: CapturedRequestEvent) => {
      buf.push({
        id: data.requestId,
        timestamp: Date.now(),
        method: data.method,
        path: data.path,
        headers: data.headers,
        body: data.body,
        bodyUnavailable: data.bodyUnavailable,
        response: data.response,
      })
    })

    this.#daemonServer.logger.info(`Tunnel started: ${req.profileName} → ${req.proxyURL}`)
  }

  async #restoreFromDump(): Promise<void> {
    let data: string
    try {
      data = readFileSync(RESTART_DUMP_FILEPATH, 'utf-8')
      unlinkSync(RESTART_DUMP_FILEPATH)
    } catch {
      return
    }
    try {
      const tunnels = JSON.parse(data) as TunnelDump
      for (const tunnel of tunnels) {
        await this.#startTunnel(tunnel).catch(e => {
          this.#daemonServer.logger.error(`Failed to restore tunnel "${tunnel.profileName}": ${e instanceof Error ? e.message : String(e)}`)
        })
      }
      this.#daemonServer.logger.info(`Restored ${tunnels.length} tunnel(s) from dump`)
    } catch (e) {
      this.#daemonServer.logger.error(`Failed to parse restart dump: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  #loadReplayMeta(): void {
    try {
      const raw = readFileSync(REPLAY_META_FILEPATH, 'utf-8')
      const entries = JSON.parse(raw) as Record<string, StoredRequestMeta[]>
      const cutoff = Date.now() - REPLAY_META_TTL_MS
      for (const [profile, metas] of Object.entries(entries)) {
        const fresh = metas.filter(m => m.timestamp > cutoff)
        if (fresh.length === 0) continue
        const buf = new ReplayBuffer(REPLAY_BUFFER_CAPACITY)
        buf.restoreFromMeta(fresh)
        this.#replayBuffers.set(profile, buf)
      }
    } catch { /* no file or parse error */
    }
  }

  #handleListRequests(req: Extract<DaemonRequest, {
    type: 'list-requests'
  }>, socket: SocketWrapper<DaemonResponse>): void {
    const buf = this.#replayBuffers.get(req.profileName)
    if (!buf) return socket.write({type: 'request-list', requests: []})
    socket.write({type: 'request-list', requests: buf.getAll(req.limit)})
  }

  async #handleReplay(req: Extract<DaemonRequest, {
    type: 'replay'
  }>, socket: SocketWrapper<DaemonResponse>): Promise<void> {
    const handle = this.#tunnels.get(req.profileName)
    const buf = this.#replayBuffers.get(req.profileName)
    if (!handle || !buf) {
      return socket.write({type: 'error', message: `No active tunnel for profile "${req.profileName}"`})
    }
    const stored = buf.getById(req.requestId)
    if (!stored) {
      return socket.write({type: 'error', message: `Request not found: ${req.requestId}`})
    }
    if (stored.bodyUnavailable) {
      return socket.write({type: 'error', message: 'Cannot replay: body not available after restart'})
    }
    const {target} = handle.startRequest
    const start = Date.now()
    try {
      const result = await new Promise<{ status: number; durationMs: number }>((resolve, reject) => {
        const requestFn = target.protocol === 'https' ? https.request : http.request
        const localReq = requestFn({
          host: target.host,
          port: target.port,
          method: stored.method,
          path: stored.path,
          headers: {
            ...stored.headers,
            host: target.host
          },
          ...(target.protocol === 'https' && {rejectUnauthorized: false, servername: target.host}),
        }, (res) => {
          const durationMs = Date.now() - start
          res.resume()
          res.on('end', () => resolve({status: res.statusCode ?? 200, durationMs}))
          res.on('error', reject)
        })
        localReq.on('error', reject)
        if (stored.body) localReq.write(stored.body)
        localReq.end()
      })
      const replayId = `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
      buf.push({
        id: replayId,
        timestamp: Date.now(),
        method: stored.method,
        path: stored.path,
        headers: stored.headers,
        body: stored.body,
        bodyUnavailable: false,
        replayOf: stored.id,
        response: result,
      })
      socket.write({type: 'replay-done', requestId: req.requestId, replayId, ...result})
    } catch (e) {
      socket.write({type: 'error', message: e instanceof Error ? e.message : String(e)})
    }
  }

  #persistReplayMeta(): void {
    try {
      const data: Record<string, StoredRequestMeta[]> = {}
      for (const [profile, buf] of this.#replayBuffers) {
        const meta = buf.toMeta()
        if (meta.length > 0) data[profile] = meta
      }
      writeFileSync(REPLAY_META_FILEPATH, JSON.stringify(data))
    } catch { /* best-effort */
    }
  }

  #handleAttach(req: Extract<DaemonRequest, { type: 'attach' }>, socket: SocketWrapper<DaemonResponse>): void {
    const handle = this.#tunnels.get(req.profileName)
    if (!handle) {
      return socket.write({type: 'error', message: `No tunnel running for profile "${req.profileName}"`})
    }

    socket.write({
      type: 'attach-ok',
      profileName: req.profileName,
      proxyURL: handle.info.proxyURL,
      status: handle.info.status,
      requestCount: handle.requestCount,
      ...(handle.lastLatency !== undefined && {lastLatency: handle.lastLatency}),
    })

    const send = (msg: EventMessage) => socket.write(msg)

    const {appEmitter} = handle

    const listeners = {
      connect: () => send({type: 'event', event: 'connect'}),
      disconnect: (reason: string) => send({type: 'event', event: 'disconnect', reason}),
      connect_error: (e: Error) => send({type: 'event', event: 'connect_error', message: e.message}),
      ready: (info: { proxyIdent: string; proxyURL: string; target: TargetConfig }) =>
        send({type: 'event', event: 'ready', ...info}),
      request: (data: ReqMeta) => send({type: 'event', event: 'request', data}),
      response: (req: Req, res: Res) => send({type: 'event', event: 'response', req, res}),
      'request-error': (e: Error, meta: ReqErrorMeta) =>
        send({type: 'event', event: 'request-error', message: e.message, meta}),
      'client-blocked': (ip: string) => send({type: 'event', event: 'client-blocked', ip}),
      latency: (ms: number) => send({type: 'event', event: 'latency', ms}),
    }

    for (const [event, listener] of Object.entries(listeners)) {
      appEmitter.on(event as never, listener as never)
    }

    socket.on('close', () => {
      for (const [event, listener] of Object.entries(listeners)) {
        appEmitter.off(event as never, listener as never)
      }
    })
  }

  #handleStop(req: Extract<DaemonRequest, { type: 'stop' }>, socket: SocketWrapper<DaemonResponse>): void {
    const handle = this.#tunnels.get(req.profileName)
    if (!handle) {
      return socket.write({type: 'error', message: `No tunnel running for profile "${req.profileName}"`})
    }
    handle.disconnect()
    this.#tunnels.delete(req.profileName)
    this.#daemonServer.logger.info(`Tunnel stopped: ${req.profileName}`)
    socket.write({type: 'stopped', profileName: req.profileName})
  }

  #handleList(_req: DaemonRequest, socket: SocketWrapper<DaemonResponse>): void {
    const tunnels = [...this.#tunnels.values()].map(h => h.info)
    socket.write({type: 'list', tunnels})
  }

  #handleDump(_req: DaemonRequest, socket: SocketWrapper<DaemonResponse>): void {
    const tunnels = [...this.#tunnels.values()].map(h => h.startRequest)
    socket.write({type: 'dump', tunnels})
  }

  #shutdown(): void {
    for (const handle of this.#tunnels.values()) handle.disconnect()
    this.#persistReplayMeta()
  }
}
