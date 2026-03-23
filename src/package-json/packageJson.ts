import {dirnameFromMeta, readJsonFile, searchFileInDirectoryTree} from "#core/FS/utils";
import {isSea} from 'node:sea'

declare const __APP_VERSION__: string

export type PackageJson = {
  version: string
  name: string
}

export const readPackageJson = (): PackageJson | undefined => {
  if (isSea()) {
    return {name: 'tunli', version: __APP_VERSION__}
  }
  const jsonPath = searchFileInDirectoryTree('package.json', dirnameFromMeta(import.meta))
  if (!jsonPath) return
  return readJsonFile(jsonPath) as PackageJson
}
