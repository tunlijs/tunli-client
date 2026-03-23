import {Command} from '#commander/index'
import type {Context} from '#types/types'
import {getAvailableUpdate} from '#cli-app/versionCheck'
import {downloadBinaryUpdate} from '#lib/Flow/downloadBinaryUpdate'
import {applyUpdate} from '#lib/Flow/applyUpdate'
import {readPackageJson} from '#package-json/packageJson'

export const createCommandUpdate = (ctx: Context, _program: Command) => {
  return new Command('update')
    .description('Update tunli to the latest version')
    .action(async () => {
      const packageJson = readPackageJson()
      if (!packageJson) {
        ctx.logger.error('Could not read package.json')
        return ctx.exit(1)
      }

      const latest = await getAvailableUpdate(packageJson.version)
      if (!latest) {
        ctx.logger.info(`Already on the latest version (${packageJson.version})`)
        return
      }

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

      await applyUpdate()
      ctx.logger.info(`Updated to ${latest}. Restart tunli to apply.`)
    })
}
