import {ConfigManager} from "#src/config/ConfigManager";

/**
 * @template T
 * @param {T} command
 * @param {Ref} [configRef]
 * @param {boolean} strictMode
 * @returns {T}
 */
export const selectConfigOption = (command, configRef, strictMode = false) => {

  command.option('--global', 'Use the global configuration file (default)')
    .option('--local, --workdir', 'Use the configuration file for the current working directory')
    .option('-p --alias <string>', 'setting alias name', 'default')

  if (configRef) {
    command.hook('preAction', (thisCommand, actionCommand) => {

      let {alias, workdir, global} = thisCommand.opts()

      if (strictMode) {
        if (global) {
          workdir = false
        }
        if (workdir) {
          global = false
        }
        global ??= true
        workdir ??= false
      } else {
        if (workdir) {
          global ??= false
        }
        if (global) {
          workdir ??= false
        }
        global ??= true
        workdir ??= true
      }

      if (global && workdir) {
        configRef.value = ConfigManager.loadCombined(alias)
      } else if (global) {
        configRef.value = ConfigManager.loadGlobalOnly(alias)
      } else {
        configRef.value = ConfigManager.loadLocalOnly(alias, !strictMode)
      }
    })
  }

  return command
}
