import {Argument, Command, Option, type ParseResult} from "#commander/index";
import type {Context} from "#types/types";
import {DEFAULT_API_SERVER_URL, DEFAULT_SERVER_NAME} from "#lib/defs";

export const createCommandAuth = (ctx: Context, _program: Command) => {
  type Options = {
    name: string
    relay: string
  }

  const cmd = new Command('auth')
    .description('Manually set an auth token for a relay server')
    .addArgument(new Argument('token', 'Auth token to store').required())
    .addOption(new Option('relay', 'Relay server URL to associate with the token').argument('url').default(DEFAULT_API_SERVER_URL))
    .addOption(new Option('name', 'Relay alias to store the token under').argument('alias').default(DEFAULT_SERVER_NAME))

  cmd.action(async ({args, options}: ParseResult) => {
    const token = args.token as string
    const opt = options as Options
    const relayUrl = opt.relay ?? DEFAULT_API_SERVER_URL
    const serverName = opt.name ?? DEFAULT_SERVER_NAME
    ctx.config.global
      .server(serverName)
      .setUrl(relayUrl)
      .setAuthToken(token)
      .save()
    ctx.logger.info('Auth token saved.')
  })

  cmd.extendUsage()
  cmd.addExample('auth <token>', 'Set the auth token for the default relay')
  cmd.addExample('auth <token> --name myrelay --relay https://api.myserver.com', 'Set the auth token for a self-hosted relay')
  return cmd
}
