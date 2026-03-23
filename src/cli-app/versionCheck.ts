import {getLatestVersion} from '#lib/Flow/getLatestVersion'
import {checkGlobalInstallation, checkLocalInstallation} from '#utils/npmFunctions'
import {exec} from 'child_process'
import {logError} from '#logger/logger'

export const getAvailableUpdate = async (currentVersion: string): Promise<string | null> => {
  const version = await getLatestVersion().catch(() => null)
  if (!version || version === currentVersion) return null
  return version
}

export const performUpdate = (packageName: string, onComplete: (success: boolean) => void): void => {
  checkGlobalInstallation(packageName).then(async isGlobal => {
    let modifier = ''
    if (isGlobal) {
      modifier = ' -g'
    } else if (!await checkLocalInstallation(packageName)) {
      onComplete(false)
      return
    }

    const cmd = `npm${modifier} update ${packageName} --registry https://registry.npmjs.org`
    exec(cmd, (error, _stdout, stderr) => {
      if (error || stderr) {
        logError(`Auto-update failed.\nCommand: ${cmd}\n${error ? `Error: ${error.message}\n` : ''}${stderr ? `stderr: ${stderr}` : ''}`.trimEnd())
        onComplete(false)
        return
      }
      onComplete(true)
    })
  }).catch(() => onComplete(false))
}
