import {existsSync, lstatSync, mkdirSync, readFileSync} from "fs";
import {dirname, join, parse} from "path";
import {fileURLToPath} from "url";
import * as fs from "node:fs";

export const ensureDirectoryExists = (directory: string) => {
  if (!existsSync(directory)) {
    mkdirSync(directory)
  }
}

export const searchDirInDirectoryTree = (dirnameToSearch: string, dir = process.cwd(), excludeDirectories: string[] = []) => {

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
export const searchFileInDirectoryTree = (
  filenameToSearch: string,
  dir = process.cwd(),
  excludeDirectories: string[] = []
) => {

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

export const readJsonFile = (configFilePath: string): Record<string, unknown> => {
  try {
    return JSON.parse(readFileSync(configFilePath, 'utf8'))
  } catch {
    return {}
  }
}

export const dirnameFromMeta = (importMeta: { url: string }) => {
  return dirname(filenameFromMeta(importMeta));
}
export const filenameFromMeta = (importMeta: { url: string }) => {
  return fileURLToPath(importMeta.url);
}

export const removeFile = (file: string) => {
  fs.rmSync(file)
}
