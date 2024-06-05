import {Command} from "commander";
import {addExample, extendUsage} from "#commands/utils";
import {ConfigManager} from "#src/config/ConfigManager";

/**
 * @returns {(function(): void)|*}
 */
const exec = () => {

  return async (token) => {
    const config = ConfigManager.loadSystem()
    config.authToken = token
    config.save()
    console.log('Done.')
  }
}

/**
 *
 * @param {Command} program
 */
export const createCommandAuth = (program) => {

  const cmd = new Command('auth')
    .argument('<token>', 'auth token')
    .action(exec())

  extendUsage(program, cmd)
  addExample('auth <TOKEN>', 'register this client with given token')
  return cmd

}
