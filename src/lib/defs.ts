import {relative, resolve} from "path";
import {homedir} from "os";
import {existsSync} from "fs";

export const PING_INTERVAL = 5000

export const CHECK_FOR_UPDATES = true

export const DEFAULT_API_SERVER_URL = 'https://api.tunli.app'

export const RELEASE_DOWNLOAD_BASE_URL = 'https://github.com/tunlijs/tunli-client/releases/latest/download'

export const CONFIG_DIR_NAME = '.tunli'

export const GLOBAL_CONFIG_DIR = resolve(homedir(), CONFIG_DIR_NAME);

export const GLOBAL_CONFIG_FILEPATH = resolve(GLOBAL_CONFIG_DIR, `config.json`)

export const LOCAL_CONFIG_FILEPATH = resolve(process.cwd(), CONFIG_DIR_NAME, `config.json`)

export const DEFAULT_SERVER_NAME = 'tunli.app'
export const DEFAULT_PROFILE_NAME = 'default'

export const LOCAL_CONFIG_LOOKUP_FILES = (() => {
  const localLookups: string[] = []
  const localLookupDirParts = process.cwd().split('/')
  const home = homedir()

  do {
    const lookupDir = resolve(localLookupDirParts.length === 1 ? '/' : localLookupDirParts.join('/'))
    const rel = relative(home, lookupDir)
    if (rel.startsWith('..') || !rel) break
    localLookups.push(resolve(lookupDir, CONFIG_DIR_NAME, `config.json`))
  } while (localLookupDirParts.pop() !== undefined && localLookupDirParts.length)

  return localLookups
})();

export const FOUND_LOCAL_CONFIG_FILEPATH = LOCAL_CONFIG_LOOKUP_FILES.find(file => existsSync(file))

export const DAEMON_SOCKET_PATH = resolve(GLOBAL_CONFIG_DIR, 'daemon.sock')

export const TUNLI_BIN_DIR = resolve(GLOBAL_CONFIG_DIR, 'bin')
export const TUNLI_BIN_PATH = resolve(TUNLI_BIN_DIR, 'tunli-main')
export const TUNLI_BIN_NEW_PATH = resolve(TUNLI_BIN_DIR, 'tunli-main.update')
export const RESTART_DUMP_FILEPATH = resolve(GLOBAL_CONFIG_DIR, 'dump.json')

export const IDENTITY_KEY_PATH = resolve(GLOBAL_CONFIG_DIR, 'identity.key')
export const IDENTITY_PUB_PATH = resolve(GLOBAL_CONFIG_DIR, 'identity.pub')
