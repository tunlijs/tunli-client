/**
 * @callback validationCallback
 * @template T
 * @param {T} value
 * @throws Error
 * @returns {T}
 */

/**
 * Class representing the configuration of a property.
 */
export class PropertyConfig {
  /**
   * The raw configuration data.
   * @type {Object}
   */
  #data

  /**
   * The visibility level of the property.
   * @type {number}
   */
  #visibility

  /**
   * Indicates if the property is writeable.
   * When true, the property can be written to.
   * If an instance of ConfigAbstract, only that instance can change the value.
   * @type {boolean|ConfigAbstract}
   */
  #writeable

  /**
   * The validation function for the property.
   * @type {validationCallback}
   */
  #validate

  /**
   * Default value for the property.
   * @type {any}
   */
  #defaultValue

  /**
   * The type of the property.
   * @type {Object}
   */
  #type

  /**
   * Create a PropertyConfig.
   * @param {Object} data - The configuration data for the property.
   * @param {number} data.visibility - The visibility level of the property.
   * @param {boolean|ConfigAbstract} data.writeable - Indicates if the property is writeable.
   * @param {validationCallback} data.validate - The validation function for the property.
   * @param {any} data.defaultValue - The default value of the property.
   * @param {Object} data.type - The type of the property.
   */
  constructor(data) {
    this.#data = data
    this.#visibility = data.visibility
    this.#writeable = data.writeable
    this.#validate = data.validate
    this.#defaultValue = data.defaultValue
    this.#type = data.type
  }

  /**
   * Get the visibility of the property.
   * @returns {number} The visibility level of the property.
   */
  get visibility() {
    return this.#visibility
  }

  /**
   * Check if the property is writeable.
   * @returns {boolean|ConfigAbstract} True if the property is writeable, false otherwise.
   */
  get writeable() {
    return this.#writeable
  }

  /**
   * Get the validation function for the property.
   * @returns {validationCallback} The validation function.
   */
  get validate() {
    return this.#validate
  }

  /**
   * Get the default value of the property.
   * @returns {*} The default value of the property.
   */
  get defaultValue() {
    return this.#defaultValue
  }

  /**
   * Get the type of the property.
   * @returns {Object} The type of the property.
   */
  get type() {
    return this.#type
  }
}

/**
 * Factory function to create a PropertyConfig instance.
 * @param {Object} propertySetup - The setup configuration for the property.
 * @param {boolean|ConfigAbstract} propertySetup.writeable - Indicates if the property is writeable.
 * @param {Object} propertySetup.type - The type of the property.
 * @param {function} [propertySetup.validate] - The validation function for the property.
 * @param {number} propertySetup.visibility - The visibility level of the property.
 * @param {any} [propertySetup.defaultValue] - The default value of the property.
 * @returns {PropertyConfig} The instance of PropertyConfig.
 */
export const property = (propertySetup) => {
  return new PropertyConfig(propertySetup)
}
