import {ParsedProfileConfig} from "#config/ParsedProfileConfig";
import {ParsedServerConfig} from "#config/ParsedServerConfig";
import {dirname} from "path";
import {rmSync, writeFileSync} from "fs";
import {ensureDirectoryExists} from "#core/FS/utils";
import {DEFAULT_PROFILE_NAME} from "#lib/defs";
import {TempProfileConfig} from "#config/TempProfileConfig";
import {type LOG_LEVEL, LoggerAbstract} from "#logger/LoggerAbstract";

const LOG_LEVELS = Object.keys(LoggerAbstract.LEVELS) as LOG_LEVEL[]

export class ParsedConfig {

  isLocal() {
    return false
  }

  get filepath() {
    return this.#filepath
  }

  get mode() {

    if (this.isLocal()) {
      return 'local'
    }

    if (this.isGlobal()) {
      return 'global'
    }

    return 'memory'
  }

  isGlobal() {
    return false
  }

  get locationType() {
    if (this.isGlobal()) return 'global'
    if (this.isLocal()) return 'local'
    return 'unknown'
  }

  readonly #data: {
    profiles: Record<string, ParsedProfileConfig>
    servers: Record<string, ParsedServerConfig>
    activeServer: string | undefined
    defaultProfile: string | undefined
    localConfigs: string[]
    logLevel: LOG_LEVEL
  } = {
    profiles: {},
    servers: {},
    activeServer: undefined,
    defaultProfile: DEFAULT_PROFILE_NAME,
    localConfigs: [],
    logLevel: 'info',
  }

  readonly #filepath?: string | undefined

  constructor(data: Record<string, unknown>, filepath?: string) {

    const {profiles, servers, activeServer, defaultProfile, localConfigs, logLevel} = data ?? {}
    this.#filepath = filepath
    for (const [name, profile] of Object.entries(profiles ?? {})) {
      this.#data.profiles[name] = new ParsedProfileConfig(this, name, profile ?? {}, true)
    }
    for (const [name, server] of Object.entries(servers ?? {})) {
      this.#data.servers[name] = new ParsedServerConfig(this, name, server ?? {}, true)
    }

    if (activeServer) {
      this.#data.activeServer = activeServer as string
    }

    if (defaultProfile) {
      this.#data.defaultProfile = defaultProfile as string
    }

    if (Array.isArray(localConfigs)) {
      this.#data.localConfigs = localConfigs.filter((v): v is string => typeof v === 'string')
    }

    if (LOG_LEVELS.includes(logLevel as LOG_LEVEL)) {
      this.#data.logLevel = logLevel as LOG_LEVEL
    }
  }

  temporaryProfile() {
    return new TempProfileConfig(this)
  }

  profile(profile: string): ParsedProfileConfig {
    return this.#data.profiles[profile] ??= new ParsedProfileConfig(this, profile, {}, false)
  }

  server(name: string): ParsedServerConfig {
    return this.#data.servers[name] ??= new ParsedServerConfig(this, name, {}, false)
  }

  get activeServer(): string | undefined {
    return this.#data.activeServer
  }

  get defaultProfile(): string | undefined {
    return this.#data.defaultProfile
  }

  set activeServer(activeServer: string) {
    this.#data.activeServer = activeServer
  }

  set defaultProfile(defaultProfile: string) {
    this.#data.defaultProfile = defaultProfile
  }

  get logLevel(): LOG_LEVEL {
    return this.#data.logLevel
  }

  set logLevel(level: LOG_LEVEL) {
    this.#data.logLevel = level
  }

  get localConfigs(): string[] {
    return this.#data.localConfigs
  }

  registerLocalConfig(path: string): void {
    if (!this.#data.localConfigs.includes(path)) {
      this.#data.localConfigs.push(path)
    }
  }

  unregisterLocalConfig(path: string): void {
    this.#data.localConfigs = this.#data.localConfigs.filter(p => p !== path)
  }

  get profiles(): ParsedProfileConfig[] {
    const profiles = Object.values(this.#data.profiles)
    profiles.sort((a, b) => {
      return a.name > b.name ? 1
        : a.name < b.name ? -1 : 0
    })

    return profiles
  }

  get servers(): ParsedServerConfig[] {
    const servers = Object.values(this.#data.servers)
    servers.sort((a, b) => {
      return a.name > b.name ? 1
        : a.name < b.name ? -1 : 0
    })

    return servers
  }

  exists(): boolean {
    if (this.#data == null) return false
    if (!Object.keys(this.#data).length) return false
    return true
  }

  toJSON() {
    return this.#data
  }

  delete() {
    if (!this.#filepath) return
    rmSync(this.#filepath)
  }

  save() {
    if (!this.#filepath) return
    ensureDirectoryExists(dirname(this.#filepath))
    writeFileSync(this.#filepath, JSON.stringify(this, null, 2), 'utf-8')
  }
}
