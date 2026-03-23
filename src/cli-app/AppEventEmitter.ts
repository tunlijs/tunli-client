import EventEmitter from "node:events";
import type {Socket} from "socket.io-client";
import type {IncomingHttpHeaders} from "http";
import type {ProxyConfig, TargetConfig} from "#types/types";

export type Req = {
  host: string
  port: number
  method: string
  path: string
  headers: IncomingHttpHeaders
  requestId: string
}
export type Res = {
  statusMessage: string
  statusCode: number
  httpVersion: string
  headers: IncomingHttpHeaders
}

export type ReqMeta = {
  method: string
  headers: IncomingHttpHeaders
  path: string
  requestId: string
  isUpgrade: boolean
}

export type ReqErrorMeta = {
  requestId: string
  isUpgrade: boolean
}

export type ReadyInfo = ProxyConfig & { target: TargetConfig }

type AppEvents =
  "connect"
  | "disconnect"
  | "connect_error"
  | "ready"
  | "response"
  | "client-blocked"
  | "request"
  | "request-error"
  | "latency"
  | "request-count"

export class AppEventEmitter extends EventEmitter {

  on(eventName: 'ready', listener: (info: ReadyInfo) => void): this
  on(eventName: 'request', listener: (req: ReqMeta) => void): this
  on(eventName: 'client-blocked', listener: (ip: string) => void): this
  on(eventName: 'disconnect', listener: (reason: Socket.DisconnectReason) => void): this
  on(eventName: 'response', listener: (req: Req, res: Res) => void): this
  on(eventName: 'request-error', listener: (e: Error, meta: ReqErrorMeta) => void): this
  on(eventName: 'connect_error', listener: (e: Error) => void): this
  on(eventName: 'latency', listener: (ms: number) => void): this
  on(eventName: 'request-count', listener: (count: number) => void): this
  on(eventName: AppEvents, listener: (...args: any[]) => unknown): this
  on(eventName: AppEvents, listener: (...args: any[]) => unknown): this {
    super.on(eventName, listener)
    return this
  }

  emit(eventName: 'ready', info: ReadyInfo): boolean
  emit(eventName: 'response', req: Req, res: Res): boolean
  emit(eventName: 'request', req: ReqMeta): boolean
  emit(eventName: 'connect_error', e: Error): boolean
  emit(eventName: 'connect'): boolean
  emit(eventName: 'client-blocked', ip: string): boolean
  emit(eventName: 'request-error', e: Error, meta: ReqErrorMeta): boolean
  emit(eventName: 'disconnect', reason: Socket.DisconnectReason): boolean
  emit(eventName: 'latency', ms: number): boolean
  emit(eventName: 'request-count', count: number): boolean
  emit(eventName: AppEvents, ...args: any[]): boolean {
    return super.emit(eventName, ...args)
  }
}
