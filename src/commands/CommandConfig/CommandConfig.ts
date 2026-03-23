import {Command, type ParseResult, type UnknownRecord} from "#commander/index";
import type {SharedOptions} from "#commands/CommandConfig/types";
import {formatConfig} from "#output-formats/formatConfig";
import type {Context} from "#types/types";
import {configSetCommand} from "#commands/CommandConfig/sub-commands/configSetCommand";
import configGetCommand from "#commands/CommandConfig/sub-commands/configGetCommand";
import {configDeleteCommand} from "#commands/CommandConfig/sub-commands/configDeleteCommand";
import {addSharedOptions} from "#commands/CommandConfig/utils/sharedOptions";
import {resolveConfig} from "#commands/CommandConfig/utils/resolveConfig";
import {configServersCommand} from "#commands/shared/configServersCommand";

export const createCommandConfig = (ctx: Context, _program: Command) => {
  const cmd = new Command('config')
  addSharedOptions(cmd)
  cmd.description('Show or modify the active configuration')
  cmd.addCommand(configServersCommand(ctx))
  cmd.action(({options}: ParseResult<UnknownRecord, SharedOptions>) => {
    const config = resolveConfig(ctx, options, 'config-only')
    ctx.logger.info(formatConfig(config))
  })
  cmd
    .addCommand(configSetCommand(ctx))
    .addCommand(configGetCommand(ctx))
    .addCommand(configDeleteCommand(ctx))
    .addCommand(new Command('dump').action(() => {
      ctx.logger.info(formatConfig(ctx.config.global))
      if (ctx.config.local) ctx.logger.info(formatConfig(ctx.config.local))
    }))

  cmd.extendUsage()
  cmd.addExample('config', 'Show the active configuration')
  cmd.addExample('config get port', 'Read a single value')
  cmd.addExample('config set port 3001', 'Set the port in the active config (profile: default)')
  cmd.addExample('config set host 127.0.0.2 -p staging', 'Set the host in a profile')
  cmd.addExample('config set port 3001 --global', 'Set in the global config')
  cmd.addExample('config delete -p staging', 'Delete a profile')
  cmd.addExample('config relays', 'List all registered relays')

  return cmd
}
