import {ConfigManager} from "#src/config/ConfigManager";
import {TunnelClient} from "#src/tunnel-client/TunnelClient";
import {renewProxyUrlRegistration} from "#lib/Flow/proxyUrl";

const prepareOptions = async (options) => {

  options ??= {}
  const localConf = ConfigManager.loadLocalOnly()
  const globalConf = ConfigManager.loadGlobalOnly()

  const authToken = globalConf.authToken

  let preparedOptions = {authToken, ...localConf.dump(), ...options}

  preparedOptions.server = await renewProxyUrlRegistration(preparedOptions.proxyURL, preparedOptions.authToken)
  preparedOptions.denyCidr ??= []
  preparedOptions.allowCidr ??= []

  console.log(preparedOptions)

  return preparedOptions
}

/**
 *
 * @param {tunliProxyOptions} options
 */
export const proxy = async (options) => {

  options = await prepareOptions(options)
  const client = new TunnelClient(options)

  await client.init()
  console.log('INIT')
  return options
}

const tunli = {
  proxy
}

export default tunli
