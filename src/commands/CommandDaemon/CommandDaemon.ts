import {Command, Option} from "#commander/index";
import type {Context} from "#types/types";
import {daemonClient} from "#daemon/DaemonClient";
import {dumpAndStopDaemon} from "#lib/Flow/applyUpdate";
import {confirm} from "#commands/utils";
import {ERROR_MESSAGES} from "#lib/errorMessages";

const getTunnelCount = async (): Promise<number> => {
  const result = await daemonClient().send({type: 'list'})
  return result.type === 'list' ? result.tunnels.length : 0
}

export const createCommandDaemon = (ctx: Context, _program: Command) => {
  const cmd = new Command('daemon')
    .description('Manage the tunli background daemon')

  cmd.addCommand(
    new Command('start')
      .description('Start the daemon in the background')
      .action(async () => {
        if (await daemonClient().isRunning()) {
          ctx.stdOut('Daemon is already running.')
          return
        }
        await daemonClient().start()
        ctx.stdOut('Daemon started.')
      })
  )

  cmd.addCommand(
    new Command('stop')
      .description('Stop the running daemon and close all tunnels')
      .addOption(new Option('force', 'Stop without confirmation even if tunnels are active').short('f'))
      .action(async ({options}) => {
        if (!await daemonClient().isRunning()) {
          ctx.stdOut(ERROR_MESSAGES.DAEMON_NOT_RUNNING)
          return
        }
        const count = await getTunnelCount()
        if (count > 0 && !options.force) {
          const yes = await confirm(`${count} tunnel(s) are active and will be closed. Stop anyway? [y/N] `)
          if (!yes) return
        }
        daemonClient().stop()
        ctx.stdOut(count > 0 ? `Daemon stopped. ${count} tunnel(s) closed.` : 'Daemon stopped.')
      })
  )

  // restart = dump + stop + start (tunnels are preserved)
  const restartAction = async () => {
    if (!await daemonClient().isRunning()) {
      ctx.stdOut('Daemon is not running. Starting...')
      await daemonClient().start()
      ctx.stdOut('Daemon started.')
      return
    }
    const count = await getTunnelCount()
    await dumpAndStopDaemon({logger: ctx.logger})
    await daemonClient().start()
    ctx.stdOut(count > 0 ? `Daemon restarted. ${count} tunnel(s) restored.` : 'Daemon restarted.')
  }

  cmd.addCommand(
    new Command('restart')
      .description('Restart the daemon and restore all active tunnels')
      .action(restartAction)
  )

  cmd.addCommand(
    new Command('reload')
      .description('Alias for restart')
      .action(restartAction)
  )

  cmd.addCommand(
    new Command('status')
      .description('Show daemon status')
      .action(async () => {
        if (!await daemonClient().isRunning()) {
          ctx.stdOut(ERROR_MESSAGES.DAEMON_NOT_RUNNING)
          return
        }
        const count = await getTunnelCount()
        ctx.stdOut(count > 0
          ? `Daemon is running. ${count} active tunnel(s).`
          : `Daemon is running. ${ERROR_MESSAGES.NO_ACTIVE_TUNNELS}`
        )
      })
  )

  return cmd
}
