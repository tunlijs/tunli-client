import {homedir} from 'os'

export const formatPath = (filepath: string): string => {
  const home = homedir()
  return filepath.startsWith(home) ? `~${filepath.slice(home.length)}` : filepath
}
