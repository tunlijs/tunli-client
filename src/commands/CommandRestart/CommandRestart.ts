import type {Context} from "#types/types";
import {Argument, Command, InvalidArgumentError, type ParseResult} from "#commander/index";
import {addSharedOptions} from "#commands/CommandConfig/utils/sharedOptions";
import {preparePrimaryOptions} from "#commands/CommandConfig/utils/preparePrimaryOptions";
import type {SharedOptions} from "#commands/CommandConfig/types";
import {resolveConfig} from "#commands/CommandConfig/utils/resolveConfig";
import type {ParsedProfileConfig} from "#config/ParsedProfileConfig";
import {addAllowDenyCidrOptions} from "#commands/shared/allowDenyCidrCommand";
import {validateProfileConfig} from "#config/validations/validateProfileConfig";
import {daemonClient} from "#daemon/DaemonClient";
import {ERROR_MESSAGES} from "#lib/errorMessages";

export const createCommandRestart = (ctx: Context, _program: Command) => {
  const cmd = new Command('restart')
    .description('Restart a running tunnel')
    .addArgument(new Argument('profile', 'Profile name').required().parse((profile: string) => {
      const cmdOptions = cmd.opts<Omit<SharedOptions, "profile">>()
      const options = preparePrimaryOptions({
        profile,
        global: cmdOptions.global === true,
        local: cmdOptions.local === true,
      })
      const config = resolveConfig(ctx, options, 'config-only')

      if (config.profile(profile).exists()) return config.profile(profile)

      if (!options.local && !options.global && config.isLocal() && ctx.config.global.profile(profile).exists()) {
        return ctx.config.global.profile(profile)
      }

      throw new InvalidArgumentError(`Profile "${profile}" not found in ${config.filepath} (${config.mode})`)
    }))
  addSharedOptions(cmd, 'no-profile')
  addAllowDenyCidrOptions(cmd)
  cmd.action(async ({args, options}: ParseResult) => {
    const config = args.profile as ParsedProfileConfig
    const opts = options as { allowCidr?: string[]; denyCidr?: string[] }

    config.allowCidr = [...(config.allowCidr ?? []), ...(opts.allowCidr ?? [])]
    config.denyCidr = [...(config.denyCidr ?? []), ...(opts.denyCidr ?? [])]

    const validated = await validateProfileConfig(ctx, config)

    if (!await daemonClient().isRunning()) {
      ctx.stdErr(ERROR_MESSAGES.NO_DAEMON_RUNNING_USE_START)
      return ctx.exit(1)
    }

    await daemonClient().send({type: 'stop', profileName: validated.profileName})

    const result = await daemonClient().send({
      type: 'start',
      profileName: validated.profileName,
      proxyIdent: validated.proxy.proxyIdent,
      proxyURL: validated.proxy.proxyURL,
      serverUrl: validated.serverConfig.url,
      authToken: validated.serverConfig.authToken,
      target: validated.target,
      filepath: validated.filepath,
      allowedCidr: validated.allowedCidr,
      deniedCidr: validated.deniedCidr,
    })

    if (result.type === 'error') {
      ctx.stdErr(result.message)
      return ctx.exit(1)
    }

    if (result.type === 'started') {
      ctx.stdOut(`Tunnel restarted: ${result.proxyURL}`)
    }
  })
  return cmd
}
