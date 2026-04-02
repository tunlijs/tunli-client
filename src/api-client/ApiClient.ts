import type {ParsedGlobalConfig} from "#config/ParsedGlobalConfig";
import type {ParsedLocalConfig} from "#config/ParsedLocalConfig";
import type {ApiResponse, ApiResult, RequestOptions} from "#api-client/types";
import {errorResponse, successResponse} from "#api-client/utils";
import {DEFAULT_API_SERVER_URL, DEFAULT_PROFILE_NAME} from "#lib/defs";
import type {ProxyConfig, ServerConfig, TargetConfig} from "#types/types";
import {sha256} from "../utils/hashFunctions.js";
import dns from 'node:dns'

dns.setDefaultResultOrder('ipv4first')

export class ApiClient {

  readonly #globalConfig: ParsedGlobalConfig
  readonly #localConfig: ParsedLocalConfig | undefined
  #serverConf?: ServerConfig

  constructor(globalConfig: ParsedGlobalConfig, localConfig?: ParsedLocalConfig) {
    this.#globalConfig = globalConfig
    this.#localConfig = localConfig
  }

  withServer(serverConf: ServerConfig) {
    const self = new ApiClient(this.#globalConfig, this.#localConfig)
    self.#serverConf = serverConf
    return self
  }

  async #request(method: string, path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse> {

    const serverUrl = new URL(
      options?.override?.server
      ?? this.#serverConf?.url
      ?? DEFAULT_API_SERVER_URL
    )

    serverUrl.pathname = `/api/v2${path}`

    const authToken = this.#serverConf?.authToken ?? ''

    let response: Response
    try {
      response = await fetch(String(serverUrl), {
        method,
        headers: {
          'User-Agent': 'tunli/1.0',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        ...(body !== undefined ? {body: JSON.stringify(body)} : {}),
      })
    } catch (e: unknown) {
      const code = (e instanceof Error && (e.cause as { code?: string } | null)?.code) || null
      const message =
        code === 'ECONNREFUSED' ? `Connection refused — is the server running at ${serverUrl.host}?` :
          code === 'ENOTFOUND' ? `Host not found: ${serverUrl.host}` :
            code === 'ETIMEDOUT' ? `Connection timed out: ${serverUrl.host}` :
              e instanceof Error ? e.message :
                String(e)
      return {isError: true, data: undefined, error: new Error(message), status: 0}
    }

    if (!response.ok) {
      return {
        isError: true,
        data: undefined,
        error: new Error(`HTTP ${response.status}: ${response.statusText}`),
        status: response.status
      }
    }

    const data = await response.json().catch(() => ({})) as Record<string, unknown>
    return {isError: false, data, error: undefined, status: response.status}
  }

  async #doGet(path: string, options?: RequestOptions): Promise<ApiResponse> {
    return this.#request('GET', path, undefined, options)
  }

  async #doPost(path: string, body?: unknown): Promise<ApiResponse> {
    return this.#request('POST', path, body)
  }

  async register(server: string): Promise<ApiResult<string>> {

    const response = await this.#doGet('/register', {
      override: {
        server
      }
    })
    if (response.isError) return errorResponse(response)
    return successResponse(response, response.data.authToken as string)
  }

  async registerProxy(target: TargetConfig, profileName: string): Promise<ApiResult<ProxyConfig>> {
    const targetHash = sha256(`${target.protocol}://${target.host}:${target.port}`)
    const profileHash = profileName === DEFAULT_PROFILE_NAME ? undefined : sha256(profileName)

    const response = await this.#doPost('/create-proxy', {targetHash, profileHash})
    if (response.isError) return errorResponse(response)
    return successResponse(response, response.data as any)
  }

  async renewProxy(target: TargetConfig, profileName: string, proxyURL: string): Promise<ApiResult<boolean>> {
    const targetHash = sha256(`${target.protocol}://${target.host}:${target.port}`)
    const profileHash = profileName === DEFAULT_PROFILE_NAME ? undefined : sha256(profileName)

    const response = await this.#doPost(`/renew-proxy/${proxyURL}`, {targetHash, profileHash})
    if (response.isError) return errorResponse(response)
    return successResponse(response, response.data.success as boolean)
  }

  async connectInfo(): Promise<ApiResult<{
    socketUrl: string;
    capturePath: string;
    connectionPoolSize: number;
    minClientVersion: string
  }>> {
    const response = await this.#doGet('/connect-info')
    if (response.isError) return errorResponse(response)
    return successResponse(response, {
      socketUrl: response.data.socketUrl as string,
      capturePath: response.data.capturePath as string,
      connectionPoolSize: response.data.connectionPoolSize as number ?? 1,
      minClientVersion: response.data.minClientVersion as string,
    })
  }
}
