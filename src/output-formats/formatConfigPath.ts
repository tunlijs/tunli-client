import {dim} from "#output-formats/colors";
import type {ParsedProfileConfig} from "#config/ParsedProfileConfig";
import type {ParsedConfig} from "#config/ParsedConfig";
import {formatPath} from "#output-formats/formatPath";

export const formatConfigPath = (profile: ParsedProfileConfig | ParsedConfig): string => {
  const path = profile.filepath ? formatPath(profile.filepath) : '-'
  return `Config: ${path} ${dim(`(${profile.locationType})`)}`
}
