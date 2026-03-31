import {renameSync, writeFileSync} from 'node:fs'
import {RESTART_DUMP_FILEPATH, TUNLI_BIN_NEW_PATH, TUNLI_BIN_PATH} from '#lib/defs'
import {daemonClient} from '#daemon/DaemonClient'
import type {Logger} from "../../types/types.js";

export const dumpAndStopDaemon = async ({logger}: { logger: Logger }): Promise<void> => {
  if (!await daemonClient().isRunning()) return

  logger.debug('Daemon is active. Requesting tunnel dump...')
  const response = await daemonClient().send({type: 'dump'})

  if (response.type === 'dump' && response.tunnels.length > 0) {
    logger.debug(`Dump received. Saving ${response.tunnels.length} tunnels to cache.`)
    writeFileSync(RESTART_DUMP_FILEPATH, JSON.stringify(response.tunnels))
  } else {
    logger.debug('Dump received, but no active tunnels found.')
  }

  logger.debug('Stopping daemon...')
  await daemonClient().stop()
  logger.debug('Daemon stopped successfully.')
}

export const applyBinary = ({logger}: { logger: Logger }): void => {
  logger.debug(`Replacing binary: ${TUNLI_BIN_NEW_PATH} -> ${TUNLI_BIN_PATH}`)
  try {
    renameSync(TUNLI_BIN_NEW_PATH, TUNLI_BIN_PATH)
    logger.debug('Update applied: Binary swapped successfully.')
  } catch (error: any) {
    logger.debug(`Update failed during rename: ${error?.message ? error.message : String(error)}`)
    throw error
  }
}

// Used by the launcher on Ctrl+R restart: dump+stop daemon, then swap binary.
// The new process will restore tunnels from the dump on startup.
export const applyUpdate = async ({logger}: { logger: Logger }): Promise<void> => {
  logger.debug('Update process: Checking daemon status...')
  await dumpAndStopDaemon({logger})
  applyBinary({logger})
}
