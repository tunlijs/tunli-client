import {Argument, Command, type ParseResult} from "#commander/index";
import type {Context} from "#types/types";
import {checkPort} from "#utils/checkFunctions";
import {resolveConfig} from "#commands/CommandConfig/utils/resolveConfig";
import {addSharedOptions} from "#commands/CommandConfig/utils/sharedOptions";
import type {SharedOptions} from "#commands/CommandConfig/types";
import {validateProfileConfig} from "#config/validations/validateProfileConfig";
import {DaemonClient} from "#daemon/DaemonClient";

export const createCommandHttp = (ctx: Context, _program: Command) => {
  const cmd = new Command('http')
    .description('Start a tunnel to a local HTTP service')
    .alias('https')
  addSharedOptions(cmd, 'save')
  cmd.addArgument(new Argument('port', 'Local port to forward (e.g. 3000)').required().parse(checkPort))
  cmd.addArgument(new Argument('host', 'Local host to forward to (default: localhost)'))
  cmd.action(async ({args, options}: ParseResult) => {
    const port = args.port as number
    const host = (args.host as string | undefined) ?? 'localhost'
    const opts = options as Omit<SharedOptions, "profile"> & { save: string }

    const config = resolveConfig(ctx, {
      local: opts.local === true,
      global: opts.global === true,
      profile: opts.save
    }, 'save')

    config.update({protocol: 'http', host, port})

    const validated = await validateProfileConfig(ctx, config)

    if (opts.save) config.save()

    await DaemonClient.ensureRunning()
    const client = new DaemonClient()
    const result = await client.send({
      type:        'start',
      profileName: validated.profileName,
      proxyIdent:  validated.proxy.proxyIdent,
      proxyURL:    validated.proxy.proxyURL,
      serverUrl:   validated.serverConfig.url,
      authToken:   validated.serverConfig.authToken,
      target:      validated.target,
      filepath:    validated.filepath,
      allowedCidr: validated.allowedCidr,
      deniedCidr:  validated.deniedCidr,
    })

    if (result.type === 'error') {
      ctx.logger.error(result.message)
      return ctx.exit(1)
    }

    if (result.type === 'started') ctx.logger.info(`Tunnel started: ${result.proxyURL}`)
  })
  return cmd
}
