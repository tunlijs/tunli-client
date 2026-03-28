import {Argument, Command} from "#commander/index";
import type {Context} from "#types/types";
import {attachTunnel, daemonClient} from "#daemon/DaemonClient";
import {AppEventEmitter} from "#cli-app/AppEventEmitter";
import {initLiveLog} from "#cli-app/LiveLog";

export const createCommandLogs = (ctx: Context, _program: Command) => {
  return new Command('logs')
    .alias('log')
    .description('Attach to a running tunnel and stream live log output')
    .addArgument(new Argument('profile', 'Profile name to attach to'))
    .action(async ({args}) => {
      if (!await daemonClient().isRunning()) {
        ctx.logger.error('No daemon running. Start a tunnel first with `tunli http <port>`.')
        return ctx.exit(1)
      }

      const listResult = await daemonClient().send({type: 'list'})
      if (listResult.type !== 'list') return ctx.exit(1)

      const profileName = (args.profile as string | undefined) ?? listResult.tunnels[0]?.profileName
      if (!profileName) {
        ctx.logger.error('No active tunnels.')
        return ctx.exit(1)
      }

      const appEmitter = new AppEventEmitter()

      const status = await attachTunnel(profileName, appEmitter).promise.catch((e: Error) => {
        ctx.logger.error(e.message)
        ctx.exit(1)
      })

      if (status?.status === 'connected') appEmitter.emit('connect')
      initLiveLog(undefined as never, appEmitter)
    })
}
