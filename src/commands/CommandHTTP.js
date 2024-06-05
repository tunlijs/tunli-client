import {Command} from "commander";
// import {renewProxyUrlRegistration, requestNewProxyUrl} from "#lib/Service/ProxyUrl";
import {checkHost, checkPort} from "#src/utils/checkFunctions";
import {isSharedArg, sharedArg} from "#commands/helper/SharedArg";
import {addExample, validateArrayArguments, validateIpV4} from "#commands/utils";
import {bindArgs} from "#commands/helper/BindArgs";
import {ref} from "#src/core/Ref";
import {selectConfigOption} from "#commands/Option/SelectConfigOption";
import {TunnelClient} from "#src/tunnel-client/TunnelClient";
import {initDashboard} from "#src/cli-app/Dashboard";


/**
 * @param {Ref} configRef
 * @returns {(function(*, *): void)|*}
 */
const exec = (configRef) => {

  return async (port, host, options) => {

    /** @type {ConfTunnelRequest.jsigAbstract} */
    const config = configRef.value

    if (isSharedArg(port)) {
      host ??= port.value.host ?? port.value.url?.host
      port = port.value.port ?? port.value.url?.port
      options.port ??= port
      options.host ??= host
    }

    options.port ??= port
    options.host ??= host

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
    const finalOptions = {
      port: options.port ?? config.port,
      host: options.host ?? config.host,
      authToken: config.authToken,
      server: config.proxyURL,
      path: undefined
    }

    const client = new TunnelClient(finalOptions)
    const dashboard = initDashboard(client, finalOptions)
    await client.init(dashboard)
  }
}
/**
 * @param {Command} program
 */
export const createCommandHTTP = (program) => {

  const configRef = ref()
  const cmd = new Command('http')

  selectConfigOption(cmd, configRef)
  // validateAuthToken(cmd, configRef)

  cmd.hook('preAction', async () => {

    /** @type {LocalConfig|GlobalConfig} */
    const config = configRef.value

    if (config.proxyURL) {
      // config.proxyURL = await renewProxyUrlRegistration(config.proxyURL, config.authToken)
    }

    if (!config.proxyURL) {
      console.log('MISS')
      process.exit()
      config.proxyURL = await requestNewProxyUrl(config.authToken)
      configRef.value = config.save()
    }
  })

  const sharedArgument = sharedArg({})
  cmd.argument('[PORT]', 'port welcher durch den proxy erreichbar sein soll (default: "80")', bindArgs(checkPort, sharedArgument, true))
  cmd.argument('[HOST]', 'host welcher durch den proxy erreichbar sein soll (default: "localhost"/"config.value")', bindArgs(checkHost, sharedArgument, true))

  cmd.option('--host <string>', 'setting hostname', bindArgs(checkHost, sharedArgument, false))
  cmd.option('--port <string>', 'setting port', bindArgs(checkPort, sharedArgument, false))
  cmd.option('--allow-cidr <string>', 'allow-cidr', validateArrayArguments(validateIpV4))
  cmd.option('--deny-cidr <string>', 'deny-cidr', validateArrayArguments(validateIpV4))

  cmd.option('--save [alias]', 'save current settings as alias/local')
  cmd.action(exec(configRef))

  addExample('http localhost:80', 'HTTP Forward to localhost:80')
  addExample('', 'Forward to port from default config, host from default config')
  // extendUsage(program, cmd)
  // .option('-o, --origin <string>', 'change request origin')

  return cmd
}
