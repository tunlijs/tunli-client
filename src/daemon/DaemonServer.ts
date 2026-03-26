import net from 'net'
import {readFileSync, unlinkSync} from 'node:fs'
import {DAEMON_SOCKET_PATH, RESTART_DUMP_FILEPATH} from '#lib/defs'
import type {DaemonRequest, DaemonResponse, EventMessage, StartRequest, TunnelDump, TunnelInfo} from '#daemon/protocol'
import type {Logger, ProfileConfig, TargetConfig} from '#types/types'
import {AppEventEmitter, type Req, type ReqErrorMeta, type ReqMeta, type Res} from '#cli-app/AppEventEmitter'
import {ApiClient} from '#api-client/ApiClient'
import {ParsedGlobalConfig} from '#config/ParsedGlobalConfig'
import {createProxy} from '#proxy/Proxy'
import {readPackageJson} from '#package-json/packageJson'

type TunnelHandle = {
  info: TunnelInfo
  startRequest: Omit<StartRequest, 'type'>
  appEmitter: AppEventEmitter
  disconnect: () => void
  lastLatency?: number
  requestCount: number
}

export class DaemonServer {

  readonly #logger: Logger
  readonly #apiClient: ApiClient
  readonly #version: string
  readonly #tunnels: Map<string, TunnelHandle> = new Map()
  #server?: net.Server

  constructor(globalConf: ParsedGlobalConfig, logger: Logger) {
    this.#logger = logger
    this.#apiClient = new ApiClient(globalConf)
    this.#version = readPackageJson()?.version ?? 'unknown'
  }

  async listen(): Promise<void> {
    try {
      unlinkSync(DAEMON_SOCKET_PATH)
    } catch { /* stale socket */
    }

    this.#server = net.createServer((socket) => {
      let buffer = ''
      socket.on('data', (chunk) => {
        buffer += chunk.toString()
        const nl = buffer.indexOf('\n')
        if (nl === -1) return
        const line = buffer.slice(0, nl)
        buffer = buffer.slice(nl + 1)
        try {
          void this.#handle(JSON.parse(line) as DaemonRequest, socket)
        } catch {
          this.#respond(socket, {type: 'error', message: 'Invalid request'})
        }
      })
    })

    await this.#restoreFromDump()
    await new Promise<void>((resolve) => this.#server!.listen(DAEMON_SOCKET_PATH, resolve))
    this.#logger.info('Daemon listening')

    process.on('SIGTERM', () => this.#shutdown())
    process.on('SIGINT', () => this.#shutdown())
  }

  async #handle(req: DaemonRequest, socket: net.Socket): Promise<void> {
    switch (req.type) {
      case 'start':
        return this.#handleStart(req, socket)
      case 'stop':
        return this.#handleStop(req, socket)
      case 'attach':
        return this.#handleAttach(req, socket)
      case 'list':
        return this.#handleList(socket)
      case 'dump':
        return this.#handleDump(socket)
      case 'shutdown':
        this.#respond(socket, {type: 'ok'});
        this.#shutdown();
        return
      case 'version':
        this.#respond(socket, {type: 'version', version: this.#version})
        return
    }
  }

  async #handleStart(req: StartRequest, socket: net.Socket): Promise<void> {
    if (this.#tunnels.has(req.profileName)) {
      return this.#respond(socket, {type: 'started', profileName: req.profileName, proxyURL: req.proxyURL, alreadyRunning: true})
    }
    try {
      await this.#startTunnel(req)
      this.#respond(socket, {type: 'started', profileName: req.profileName, proxyURL: req.proxyURL})
    } catch (e) {
      this.#respond(socket, {type: 'error', message: e instanceof Error ? e.message : String(e)})
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
      target: `${req.target.host}:${req.target.port}`,
      status: 'connecting',
    }

    const appEmitter = new AppEventEmitter()
    const handle: TunnelHandle = {info, startRequest: req, appEmitter, disconnect: () => {}, requestCount: 0}

    appEmitter.on('connect', () => { info.status = 'connected' })
    appEmitter.on('disconnect', () => { info.status = 'disconnected' })
    appEmitter.on('connect_error', () => { info.status = 'error' })
    appEmitter.on('latency', (ms) => { handle.lastLatency = ms })
    appEmitter.on('response', () => { handle.requestCount++ })

    const proxy = await createProxy(profileConfig, appEmitter)
    handle.disconnect = proxy.disconnect
    this.#tunnels.set(req.profileName, handle)
    this.#logger.info(`Tunnel started: ${req.profileName} → ${req.proxyURL}`)
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
          this.#logger.error(`Failed to restore tunnel "${tunnel.profileName}": ${e instanceof Error ? e.message : String(e)}`)
        })
      }
      this.#logger.info(`Restored ${tunnels.length} tunnel(s) from dump`)
    } catch (e) {
      this.#logger.error(`Failed to parse restart dump: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  #handleAttach(req: Extract<DaemonRequest, { type: 'attach' }>, socket: net.Socket): void {
    const handle = this.#tunnels.get(req.profileName)
    if (!handle) {
      return this.#respond(socket, {type: 'error', message: `No tunnel running for profile "${req.profileName}"`})
    }

    socket.write(JSON.stringify({
      type: 'attach-ok',
      profileName: req.profileName,
      proxyURL: handle.info.proxyURL,
      status: handle.info.status,
      requestCount: handle.requestCount,
      ...(handle.lastLatency !== undefined && {lastLatency: handle.lastLatency}),
    } satisfies DaemonResponse) + '\n')

    const send = (msg: EventMessage) => {
      if (!socket.destroyed) socket.write(JSON.stringify(msg) + '\n')
    }

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

  #handleStop(req: Extract<DaemonRequest, { type: 'stop' }>, socket: net.Socket): void {
    const handle = this.#tunnels.get(req.profileName)
    if (!handle) {
      return this.#respond(socket, {type: 'error', message: `No tunnel running for profile "${req.profileName}"`})
    }
    handle.disconnect()
    this.#tunnels.delete(req.profileName)
    this.#logger.info(`Tunnel stopped: ${req.profileName}`)
    this.#respond(socket, {type: 'stopped', profileName: req.profileName})
  }

  #handleList(socket: net.Socket): void {
    const tunnels = [...this.#tunnels.values()].map(h => h.info)
    this.#respond(socket, {type: 'list', tunnels})
  }

  #handleDump(socket: net.Socket): void {
    const tunnels = [...this.#tunnels.values()].map(h => h.startRequest)
    this.#respond(socket, {type: 'dump', tunnels})
  }

  #respond(socket: net.Socket, response: DaemonResponse): void {
    socket.write(JSON.stringify(response) + '\n')
  }

  #shutdown(): void {
    this.#logger.info('Daemon shutting down')
    for (const handle of this.#tunnels.values()) handle.disconnect()
    this.#server?.close()
    try {
      unlinkSync(DAEMON_SOCKET_PATH)
    } catch { /* already gone */
    }
    process.exit(0)
  }
}
