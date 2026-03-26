import type {TargetConfig} from '#types/types'
import type {Req, Res, ReqMeta, ReqErrorMeta} from '#cli-app/AppEventEmitter'

export type TunnelInfo = {
  profileName: string
  proxyURL: string
  target: string
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
}

// CLI serializes the fully-validated ProfileConfig so the daemon
// doesn't need to read config files or make API calls for proxy creation.
export type StartRequest = {
  type: 'start'
  profileName: string
  proxyIdent: string
  proxyURL: string
  serverUrl: string
  authToken: string
  target: TargetConfig
  filepath: string
  allowedCidr: string[]
  deniedCidr: string[]
}

export type TunnelDump = Omit<StartRequest, 'type'>[]

export type DaemonRequest =
  | StartRequest
  | { type: 'stop'; profileName: string }
  | { type: 'attach'; profileName: string }
  | { type: 'list' }
  | { type: 'dump' }
  | { type: 'shutdown' }

// Event messages streamed over an attach connection (daemon → CLI).
// Each variant maps directly to an AppEventEmitter event.
export type EventMessage =
  | { type: 'event'; event: 'connect' }
  | { type: 'event'; event: 'disconnect'; reason: string }
  | { type: 'event'; event: 'connect_error'; message: string }
  | { type: 'event'; event: 'ready'; proxyIdent: string; proxyURL: string; target: TargetConfig }
  | { type: 'event'; event: 'request'; data: ReqMeta }
  | { type: 'event'; event: 'response'; req: Req; res: Res }
  | { type: 'event'; event: 'request-error'; message: string; meta: ReqErrorMeta }
  | { type: 'event'; event: 'client-blocked'; ip: string }
  | { type: 'event'; event: 'latency'; ms: number }

export type DaemonResponse =
  | { type: 'started'; profileName: string; proxyURL: string; alreadyRunning?: boolean }
  | { type: 'stopped'; profileName: string }
  | { type: 'list'; tunnels: TunnelInfo[] }
  | { type: 'dump'; tunnels: TunnelDump }
  | { type: 'attach-ok'; profileName: string; proxyURL: string; status: TunnelInfo['status']; lastLatency?: number; requestCount: number }
  | EventMessage
  | { type: 'error'; message: string }
  | { type: 'ok' }
