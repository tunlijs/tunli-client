import type {ParsedProfileConfig} from '#config/ParsedProfileConfig'
import {formatPath} from '#output-formats/formatPath'
import {dim, green} from '#output-formats/colors'
import type {ParsedConfig} from "#config/ParsedConfig";

export const formatSaveResult = (profile: ParsedProfileConfig | ParsedConfig): string => {
  const path = profile.filepath ? formatPath(profile.filepath) : '-'
  return `${green('Saved')}  ${path} ${dim(`(${profile.locationType})`)}`
}

