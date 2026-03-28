import {Command, Option} from '#commander/index'
import type {Context} from '#types/types'
import {getAvailableUpdate} from '#cli-app/versionCheck'
import {downloadBinaryUpdate} from '#lib/Flow/downloadBinaryUpdate'
import {applyBinary, dumpAndStopDaemon} from '#lib/Flow/applyUpdate'
import {readPackageJson} from '#package-json/packageJson'
import {daemonClient} from '#daemon/DaemonClient'
import {confirm} from '#commands/utils'

export const createCommandUpdate = (ctx: Context, _program: Command) => {
  type Options = { restart?: boolean; noRestart?: boolean }

  return new Command('update')
    .description('Update tunli to the latest version')
    .addOption(new Option('restart', 'Restart the daemon after update without prompting'))
    .addOption(new Option('no-restart', 'Skip daemon restart after update without prompting'))
    .action(async ({options}) => {
      const opt = options as Options
      const packageJson = readPackageJson()
      if (!packageJson) {
        ctx.logger.error('Could not read package.json')
        return ctx.exit(1)
      }

      if (opt.restart && opt.noRestart) {
        ctx.logger.error('--restart and --no-restart are mutually exclusive')
        return ctx.exit(1)
      }

      const latest = await getAvailableUpdate(packageJson.version)
      if (!latest) {
        ctx.logger.info(`Already on the latest version (${packageJson.version})`)
        return
      }

      const daemonWasRunning = await daemonClient().isRunning()

      ctx.logger.info(`Updating to ${latest}...`)

      await new Promise<void>((resolve, reject) => {
        downloadBinaryUpdate((result) => {
          if (result.status === 'progress') {
            ctx.logger.info(result.message)
          } else if (result.status === 'success') {
            resolve()
          } else {
            reject(new Error(result.reason))
          }
        })
      })

      applyBinary()
      ctx.logger.info(`Updated to ${latest}.`)

      if (!daemonWasRunning) return

      let doRestart: boolean
      if (opt.restart) {
        doRestart = true
      } else if (opt.noRestart) {
        doRestart = false
      } else {
        doRestart = await confirm('Restart daemon now to apply the update? [y/N] ')
      }

      if (!doRestart) {
        ctx.logger.info('Daemon restart skipped. Run `tunli daemon restart` to apply.')
        return
      }

      await dumpAndStopDaemon()
      await daemonClient().start()
      ctx.logger.info('Daemon restarted.')
    })
}
