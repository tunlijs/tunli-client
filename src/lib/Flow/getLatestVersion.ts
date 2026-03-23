type NpmResponse = { latest: string }

export const getLatestVersion = async (): Promise<string | false> => {
  try {
    const response = await fetch('https://registry.npmjs.org/-/package/tunli/dist-tags')
    if (!response.ok) return false
    const data = await response.json() as NpmResponse
    return data.latest ?? false
  } catch {
    return false
  }
}
