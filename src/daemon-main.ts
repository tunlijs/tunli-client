import {readJsonFile} from '#core/FS/utils'
import {GLOBAL_CONFIG_FILEPATH} from '#lib/defs'
import {ParsedGlobalConfig} from '#config/ParsedGlobalConfig'
import {DaemonServer} from '#daemon/DaemonServer'
import {createComputedLogger} from "./logger/ComputedLogger.js";

const globalConf = new ParsedGlobalConfig(readJsonFile(GLOBAL_CONFIG_FILEPATH), GLOBAL_CONFIG_FILEPATH)
const logger = createComputedLogger(globalConf)
const server = new DaemonServer(globalConf, logger)

await server.listen()
