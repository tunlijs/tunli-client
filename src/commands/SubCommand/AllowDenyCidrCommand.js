import {Command} from "commander";
import {addDelValuesAction} from "#commands/Action/addDelValuesAction";
import {validateArrayArguments, validateIpV4} from "#commands/utils";

/**
 * @param {string} commandName
 * @param {Command} configCommand
 * @param {Ref} configRef
 * @returns {Command}
 */
export const allowDenyCidrCommand = (commandName, configCommand, configRef) => {
  const cmd = new Command(commandName)

  cmd
    .argument('[values...]', 'config value', validateArrayArguments(validateIpV4))
    .option('-d --del [ip-address]', 'del values', validateArrayArguments(validateIpV4))
    .option('-a --add [ip-address]', 'add values', validateArrayArguments(validateIpV4))
    .action(addDelValuesAction(commandName, configRef))
    .hook('preAction', (thisCommand, actionCommand) => {
      const {del, add} = actionCommand.opts()

      if (!actionCommand.args.length && !del && !add) {
        // actionCommand.error("error: --add, --del oder values, einer muss mindestens gesetzt sein");
      }
    })

  return cmd
}
