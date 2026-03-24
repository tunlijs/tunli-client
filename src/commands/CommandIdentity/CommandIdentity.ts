import {Command, type ParseResult} from '#commander/index'
import type {Context} from '#types/types'
import {ensureIdentity, encodePublicKey, fingerprint} from '#identity/identity'
import {IDENTITY_KEY_PATH, IDENTITY_PUB_PATH} from '#lib/defs'

export const createCommandIdentity = (ctx: Context, _program: Command) => {
  const cmd = new Command('identity')
    .description('Show your tunli identity (public key and fingerprint)')

  cmd.action((_: ParseResult) => {
    const identity = ensureIdentity()
    const pubKey = encodePublicKey(identity.publicKeyRaw)
    const fp = fingerprint(identity.publicKeyRaw)
    ctx.logger.info(`Public key:  ${pubKey}`)
    ctx.logger.info(`Fingerprint: ${fp}`)
    ctx.logger.info(`Key file:    ${IDENTITY_KEY_PATH}`)
    ctx.logger.info(`Pub file:    ${IDENTITY_PUB_PATH}`)
  })

  return cmd
}
