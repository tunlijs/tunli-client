import type {Context} from "#types/types";
import {Argument, Command, Option, type ParseResult, type UnknownRecord} from "#commander/index";
import type {SharedOptions} from "#commands/CommandConfig/types";
import {resolveConfig} from "#commands/CommandConfig/utils/resolveConfig";
import {addSharedOptions} from "#commands/CommandConfig/utils/sharedOptions";
import {formatSaveResult} from "#output-formats/formatSaveResult";
import {formatProfilesShort} from "#output-formats/formatProfilesShort";
import {confirm} from "#commands/utils";

export const configProfilesCommand = (
  ctx: Context,
  cmdName = 'servers'
) => {
  const cmd = new Command(cmdName)
    .description('List all profiles in the active configuration')

  cmd.action(({options}: ParseResult<UnknownRecord, SharedOptions>) => {
    const config = resolveConfig(ctx, options, 'config-only')
    const profiles = config.profiles
    if (!profiles.length) {
      ctx.logger.info('No profiles found. Run `tunli http 3000 --save <name>` to create one.')
      return
    }
    ctx.logger.info(formatProfilesShort(config))
  })

  return cmd
}

export const createCommandProfile = (ctx: Context, _program: Command) => {
  const cmd = new Command('profile').alias('profiles')
    .description('Manage tunnel profiles')
    .addCommand(configProfilesCommand(ctx, 'list'))
    .addCommand(new Command('delete').description('Remove a profile from the configuration')
      .addOption(new Option('force', 'Skip confirmation').short('f'))
      .addArgument(new Argument('name', 'Profile name').required())
      .action(async ({args, options}: ParseResult<{
        name: string
      }, SharedOptions & {force: boolean}>) => {
        const config = resolveConfig(ctx, options, 'config-only').profile(args.name)
        if (!config.exists()) {
          ctx.logger.error(`Profile "${args.name}" not found.`)
          return ctx.exit(1)
        }
        const ok = options.force || await confirm(`Remove profile "${config.name}" from ${config.filepath} (${config.locationType})? [y/N] `)

        if (!ok) {
          ctx.logger.info('Aborted.')
          return ctx.exit(0)
        }

        config.delete()
        config.save()
        ctx.logger.info(formatSaveResult(config))
        ctx.logger.info(`Profile "${args.name}" deleted`)
      }))
    .addCommand(new Command('use').description('Set the default profile')
      .addArgument(new Argument('name', 'Profile name').required()).action(({args, options}: ParseResult<{
        name: string
      }, SharedOptions>) => {
        const name = args.name
        const config = resolveConfig(ctx, options, 'config-only')

        if (!config.profile(name).exists()) {
          ctx.logger.warn(`Profile "${name}" not found.`)
        } else {
          config.defaultProfile = name
          config.save()
          ctx.logger.info(formatSaveResult(config))
          ctx.logger.info(`Active profile set to "${name}"`)
        }
      }))
  addSharedOptions(cmd, 'no-profile')
  cmd.extendUsage()
  cmd.addExample('profile list', 'List all registered profiles')
  cmd.addExample('profile use staging', 'Set staging as the default profile')
  return cmd
}
