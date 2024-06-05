import {writeFileSync} from "fs"
import {dirname} from 'path'
import {ensureDirectoryExists} from "#src/core/FS/utils";
import {PropertyConfig} from "#src/config/PropertyConfig";

const callerStack = new Map()

/**
 * Mark a value with a caller reference.
 * @param {Object} callee - The caller object.
 * @param {*} value - The value to be marked.
 * @returns {*} - The marked value.
 */
const caller = (callee, value) => {
  value = {value}
  callerStack.set(value, callee)
  return value
}

/**
 * Check if a value is marked with a caller reference.
 * @param {*} value - The value to check.
 * @returns {boolean} - True if the value is marked, false otherwise.
 */
const isCaller = (value) => {
  return callerStack.has(value)
}

/**
 * Retrieve the caller reference for a value.
 * @param {*} value - The value with the caller reference.
 * @returns {Object} - The caller object.
 */
const callee = (value) => {
  return callerStack.get(value)
}

export const VISIBILITY_PRIVATE = 0
export const VISIBILITY_PUBLIC = 1

/**
 * Abstract class representing the basic configuration functionality.
 */
export class ConfigAbstract {
  /**
   * Configuration data.
   * @type {Object}
   * @private
   */
  #data = {}

  /**
   * Profile and system configuration data.
   * @type {Object}
   * @private
   */
  #profileData = {
    profile: {}, system: {},
  }

  /**
   * Path to the configuration file.
   * @type {string}
   * @private
   */
  #path

  /**
   * Fallback configuration instance.
   * @type {ConfigAbstract}
   * @private
   */
  #fallbackConfig

  /**
   * Defined properties.
   * @type {Array<string>}
   * @private
   */
  #definedProperties = []

  /**
   * Property configuration.
   * @type {Object<string, PropertyConfig>}
   * @private
   */
  #propertyConfig

  /**
   * Defined properties with inheritance.
   * @type {Array<string>}
   * @private
   */
  #definedWithInheritProperties

  /**
   * Active profile name.
   * @type {string}
   * @private
   */
  #activeProfile = 'default'

  /**
   * Create a ConfigAbstract instance.
   * @param {Object} prefillData - Initial data to prefill the configuration.
   * @param {string} path - The path to the configuration file.
   * @param {ConfigAbstract} [fallbackConfig] - The fallback configuration.
   */
  constructor(prefillData = {}, path, fallbackConfig) {
    this.#profileData = prefillData
    this.#profileData.profile ??= {}
    this.#profileData.system ??= {}
    this.#path = path
    this.#fallbackConfig = fallbackConfig
  }

  /**
   * Get the fallback configuration.
   * @return {ConfigAbstract}
   */
  get fallbackConfig() {
    return this.#fallbackConfig
  }

  /**
   * Get the profile data.
   * @return {{system: {}, profile: {}}}
   */
  get profileData() {
    return this.#profileData
  }

  /**
   * Get the configuration path.
   * @return {string}
   */
  get configPath() {
    return this.#path
  }

  /**
   * Prepare the configuration by defining properties.
   * @param {{[p: string]: PropertyConfig}} propertyConfig - The configuration properties.
   */
  prepare(propertyConfig = {}) {
    this.#propertyConfig = propertyConfig

    /**
     * Define a property.
     * @param {string} name - The name of the property.
     * @param {PropertyConfig} propertyConfig - The configuration of the property.
     */
    const defineProperty = (name, propertyConfig) => {

      let {writeable, visibility, type, defaultValue} = propertyConfig

      this.#definedProperties.push(name)
      const attributes = {
        get: () => {
          return this.#data[name] ?? this.#fallbackConfig?.[name] ?? defaultValue
        }
      }

      if (writeable) {
        /**
         * Set the value of the property.
         * This method checks if the value is marked with a caller reference
         * and handles the writeable state accordingly. If the property is
         * not writeable, an error is thrown. The value is also validated
         * if a validation function is provided. Finally, the validated
         * value is stored in the configuration data.
         *
         * @param {*} value - The value to set.
         * @throws {Error} If the property is not writeable.
         */
        attributes.set = (value) => {
          if (isCaller(value)) {
            const writer = callee(value)
            if (writeable && writeable !== true) {
              writeable = writer instanceof writeable
            }
            value = value.value
          }

          if (!writeable) {
            throw new Error(`property ${name} is not writeable`)
          }

          if (propertyConfig.validate) {
            value = propertyConfig.validate(value)
          }

          this.#data[name] = value
        }
      }

      Object.defineProperty(this, name, attributes)
    }

    for (const [name, setting] of Object.entries(propertyConfig)) {
      defineProperty(name, setting)
    }

    this.#definedWithInheritProperties = Array.from(new Set([
      ...this.#definedProperties,
      ...(this.#fallbackConfig?.#definedWithInheritProperties ?? [])
    ]))

    for (const name of this.#fallbackConfig?.#definedWithInheritProperties ?? []) {
      if (this.#definedProperties.includes(name)) {
        continue
      }

      Object.defineProperty(this, name, {
        get: () => {
          return this.#fallbackConfig[name]
        },
        set: (value) => {
          if (!isCaller(value)) {
            value = caller(this, value)
          }
          this.#fallbackConfig[name] = value
        }
      })
    }
  }

  /**
   * Check if a property is public.
   * @param {string} key - The property key.
   * @returns {boolean} - True if the property is public, false otherwise.
   */
  isPublic(key) {
    return this.#propertyConfig[key]?.visibility === VISIBILITY_PUBLIC
  }

  /**
   * Save the configuration to the file system.
   * @returns {ConfigAbstract} - The instance of the configuration.
   */
  save() {
    ensureDirectoryExists(dirname(this.#path))

    const isGlobal = this.constructor.name === 'GlobalConfig'
    const isSystem = this.constructor.name === 'SystemConfig'

    if (!isGlobal && !isSystem) {
      delete this.#profileData.system
    }

    writeFileSync(this.#path, JSON.stringify(this.#profileData, null, 2) + "\n")
    return this
  }

  /**
   * Use the system configuration.
   * @returns {ConfigAbstract} - The instance of the configuration.
   */
  useSystem() {
    this.#data = this.#profileData.system
    return this
  }

  /**
   * Use a specific profile configuration.
   * @param {string} profile - The profile name.
   * @returns {ConfigAbstract} - The instance of the configuration.
   */
  use(profile) {
    this.#profileData.profile[profile] ??= {}
    this.#data = this.#profileData.profile[profile]
    this.#activeProfile = profile
    return this
  }

  /**
   * Delete a property from the configuration.
   * @param {string} key - The property key.
   * @returns {ConfigAbstract} - The instance of the configuration.
   */
  del(key) {
    this.#data[key] = undefined
    return this
  }

  /**
   * Copy the current profile to a new profile.
   * @param {string} profile - The new profile name.
   * @returns {ConfigAbstract} - The instance of the configuration.
   */
  copyCurrentProfileTo(profile) {
    this.#profileData.profile[profile] = {...this.#data}
    return this
  }

  /**
   * Dump the configuration properties.
   * @returns {Object} - The dumped properties.
   */
  dump() {
    return Object.fromEntries(this.#definedProperties.map(x => {
      let t = this[x]
      if (Array.isArray(t)) {
        if (t.length) {
          t = t.join(', ')
        } else {
          t = undefined
        }
      }
      return [x, t]
    }))
  }
}
