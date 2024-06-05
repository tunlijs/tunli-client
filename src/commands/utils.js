import {Command} from "commander";
import {checkIpV4Cidr} from "#src/utils/checkFunctions";

export const validateArrayArguments = (validationCallback) => {

  return (value, previous) => {
    const ref = {value}
    validationCallback(ref)
    previous ??= []
    previous.push(ref.value)
    return previous
  }
}
export const validateIpV4 = (ref) => {
  ref.value = checkIpV4Cidr(ref.value)
}

const extendedUsages = []

/**
 * @param {Command} program
 * @param {Command} command
 */
export const extendUsage = (program, command) => {

  extendedUsages.push({program, command})

}

export const addUsage = (program) => {

  const help = program.createHelp()

  for (const {program, command} of extendedUsages) {
    const usage = help.commandUsage(command)
    const before = program.usage()
    program.usage(before + "\n" + ''.padEnd(7, ' ') + usage)
  }
}

/**
 * Add examples to the command help text.
 * @param {Command} program - The commander program instance.
 */
export const addExamples = (program) => {

  const usage = program.usage()
  program.usage('')

  const maxRowLength = {
    length: 0
  }

  const rows = [].slice.call(program.helpInformation().split("\n").map(x => {
    x = x.trim()
    const rowLength = x.length
    if (rowLength > maxRowLength.length) {
      maxRowLength.length = rowLength
      maxRowLength.row = x
    }
    return x
  }).filter(Boolean), 2)
  program.usage(usage)

  const maxWhitespaceLength = {
    length: 0
  }

  for (const match of maxRowLength.row.matchAll(/(\s)+/g)) {
    const whiteSpacesCount = match[0].length
    if (whiteSpacesCount > maxWhitespaceLength.length) {
      maxWhitespaceLength.length = whiteSpacesCount
      maxWhitespaceLength.index = match.index
    }
  }

  const padLength = maxWhitespaceLength.index + maxWhitespaceLength.length - 6
  program.addHelpText('after', "\nExamples:")

  for (const {example, description} of examples) {
    const whitespaces = ''.padStart(padLength - example.length, ' ')
    program.addHelpText('after', `  tunli ${example}${whitespaces}${description}`)
  }
}

/**
 * Adds an example to the list of examples.
 * @param {string} example - The example command.
 * @param {string} description - The description of the example.
 */
export const addExample = (example, description) => {
  examples.push({
    example, description
  })
}
const examples = []
