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

export const padEndIgnoreControlChars = (string, maxLength, fillString = ' ', autoSubstring = false) => {

  if (maxLength < 0) {
    return string
  }

  const stringWithoutCC = removeControlChars(string)

  if (autoSubstring !== false && stringWithoutCC.length > maxLength) {
    if (autoSubstring !== true) {
      return stringWithoutCC.substring(0, maxLength - autoSubstring.length) + autoSubstring
    } else {
      return stringWithoutCC.substring(0, maxLength)
    }
  }

  const padding = ''.padEnd(maxLength - stringWithoutCC.length, fillString)
  return `${string}${padding}`
}
