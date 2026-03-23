import type {ParsedConfig} from "#config/ParsedConfig";
import type {ProxyConfig} from "#types/types";


export class ParsedProfileConfig {

  readonly #name: string
  readonly #exists: boolean
  readonly #config: ParsedConfig


  #data: undefined | {
    relay?: string | undefined
    port?: number | undefined
    host?: string | undefined
    protocol?: string | undefined
    proxyURL?: string | undefined
    proxy?: ProxyConfig | undefined
    allowCidr?: string[] | undefined
    denyCidr?: string[] | undefined
  }

  get target() {
    return `${this.protocol}://${this.host}:${this.port}`
  }

  get filepath() {
    return this.#config.filepath
  }

  get locationType() {
    return this.#config.locationType
  }

  constructor(config: ParsedConfig, name: string, data: Record<string, unknown>, exists: boolean) {
    this.#name = name
    this.#data = data
    this.#exists = exists
    this.#config = config
  }

  exists() {
    return this.#exists
  }

  delete() {
    this.#data = undefined
  }

  get denyCidr(): undefined | string[] {
    return this.#data?.denyCidr
  }

  get allowCidr(): undefined | string[] {
    return this.#data?.allowCidr
  }

  set denyCidr(denyCidr: string[]) {
    this.#data ??= {}
    this.#data.denyCidr = denyCidr
  }

  set allowCidr(allowCidr: string[]) {
    this.#data ??= {}
    this.#data.allowCidr = allowCidr
  }

  setPort(port: number): this {
    this.#data ??= {}
    this.#data.port = port
    return this
  }

  getPort(): number | undefined {
    return this.#data?.port
  }

  setHost(host: string): this {
    this.#data ??= {}
    this.#data.host = host
    return this
  }

  set protocol(protocol) {
    this.#data ??= {}
    this.#data.protocol = protocol
  }

  getHost(): string | undefined {
    return this.#data?.host
  }

  getProtocol(): string | undefined {
    return this.#data?.protocol
  }

  getProxyURL(): string | undefined {
    return this.#data?.proxyURL
  }

  get proxyURL(): string | undefined {
    return this.getProxyURL()
  }

  getProxy(): ProxyConfig | undefined {
    return this.#data?.proxy
  }

  setProxy(proxy: ProxyConfig): this {
    this.#data ??= {}
    this.#data.proxy = proxy
    return this
  }

  get proxy(): ProxyConfig | undefined {
    return this.getProxy()
  }

  set proxy(proxy: ProxyConfig) {
    this.setProxy(proxy)
  }

  getRelay(): string | undefined {
    return this.#data?.relay
  }

  get relay(): string | undefined {
    return this.getRelay()
  }


  get port(): number | undefined {
    return this.getPort()
  }

  get host(): string | undefined {
    return this.getHost()
  }

  get protocol(): string | undefined {
    return this.#data?.protocol
  }

  get name() {
    return this.#name
  }

  update(data: Record<string, unknown>): this {
    this.#data = {
      ...this.#data,
      ...data
    }
    return this
  }

  save() {
    return this.#config.save()
  }

  toJSON() {
    if (this.#data == null) return
    if (!Object.keys(this.#data).length) return
    return this.#data
  }
}
