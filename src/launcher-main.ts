import {chmodSync, existsSync, mkdirSync, renameSync} from 'node:fs'
import {proxyChildProcess, setCursorVisibility} from './utils/cliFunctions.js'
import {applyUpdate} from './lib/Flow/applyUpdate.js'
import {TUNLI_BIN_DIR, TUNLI_BIN_NEW_PATH, TUNLI_BIN_PATH} from './lib/defs.js'
import {downloadBinaryUpdate} from "./lib/Flow/downloadBinaryUpdate.js";
import {logDebug} from "./logger/logger.js";

// On first run: install main binary from launcher binary itself
if (!existsSync(TUNLI_BIN_PATH)) {

  process.stdout.write('prepare first usage...\n')
  logDebug(`Initial setup: Creating binary directory at ${TUNLI_BIN_DIR}`)
  mkdirSync(TUNLI_BIN_DIR, {recursive: true})

  const downloadSuccess = await downloadBinaryUpdate((res) => {
    switch (res.status) {
      case 'progress':
        process.stdout.write(`\rSetup: ${res.message}`);
        break;
      case 'success':
        process.stdout.write('\nSetup: Download completed successfully.\n');
        logDebug('Setup: Binary transfer finished.');
        break;
      case 'failed':
        process.stderr.write(`\nSetup: Installation failed. Reason: ${res.reason}\n`);
        logDebug(`Setup: Failure during download: ${res.reason}`);
        break;
    }
  })

  if (downloadSuccess) {
    logDebug('Initial setup: Binary downloaded. Moving to destination...')
    renameSync(TUNLI_BIN_NEW_PATH, TUNLI_BIN_PATH)
    chmodSync(TUNLI_BIN_PATH, 0o755)
    logDebug('Initial setup: Binary installed and permissions set.')
  } else {
    const errorMsg = 'Initial setup: Binary download failed.'
    logDebug(errorMsg)
    console.error(errorMsg)
    process.exit(1)
  }
}

const onBeforeRestart = async () => {
  logDebug('Lifecycle: Preparing for restart...')

  if (existsSync(TUNLI_BIN_NEW_PATH)) {
    logDebug('Lifecycle: New update detected. Applying update before restart.')
    await applyUpdate()
  } else {
    logDebug('Lifecycle: No pending updates found. Performing clean restart.')
  }
}

logDebug(`Lifecycle: Launching child process: ${TUNLI_BIN_PATH}`);
const exitCode = await proxyChildProcess(TUNLI_BIN_PATH, process.argv.slice(2), {
  sea: true,
  onBeforeRestart,
})

setCursorVisibility(true)
process.exit((exitCode as number | null) ?? 0)
