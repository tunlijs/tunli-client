import {InvalidArgumentError} from "#commander/index"
import {assertString} from "#utils/assertFunctions";
import {ipV4, IPv4Address} from "@pfeiferio/ipv4";

/**
 * Validate and format an IPv4 address with CIDR notation.
 * This function checks if the provided value is a valid IPv4 address with or without CIDR suffix.
 * If valid, it returns the address formatted with its CIDR suffix.
 * If invalid, it throws an InvalidArgumentError with an appropriate message.
 *
 * @param value - The IPv4 address (with or without CIDR) to validate.
 * @returns The validated and formatted IPv4 address with CIDR suffix.
 * @throws {InvalidArgumentError} - If the IPv4 address is not valid.
 */
export const checkIpV4Cidr = (value: unknown): IPv4Address => {
  try {
    return ipV4(value as any)
  } catch (e: any) {
    throw new InvalidArgumentError(String(e))
//    throw new InvalidArgumentError('The provided value must be a valid IPv4 address, with or without CIDR notation.')

  }
}

/**
 * Checks if the value is an integer.
 * @param  value - The value to check.
 * @param  [errorMessage='Value must be an integer'] - The error message to throw if validation fails.
 * @returns The validated integer.
 * @throws {InvalidArgumentError} - If the value is not a valid integer.
 */
export const checkInt = (value: unknown, errorMessage = 'Value must be an integer'): number => {

  if (typeof value === 'number' && Number.isInteger(value)) return value

  if (value == null) throw new InvalidArgumentError(errorMessage);

  const stringValue = value.toString()

  if (!/^\d+$/.test(stringValue)) {
    throw new InvalidArgumentError(errorMessage);
  }

  return parseInt(stringValue)
}

/**
 * Checks if the value is a valid URL.
 * @param value - The value to check.
 * @returns The validated URL.
 * @throws {InvalidArgumentError} - If the value is not a valid URL.
 */
export const checkUrl = (value: string) => {
  try {
    return new URL(value).toString()
  } catch (e) {
    throw new InvalidArgumentError('Invalid URL')
  }
}

export const checkProtocol = (value: unknown) => {
  assertString(value, 'Protocol')
  return checkInArray(value, ['http', 'https'], 'Protocol')
}

export const checkInArray = (val: string, arr: string[], valueName: string = 'Value') => {
  if (!arr.includes(val)) {
    throw new InvalidArgumentError(`${valueName} must be one of (${arr.join(', ')})`)
  }
  return val
}

export const checkMd5 = (hash: string) => {
  if (!hash?.match(/^[0-9a-f]{32}$/i)) {
    throw new InvalidArgumentError(`Value is not a valid md5 hash`)
  }
  return hash.toLowerCase()
}

export const checkPort = (value: unknown): number => {
  const port = checkInt(value, 'Port must be a valid integer')
  if (port < 1 || port > 65535) throw new InvalidArgumentError('Port must be between 1 and 65535')
  return port
}

export const checkString = (value: unknown, foo: string = 'Value') => {
  if (typeof value !== 'string') {
    throw new InvalidArgumentError(`${foo} must be a string`)
  }
}

export const checkHost = (value: unknown) => {
  if (typeof value !== 'string') {
    throw new InvalidArgumentError('Host must be a string')
  }
}
