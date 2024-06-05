import {Command} from "commander";
import {httpClient} from "#lib/HttpClient";
import {ConfigManager} from "#src/config/ConfigManager";

/**
 *
 * @returns {(function(): void)|*}
 */
const exec = () => {

  return async (options) => {

    const forceRenew = options.f === true
    const config = ConfigManager.loadSystem()

    if (config.authToken && !forceRenew) {
      console.log(`Auth token exists. use -f to renew: ${config.authToken}`)
      process.exit()
    }

    const {data, error} = await httpClient.get('/register')

    if (error) {
      console.error(error)
      process.exit(1)
    }

    config.authToken = data
    config.save()
    console.log('Done.',config.authToken)
  }
}


/**
 *
 * @param {Command} program
 */
export const createCommandRegister = (program) => {

  const cmd = new Command('register')
    .option('-f', 'fore renew auth token')
    .action(exec())

  return cmd
  // extendUsage(program, cmd)
  // addExample('register', 'register call')
}
