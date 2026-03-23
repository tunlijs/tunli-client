import {createHash} from 'crypto'

/**
 * @param value
 */
export const md5 = (value: { toString(): string }) => {
  return createHash('md5').update(value.toString()).digest('hex')
}

export const sha256 = (value: { toString(): string }) => {
  return createHash('sha256').update(value.toString()).digest('hex')
}
