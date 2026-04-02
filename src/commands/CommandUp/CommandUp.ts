import {Command} from "#commander/index";
import type {Context} from "#types/types";
import {validateProfileConfig} from "#config/validations/validateProfileConfig";
import {daemonClient} from "#daemon/DaemonClient";
import {ERROR_MESSAGES} from "#lib/errorMessages";

export const createCommandUp = (ctx: Context, _program: Command) => {
  return new Command('up')
    .description('Start all profiles defined in the local config')
    .action(async () => {
      if (!ctx.config.local) {
        ctx.stdErr(ERROR_MESSAGES.NO_LOCAL_CONFIG)
        return ctx.exit(1)
      }

      const profiles = ctx.config.local.profiles
      if (profiles.length === 0) {
        ctx.stdErr('No profiles defined in local config. Add profiles to .tunli/config.json first.')
        return ctx.exit(1)
      }

      await daemonClient().ensureRunning()

      for (const profile of profiles) {
        const validated = await validateProfileConfig(ctx, profile).catch((e: Error) => {
          ctx.stdErr(`${profile.name}: ${e.message}`)
          return null
        })
        if (!validated) continue

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
          ctx.stdErr(`${validated.profileName}: ${result.message}`)
          continue
        }

        if (result.type === 'started') {
          const targetUrl = `${validated.target.protocol}://${validated.target.host}:${validated.target.port}`
          if (result.alreadyRunning) {
            ctx.stdOut(`${validated.profileName}: already running → ${result.proxyURL}`)
          } else {
            ctx.stdOut(`${validated.profileName}: ✓ ${result.proxyURL} → ${targetUrl}`)
          }
        }
      }
    })
}
