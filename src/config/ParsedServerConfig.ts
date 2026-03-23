import {type ParsedConfig} from "#config/ParsedConfig";

export class ParsedServerConfig {
  readonly #name: string
  readonly #exists: boolean
  #data: undefined | {
    url?: string | undefined
    authToken?: string | undefined
  }

  readonly #config: ParsedConfig

  constructor(config: ParsedConfig, name: string, data: Record<string, unknown>, exists: boolean) {
    this.#name = name
    this.#data = data
    this.#exists = exists
    this.#config = config
  }

  exists() {
    return this.#exists
  }

  save() {
    return this.#config.save()
  }

  get name() {
    return this.#name
  }

  getUrl(): string | undefined {
    return this.#data?.url
  }

  getAuthToken(): string | undefined {
    return this.#data?.authToken
  }

  delete() {
    this.#data = undefined
  }

  setUrl(url: string): this {
    this.#data ??= {}
    this.#data.url = url
    return this
  }

  get url(): string | undefined {
    return this.getUrl()
  }

  get authToken(): string | undefined {
    return this.getAuthToken()
  }

  setAuthToken(authToken: string): this {
    this.#data ??= {}
    this.#data.authToken = authToken
    return this
  }

  toJSON() {
    if (this.#data == null) return
    if (!Object.keys(this.#data).length) return
    return this.#data
  }
}
