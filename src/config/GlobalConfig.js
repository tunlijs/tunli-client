import {GLOBAL_CONFIG_DIR} from "#lib/defs";
import {resolve} from "path";
import {GlobalLocalShardConfigAbstract} from "#src/config/GlobalLocalShardConfigAbstract";
import {SystemConfig} from "#src/config/SystemConfig";

export class GlobalConfig extends GlobalLocalShardConfigAbstract {

  constructor(data) {
    const alias = 'default'
    const configFilePath = resolve(GLOBAL_CONFIG_DIR, `${alias}.json`);

    super({}, data, configFilePath, new SystemConfig(data));
  }
}
