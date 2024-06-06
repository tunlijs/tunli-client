import {Option} from "commander";
import {ConfigManager} from "#src/config/ConfigManager";

export const profileListOption = () => {
  const option = new Option('-l, --list', 'profile list')
  option.argParser(() => {
    /**
     * @param label
     * @param {ConfigAbstract} config
     * @return {string}
     */
    const createOutput = (label, config) => {
      const profiles = [...config.profiles]
      const maxLabelLength = Math.max(...profiles.map(x => x.length))
      const whitespace = ''.padEnd(2)
      const rows = [`${label}`, '']
      // const rows = [`${label}${profiles.shift()}`]
      const overview = {}
      const proxyURLs = []
      for (const profile of profiles) {

        const info = config.use(profile)
        const host = info.host
        const port = info.port
        const protocol = info.protocol
        let proxyURL = info.proxyURL

        let targetUrl = new URL(`${protocol}://${host}:${port}`).toString()
        if (proxyURL) {
          proxyURL = proxyURL.substring(0, proxyURL.length - 1)
        }

        targetUrl = targetUrl.substring(0, targetUrl.length - 1)
        proxyURLs.push(proxyURL.length)
        overview[profile] = {
          host,
          port,
          targetUrl,
          proxyURL
        }
      }

      const maxProxyUrlLength = Math.max(...proxyURLs)

      for (const profile of profiles) {
        let {targetUrl, proxyURL} = overview[profile]
        proxyURL = proxyURL.padEnd(maxProxyUrlLength)
        rows.push(`${whitespace}${profile.padEnd(maxLabelLength)}    ${proxyURL} -> ${targetUrl}`)
      }

      return rows.join("\n") + "\n"
    }
    const localConf = ConfigManager.loadLocalOnly()
    const globalConf = ConfigManager.loadGlobalOnly()

    if (localConf.exists()) {
      console.log(createOutput('Alias local config:  ', localConf))
    }
    if (globalConf.exists()) {
      console.log(createOutput('Alias global config:  ', globalConf))
    }
    process.exit()
  })
  return option
}
