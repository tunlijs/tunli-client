import {ParsedConfig} from "#config/ParsedConfig";

export class ParsedGlobalConfig extends ParsedConfig {
  isGlobal() {
    return true
  }
}
