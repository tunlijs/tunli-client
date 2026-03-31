import type {Logger} from "../types/types.js";

export type LOG_LEVEL = "error" | "warn" | "info" | "debug" | "verbose"

export abstract class LoggerAbstract implements Logger {

  static readonly LEVELS: Record<LOG_LEVEL, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    verbose: 4,
  }

  readonly #level: number

  readonly #writeFn: (line: string, type: string, message: string) => void

  protected constructor(level: LOG_LEVEL, writeFn: (line: string, type: string, message: string) => void) {
    this.#writeFn = writeFn
    this.#level = LoggerAbstract.LEVELS[level] ?? 2
  }


  #write(type: string, message: string) {
    const now = new Date()
    const line = `[${now.toISOString()}] [${type.toUpperCase()}] ${message}\n`
    this.#writeFn(line, type, message)
  }

  info(message: string) {
    if (this.#level >= 2) this.#write('info', message)
  }

  warn(message: string) {
    if (this.#level >= 1) this.#write('warning', message)
  }

  error(message: string) {
    this.#write('error', message)
  }

  debug(message: string) {
    if (this.#level >= 3) this.#write('debug', message)
  }

  verbose(message: string) {
    if (this.#level >= 4) this.#write('verbose', message)
  }

  exception(e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    this.#write('error', message)
    if (e instanceof Error && e.stack) this.#write('error', e.stack)
  }
}
