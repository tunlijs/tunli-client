export const argumentAliasResolver = () => {
  let args = []
  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i]
    if (arg.charAt(0) === '@') {
      args.push('--alias')
      args.push(arg.substring(1))
    } else {
      args.push(arg)
    }
  }
  return args
}
