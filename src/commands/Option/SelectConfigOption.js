import {ConfigManager} from "#src/config/ConfigManager";

/**
 * @template T
 * @param {T} command
 * @param {Ref} [configRef]
 * @param {boolean} strictMode
 * @returns {T}
 */
export const selectConfigOption = (command, configRef, strictMode = false) => {

  command.option('--global', 'globale Konfigurationsdatei verwenden')
    .option('--workdir', 'Konfigurationsdatei pro Arbeitsverzeichnis verwenden (default)')
    .option('-p --alias <string>', 'setting alias name', 'default')

  if (configRef) {
    command.hook('preAction', (thisCommand, actionCommand) => {

      const {alias, global} = thisCommand.opts()

      if (global) {
        configRef.value = ConfigManager.loadGlobalOnly(alias)
      } else if (strictMode) {
        configRef.value = ConfigManager.loadLocalOnly(alias, false)
      } else {
        configRef.value = ConfigManager.loadLocalWithGlobal(alias)
      }
    })
  }

  return command
}
