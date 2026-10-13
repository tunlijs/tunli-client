import {dirnameFromMeta, readJsonFile, searchFileInDirectoryTree} from "#core/FS/utils";
import {isSea} from 'node:sea'

declare const __APP_VERSION__: string | undefined

export type PackageJson = {
  version: string
  name: string
}

export const readPackageJson = (): PackageJson | undefined => {
  if (isSea()) {
    // injected by esbuild --define; guarded so a missing define can't crash the binary at startup
    return {name: 'tunli', version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown'}
  }
  const jsonPath = searchFileInDirectoryTree('package.json', dirnameFromMeta(import.meta))
  if (!jsonPath) return
  return readJsonFile(jsonPath) as PackageJson
}
