import {Argument, Command} from '#commander/index'
import type {Context} from '#types/types'
import {ensureIdentity, encodePublicKey, fingerprint} from '#identity/identity'
import {createShareHost} from '#share/ShareHost'
import {DEFAULT_SERVER_NAME} from '#lib/defs'

export const createCommandShare = (ctx: Context, _program: Command) => {
  const cmd = new Command('share')
    .description('Share a local port via a private peer-to-peer tunnel')
    .addArgument(new Argument('port', 'Local port to share').required().parse(Number))
    .addArgument(new Argument('host', 'Local host to share (default: localhost)'))

  cmd.action(async ({args}) => {
    const port = args.port as number
    const host = (args.host as string | undefined) ?? 'localhost'

    const serverName = ctx.config.global.activeServer ?? DEFAULT_SERVER_NAME
    const serverConf = ctx.config.global.server(serverName)

    if (!serverConf.exists() || !serverConf.authToken || !serverConf.url) {
      ctx.logger.error('Not registered. Run `tunli register` first.')
      return ctx.exit(1)
    }

    const serverConfig = {url: serverConf.url, authToken: serverConf.authToken}
    const apiClient = ctx.apiClient.withServer(serverConfig)

    const connectInfoResult = await apiClient.connectInfo()
    if (connectInfoResult.error) {
      ctx.logger.error(`Failed to reach relay: ${connectInfoResult.error.message}`)
      return ctx.exit(1)
    }

    const {socketUrl, capturePath} = connectInfoResult.data
    const identity = ensureIdentity()
    const pubKey = encodePublicKey(identity.publicKeyRaw)
    const fp = fingerprint(identity.publicKeyRaw)

    ctx.logger.info(`Sharing ${host}:${port}`)
    ctx.logger.info(`Your public key: ${pubKey}`)
    ctx.logger.info(`Fingerprint:     ${fp}`)
    ctx.logger.info(`Share this with the other party:`)
    ctx.logger.info(`  tunli connect ${pubKey}`)
    ctx.logger.info(`Waiting for connections... (Ctrl+C to stop)`)

    const host_ = createShareHost(
      serverConfig,
      socketUrl,
      capturePath,
      identity,
      host,
      port,
      (event) => {
        if (event.type === 'registered') {
          ctx.logger.info('Registered with relay.')
        } else if (event.type === 'client-connected') {
          ctx.logger.info(`Client connected:  ${event.publicKey}`)
        } else if (event.type === 'client-disconnected') {
          ctx.logger.info(`Client disconnected: ${event.publicKey}`)
        } else if (event.type === 'error') {
          ctx.logger.error(`Share error: ${event.message}`)
        }
      },
    )

    process.on('SIGINT', () => { host_.disconnect(); process.exit(0) })
    process.on('SIGTERM', () => { host_.disconnect(); process.exit(0) })
  })

  return cmd
}
