import {searchDirInDirectoryTree} from "#lib/FS/utils";
import {CONFIG_DIR_NAME} from "#lib/defs";

/**
 *
 * @param {Command} program
 * @returns {(function(): void)|*}
 */
const exec = (program) => {

  return async() => {

    let path
    while (null !== (path = searchDirInDirectoryTree(CONFIG_DIR_NAME))) {
      console.log(`remove ${path}`)
      await rm(path, {recursive: true, force: true})
    }
  }
}
/**
 * @param {Command} program
 */
export const addCommandClearAll = (program) => {
  program.command('clear-all')
    .description('Remove all configurations in directory tree including global')
    .action(exec(program))
}
