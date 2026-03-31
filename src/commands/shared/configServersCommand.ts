import type {Context} from "#types/types";
import {Command} from "#commander/index";

export const configServersCommand = (ctx: Context, cmdName = 'relays') => {
  const cmd = new Command(cmdName)
    .description('List all registered relay servers')

  cmd.action(() => {
    const servers = ctx.config.global.servers

    if (!servers.length) {
      ctx.stdOut('No relay servers registered. Run `tunli register` to get started.')
      return
    }

    const active = ctx.config.global.activeServer
    for (const {name, url} of servers) {
      const marker = name === active ? '* ' : '  '
      ctx.stdOut(`${marker}${name.padEnd(16)} ${url}`)
    }
  })

  return cmd
}
