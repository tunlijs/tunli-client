import {Command} from "commander";
import {httpClient, securedHttpClient} from "#lib/HttpClient";
import {addExample, extendUsage} from "#commands/utils";
import {ConfigManager} from "#src/config/ConfigManager";

/**
 *
 * @returns {(function(): void)|*}
 */
const exec = () => {

  return async () => {
    const config = ConfigManager.loadSystem()
    const {data, error} = await securedHttpClient(config.authToken).get('/invite')

    if (error) {
      console.error(error)
      process.exit(1)
    }

    console.log('Done.', data)
  }
}

/**
 *
 * @param {Command} program
 */
export const createCommandInvite = (program) => {

  const cmd = new Command('invite')
    .action(exec())

  extendUsage(program, cmd)
  addExample('invite', 'create sharable registration token')
  return cmd

}
