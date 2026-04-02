const parseSemver = (version: string): [number, number, number] => {
  const [major = 0, minor = 0, patch = 0] = version.split('.').map(Number)
  return [major, minor, patch]
}

export const isVersionCompatible = (clientVersion: string, minClientVersion: string): boolean => {
  const [cMajor, cMinor, cPatch] = parseSemver(clientVersion)
  const [mMajor, mMinor, mPatch] = parseSemver(minClientVersion)
  if (cMajor !== mMajor) return cMajor > mMajor
  if (cMinor !== mMinor) return cMinor > mMinor
  return cPatch >= mPatch
}
