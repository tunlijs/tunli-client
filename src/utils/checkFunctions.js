import {InvalidArgumentError} from "commander"
import {ipV4} from "#src/net/IPV4";
import {isSharedArg} from "#commands/helper/SharedArg";

/**
 * Validate and format an IPv4 address with CIDR notation.
 * This function checks if the provided value is a valid IPv4 address with or without CIDR suffix.
 * If valid, it returns the address formatted with its CIDR suffix.
 * If invalid, it throws an InvalidArgumentError with an appropriate message.
 *
 * @param {string} value - The IPv4 address (with or without CIDR) to validate.
 * @returns {string} - The validated and formatted IPv4 address with CIDR suffix.
 * @throws {InvalidArgumentError} - If the IPv4 address is not valid.
 */
export const checkIpV4Cidr = (value) => {
  const val = ipV4(value)
  if (!val.isValid) {
    throw new InvalidArgumentError('The provided value must be a valid IPv4 address, with or without CIDR notation.')
  }
  return `${val}/${val.cidrSuffix}`
}
/**
 * Checks if the value is an integer.
 * @param {any} value - The value to check.
 * @param {string} [errorMessage='Value must be an integer'] - The error message to throw if validation fails.
 * @returns {number} - The validated integer.
 * @throws {InvalidArgumentError} - If the value is not a valid integer.
 */
export const checkInt = (value, errorMessage = 'Value must be an integer') => {
  value = value.toString()

  if (!/^\d+$/.test(value)) {
    throw new InvalidArgumentError(errorMessage);
  }

  return parseInt(value)
}
/**
 * Checks if the value is a valid URL.
 * @param {string} value - The value to check.
 * @returns {string} - The validated URL.
 * @throws {InvalidArgumentError} - If the value is not a valid URL.
 */
export const checkUrl = (value) => {
  try {
    return new URL(value).toString()
  } catch (e) {
    throw new InvalidArgumentError('Invalid URL')
  }
}
/**
 * Checks if the value is a valid host.
 * @param {Ref|*} valueOrSharedArg - The value or shared argument to check.
 * @param {boolean} [isArgument=false] - Whether the value is an argument.
 * @param {*} [value] - The value to check.
 * @returns {string} - The validated host.
 * @throws {InvalidArgumentError} - If the value is not a valid host.
 */
export const checkHost = (valueOrSharedArg, isArgument = false, value) => {
  if (isSharedArg(valueOrSharedArg)) {
    const {url, host} = valueOrSharedArg.value
    if (url) {
      throw new InvalidArgumentError('You must not set a host if the port argument is a URL')
    } else if (host) {
      throw new InvalidArgumentError('You must not set a host argument if the host option has been set')
    }
  } else {
    value = valueOrSharedArg
    valueOrSharedArg = undefined
  }

  const check = new URL('http://localhost')
  check.hostname = value

  if (check.hostname !== value.toLowerCase()) {
    throw new InvalidArgumentError('Invalid host');
  }
  if (isSharedArg(valueOrSharedArg) && !isArgument) {
    valueOrSharedArg.value.host = check.host
  }

  return check.host
}
/**
 * Checks if the value is a valid port.
 * @param {Ref|*} valueOrSharedArg - The value or shared argument to check.
 * @param {boolean} [isArgument=false] - Whether the value is an argument.
 * @param {*} [value] - The value to check.
 * @returns {number|Ref} - The validated port or shared argument with port.
 * @throws {InvalidArgumentError} - If the value is not a valid port.
 */
export const checkPort = (valueOrSharedArg, isArgument = false, value) => {
  const handleUrlArg = (value) => {
    try {
      const url = new URL(value)

      let port = url.port
      const protocol = url.protocol.substring(0, url.protocol.length - 1)

      if (!port) {
        if (protocol === 'http') {
          port = 80
        } else if (protocol === 'https') {
          port = 443
        }
        url.port = port.toString()
      }

      valueOrSharedArg.value.url = {
        protocol,
        host: url.hostname,
        port: parseInt(port)
      }

      return port
    } catch (e) {
      return null
    }
  }

  let portFromUrl

  if (isSharedArg(valueOrSharedArg)) {
    const {url, port, host} = valueOrSharedArg.value
    portFromUrl = isArgument ? handleUrlArg(value) : null

    if (host && portFromUrl) {
      throw new InvalidArgumentError('You must not set a URL as port argument if the host option is already set')
    } else if (port) {
      if (portFromUrl) {
        throw new InvalidArgumentError('You must not set a port option if the port argument is a URL')
      }
      throw new InvalidArgumentError('You must not set a port option if the port argument is set')
    } else if (url) {
      if (port) {
        throw new InvalidArgumentError('You must not set a port option if the port argument is a URL')
      }
      throw new InvalidArgumentError('Unexpected: You must not set a port argument')
    }

    value = portFromUrl ?? value
  } else {
    value = valueOrSharedArg
    valueOrSharedArg = undefined
  }

  value = checkInt(value, 'Port must be a valid integer')

  if (value > 65535) {
    throw new InvalidArgumentError('Port exceeds maximum value of 65535');
  }

  if (isSharedArg(valueOrSharedArg)) {
    if (!portFromUrl) {
      valueOrSharedArg.value.port = value
    }
    return valueOrSharedArg
  }

  return value
}

export const checkProtocol = (value) => {
  return checkInArray(value, ['http', 'https'])
}

export const checkInArray = (val, arr) => {
  if (!arr.includes(val)) {
    throw new InvalidArgumentError(`Value must be one of (${arr.join(', ')})`)
  }

  return val
}

export const checkMd5 = (hash) => {

  if (!hash?.match(/^[0-9a-f]{32}$/i)) {
    throw new InvalidArgumentError(`Value is not a valid md5 hash`)
  }

  return hash.toLowerCase()
}