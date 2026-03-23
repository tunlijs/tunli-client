import {type Command, Option} from "#commander/index";
import {DEFAULT_PROFILE_NAME} from "#lib/defs";

export const addSharedOptions = (cmd: Command, mode: "save" | "no-profile" | "profile" = "profile"): Command => {
  cmd.addOption(new Option('global', 'Use the global configuration').short('g'))
    .addOption(new Option('local', 'Use the local configuration').short('l'))

  if (mode === 'profile') {
    cmd.addOption(new Option('profile', 'Profile to use').short('p').argument('name').default(DEFAULT_PROFILE_NAME))
  } else if (mode === 'save') {
    cmd.addOption(new Option('save', 'Profile to use').argument('profile'))
  }

  return cmd
}
