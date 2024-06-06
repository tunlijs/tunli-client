import {Command} from "commander";
import {checkHost, checkPort} from "#src/utils/checkFunctions";
import {isSharedArg, sharedArg} from "#commands/helper/SharedArg";
import {addExample, validateArrayArguments, validateIpV4} from "#commands/utils";
import {bindArgs} from "#commands/helper/BindArgs";
import {ref} from "#src/core/Ref";
import {selectConfigOption} from "#commands/Option/SelectConfigOption";
import {TunnelClient} from "#src/tunnel-client/TunnelClient";
import {renewProxyUrlRegistration, requestNewProxyUrl} from "#lib/Flow/proxyUrl";
import {getCurrentIp} from "#lib/Flow/getCurrentIp";
import {arrayUnique} from "#src/utils/arrayFunctions";
import {initDashboard} from "#src/cli-app/Dashboard";

/**
 * @callback httpCommandExec
 * @param {number} port
 * @param {string} host
 * @param {tunnelClientOptions} options
 * @returns {Promise<void>}
 */

/**
 * @param {Ref} configRef
 * @returns {httpCommandExec}
 */
const exec = (configRef, cmd, program) => {

  return async (port, host, options) => {

    let protocol

    if (['http', 'https'].includes(cmd.parent.args[0])) {
      protocol = cmd.parent.args[0]
    }

    /** @type {AppConfig} */
    const config = configRef.value

    if (options.self) {
      options.allowCidr ??= []
      options.allowCidr.push(await getCurrentIp())
      options.allowCidr = arrayUnique(options.allowCidr)
    }

    if (config.proxyURL) {
      config.proxyURL = await renewProxyUrlRegistration(config.proxyURL, config.authToken)
    }

    if (!config.proxyURL) {
      config.proxyURL = await requestNewProxyUrl(config.authToken)
      options.save ??= true
    }

    if (isSharedArg(port)) {
      protocol ??= port.value.url?.protocol
      host ??= port.value.host ?? port.value.url?.host
      port = port.value.port ?? port.value.url?.port
      options.port ??= port
      options.host ??= host
    }

    options.port ??= port
    options.host ??= host
    options.protocol ??= protocol ?? 'http'

    const save = options.save
    delete options.save

    if (save && save !== true) {
      config.copyCurrentProfileTo(save).use(save)
    }

    for (const [k, v] of Object.entries(options)) {
      if (v !== undefined) {
        config[k] = v
      }
    }

    if (save) {
      config.save()
    }

    /**
     * @type {tunnelClientOptions}
     */
    const clientOptions = {
      port: options.port ?? config.port,
      host: options.host ?? config.host,
      authToken: config.authToken,
      server: config.proxyURL,
      path: undefined,
      allowCidr: options.allowCidr ?? config.allowCidr,
      denyCidr: options.denyCidr ?? config.denyCidr,
      protocol: options.protocol
    }

    const client = new TunnelClient(clientOptions)
    const dashboard = initDashboard(client, clientOptions, config)
    await client.init(dashboard)
  }
}
/**
 * @param {Command} program
 */
export const createCommandHTTP = (program) => {

  const configRef = ref()
  const cmd = new Command('http')
  cmd.alias('https')

  selectConfigOption(cmd, configRef)
  // validateAuthToken(cmd, configRef)

  const sharedArgument = sharedArg({})
  cmd.argument('[PORT]', 'port welcher durch den proxy erreichbar sein soll (default: "80")', bindArgs(checkPort, sharedArgument, true))
  cmd.argument('[HOST]', 'host welcher durch den proxy erreichbar sein soll (default: "localhost"/"config.value")', bindArgs(checkHost, sharedArgument, true))

  cmd.option('--host <string>', 'setting hostname', bindArgs(checkHost, sharedArgument, false))
  cmd.option('--port <string>', 'setting port', bindArgs(checkPort, sharedArgument, false))
  cmd.option('--allow, --allow-cidr <string>', 'allow-cidr', validateArrayArguments(validateIpV4))
  cmd.option('--deny, --deny-cidr <string>', 'deny-cidr', validateArrayArguments(validateIpV4))
  cmd.option('--allow-self, --self', 'allow self only', false)
  cmd.option('--save [alias]', 'save current settings as alias/local')
  cmd.action(exec(configRef, cmd, program))

  addExample('http localhost:80', 'HTTP Forward to localhost:80')
  addExample('', 'Forward to port from default config, host from default config')
  // extendUsage(program, cmd)
  // .option('-o, --origin <string>', 'change request origin')

  return cmd
}
