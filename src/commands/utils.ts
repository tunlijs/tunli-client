import {createInterface} from 'readline'

export const toJSON = (data: unknown) => {
  if (data == null) {
    return data
  }
  return JSON.parse(JSON.stringify(data))
}

export const confirm = (question: string): Promise<boolean> => {
  const rl = createInterface({input: process.stdin, output: process.stdout})
  return new Promise(resolve => {
    rl.on('close', () => { process.stdout.write('\n'); resolve(false) })
    rl.question(question, answer => {
      rl.close()
      resolve(answer.trim().toLowerCase() === 'y')
    })
  })
}
