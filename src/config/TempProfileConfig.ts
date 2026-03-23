import {ParsedProfileConfig} from "#config/ParsedProfileConfig";
import type {ParsedConfig} from "#config/ParsedConfig";


export class TempProfileConfig extends ParsedProfileConfig {

  constructor(config: ParsedConfig) {
    super(config, '__TEMP__', {}, false);
  }

  get name(): string {
    return this.target
  }

  save() {
    throw new Error('ich kann und darf nicht gespeichert werden')
  }
}
