import {type LOG_LEVEL, LoggerAbstract} from "./LoggerAbstract.js";

export class StdOutLogger extends LoggerAbstract {

  constructor(level: LOG_LEVEL) {
    super(level, (line) => {
      process.stdout.write(line)
    })
  }
}
