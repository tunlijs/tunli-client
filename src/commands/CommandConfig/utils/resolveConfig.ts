import type {SharedOptions} from "#commands/CommandConfig/types";
import type {Context} from "#types/types";
import type {ParsedProfileConfig} from "#config/ParsedProfileConfig";
import type {ParsedConfig} from "#config/ParsedConfig";
import {DEFAULT_PROFILE_NAME} from "#lib/defs";

export function resolveConfig(ctx: Context, options: SharedOptions, mode?: "save"): ParsedProfileConfig
export function resolveConfig(ctx: Context, options: SharedOptions, mode?: "profile"): ParsedProfileConfig
export function resolveConfig(ctx: Context, options: SharedOptions, mode: "config-only"): ParsedConfig
export function resolveConfig(ctx: Context, options: SharedOptions, mode: "profile" | "save" | "config-only" = 'profile'): ParsedProfileConfig | ParsedConfig {
  if (options.local && !ctx.config.local) {
    ctx.logger.warn(' No local config found. Run `tunli init` to create one.')
    ctx.exit(1)
  }

  if (options.global && !ctx.config.global.exists()) {
    ctx.logger.warn(' No global config found. Run `tunli register` to create one.')
    ctx.exit(1)
  }

  let config

  if (!options.global && ctx.config.local) {
    config = ctx.config.local
  } else {
    config = ctx.config.global
  }

  if (mode === 'save') {
    if (!options.profile) {
      return config.temporaryProfile()
    }
    return config.profile(options.profile)
  }

  if (mode === 'profile') {
    const profileName = options.profile ?? config.defaultProfile ?? DEFAULT_PROFILE_NAME
    const profile = config.profile(profileName)
    if (profile.exists()) return profile
    return config.profile(config.defaultProfile ?? DEFAULT_PROFILE_NAME)
  }
  return config
}
