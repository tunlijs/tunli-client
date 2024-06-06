export const trimEnd = (string, trimChar = ' ') => {
  const regex = new RegExp(`${trimChar}+$`)
  return string.replace(regex, '')
}

export const trimStart = (string, trimChar) => {
  const regex = new RegExp(`^${trimChar}+`)
  return string.replace(regex, '')
}

export const removeControlChars = (string) => {
  const removeControlCharsRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g
  return string.replace(removeControlCharsRegex, '')
}

export const padEndIgnoreControlChars = (string, maxLength, fillString = ' ') => {
  const stringWithoutLength = removeControlChars(string).length
  const padding = ''.padEnd(maxLength - stringWithoutLength, fillString)
  return `${string}${padding}`
}
