import {ParsedProfileConfig} from "#config/ParsedProfileConfig";
import type {ParsedConfig} from "#config/ParsedConfig";
import {sha256} from "#utils/hashFunctions";

const ADJECTIVES = [
  'amber', 'brave', 'calm', 'cedar', 'crisp',
  'dusk', 'eager', 'fair', 'fleet', 'frost',
  'glad', 'gold', 'grand', 'gray', 'green',
  'hollow', 'jade', 'keen', 'kind', 'lark',
  'lean', 'light', 'lone', 'mist', 'mossy',
  'neat', 'nimble', 'noble', 'north', 'oaken',
  'pale', 'prime', 'proud', 'quick', 'quiet',
  'rapid', 'raw', 'red', 'rocky', 'round',
  'sage', 'sharp', 'shy', 'silk', 'slim',
  'soft', 'still', 'stone', 'swift', 'teal',
  'thin', 'tidy', 'true', 'vivid', 'warm',
  'wild', 'wise', 'woody', 'young', 'zeal',
]

const adjectiveForHostPort = (host: string, port: number): string => {
  const index = parseInt(sha256(`${host}:${port}`).slice(0, 8), 16)
  return ADJECTIVES[index % ADJECTIVES.length]!
}


export class TempProfileConfig extends ParsedProfileConfig {

  constructor(config: ParsedConfig) {
    super(config, '__TEMP__', {}, false);
  }

  get name(): string {
    const port = this.port ?? 0
    const host = this.host ?? 'localhost'
    return `${adjectiveForHostPort(host, port)}-${port}`
  }

  save() {
    throw new Error('ich kann und darf nicht gespeichert werden')
  }
}
