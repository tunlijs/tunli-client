import {renameSync, writeFileSync} from 'node:fs'
import {RESTART_DUMP_FILEPATH, TUNLI_BIN_NEW_PATH, TUNLI_BIN_PATH} from '#lib/defs'
import {DaemonClient} from '#daemon/DaemonClient'
import {logDebug} from "#logger/logger"

export const dumpAndStopDaemon = async (): Promise<void> => {
  if (!await DaemonClient.isRunning()) return

  logDebug('Daemon is active. Requesting tunnel dump...')
  const response = await new DaemonClient().send({type: 'dump'})

  if (response.type === 'dump' && response.tunnels.length > 0) {
    logDebug(`Dump received. Saving ${response.tunnels.length} tunnels to cache.`)
    writeFileSync(RESTART_DUMP_FILEPATH, JSON.stringify(response.tunnels))
  } else {
    logDebug('Dump received, but no active tunnels found.')
  }

  logDebug('Stopping daemon...')
  await DaemonClient.stop()
  logDebug('Daemon stopped successfully.')
}

export const applyBinary = (): void => {
  logDebug(`Replacing binary: ${TUNLI_BIN_NEW_PATH} -> ${TUNLI_BIN_PATH}`)
  try {
    renameSync(TUNLI_BIN_NEW_PATH, TUNLI_BIN_PATH)
    logDebug('Update applied: Binary swapped successfully.')
  } catch (error: any) {
    logDebug(`Update failed during rename: ${error?.message ? error.message : String(error)}`)
    throw error
  }
}

// Used by the launcher on Ctrl+R restart: dump+stop daemon, then swap binary.
// The new process will restore tunnels from the dump on startup.
export const applyUpdate = async (): Promise<void> => {
  logDebug('Update process: Checking daemon status...')
  await dumpAndStopDaemon()
  applyBinary()
}
