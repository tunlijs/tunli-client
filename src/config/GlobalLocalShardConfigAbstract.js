import {checkHost, checkIpV4Cidr, checkPort, checkUrl} from "#src/utils/checkFunctions";
import {ConfigAbstract, VISIBILITY_PUBLIC} from "#src/config/ConfigAbstract";
import {property} from "#src/config/PropertyConfig";
import {ConfigManager} from "#src/config/ConfigManager";

/**
 * Abstract class for managing global and local shard configurations.
 * Extends the ConfigAbstract class to include properties specific to network configuration.
 */
export class GlobalLocalShardConfigAbstract extends ConfigAbstract {

  #config = {

    allowCidr: property({
      visibility: VISIBILITY_PUBLIC,
      writeable: true,
      type: Array,
      defaultValue: [],
      validate(val) {
        return val.map(checkIpV4Cidr)
      }
    }),
    proxyURL: property({
      visibility: VISIBILITY_PUBLIC,
      writeable: true,
      type: String,
      validate(val) {
        if (!val) {
          return
        }
        return checkUrl(val)
      }
    }),
    denyCidr: property({
      visibility: VISIBILITY_PUBLIC,
      writeable: true,
      type: Array,
      defaultValue: [],
      validate(val) {
        return val.map(checkIpV4Cidr)
      }
    }),
    port: property({
      visibility: VISIBILITY_PUBLIC,
      writeable: true,
      type: Number,
      defaultValue: 80,
      validate(val) {
        return checkPort(val)
      }
    }),
    host: property({
      visibility: VISIBILITY_PUBLIC,
      writeable: true,
      type: String,
      defaultValue: '127.0.0.1',
      validate(val) {
        return checkHost(val)
      }
    }),
  }

  /**
   * Create a GlobalLocalShardConfigAbstract.
   * @param {Object} additionalConfig - Additional configuration properties to be merged with the default config.
   * @param {Object} prefillData - Initial data to prefill the configuration.
   * @param {string} path - The path to the configuration file.
   * @param {ConfigAbstract} fallbackConfig - The fallback configuration to be used when specific data is not available.
   */
  constructor(additionalConfig = {}, prefillData = {}, path, fallbackConfig) {
    fallbackConfig ??= ConfigManager.loadSystem()
    super(prefillData, path, fallbackConfig)
    this.prepare({...this.#config, ...additionalConfig})
    this.use('default')
  }
}
