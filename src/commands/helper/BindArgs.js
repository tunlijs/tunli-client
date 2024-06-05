import {ipV4} from "#src/net/IPV4";

/**
 * Binds arguments to a function.
 * @param {Function} fn - The function to bind arguments to.
 * @param {...any} args - The arguments to bind.
 * @returns {Function} - The bound function.
 */
export const bindArgs = (fn, ...args) => {
  return fn.bind(null, ...args)
}

/**
 * Validates a remote address against allowed and denied CIDR ranges.
 * @param {string} remoteAddress - The remote address to check.
 * @param {Object} options - The options containing allowCidr and denyCidr arrays.
 * @param {string[]} options.allowCidr - Array of CIDR ranges that are allowed.
 * @param {string[]} options.denyCidr - Array of CIDR ranges that are denied.
 * @returns {boolean} - True if the address is valid, otherwise false.
 */
export const isValidRemoteAddress = (() => {
  const cache = {}

  /**
   * Checks if a remote address is within a given subnet.
   * Uses a cache to store results for performance improvement.
   * @param {string} remoteAddress - The remote address to check.
   * @param {string} subnet - The CIDR subnet to check against.
   * @returns {boolean} - True if the remote address is in the subnet, otherwise false.
   */
  const isInSubnet = (remoteAddress, subnet) => {
    return cache[`${remoteAddress}#${subnet}`] ??= ipV4(remoteAddress).isInSubnet(subnet)
  }

  return (remoteAddress, {allowCidr, denyCidr}) => {
    // Check against denied CIDR ranges
    for (const deny of denyCidr) {
      if (isInSubnet(remoteAddress, deny)) {
        return false
      }
    }

    // Check against allowed CIDR ranges
    for (const allow of allowCidr) {
      if (isInSubnet(remoteAddress, allow)) {
        return true
      }
    }

    // If there are no allowed CIDR ranges, allow the address
    return allowCidr.length === 0
  }
})();
