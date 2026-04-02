import type {Context} from "#types/types";
import {Command, Option, type ParseResult, type UnknownRecord} from "#commander/index";
import {resolveConfig} from "#commands/CommandConfig/utils/resolveConfig";
import type {SharedOptions} from "#commands/CommandConfig/types";
import {formatPath} from "#output-formats/formatPath";
import {confirm} from "#commands/utils";
import {ERROR_MESSAGES} from "#lib/errorMessages";

type DeleteOptions = SharedOptions & { force?: boolean }

export const configDeleteCommand = (ctx: Context) => {
  return new Command('delete')
    .addOption(new Option('force', 'Skip confirmation').short('f'))
    .action(async ({options}: ParseResult<UnknownRecord, DeleteOptions>) => {
      const config = resolveConfig(ctx, options, 'config-only')
      const path = config.filepath ? formatPath(config.filepath) : '-'

      const ok = options.force || await confirm(`Remove config file ${path} (${config.mode})? [y/N] `)

      if (!ok) {
        ctx.stdOut(ERROR_MESSAGES.ABORTED)
        return ctx.exit(0)
      }

      config.delete()
      ctx.stdOut(`Removed config file ${path} (${config.mode})`)
    })
}
