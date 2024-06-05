import {concat, createScreen} from "#src/cli-app/helper/utils";
import {dirnameFromMeta, readJsonFile, searchFileInDirectoryTree} from "#src/core/FS/utils";
import {ref} from "#src/core/Ref";
import {trimEnd} from "#src/utils/stringFunctions";
import chalk from "chalk";

/**
 *
 * @param {TunnelClient} client
 * @param {tunnelClientOptions} options
 */
export const initDashboard = (client, options) => {

  const screen = createScreen()
  const packageJson = readJsonFile(searchFileInDirectoryTree('package.json'), dirnameFromMeta(import.meta))
  const connectionStatus = ref(chalk.yellow('offline'))
  const requestCount = ref(0)
  const connectionDetails = ref('')

  screen.row(packageJson.name)
  screen.row('(Ctrl+C to quit)', {
    top: -1,
    right: 0
  })

  screen.row("")

  const infoList = screen.list({minWidth: 0})
  screen.row('HTTP Requests')
  screen.line()

  const accessLog = screen.list({length: 30, reverse: true, minWidth: [undefined, 30]})
  client.on('tunnel-connection-established', () => {
    connectionStatus.value = chalk.bold(chalk.green('online'))
    connectionDetails.value = ''
    screen.render()
  })

  client.on('tunnel-connection-closed', () => {
    connectionStatus.value = chalk.bold(chalk.red('offline'))
    screen.render()
  })

  client.on('tunnel-connection-error', (error) => {
    connectionDetails.value = chalk.bold(chalk.red(` - ${error.message}`))
    screen.render()
  })

  client.on('response', (res, req) => {

    const code = res.statusCode
    let rspMsg = `${res.statusCode} ${res.statusMessage}`
    if (code >= 500) {
      rspMsg = chalk.red(rspMsg)
    } else if (code >= 400) {
      rspMsg = chalk.blueBright(rspMsg)
    } else {
      rspMsg = chalk.green(rspMsg)
    }

    rspMsg = chalk.bold(rspMsg)

    requestCount.value++
    accessLog.row(req.method, req.path, rspMsg)
    screen.render()
  })

  screen.key('C-c', (char, details) => {
    process.exit(0);
  })

  const target = new URL(`http://${options.host}:${options.port}`)

  infoList.row('Tunnel', concat(connectionStatus, connectionDetails))
  infoList.row('Version', packageJson.version)
  infoList.row('Latency', concat(client.latency, 'ms'))
  infoList.row('Forwarding', `${trimEnd(options.server, '/')} -> ${trimEnd(target.toString(), '/')}`)
  infoList.row('Connections', requestCount)

  screen.render();

  return screen
}
