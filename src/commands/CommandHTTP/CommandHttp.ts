import {Argument, Command, Option, type ParseResult} from "#commander/index";
import type {Context, Protocol} from "#types/types";
import {checkPort} from "#utils/checkFunctions";
import {resolveConfig} from "#commands/CommandConfig/utils/resolveConfig";
import {addSharedOptions} from "#commands/CommandConfig/utils/sharedOptions";
import type {SharedOptions} from "#commands/CommandConfig/types";
import {validateProfileConfig} from "#config/validations/validateProfileConfig";
import {DaemonClient} from "#daemon/DaemonClient";
import {AppEventEmitter} from "#cli-app/AppEventEmitter";
import {createProxy} from "#proxy/Proxy";
import {initDashboard} from "#cli-app/Dashboard";
import {initLiveLog} from "#cli-app/LiveLog";

export const createCommandHttp = (ctx: Context, _program: Command, protocol: Protocol = 'http') => {
  const cmd = new Command(protocol)
    .description(`Start a tunnel to a local ${protocol.toUpperCase()} service`)
  addSharedOptions(cmd, 'save')
  cmd.addArgument(new Argument('port', 'Local port to forward (e.g. 3000)').required().parse(checkPort))
  cmd.addArgument(new Argument('host', 'Local host to forward to (default: localhost)'))
  cmd.addOption(new Option('foreground', 'Run tunnel in the foreground (no daemon)').alias('fg'))
  cmd.addOption(new Option('dashboard', 'Show live dashboard (implies --foreground)').alias('db'))
  cmd.addOption(new Option('logs', 'Show live log output (implies --foreground)'))
  cmd.action(async ({args, options}: ParseResult) => {
    const port = args.port as number
    const host = (args.host as string | undefined) ?? 'localhost'
    const opts = options as Omit<SharedOptions, "profile"> & { save: string; foreground: boolean; dashboard: boolean; logs: boolean }

    const config = resolveConfig(ctx, {
      local: opts.local === true,
      global: opts.global === true,
      profile: opts.save
    }, 'save')

    config.update({protocol, host, port})

    const validated = await validateProfileConfig(ctx, config)

    if (opts.save) config.save()

    if (opts.foreground || opts.dashboard || opts.logs) {
      const appEmitter = new AppEventEmitter()
      if (opts.dashboard) initDashboard(validated, appEmitter, [{ profileName: validated.profileName, proxyURL: validated.proxy.proxyURL, target: `${validated.target.host}:${validated.target.port}`, status: 'connecting' }], () => {})
      else if (opts.logs) initLiveLog(validated, appEmitter)
      const proxy = await createProxy(validated, appEmitter)
      process.once('exit', () => proxy.disconnect())
      process.on('SIGINT', () => process.exit(0))
      process.on('SIGTERM', () => process.exit(0))
      return
    }

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

    if (result.type === 'started') {
      const targetUrl = `${validated.target.protocol}://${validated.target.host}:${validated.target.port}`
      const status = result.alreadyRunning ? 'Already running' : '✓ Connected'
      ctx.logger.info(`${status}\n✓ Public URL: ${result.proxyURL}\n✓ Target URL: ${targetUrl}`)
    }
  })
  return cmd
}
