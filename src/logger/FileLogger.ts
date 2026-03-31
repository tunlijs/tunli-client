import {appendFileSync} from 'fs'
import {join} from "path";
import {GLOBAL_CONFIG_DIR} from "#lib/defs";
import {type LOG_LEVEL, LoggerAbstract} from "./LoggerAbstract.js";

export class FileLogger extends LoggerAbstract {

  constructor(level: LOG_LEVEL = 'info', logDir: string = GLOBAL_CONFIG_DIR) {
    super(level, (line, _type, _message) => {
      const now = new Date()
      const filename = `log-${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}_${String(now.getDate()).padStart(2, '0')}.log`
      const file = join(logDir, filename)
      try {
        appendFileSync(file, line, 'utf-8')
      } catch {
        // silently ignore — log dir may not exist yet
      }
    })
  }
}
