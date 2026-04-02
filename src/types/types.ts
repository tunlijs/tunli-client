import type {ParsedGlobalConfig} from "#config/ParsedGlobalConfig";
import type {ParsedLocalConfig} from "#config/ParsedLocalConfig";
import type {ApiClient} from "#api-client/ApiClient";

export type ServerConfig = {
  readonly url: string
  readonly authToken: string
}

export type Protocol = "http" | "https"

export type TargetConfig = {
  readonly  protocol: Protocol
  readonly  port: number
  readonly  host: string
}

export type ProfileConfig = {
  readonly filepath: string
  readonly allowedCidr: string[]
  readonly deniedCidr: string[]
  readonly profileName: string
  readonly serverConfig: ServerConfig
  readonly apiClient: ApiClient
  readonly proxy: ProxyConfig
  readonly target: TargetConfig
}

export type ProxyConfig = {
  readonly proxyURL: string
  readonly proxyIdent: string
}

export type RequestMethod = "GET" | "POST" | "PATCH" | "DELETE" | "HEAD" | "OPTION" | "PUT"

export interface Headers {

  host: string

  [name: string]: string
}

export type Logger = {
  info(message: string): void
  warn(message: string): void
  error(message: string): void
  debug(message: string): void
  exception(message: unknown): void
  verbose(message: string): void
}

export type Context = {
  logger: Logger
  exit(code?: number): never
  apiClient: ApiClient
  stdOut: (message: string) => void
  stdErr: (message: string) => void
  config: {
    createLocalConfig(): void
    global: ParsedGlobalConfig
    local: ParsedLocalConfig | undefined
  }
}
