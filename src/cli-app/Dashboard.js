import {concat, createScreen} from "#src/cli-app/helper/utils";
import {dirnameFromMeta, readJsonFile, searchFileInDirectoryTree} from "#src/core/FS/utils";
import {ref} from "#src/core/Ref";
import {trimEnd} from "#src/utils/stringFunctions";
import chalk from "chalk";
import {getLatestVersion} from "#lib/Flow/getLatestVersion";
import {exec} from 'child_process'
import {checkGlobalInstallation, checkLocalInstallation} from "#src/utils/npmFunctions";

/**
 *
 * @param {TunnelClient} client
 * @param {tunnelClientOptions} options
 * @param {AppConfig} config
 */
export const initDashboard = (client, options, config) => {

  const screen = createScreen()
  const packageJson = readJsonFile(searchFileInDirectoryTree('package.json', dirnameFromMeta(import.meta)))
  const connectionStatus = ref(chalk.yellow('offline'))
  const requestCount = ref(0)
  const connectionDetails = ref('')

  const allowedCidr = options.allowCidr.join(', ')
  const deniedCidr = options.denyCidr.join(', ')

  const blockedCount = ref(0)
  const lastBlockedIp = ref('')
  const availableUpdate = ref('')

  getLatestVersion().then((version) => {
    if (version && version !== packageJson.version) {
      availableUpdate.value = chalk.yellow(`update available (version ${version}, Ctrl-U to update)`)

      screen.onceKey('C-u', async (char, details) => {
        availableUpdate.value = chalk.yellow('Updating...')
        let modifier
        if (await checkGlobalInstallation(packageJson.name)) {
          modifier = ' -g'
        } else if (!await checkLocalInstallation(packageJson.name)) {
          availableUpdate.value = chalk.red('Update failed.')
          return
        }

        const npmUpdateCommand = `npm${modifier} update ${packageJson.name} --registry https://registry.npmjs.org`

        exec(npmUpdateCommand, (error, stdout, stderr) => {
          if (error || stderr) {
            availableUpdate.value = chalk.red('Update failed. Reason 2.')
            return;
          }
          availableUpdate.value = chalk.green('Update done. Please restart tunli.')
        })
      })
    }
  })

  screen.row(packageJson.name)
  screen.row('(Ctrl+C to quit)', {
    top: -1,
    right: 0
  })

  screen.row("")

  const infoList = screen.list({minWidth: 30})

  screen.row('HTTP Requests')
  screen.line()

  const accessLog = screen.list({
    length: 30,
    reverse: true,
    minWidth: [undefined, 30],
    maxWidth: [undefined, screen.width - 35]
  })

  client.on('tunnel-connection-established', () => {
    connectionStatus.value = chalk.bold(chalk.green('online'))
    connectionDetails.value = ''
    screen.render()
  })

  client.on('blocked', ip => {
    blockedCount.value++
    lastBlockedIp.value = ` (${ip})`
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
  infoList.row(chalk.yellow('Update'), availableUpdate).if(() => availableUpdate)
  infoList.row('Profile', config.profile)
  infoList.row('Config', config.configPath)

  if (allowedCidr || deniedCidr) infoList.row('')
  if (allowedCidr) infoList.row('Allowed', allowedCidr)
  if (deniedCidr) infoList.row('Denied', deniedCidr)
  if (allowedCidr || deniedCidr) infoList.row('Blocked', concat(blockedCount, lastBlockedIp))

  infoList.row('')
  infoList.row('Latency', concat(client.latency, 'ms'))
  infoList.row('Forwarding', `${trimEnd(options.server, '/')} -> ${trimEnd(target.toString(), '/')}`)
  infoList.row('Connections', requestCount)

  screen.render();

  return screen
}
