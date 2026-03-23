import {dirnameFromMeta, readJsonFile, searchFileInDirectoryTree} from "#core/FS/utils";

export type PackageJson = {
  version: string
  name: string
}
export const readPackageJson = (): PackageJson | undefined => {
  const jsonPath = searchFileInDirectoryTree('package.json', dirnameFromMeta(import.meta))

  if (!jsonPath) return
  return readJsonFile(jsonPath) as PackageJson
}
