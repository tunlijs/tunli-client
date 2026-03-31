import {Command, InvalidArgumentError, Option, type ParseResult} from "#commander/index";
import type {Context} from "#types/types";
import {FOUND_LOCAL_CONFIG_FILEPATH, GLOBAL_CONFIG_FILEPATH, LOCAL_CONFIG_FILEPATH} from "#lib/defs";
import {removeFile} from "#core/FS/utils";
import {formatPath} from "#output-formats/formatPath";

export const createCommandInit = (ctx: Context, _program: Command) => {
  type Options = {
    force?: boolean
  }
  const cmd = new Command('init')
    .description('Initialize a local config in the current directory')
    .addOption(new Option('force', 'Overwrite existing local config').short('f'))

  cmd.action(({options}: ParseResult) => {
    if (!ctx.config.global.exists()) {
      ctx.stdOut('No account found. Run `tunli register` to get started.')
    }

    const opt = options as Options
    const force = opt.force === true

    if (ctx.config.local) {
      if (force) {
        if (FOUND_LOCAL_CONFIG_FILEPATH) {
          ctx.stdOut(`Removed existing config at ${formatPath(FOUND_LOCAL_CONFIG_FILEPATH)}`)
          removeFile(FOUND_LOCAL_CONFIG_FILEPATH)
        }

      } else {
        ctx.stdErr(`Local config already exists at ${formatPath(FOUND_LOCAL_CONFIG_FILEPATH!)}`)
        ctx.stdErr('Use --force to reinitialize.')
        ctx.exit(1)
      }
    }

    if (LOCAL_CONFIG_FILEPATH === GLOBAL_CONFIG_FILEPATH) {
      throw new InvalidArgumentError(`Error: Cannot run \`tunli init\` in your home directory.\nThe global config already lives at ~/.tunli/config.json`)
    }

    ctx.config.createLocalConfig()
    ctx.config.global.registerLocalConfig(LOCAL_CONFIG_FILEPATH)
    ctx.config.global.save()
    ctx.stdOut(`Initialized empty tunli config at ${formatPath(LOCAL_CONFIG_FILEPATH)}`)
  })

  cmd.extendUsage()
  cmd.addExample('init', 'Initialize a local config in the current directory')
  cmd.addExample('init --force', 'Reinitialize and overwrite existing local config')

  return cmd
}
