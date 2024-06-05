import EventEmitter from 'node:events'

/**
 * A class representing a reference to a value.
 * This class is useful for creating mutable references to values,
 * allowing for controlled access and modification.
 */
export class Ref extends EventEmitter {

  /**
   * @type {any}
   * Private field to store the value.
   */
  #value

  /**
   * Constructor for the Ref class.
   * If the provided value is an instance of Ref, it uses its value.
   * Otherwise, it stores the provided value.
   * @param {any} value - The value to store.
   */
  constructor(value) {
    super()
    if (value instanceof Ref) {
      this.#value = value.#value
    } else {
      this.#value = { value }
    }
  }

  /**
   * Getter for the stored value.
   * @returns {any} - The stored value.
   */
  get value() {
    return this.#value.value
  }

  /**
   * Setter for the stored value.
   * @param {any} value - The new value.
   */
  set value(value) {
    const oldValue = this.#value.value
    this.#value.value = value
    // Emit an event if the value has changed
    if (oldValue !== value) {
      this.emit('update', value, oldValue)
    }
  }
}

/**
 * @template T
 * Creates a new Ref instance.
 * @param {T} [value] - The value to store.
 * @returns {Ref} - A new Ref instance.
 */
export const ref = (value) => {
  return new Ref(value)
}

/**
 * Checks if the value is an instance of Ref.
 * @param {any} value - The value to check.
 * @returns {boolean} - True if the value is an instance of Ref, otherwise false.
 */
export const isRef = (value) => {
  return value instanceof Ref
}
