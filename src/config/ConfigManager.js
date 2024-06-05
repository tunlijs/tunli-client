import {resolve} from "path";
import {CONFIG_DIR_NAME, CONFIG_FILENAME, GLOBAL_CONFIG_DIR} from "#lib/defs";
import {readJsonFile, searchDirInDirectoryTree} from "#src/core/FS/utils";
import {existsSync} from "fs";

import {GlobalConfig} from "#src/config/GlobalConfig";
import {SystemConfig} from "#src/config/SystemConfig";
import {LocalConfig} from "#src/config/LocalConfig";

const LOCAL_CONFIG_DIR = resolve(process.cwd(), CONFIG_DIR_NAME)
export const WORKDIR_CONFIG_DIR = resolve(process.cwd(), CONFIG_DIR_NAME)

const searchConfigInDirectoryTree = () => {
  return searchDirInDirectoryTree(CONFIG_DIR_NAME, undefined, [GLOBAL_CONFIG_DIR])
}

export class ConfigManager {

  static loadLocalOnly(profile = 'default', searchInDirectoryTree = true) {
    profile = normalizeAlias(profile)

    let configDirectory
    if (searchInDirectoryTree) {
      configDirectory = searchConfigInDirectoryTree() ?? LOCAL_CONFIG_DIR
    } else {
      configDirectory = LOCAL_CONFIG_DIR
    }

    const configFilePath = resolve(configDirectory, CONFIG_FILENAME);
    const data = existsSync(configFilePath) ? readJsonFile(configFilePath) : {}

    return new LocalConfig(data, configFilePath).use(profile)
  }

  static loadLocalWithGlobal(profile = 'default') {
    profile = normalizeAlias(profile)

    const globalConfig = ConfigManager.loadGlobalOnly()
    const configDirectory = searchConfigInDirectoryTree() ?? LOCAL_CONFIG_DIR

    const configFilePath = resolve(configDirectory, CONFIG_FILENAME);
    const data = existsSync(configFilePath) ? readJsonFile(configFilePath) : {}

    return new LocalConfig(data, configFilePath, globalConfig).use(profile)
  }

  static loadSystem() {
    const configDirectory = GLOBAL_CONFIG_DIR

    const configFilePath = resolve(configDirectory, CONFIG_FILENAME);
    const data = existsSync(configFilePath) ? readJsonFile(configFilePath) : {}

    return new SystemConfig(data)
  }

  static loadGlobalOnly(profile = 'default') {
    profile = normalizeAlias(profile)

    const configDirectory = GLOBAL_CONFIG_DIR

    const configFilePath = resolve(configDirectory, CONFIG_FILENAME);
    const data = existsSync(configFilePath) ? readJsonFile(configFilePath) : {}

    return new GlobalConfig(data).use(profile)
  }
}

const normalizeAlias = (alias) => {
  if (isAlias(alias)) {
    alias = alias.toString().substring(1)
  }
  return alias.toLowerCase()
}

const isAlias = (alias) => {
  return typeof alias === 'string' && alias.startsWith('@')
}
