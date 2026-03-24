import {Command, Option, type ParseResult} from "#commander/index";
import type {Context} from "#types/types";
import {DEFAULT_API_SERVER_URL, DEFAULT_SERVER_NAME} from "#lib/defs";
import {encodePublicKey, ensureIdentity, fingerprint, loadIdentity} from "#identity/identity";

export const createCommandRegister = (ctx: Context, _program: Command) => {

  type Options = {
    force?: boolean
    relay: string
    name: string
  }

  const cmd = new Command('register')
    .description('Register a new account and store the auth token')
    .addOption(new Option('force', 'Force registration even if an auth token already exists').short('f'))
    .addOption(new Option('relay', 'Register against a custom relay server instead of the default tunli relay').argument('url').default(DEFAULT_API_SERVER_URL))
    .addOption(new Option('name', 'Alias for the relay, used to reference it later (e.g. tunli relay use myrelay)').argument('alias').default(DEFAULT_SERVER_NAME))

  cmd.action(async ({options}: ParseResult) => {
    const opt = options as Options
    const force = opt.force === true
    const serverName = opt.name ?? ctx.config.global.activeServer ?? DEFAULT_SERVER_NAME
    const serverConf = ctx.config.global.server(serverName)

    if (serverConf.exists() && !force) {
      ctx.logger.info('Auth token already exists. Use --force to renew.')
      return ctx.exit(0)
    }

    const {data, error} = await ctx.apiClient.register(opt.relay)

    if (error || !data) {
      if (error) {
        ctx.logger.error(error.message)
      } else {
        ctx.logger.error('Registration failed. Please try again later.')
      }
      return ctx.exit(1)
    }

    if (!ctx.config.global.activeServer) {
      ctx.config.global.activeServer = serverName
    }

    serverConf
      .setUrl(opt.relay)
      .setAuthToken(data)
      .save()

    ctx.logger.info(`Registration successful. Relay: ${opt.relay} (${serverName})`)

    const isNew = loadIdentity() === null
    const identity = ensureIdentity()
    if (isNew) {
      ctx.logger.info(`Identity key generated: ${encodePublicKey(identity.publicKeyRaw)}`)
      ctx.logger.info(`Fingerprint: ${fingerprint(identity.publicKeyRaw)}`)
    }
  })

  cmd.extendUsage()
  cmd.addExample('register', 'Register a new account against tunli.app')
  cmd.addExample('register --relay https://api.myserver.com --name myrelay', 'Register against a self-hosted relay server')
  cmd.addExample('register --force', 'Force re-registration and renew the auth token')

  return cmd
}
