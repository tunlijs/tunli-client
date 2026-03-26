import {Argument, Command} from "#commander/index";
import type {Context} from "#types/types";
import {DaemonClient} from "#daemon/DaemonClient";

export const createCommandStop = (ctx: Context, _program: Command) => {
  return new Command('stop')
    .description('Stop one or more running tunnels')
    .addArgument(new Argument('profiles', 'Profile name(s) of the tunnel(s) to stop').many())
    .action(async ({args}) => {
      const profiles = args.profiles as string[]
      if (!await DaemonClient.isRunning()) {
        ctx.logger.info('No daemon running.')
        return
      }
      for (const profile of profiles) {
        const result = await new DaemonClient().send({type: 'stop', profileName: profile})
        if (result.type === 'stopped') {
          ctx.logger.info(`Tunnel "${profile}" stopped.`)
        } else if (result.type === 'error') {
          ctx.logger.error(result.message)
        } else {
          ctx.logger.error('Unexpected response from daemon.')
        }
      }
    })
}
