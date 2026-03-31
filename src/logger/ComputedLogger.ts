import {type LOG_LEVEL, LoggerAbstract} from "./LoggerAbstract.js";
import {GLOBAL_CONFIG_DIR, IS_DEV_ENV} from "#lib/defs";
import type {Logger} from "#types/types";
import type {ParsedGlobalConfig} from "#config/ParsedGlobalConfig";
import {FileLogger} from "./FileLogger.js";
import {StdOutLogger} from "./StdOutLogger.js";

let _fileLogger: Logger
export const fileLogger = () => {
  return _fileLogger
}

export const createComputedLogger = (config: ParsedGlobalConfig): Logger => {
  let level: LOG_LEVEL
  if (process.env.TUNLI_LOG_LEVEL !== undefined && LoggerAbstract.LEVELS[process.env.TUNLI_LOG_LEVEL as LOG_LEVEL] !== undefined) {
    level = process.env.TUNLI_LOG_LEVEL as LOG_LEVEL
  }
  level ??= (IS_DEV_ENV ? 'debug' : config.logLevel)
  _fileLogger = new FileLogger(level, GLOBAL_CONFIG_DIR)

  const fileLogger = new FileLogger(level, GLOBAL_CONFIG_DIR)
  const stdOutLogger = process.stdout.isTTY ? new StdOutLogger(level) : undefined

  return Object.fromEntries((Object.keys(LoggerAbstract.LEVELS) as LOG_LEVEL[]).map((methodName: LOG_LEVEL) => {
    return [methodName, (message: string) => {
      fileLogger[methodName](message)
      stdOutLogger?.[methodName](message)
    }]
  })) as Logger
}
