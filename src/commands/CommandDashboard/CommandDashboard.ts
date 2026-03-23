import {Argument, Command} from "#commander/index";
import type {Context} from "#types/types";
import {DaemonClient} from "#daemon/DaemonClient";
import {AppEventEmitter} from "#cli-app/AppEventEmitter";
import {initDashboard} from "#cli-app/Dashboard";

export const createCommandDashboard = (ctx: Context, _program: Command) => {
  return new Command('dashboard')
    .description('Attach to a running tunnel and show the live dashboard')
    .addArgument(new Argument('profile', 'Profile name to attach to'))
    .action(async ({args}) => {
      if (!await DaemonClient.isRunning()) {
        ctx.logger.error('No daemon running. Start a tunnel first with `tunli http <port>`.')
        return ctx.exit(1)
      }

      const listResult = await new DaemonClient().send({type: 'list'})
      if (listResult.type !== 'list') return ctx.exit(1)

      const profileName = (args.profile as string | undefined) ?? listResult.tunnels[0]?.profileName
      if (!profileName) {
        ctx.logger.error('No active tunnels.')
        return ctx.exit(1)
      }

      const appEmitter = new AppEventEmitter()

      const attachResult = await DaemonClient.attach(profileName, appEmitter).catch((e: Error) => {
        ctx.logger.error(e.message)
        ctx.exit(1)
      })

      const tunnelInfo = listResult.tunnels.find(t => t.profileName === profileName)
      if (!tunnelInfo) {
        ctx.logger.error(`No tunnel running for profile "${profileName}".`)
        return ctx.exit(1)
      }

      const [host, portStr] = tunnelInfo.target.split(':')
      const mockConfig = {
        profileName,
        filepath: '-',
        allowedCidr: [],
        deniedCidr: [],
        proxy: {proxyIdent: '', proxyURL: tunnelInfo.proxyURL},
        target: {host: host ?? 'localhost', port: Number(portStr ?? 80), protocol: 'http' as const},
        serverConfig: {url: '', authToken: ''},
        apiClient: ctx.apiClient,
      }

      initDashboard(mockConfig, appEmitter)

      if (attachResult?.status === 'connected') appEmitter.emit('connect')
      if (attachResult?.status === 'disconnected') appEmitter.emit('disconnect', 'io client disconnect')
      if (attachResult?.lastLatency !== undefined) appEmitter.emit('latency', attachResult.lastLatency)
      if (attachResult?.requestCount) appEmitter.emit('request-count', attachResult.requestCount)
    })
}
