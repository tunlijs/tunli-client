import {Ref} from "#src/core/Ref";

/**
 * Class representing a shared argument, extending Ref.
 */
class SharedArg extends Ref {
  /**
   * Create a SharedArg instance.
   * @param {*} value - The initial value for the shared argument.
   */
  constructor(value) {
    super(value)
  }
}

/**
 * Create a new SharedArg instance.
 * @param {*} value - The initial value for the shared argument.
 * @returns {SharedArg} - The created SharedArg instance.
 */
export const sharedArg = (value) => {
  return new SharedArg(value)
}

/**
 * Check if a value is an instance of SharedArg.
 * @param {SharedArg|*} value - The value to check.
 * @returns {boolean} - True if the value is an instance of SharedArg, false otherwise.
 */
export const isSharedArg = (value) => {
  return value instanceof SharedArg
}
