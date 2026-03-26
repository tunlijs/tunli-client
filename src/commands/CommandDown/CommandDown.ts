import {Command} from "#commander/index";
import type {Context} from "#types/types";
import {DaemonClient} from "#daemon/DaemonClient";
export const createCommandDown = (ctx: Context, _program: Command) => {
  return new Command('down')
    .description('Stop all tunnels belonging to the local config profiles')
    .action(async () => {
      if (!ctx.config.local) {
        ctx.logger.error('No local config found. Run `tunli init` to create one.')
        return ctx.exit(1)
      }

      if (!await DaemonClient.isRunning()) {
        ctx.logger.info('No daemon running.')
        return
      }

      const listResult = await new DaemonClient().send({type: 'list'})
      if (listResult.type !== 'list') return ctx.exit(1)

      const localProfileNames = new Set(ctx.config.local.profiles.map(p => p.name))
      const toStop = listResult.tunnels.filter(t => localProfileNames.has(t.profileName))

      if (toStop.length === 0) {
        ctx.logger.info('No active tunnels for this project.')
        return
      }

      for (const tunnel of toStop) {
        const result = await new DaemonClient().send({type: 'stop', profileName: tunnel.profileName})
        if (result.type === 'stopped') {
          ctx.logger.info(`${tunnel.profileName}: stopped`)
        } else if (result.type === 'error') {
          ctx.logger.error(`${tunnel.profileName}: ${result.message}`)
        }
      }
    })
}
