import {Argument, Command, Option} from '#commander/index'
import type {Context} from '#types/types'
import {ensureIdentity} from '#identity/identity'
import {createShareClient} from '#share/ShareClient'
import {DEFAULT_SERVER_NAME} from '#lib/defs'

export const createCommandConnect = (ctx: Context, _program: Command) => {
  const cmd = new Command('connect')
    .description('Connect to a remote share by public key')
    .addArgument(new Argument('pubkey', 'Public key of the share host (tunli1...)').required())
    .addOption(new Option('port', 'Local port to listen on (default: random)').argument('port').parse(Number))

  cmd.action(async ({args, options}) => {
    const targetPublicKey = args.pubkey as string
    const localPort = (options.port as number | undefined) ?? 0

    if (!targetPublicKey.startsWith('tunli1')) {
      ctx.logger.error('Invalid public key. Expected format: tunli1...')
      return ctx.exit(1)
    }

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

    ctx.logger.info(`Connecting to share ${targetPublicKey}...`)

    const client = createShareClient(
      serverConfig,
      socketUrl,
      capturePath,
      identity,
      targetPublicKey,
      localPort,
      (event) => {
        if (event.type === 'connected') {
          ctx.logger.info(`Connected. Service available at localhost:${event.localPort}`)
          ctx.logger.info(`For SSH: ssh -p ${event.localPort} user@localhost`)
        } else if (event.type === 'error') {
          ctx.logger.error(`Connection failed: ${event.message}`)
          process.exit(1)
        } else if (event.type === 'disconnected') {
          ctx.logger.info('Share host disconnected.')
        }
      },
    )

    process.on('SIGINT', () => { client.disconnect(); process.exit(0) })
    process.on('SIGTERM', () => { client.disconnect(); process.exit(0) })
  })

  return cmd
}
