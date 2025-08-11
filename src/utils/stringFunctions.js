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

/**
 * Replaces template placeholders in a string with corresponding values from a replacements object.
 *
 * @param {string} template - The string containing placeholders in the format {{ placeholder }}.
 * @param {object} replacements - The object containing replacement values. Nested placeholders can be accessed using dot notation.
 */
export const replaceTemplatePlaceholders = (template, replacements) => {

  return template.replace(/{{\s*([^{}|]+)\s*(\|[^{}]+)*\s*}}/ig, (match, placeholder) => {

    placeholder = placeholder.trim()
    const keys = placeholder.split('.')

    let value = replacements
    for (const part of keys) {
      if (!value) {
        break
      }
      value = value [part]
    }

    return value ?? ''
  })
}
