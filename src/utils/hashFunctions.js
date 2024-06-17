import {createHash} from 'crypto'

/**
 * @param {string|Object<toString>} value
 * @return {string}
 */
export const md5 = (value) => {
  return createHash('md5').update(value.toString()).digest('hex')
}
