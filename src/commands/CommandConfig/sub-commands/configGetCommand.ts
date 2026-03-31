import type {Context} from "#types/types";
import {Command, type ParseResult, type UnknownRecord} from "#commander/index";
import {resolveConfig} from "#commands/CommandConfig/utils/resolveConfig";
import {formatProfile} from "#output-formats/formatProfile";
import type {SharedOptions} from "#commands/CommandConfig/types";

const createGetSubCommand = (
  ctx: Context,
  name: "host" | "port",
  description: string,
): Command => new Command(name).description(description).
action(({options}: ParseResult<UnknownRecord, SharedOptions>) => {
  const config = resolveConfig(ctx, options)
  if (name === 'host') ctx.stdOut(config.getHost() ?? '-')
  if (name === 'port') ctx.stdOut((config.getPort() ?? '-').toString())
})

const configGetCommand = (ctx: Context) => {
  return new Command('get')
    .action(({options}: ParseResult<UnknownRecord, SharedOptions>) => {
      const config = resolveConfig(ctx, options)
      ctx.stdOut(formatProfile(config))
    })
    .description('Show configuration values')
    .addCommand(createGetSubCommand(ctx, 'host', 'Show the configured host'))
    .addCommand(createGetSubCommand(ctx, 'port', 'Show the configured port'))
}
export default configGetCommand

