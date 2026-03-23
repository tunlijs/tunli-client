import {Command} from "#commander/index";
import type {Context} from "#types/types";
import {DaemonClient} from "#daemon/DaemonClient";
import {dumpAndStopDaemon} from "#lib/Flow/applyUpdate";

export const createCommandDaemon = (ctx: Context, _program: Command) => {
  const cmd = new Command('daemon')
    .description('Manage the tunli background daemon')

  cmd.addCommand(
    new Command('start')
      .description('Start the daemon in the background')
      .action(async () => {
        if (await DaemonClient.isRunning()) {
          ctx.logger.info('Daemon is already running.')
          return
        }
        await DaemonClient.start()
        ctx.logger.info('Daemon started.')
      })
  )

  cmd.addCommand(
    new Command('stop')
      .description('Stop the running daemon')
      .action(async () => {
        if (!await DaemonClient.isRunning()) {
          ctx.logger.info('Daemon is not running.')
          return
        }
        await DaemonClient.stop()
        ctx.logger.info('Daemon stopped.')
      })
  )

  cmd.addCommand(
    new Command('restart')
      .description('Restart the daemon')
      .action(async () => {
        if (await DaemonClient.isRunning()) {
          await DaemonClient.stop()
          ctx.logger.info('Daemon stopped.')
        }
        await DaemonClient.start()
        ctx.logger.info('Daemon started.')
      })
  )

  cmd.addCommand(
    new Command('reload')
      .description('Dump active tunnels, restart daemon and restore them')
      .action(async () => {
        if (!await DaemonClient.isRunning()) {
          ctx.logger.info('Daemon is not running.')
          return
        }
        await dumpAndStopDaemon()
        ctx.logger.info('Daemon stopped.')
        await DaemonClient.start()
        ctx.logger.info('Daemon restarted. Tunnels restored.')
      })
  )

  cmd.addCommand(
    new Command('status')
      .description('Show daemon status')
      .action(async () => {
        const running = await DaemonClient.isRunning()
        ctx.logger.info(running ? 'Daemon is running.' : 'Daemon is not running.')
      })
  )

  return cmd
}
