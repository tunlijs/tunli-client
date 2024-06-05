export const trimEnd = (string, trimChar = ' ') => {
  const regex = new RegExp(`${trimChar}+$`)
  return string.replace(regex, '')
}

export const trimStart = (string, trimChar) => {
  const regex = new RegExp(`^${trimChar}+`)
  return string.replace(regex, '')
}
