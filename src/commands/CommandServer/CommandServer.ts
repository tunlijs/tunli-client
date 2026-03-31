import type {Context} from "#types/types";
import {Argument, Command, type ParseResult} from "#commander/index";
import {configServersCommand} from "#commands/shared/configServersCommand";

export const createCommandServer = (ctx: Context, _program: Command) => {
  const cmd = new Command('relay')
    .description('Manage relay servers')
    .addCommand(configServersCommand(ctx, 'list'))
    .addCommand(new Command('use').description('Switch the active relay server').addArgument(new Argument('name', 'Relay server alias').required()).action(({args}: ParseResult) => {
      const name = args.name as string
      const config = ctx.config.global
      if (!config.server(name).exists()) {
        ctx.stdOut(`Relay "${name}" not found. Run \`tunli relay list\` to see available relays.`)
      } else {
        config.activeServer = name
        config.save()
        ctx.stdOut(`Active relay set to "${name}"`)
      }
    }))
  cmd.extendUsage()
  cmd.addExample('relay list', 'List all registered relay servers')
  cmd.addExample('relay use myserver', 'Switch the active relay to myserver')
  return cmd
}
