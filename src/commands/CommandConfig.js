import {Command} from "commander";
import {ref} from "#src/core/Ref";
import {allowDenyCidrCommand} from "#commands/SubCommand/AllowDenyCidrCommand";
import {portCommand} from "#commands/SubCommand/PortCommand";
import {hostCommand} from "#commands/SubCommand/HostCommand";
import {selectConfigOption} from "#commands/Option/SelectConfigOption";
import {addExample, extendUsage} from "#commands/utils";

/**
 *
 * @param {Ref} configRef
 * @param {Command} program
 * @returns {(function(*, *, *): void)|*}
 */
const exec = (configRef, program) => {

  return async (key, value, options) => {

    /** @type {LocalConfig|GlobalConfig} */
    const config = configRef.value

    const maxKeyLength = Math.max(...Object.keys(config.dump()).map(x => x.length))
    console.log('location: ', config.configPath, "\n")
    for (const [k, v] of Object.entries(config.dump())) {
      console.log(k.padEnd(maxKeyLength, ' '), '=', v)
      console.log(''.padEnd(maxKeyLength + 3 + (v?.length ?? 9), '-'))
    }
  }
}
/**
 *
 * @param {Command} program
 */
export const createCommandConfig = (program) => {

  const configRef = ref()

  const cmd = new Command('config')

  cmd.addCommand(allowDenyCidrCommand('allowCidr', cmd, configRef))
  cmd.addCommand(allowDenyCidrCommand('denyCidr', cmd, configRef))
  cmd.addCommand(portCommand(configRef))
  cmd.addCommand(hostCommand(configRef))

  selectConfigOption(cmd, configRef, true)
    .action(exec(configRef, program));

  extendUsage(program, cmd)
  //
  addExample('config host localhost', 'Set the host for the local configuration')
  addExample('config port 80', 'Set the port for the local configuration')
  addExample('config', 'Show the local configuration')
  addExample('config --global', 'Show the global configuration')

  return cmd
}

