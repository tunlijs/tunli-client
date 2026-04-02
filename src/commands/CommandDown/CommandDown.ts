import {Command} from "#commander/index";
import type {Context} from "#types/types";
import {daemonClient} from "#daemon/DaemonClient";
import {ERROR_MESSAGES} from "#lib/errorMessages";

export const createCommandDown = (ctx: Context, _program: Command) => {
  return new Command('down')
    .description('Stop all tunnels belonging to the local config profiles')
    .action(async () => {
      if (!ctx.config.local) {
        ctx.stdErr(ERROR_MESSAGES.NO_LOCAL_CONFIG)
        return ctx.exit(1)
      }

      if (!await daemonClient().isRunning()) {
        ctx.stdOut(ERROR_MESSAGES.NO_DAEMON_RUNNING)
        return
      }

      const listResult = await daemonClient().send({type: 'list'})
      if (listResult.type !== 'list') return ctx.exit(1)

      const localProfileNames = new Set(ctx.config.local.profiles.map(p => p.name))
      const toStop = listResult.tunnels.filter(t => localProfileNames.has(t.profileName))

      if (toStop.length === 0) {
        ctx.stdOut('No active tunnels for this project.')
        return
      }

      for (const tunnel of toStop) {
        const result = await daemonClient().send({type: 'stop', profileName: tunnel.profileName})
        if (result.type === 'stopped') {
          ctx.stdOut(`${tunnel.profileName}: stopped`)
        } else if (result.type === 'error') {
          ctx.stdErr(`${tunnel.profileName}: ${result.message}`)
        }
      }
    })
}
