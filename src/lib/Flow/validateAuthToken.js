import {Command} from "commander";
import {Ref} from "#src/core/Ref";


/**
 * @param {Ref} configRef
 * @param {Command} cmd
 */
export const validateAuthToken = (cmd, configRef) => {
  cmd.hook('preAction', (thisCommand, actionCommand) => {

    /** @type {LocalConfig|GlobalConfig} */
    const config = configRef.value

    if (!config.authToken) {
      actionCommand.error("error: Missing authToken. Please run register firstly");
    }
  })
}
