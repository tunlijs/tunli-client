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
      ctx.stdErr('Invalid public key. Expected format: tunli1...')
      return ctx.exit(1)
    }

    const serverName = ctx.config.global.activeServer ?? DEFAULT_SERVER_NAME
    const serverConf = ctx.config.global.server(serverName)

    if (!serverConf.exists() || !serverConf.authToken || !serverConf.url) {
      ctx.stdErr('Not registered. Run `tunli register` first.')
      return ctx.exit(1)
    }

    const serverConfig = {url: serverConf.url, authToken: serverConf.authToken}
    const apiClient = ctx.apiClient.withServer(serverConfig)

    const connectInfoResult = await apiClient.connectInfo()
    if (connectInfoResult.error) {
      ctx.stdErr(`Failed to reach relay: ${connectInfoResult.error.message}`)
      return ctx.exit(1)
    }

    const {socketUrl, capturePath} = connectInfoResult.data

    const identity = ensureIdentity()

    ctx.stdOut(`Connecting to share ${targetPublicKey}...`)

    const client = createShareClient(
      ctx.logger,
      serverConfig,
      socketUrl,
      capturePath,
      identity,
      targetPublicKey,
      localPort,
      (event) => {
        if (event.type === 'connected') {
          ctx.stdOut(`Connected. Service available at localhost:${event.localPort}`)
          ctx.stdOut(`For SSH: ssh -p ${event.localPort} user@localhost`)
        } else if (event.type === 'error') {
          ctx.stdErr(`Connection failed: ${event.message}`)
          ctx.exit(1)
        } else if (event.type === 'disconnected') {
          ctx.stdOut('Share host disconnected.')
        }
      },
    )

    process.on('SIGINT', () => {
      client.disconnect();
      ctx.exit(0)
    })
    process.on('SIGTERM', () => {
      client.disconnect();
      ctx.exit(0)
    })
  })

  return cmd
}
