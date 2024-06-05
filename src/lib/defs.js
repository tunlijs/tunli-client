import {resolve} from "path";
import {homedir} from "os";

export const SERVER_HOST = 'tunli.app'
export const CONFIG_DIR_NAME = '.tunli'

export const AUTH_SERVER_URL = 'https://api.tunli.app'

export const GLOBAL_CONFIG_DIR = resolve(homedir(), CONFIG_DIR_NAME);
export const CONFIG_FILENAME = 'default.json'
