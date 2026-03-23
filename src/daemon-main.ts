import {readJsonFile} from '#core/FS/utils'
import {GLOBAL_CONFIG_FILEPATH} from '#lib/defs'
import {ParsedGlobalConfig} from '#config/ParsedGlobalConfig'
import {DaemonServer} from '#daemon/DaemonServer'
import {logInfo, logError, logWarning} from '#logger/logger'

const globalConf = new ParsedGlobalConfig(readJsonFile(GLOBAL_CONFIG_FILEPATH), GLOBAL_CONFIG_FILEPATH)

const server = new DaemonServer(globalConf, {
  info:  logInfo,
  error: logError,
  warn:  logWarning,
})

await server.listen()
