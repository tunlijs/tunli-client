import {existsSync, lstatSync, mkdirSync, readFileSync} from "fs";
import {dirname, join, parse} from "path";
import {fileURLToPath} from "url";

export const ensureDirectoryExists = (directory) => {
  if (!existsSync(directory)) {
    mkdirSync(directory)
  }
}

export const searchDirInDirectoryTree = (dirnameToSearch, dir = process.cwd(), excludeDirectories = []) => {

  dir ??= process.cwd()

  while (dir !== parse(dir).root) {
    const configPath = join(dir, dirnameToSearch);

    dir = dirname(dir);

    if (excludeDirectories.includes(configPath)) {
      continue
    }

    if (existsSync(configPath) && lstatSync(configPath).isDirectory()) {
      return configPath
    }
  }

  return null;
}
export const searchFileInDirectoryTree = (filenameToSearch, dir = process.cwd(), excludeDirectories = []) => {

  dir ??= process.cwd()

  while (dir !== parse(dir).root) {
    const configPath = join(dir, filenameToSearch);
    dir = dirname(dir);

    if (excludeDirectories.includes(configPath)) {
      continue
    }

    if (existsSync(configPath) && lstatSync(configPath).isFile()) {
      return configPath
    }
  }

  return null;
}

export const readJsonFile = (configFilePath) => {
  return JSON.parse(readFileSync(configFilePath, 'utf8'))
}

export const dirnameFromMeta = (importMeta) => {
  return dirname(filenameFromMeta(importMeta));
}
export const filenameFromMeta = (importMeta) => {
  return fileURLToPath(importMeta.url);
}
