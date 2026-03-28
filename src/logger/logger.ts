import {appendFileSync} from 'fs'
import {join} from "path";
import {GLOBAL_CONFIG_DIR} from "../lib/defs.js";

const log = (type: string, message: string) => {
  const now = new Date()
  const filename = `log-${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}_${String(now.getDate()).padStart(2, '0')}.log`
  const file = join(GLOBAL_CONFIG_DIR, filename)
  const line = `[${now.toISOString()}] [${type.toUpperCase()}] ${message}\n`
  try {
    appendFileSync(file, line, 'utf-8')
  } catch {
    // silently ignore — log dir may not exist yet
  }
}
export const logInfo = (message: string) => {
  log('info', message)
}
export const logWarning = (message: string) => {
  log('warning', message)
}
export const logError = (message: string) => {
  log('error', message)
}
export const logDebug = (message: string) => {
  log('debug', message)
}

export const logVerbose = (message: string) => {
  log('verbose', message)
}

export const logException = (e: unknown) => {
  const message = e instanceof Error ? e.message : String(e)
  log('error', message)
  if (e instanceof Error && e.stack) log('error', e.stack)
}
