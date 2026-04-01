import {createInterface} from 'readline'
import {assertPort, assertProtocol} from '#utils/assertFunctions'

export const prompt = (question: string, defaultValue?: string): Promise<string> => {
  const rl = createInterface({input: process.stdin, output: process.stdout})
  const label = defaultValue !== undefined ? `${question} [${defaultValue}]: ` : `${question}: `
  return new Promise(resolve => {
    rl.question(label, answer => {
      rl.close()
      const trimmed = answer.trim()
      resolve(trimmed || defaultValue || '')
    })
  })
}

export const toJSON = (data: unknown) => {
  if (data == null) {
    return data
  }
  return JSON.parse(JSON.stringify(data))
}

export const promptUrl = async (question: string, defaultValue?: string): Promise<string> => {
  while (true) {
    const input = await prompt(question, defaultValue)
    try {
      const parsed = new URL(input)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error()
      return input
    } catch {
      process.stdout.write('  Invalid URL. Must start with http:// or https://.\n')
    }
  }
}

export const promptProtocol = async (question: string, defaultValue?: string): Promise<string> => {
  while (true) {
    const input = await prompt(question, defaultValue)
    try {
      assertProtocol(input);
      return input
    } catch {
      process.stdout.write('  Invalid protocol. Use "http" or "https".\n')
    }
  }
}

export const promptPort = async (question: string): Promise<number> => {
  while (true) {
    const raw = await prompt(question)
    const parsed = parseInt(raw, 10)
    try {
      assertPort(parsed);
      return parsed
    } catch {
      process.stdout.write('  Invalid port. Enter a number between 1 and 65535.\n')
    }
  }
}

export const confirm = (question: string): Promise<boolean> => {
  const rl = createInterface({input: process.stdin, output: process.stdout})
  return new Promise(resolve => {
    let answered = false
    rl.on('close', () => {
      process.stdout.write('\n');
      if (!answered) resolve(false)
    })
    rl.question(question, answer => {
      answered = true
      rl.close()
      resolve(answer.trim().toLowerCase() === 'y')
    })
  })
}
