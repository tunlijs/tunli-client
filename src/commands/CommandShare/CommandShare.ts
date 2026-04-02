import {Argument, Command} from '#commander/index'
import type {Context} from '#types/types'
import {ensureIdentity, encodePublicKey, fingerprint} from '#identity/identity'
import {createShareHost} from '#share/ShareHost'
import {CLIENT_VERSION, DEFAULT_SERVER_NAME} from '#lib/defs'
import {isVersionCompatible} from '#utils/versionFunctions'
import {ERROR_MESSAGES} from '#lib/errorMessages'

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
      ctx.stdErr(ERROR_MESSAGES.NOT_REGISTERED)
      return ctx.exit(1)
    }

    const serverConfig = {url: serverConf.url, authToken: serverConf.authToken}
    const apiClient = ctx.apiClient.withServer(serverConfig)

    const connectInfoResult = await apiClient.connectInfo()
    if (connectInfoResult.error) {
      ctx.stdErr(ERROR_MESSAGES.FAILED_TO_REACH_RELAY(connectInfoResult.error.message))
      return ctx.exit(1)
    }

    const {socketUrl, capturePath, minClientVersion} = connectInfoResult.data
    if (minClientVersion && !isVersionCompatible(CLIENT_VERSION, minClientVersion)) {
      ctx.stdErr(ERROR_MESSAGES.VERSION_INCOMPATIBLE(minClientVersion, CLIENT_VERSION))
      return ctx.exit(1)
    }
    const identity = ensureIdentity()
    const pubKey = encodePublicKey(identity.publicKeyRaw)
    const fp = fingerprint(identity.publicKeyRaw)

    ctx.stdOut(`Sharing ${host}:${port}`)
    ctx.stdOut(`Your public key: ${pubKey}`)
    ctx.stdOut(`Fingerprint:     ${fp}`)
    ctx.stdOut(`Share this with the other party:`)
    ctx.stdOut(`  tunli connect ${pubKey}`)
    ctx.stdOut(`Waiting for connections... (Ctrl+C to stop)`)

    const host_ = createShareHost(
      ctx.logger,
      serverConfig,
      socketUrl,
      capturePath,
      identity,
      host,
      port,
      (event) => {
        if (event.type === 'registered') {
          ctx.stdOut('Registered with relay.')
        } else if (event.type === 'client-connected') {
          ctx.stdOut(`Client connected:  ${event.publicKey}`)
        } else if (event.type === 'client-disconnected') {
          ctx.stdOut(`Client disconnected: ${event.publicKey}`)
        } else if (event.type === 'error') {
          ctx.stdErr(`Share error: ${event.message}`)
        }
      },
    )

    process.on('SIGINT', () => { host_.disconnect(); process.exit(0) })
    process.on('SIGTERM', () => { host_.disconnect(); process.exit(0) })
  })

  return cmd
}
