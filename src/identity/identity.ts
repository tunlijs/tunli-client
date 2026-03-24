import {createHash, generateKeyPairSync} from 'node:crypto'
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {GLOBAL_CONFIG_DIR, IDENTITY_KEY_PATH, IDENTITY_PUB_PATH} from '#lib/defs'

const TUNLI_PREFIX = 'tunli1'

export type Identity = {
  privateKeyPem: string
  publicKeyRaw: Buffer
}

export const encodePublicKey = (publicKeyRaw: Buffer): string =>
  TUNLI_PREFIX + publicKeyRaw.toString('base64url')

export const decodePublicKey = (encoded: string): Buffer => {
  if (!encoded.startsWith(TUNLI_PREFIX)) throw new Error('Invalid tunli public key')
  return Buffer.from(encoded.slice(TUNLI_PREFIX.length), 'base64url')
}

export const fingerprint = (publicKeyRaw: Buffer): string =>
  createHash('sha256').update(publicKeyRaw).digest('hex').slice(0, 8)

const generate = (): Identity => {
  const {privateKey, publicKey} = generateKeyPairSync('ed25519')
  const privateKeyPem = privateKey.export({type: 'pkcs8', format: 'pem'}) as string
  // SPKI DER for Ed25519: 12-byte header + 32-byte raw key
  const publicKeyRaw = (publicKey.export({type: 'spki', format: 'der'}) as Buffer).subarray(-32)
  return {privateKeyPem, publicKeyRaw}
}

export const saveIdentity = (identity: Identity): void => {
  mkdirSync(GLOBAL_CONFIG_DIR, {recursive: true})
  writeFileSync(IDENTITY_KEY_PATH, identity.privateKeyPem, {encoding: 'utf-8', mode: 0o600})
  writeFileSync(IDENTITY_PUB_PATH, encodePublicKey(identity.publicKeyRaw), {encoding: 'utf-8'})
}

export const loadIdentity = (): Identity | null => {
  if (!existsSync(IDENTITY_KEY_PATH) || !existsSync(IDENTITY_PUB_PATH)) return null
  const privateKeyPem = readFileSync(IDENTITY_KEY_PATH, 'utf-8')
  const publicKeyRaw = decodePublicKey(readFileSync(IDENTITY_PUB_PATH, 'utf-8').trim())
  return {privateKeyPem, publicKeyRaw}
}

export const ensureIdentity = (): Identity => {
  const existing = loadIdentity()
  if (existing) return existing
  const identity = generate()
  saveIdentity(identity)
  return identity
}
