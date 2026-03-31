import {Argument, Command} from "#commander/index";
import type {Context} from "#types/types";
import {daemonClient} from "#daemon/DaemonClient";

export const createCommandStop = (ctx: Context, _program: Command) => {
  return new Command('stop')
    .description('Stop one or more running tunnels')
    .addArgument(new Argument('profiles', 'Profile name(s) of the tunnel(s) to stop').many())
    .action(async ({args}) => {
      const profiles = args.profiles as string[]
      if (!await daemonClient().isRunning()) {
        ctx.stdOut('No daemon running.')
        return
      }
      for (const profile of profiles) {
        const result = await daemonClient().send({type: 'stop', profileName: profile})
        if (result.type === 'stopped') {
          ctx.stdOut(`Tunnel "${profile}" stopped.`)
        } else if (result.type === 'error') {
          ctx.stdErr(result.message)
        } else {
          ctx.stdErr('Unexpected response from daemon.')
        }
      }
    })
}
