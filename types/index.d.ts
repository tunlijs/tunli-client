import {Socket} from 'socket.io-client';

export interface Headers {

  host: string

  [name: string]: string
}

export type RequestMethod = "GET" | "POST" | "PATCH" | "DELETE" | "HEAD" | "OPTION" | "PUT"

export type RequestId = string

export type IncomingSocketIoRequest = {
  method: RequestMethod
  headers: Headers
  path: string
  port: number
  hostname: string
}

export type SocketIoRawRequestObject = {
  method: RequestMethod
  headers: Headers
  path: string
  requestId?: string
  tunnelSocket?: Socket
}

export type cliListOption = {
  maxLength?: number
  minLength?: number
  length?: number
  reverse?: boolean
  minWidth?: number | Array<number | string | boolean>
  maxWidth?: number | Array<number | string | boolean>
}

export type profileDump = {}
export type proxyURL = string
export type profileConfig = {
  system: {}
  profile: {}
}

interface ConfigAbstract {
}

export interface AppConfig {

  protocol: protocol
  port: number
  host: string
  authToken: string
  proxyURL: proxyURL
  proxyURLs: proxyURL[]
  path: undefined
  origin: string
  denyCidr?: ipCidr[]
  allowCidr?: ipCidr[]

  get fallbackConfig(): AppConfig

  get profileData(): profileConfig

  get configPath(): string

  get profile(): profileAlias

  copyCurrentProfileTo(profile: profileAlias): this

  save(): this

  update(value: { [p: string]: any }): this

  useSystem(): AppConfig

  use(profile: profileAlias): AppConfig

  del(configKey: string): AppConfig

  copyCurrentProfileTo(profile: profileAlias): this

  dump(): profileDump
}

export type protocol = "http" | "https"
export type ipCidr = string
export type profileAlias = string
export type tunnelClientOptions = {
  protocol: protocol
  self: boolean
  port: number
  host: string
  authToken: string
  server: proxyURL
  path?: string
  origin?: string
  save?: profileAlias | true
  denyCidr?: ipCidr[]
  allowCidr?: ipCidr[]
  allowSelf?: ipCidr[]
}

export type keypressEventDetails = {
  sequence: string
  name: string
  ctrl: boolean
  meta: boolean
  shift: boolean
  full: string
}

export interface keypressEventListener {
  (char: string, details: keypressEventDetails): void
}


export type tunliProxyOptions = {}
