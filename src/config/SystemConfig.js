import {GLOBAL_CONFIG_DIR} from "#lib/defs";
import {resolve} from "path";
import {ConfigAbstract, VISIBILITY_PRIVATE} from "#src/config/ConfigAbstract";
import {property} from "#src/config/PropertyConfig";


/**
 * Class representing the system configuration.
 * Extends ConfigAbstract to provide specific configuration for system settings.
 */
export class SystemConfig extends ConfigAbstract {
  /**
   * Create a SystemConfig instance.
   * @param {Object} data - Initial data to prefill the configuration.
   */
  constructor(data) {
    const alias = 'default'
    const configFilePath = resolve(GLOBAL_CONFIG_DIR, `${alias}.json`)

    super(data, configFilePath)

    this.prepare({
      authToken: property({
        visibility: VISIBILITY_PRIVATE,
        writeable: SystemConfig,
        type: String
      })
    })
    this.useSystem()
  }
}
