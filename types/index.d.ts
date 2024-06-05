export type TunnelClientOptions = {
  host: string
  port: number
  path: string
  proxyURL: string
  authToken: string
  denyCidr: string[]
  allowCidr: string[]
}

export interface ConfigAbstract extends TunnelClientOptions {

}

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
}

export type cliListOption = {
  maxLength?: number
  minLength?: number
  length?: number
  reverse?: boolean
  minWidth?: number | (number | boolean)[]
}

export type proxyURL = string

export type tunnelClientOptions = {
  port: number
  host: string
  authToken: string
  server: proxyURL
  path: undefined
  origin: string
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
