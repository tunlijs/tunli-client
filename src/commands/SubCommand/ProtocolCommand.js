import {Command} from "commander";

import {checkProtocol} from "#src/utils/checkFunctions";
import {deleteOption} from "#commands/Option/DeleteOption";
import {addGetDeleteValueAction} from "#commands/Action/addDelValuesAction";

export const protocolCommand = (configRef) => {
  const cmd = new Command('protocol')

  cmd.description('default protocol "http"')
    .argument('[PROTOCOL]', 'füge eine kurze beschreibung ein', checkProtocol)
    .hook('preAction', (thisCommand, actionCommand) => {
      if (thisCommand.args.length && thisCommand.opts().del) {
        actionCommand.error("error: wenn delete dann keine argumente");
      }
    })
    .addOption(deleteOption())
    .action(addGetDeleteValueAction('protocol', configRef))

  return cmd
}
