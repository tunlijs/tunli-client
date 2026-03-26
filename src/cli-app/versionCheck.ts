import {getLatestVersion} from '#lib/Flow/getLatestVersion'
import {checkGlobalInstallation, checkLocalInstallation} from '#utils/npmFunctions'
import {downloadBinaryUpdate} from '#lib/Flow/downloadBinaryUpdate'
import {exec} from 'node:child_process'
import {isSea} from 'node:sea'
import type {UpdateResult} from "./types.js";

const isNewer = (remote: string, local: string): boolean => {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number)
  const [rMaj = 0, rMin = 0, rPat = 0] = parse(remote)
  const [lMaj = 0, lMin = 0, lPat = 0] = parse(local)
  if (rMaj !== lMaj) return rMaj > lMaj
  if (rMin !== lMin) return rMin > lMin
  return rPat > lPat
}

export const getAvailableUpdate = async (currentVersion: string): Promise<string | null> => {
  const version = await getLatestVersion().catch(() => null)
  if (!version || !isNewer(version, currentVersion)) return null
  return version
}

export const performUpdate = async (packageName: string, onComplete: (result: UpdateResult) => void): Promise<void> => {
  if (isSea()) {
    await downloadBinaryUpdate(onComplete)
    return
  }

  try {
    const isGlobal = await checkGlobalInstallation(packageName)
    let modifier = ''
    if (isGlobal) {
      modifier = ' -g'
    } else if (!await checkLocalInstallation(packageName)) {
      onComplete({status: 'failed', reason: 'Not installed via npm'})
      return
    }

    const cmd = `npm${modifier} update ${packageName} --registry https://registry.npmjs.org`
    onComplete({status: 'progress', message: 'Updating via npm...'})
    await new Promise<void>((resolve) => {
      exec(cmd, (error, _stdout, stderr) => {
        if (error || stderr) {
          const reason = error?.message ?? stderr
          onComplete({status: 'failed', reason: `npm update failed: ${reason}`.trimEnd()})
        } else {
          onComplete({status: 'success'})
        }
        resolve()
      })
    })
  } catch (e) {
    onComplete({status: 'failed', reason: e instanceof Error ? e.message : String(e)})
  }
}
