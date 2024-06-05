import {Command} from "commander";

import {checkHost} from "#src/utils/checkFunctions";
import {deleteOption} from "#commands/Option/DeleteOption";
import {addGetDeleteValueAction} from "#commands/Action/addDelValuesAction";

export const hostCommand = (configRef) => {
  const cmd = new Command('host')


  cmd.description('default forweard host (127.0.0.1)')
    .argument('[HOST]', 'füge eine kurze beschreibung ein', checkHost)
    .hook('preAction', (thisCommand, actionCommand) => {
      if (thisCommand.args.length && thisCommand.opts().del) {
        actionCommand.error("error: wenn delete dann keine argumente");
      }
    })
    .addOption(deleteOption())
    .action(addGetDeleteValueAction('host', configRef))

  return cmd
}
