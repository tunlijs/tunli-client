import type {SharedOptions} from "#commands/CommandConfig/types";

export const preparePrimaryOptions = (options: SharedOptions): SharedOptions => {
  return {
    global: options.global === true,
    local: options.local === true,
    profile: options.profile,
  }
}
