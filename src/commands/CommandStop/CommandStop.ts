import {Argument, Command, type ParseResult, type UnknownRecord} from "#commander/index";
import type {Context} from "#types/types";
import {DaemonClient} from "#daemon/DaemonClient";

export const createCommandStop = (ctx: Context, _program: Command) => {
  return new Command('stop')
    .description('Stop a running tunnel')
    .addArgument(new Argument('profile', 'Profile name of the tunnel to stop'))
    .action(async (parseResult: ParseResult<{ profile: string }, UnknownRecord>) => {
      const profile = parseResult.args.profile
      if (!await DaemonClient.isRunning()) {
        ctx.logger.info('No daemon running.')
        return
      }
      const result = await new DaemonClient().send({type: 'stop', profileName: profile})
      if (result.type === 'stopped') {
        ctx.logger.info(`Tunnel "${profile}" stopped.`)
      } else if (result.type === 'error') {
        ctx.logger.error(result.message)
      } else {
        ctx.logger.error('Unexpected response from daemon.')
      }
    })
}
