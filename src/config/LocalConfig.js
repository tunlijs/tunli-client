import {GlobalLocalShardConfigAbstract} from "#src/config/GlobalLocalShardConfigAbstract";

export class LocalConfig extends GlobalLocalShardConfigAbstract {
  constructor(data, path, globalConfig) {
    super({}, data, path, globalConfig);
  }
}
