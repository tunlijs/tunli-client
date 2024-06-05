import {Command} from "commander";
import {selectConfigOption} from "#commands/Option/SelectConfigOption";
import {ref} from "#src/core/Ref";
import {validateAuthToken} from "#lib/Flow/validateAuthToken";
import {requestNewProxyUrl} from "#lib/Flow/proxyUrl";

/**
 * @param {Ref} configRef
 * @returns {(function(*, *): void)|*}
 */
const exec = (configRef) => {
  return async () => {
    /** @type {LocalConfig|GlobalConfig} */
    const config = configRef.value
    config.proxyURL = await requestNewProxyUrl(config.authToken)
    config.save()
    console.log('done')
  }
}
/**
 * @param {Command} program
 */
export const createCommandRefresh = (program) => {

  const configRef = ref()
  const cmd = new Command('refresh')

  selectConfigOption(cmd, configRef)
  validateAuthToken(cmd, configRef)

  cmd.action(exec(configRef))
  // extendUsage(program, cmd)

  return cmd
}
