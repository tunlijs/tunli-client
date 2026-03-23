import {ParsedConfig} from "#config/ParsedConfig";

export class ParsedLocalConfig extends ParsedConfig {
  isLocal() {
    return true
  }
}
