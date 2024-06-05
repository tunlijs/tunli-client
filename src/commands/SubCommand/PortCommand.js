import {Command} from "commander";
import {checkPort} from "#src/utils/checkFunctions";
import {addGetDeleteValueAction} from "#commands/Action/addDelValuesAction";
import {deleteOption} from "#commands/Option/DeleteOption";

export const portCommand = (configRef) => {
  const cmd = new Command('port')
  cmd.description('default forweard port (80)')
    .argument('[PORT]', 'set port for config', checkPort)
    .action(addGetDeleteValueAction('port', configRef))
    .addOption(deleteOption())

  return cmd
}

//
// if (!config.isPublic(configKey)) {
//   console.error('Ungültiger Konfigurationsdirektive')
//   process.exit()
// }
