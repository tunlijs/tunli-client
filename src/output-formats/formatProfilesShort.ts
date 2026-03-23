import type {ParsedConfig} from "#config/ParsedConfig";
import {bold, green} from "#output-formats/colors";
import {formatConfigPath} from "#output-formats/formatConfigPath";

export const formatProfilesShort = (config: ParsedConfig) => {

  const profiles = config.profiles
  const active = config.defaultProfile

  const rows = [
    '',
    formatConfigPath(config),
    '',
  ]
  for (const profile of profiles) {
    const marker = profile.name === active ? bold(green('* ')) : '  '
    const row = `${marker}${profile.name.padEnd(16)} ${profile.protocol}://${profile.host}:${profile.port}`
    rows.push(row)
  }
  rows.push('')
  return rows.join("\n")
}
