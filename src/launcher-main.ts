import {chmodSync, existsSync, mkdirSync, renameSync} from 'node:fs'
import {proxyChildProcess, setCursorVisibility} from './utils/cliFunctions.js'
import {applyUpdate} from './lib/Flow/applyUpdate.js'
import {GLOBAL_CONFIG_FILEPATH, TUNLI_BIN_DIR, TUNLI_BIN_NEW_PATH, TUNLI_BIN_PATH} from './lib/defs.js'
import {downloadBinaryUpdate} from "./lib/Flow/downloadBinaryUpdate.js";
import {ParsedGlobalConfig} from "./config/ParsedGlobalConfig.js";
import {readJsonFile} from "./core/FS/utils.js";
import {createComputedLogger} from "./logger/ComputedLogger.js";

const globalConf = new ParsedGlobalConfig(readJsonFile(GLOBAL_CONFIG_FILEPATH), GLOBAL_CONFIG_FILEPATH)
const logger = createComputedLogger(globalConf)

// On first run: install main binary from launcher binary itself
if (!existsSync(TUNLI_BIN_PATH)) {

  process.stdout.write('prepare first usage...\n')
  logger.debug(`Initial setup: Creating binary directory at ${TUNLI_BIN_DIR}`)
  mkdirSync(TUNLI_BIN_DIR, {recursive: true})

  const downloadSuccess = await downloadBinaryUpdate((res) => {
    switch (res.status) {
      case 'progress':
        process.stdout.write(`\rSetup: ${res.message}`);
        break;
      case 'success':
        process.stdout.write('\nSetup: Download completed successfully.\n');
        logger.debug('Setup: Binary transfer finished.');
        break;
      case 'failed':
        process.stderr.write(`\nSetup: Installation failed. Reason: ${res.reason}\n`);
        logger.debug(`Setup: Failure during download: ${res.reason}`);
        break;
    }
  })

  if (downloadSuccess) {
    logger.debug('Initial setup: Binary downloaded. Moving to destination...')
    renameSync(TUNLI_BIN_NEW_PATH, TUNLI_BIN_PATH)
    chmodSync(TUNLI_BIN_PATH, 0o755)
    logger.debug('Initial setup: Binary installed and permissions set.')
  } else {
    const errorMsg = 'Initial setup: Binary download failed.'
    logger.error(errorMsg)
    process.exit(1)
  }
}

const onBeforeRestart = async () => {
  logger.debug('Lifecycle: Preparing for restart...')

  if (existsSync(TUNLI_BIN_NEW_PATH)) {
    logger.debug('Lifecycle: New update detected. Applying update before restart.')
    await applyUpdate({logger})
  } else {
    logger.debug('Lifecycle: No pending updates found. Performing clean restart.')
  }
}

logger.debug(`Lifecycle: Launching child process: ${TUNLI_BIN_PATH}`);
const exitCode = await proxyChildProcess(logger, TUNLI_BIN_PATH, process.argv.slice(2), {
  sea: true,
  onBeforeRestart,
})

setCursorVisibility(true)
process.exit((exitCode as number | null) ?? 0)
