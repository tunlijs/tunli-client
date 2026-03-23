export type OptionDef = {
  type: 'option'
  name: string
  key?: string          // camelCase result key — defaults to name
  short?: string | string[]
  argument?: string
  many?: boolean
  parse?: (value: string) => unknown
  description?: string
}

export type ArgumentDef = {
  type: 'argument'
  name: string
  required?: boolean
  many?: boolean
  parse?: (value: string, result: ParseResult) => unknown
  description?: string
  defaultValue?: unknown
}

export type RequiresInput = { command: boolean; option: boolean; argument: boolean }

export type ParseResult<TArgs = Record<string, unknown>, TOpts = Record<string, unknown>> = {
  command: string[]
  args: TArgs
  options: TOpts
  action?: (result: ParseResult<TArgs, TOpts>) => void
  help?: true
}

export type CommandDef<TArgs = Record<string, unknown>, TOpts = Record<string, unknown>> = {
  type: 'command'
  name: string
  alias?: string
  aliasPrefix?: string
  isDefault?: boolean   // dispatch to this child when no named subcommand matches
  children?: Node[]
  action?: (result: ParseResult<TArgs, TOpts>) => void
  requires?: (matched: RequiresInput) => Partial<RequiresInput>
  description?: string
  examples?: ({ example: string; description?: string } | string)[]
  showAliasUsage?: boolean
  showUsage?: 'self' | 'global'
}

export type Node = CommandDef | OptionDef | ArgumentDef

export class ParseError extends Error {
  constructor(message: string, public readonly commandPath: string[]) {
    super(message)
    this.name = 'ParseError'
  }
}

type OptionMap = Record<string, OptionDef>

// ─── Pre-processing ───────────────────────────────────────────────────────────

const preProcess = (argv: string[]): string[] => {
  const [node = '', bin = '', ...args] = argv
  //const commandExists = args.filter(x => !x.startsWith('-')).length
  if (!args.length) {
    return [node, bin, 'start', ...args]
  }
  // @profile → use profile
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] as string
    if (arg.startsWith('@')) {
      args.splice(i, 1, 'start', arg.slice(1))
      return [node, bin, ...args]
    }
  }

  // tunli http://localhost:3000 → tunli http <port> <host>
  const first = args[0]
  if (first && !first.startsWith('-')) {
    try {
      const url = new URL(first)
      if (['http:', 'https:'].includes(url.protocol)) {
        const port = url.port || (url.protocol === 'https:' ? '443' : '80')
        args.splice(0, 1, 'http', port, url.hostname)
      }
    } catch {
      // not a URL, continue
    }
  }

  return [node, bin, ...args]
}

// ─── Option extraction ────────────────────────────────────────────────────────

const extractOptions = (
  args: string[],
  optionMap: OptionMap
): { positional: string[]; parsedOptions: Record<string, unknown> } => {
  const positional: string[] = []
  const parsedOptions: Record<string, unknown> = {}

  let i = 0
  while (i < args.length) {
    // i < args.length guarantees arg is defined
    const arg = args[i] as string

    if (arg.startsWith('--')) {
      const name = arg.slice(2)
      const def = optionMap[name]
      if (def) {
        const key = def.key ?? def.name
        if (def.argument) {
          if (def.many) {
            const raw = args[++i]
            if (raw === undefined) throw new Error(`Option --${def.name} requires a value`)
            const prev = Array.isArray(parsedOptions[key]) ? (parsedOptions[key] as unknown[]) : []
            try {
              parsedOptions[key] = [...prev, def.parse ? def.parse(raw) : raw]
            } catch (e) {
              throw new Error(`Invalid value for --${def.name}: ${e instanceof Error ? e.message : e}`)
            }
          } else {
            const raw = args[++i]
            if (raw === undefined) throw new Error(`Option --${def.name} requires a value`)
            try {
              parsedOptions[key] = def.parse ? def.parse(raw) : raw
            } catch (e) {
              throw new Error(`Invalid value for --${def.name}: ${e instanceof Error ? e.message : e}`)
            }
          }
        } else {
          parsedOptions[key] = true
        }
      } else {
        positional.push(arg) // defer to subcommand or leaf check
      }

    } else if (arg.startsWith('-') && arg.length === 2) {
      const short = arg.slice(1)
      const def = Object.values(optionMap).find(o =>
        Array.isArray(o.short) ? o.short.includes(short) : o.short === short
      )
      if (def) {
        const key = def.key ?? def.name
        if (def.argument) {
          const raw = args[++i]
          if (raw === undefined) throw new Error(`Option -${short} requires a value`)
          try {
            if (def.many) {
              const prev = Array.isArray(parsedOptions[key]) ? (parsedOptions[key] as unknown[]) : []
              parsedOptions[key] = [...prev, def.parse ? def.parse(raw) : raw]
            } else {
              parsedOptions[key] = def.parse ? def.parse(raw) : raw
            }
          } catch (e) {
            throw new Error(`Invalid value for -${short}: ${e instanceof Error ? e.message : e}`)
          }
        } else {
          parsedOptions[key] = true
        }
      } else {
        positional.push(arg) // defer to subcommand or leaf check
      }

    } else {
      positional.push(arg)
    }

    i++
  }

  return {positional, parsedOptions}
}

// ─── Argument parsing ─────────────────────────────────────────────────────────

const parseArguments = (
  positional: string[],
  defs: ArgumentDef[],
  context: ParseResult
): Record<string, unknown> => {
  const result: Record<string, unknown> = {}
  let pos = 0

  for (const def of defs) {
    if (def.many) {
      const values = positional.slice(pos)
      try {
        result[def.name] = def.parse
          ? values.map(v => def.parse!(v, context))
          : values
      } catch (e) {
        throw new Error(`Invalid argument <${def.name}>: ${e instanceof Error ? e.message : e}`)
      }
      break
    } else if (pos < positional.length) {
      const raw = positional[pos++] as string
      try {
        result[def.name] = def.parse ? def.parse(raw, context) : raw
      } catch (e) {
        throw new Error(`Invalid argument <${def.name}>: ${e instanceof Error ? e.message : e}`)
      }
    } else if (def.defaultValue !== undefined) {
      try {
        result[def.name] = def.parse ? def.parse(def.defaultValue as string, context) : def.defaultValue
      } catch (e) {
        throw new Error(`Invalid default for <${def.name}>: ${e instanceof Error ? e.message : e}`)
      }
    } else if (def.required) {
      throw new Error(`Missing required argument: <${def.name}>`)
    }
  }

  return result
}

// ─── Build option map ─────────────────────────────────────────────────────────

const buildOptionMap = (node: CommandDef, inherited: OptionMap): OptionMap => {
  const map: OptionMap = {...inherited}
  for (const child of node.children ?? []) {
    if (child.type === 'option') {
      map[child.name] = child
    }
  }
  return map
}

// ─── Core parser ──────────────────────────────────────────────────────────────

const parseNode = (
  args: string[],
  node: CommandDef,
  inheritedOptions: OptionMap,
  commandPath: string[]
): ParseResult => {
  const optionMap = buildOptionMap(node, inheritedOptions)
  let positional: string[], parsedOptions: Record<string, unknown>
  try {
    ;({positional, parsedOptions} = extractOptions(args, optionMap))
  } catch (e) {
    throw new ParseError(e instanceof Error ? e.message : String(e), commandPath)
  }

  const [first, ...rest] = positional

  // Try to match a subcommand
  if (first !== undefined) {
    const subCommand = (node.children ?? []).find((c): c is CommandDef => {
      if (c.type !== 'command') return false
      if (c.name === first || c.alias === first) return true
      return !!(c.aliasPrefix && first.startsWith(c.aliasPrefix))
    })

    if (subCommand) {
      // Handle aliasPrefix: strip prefix and put value back as first positional
      let remainingArgs = rest
      if (subCommand.aliasPrefix && first.startsWith(subCommand.aliasPrefix)) {
        const value = first.slice(subCommand.aliasPrefix.length)
        if (value) remainingArgs = [value, ...rest]
      }

      // Re-inject --help so the child can detect it at its own level
      if (parsedOptions['help']) remainingArgs = [...remainingArgs, '--help']

      const child = parseNode(remainingArgs, subCommand, optionMap, [...commandPath, subCommand.name])
      return {
        ...child,
        options: {...parsedOptions, ...child.options}
      }
    }

    // No named subcommand matched — try the default child
    const defaultChild = (node.children ?? []).find(
      (c): c is CommandDef => c.type === 'command' && c.isDefault === true
    )
    if (defaultChild) {
      let remainingArgs = positional
      if (parsedOptions['help']) remainingArgs = [...remainingArgs, '--help']
      const child = parseNode(remainingArgs, defaultChild, optionMap, [...commandPath, defaultChild.name])
      return {...child, options: {...parsedOptions, ...child.options}}
    }
  }

  // --help / -h → signal caller to print help for this command
  if (parsedOptions['help']) {
    return {command: commandPath, args: {}, options: {}, help: true}
  }

  // requires() validation — takes precedence over generic subcommand check
  if (node.requires) {
    const matched: RequiresInput = {
      command: false,
      option: Object.keys(parsedOptions).length > 0,
      argument: positional.length > 0,
    }
    const required = node.requires(matched)
    const valid = (Object.keys(required) as (keyof RequiresInput)[])
      .some(key => required[key] && matched[key])
    if (!valid) {
      throw new ParseError(`Command "${commandPath.join(' ')}": missing required argument, option or subcommand`, commandPath)
    }
  } else {
    const subCommands = (node.children ?? []).filter((c): c is CommandDef => c.type === 'command')
    if (subCommands.length > 0) {
      // Unknown subcommand token
      if (first !== undefined && !first.startsWith('-')) {
        throw new ParseError(`Unknown command: ${first}`, commandPath)
      }
      // No token at all but subcommand required
      if (!node.action) {
        throw new ParseError(`Command "${commandPath.join(' ')}" requires a subcommand`, commandPath)
      }
    }
  }

  // Leaf-level: reject unrecognized options that were deferred
  const unknown = positional.find(p => p.startsWith('-'))
  if (unknown) throw new ParseError(`Unknown option: ${unknown}`, commandPath)

  // No subcommand matched → parse positional as arguments
  const argDefs = (node.children ?? []).filter((c): c is ArgumentDef => c.type === 'argument')
  const context: ParseResult = {command: commandPath, args: {}, options: parsedOptions}
  let parsedArgs: Record<string, unknown>
  try {
    parsedArgs = parseArguments(positional, argDefs, context)
  } catch (e) {
    throw new ParseError(e instanceof Error ? e.message : String(e), commandPath)
  }

  return {
    command: commandPath,
    args: parsedArgs,
    options: parsedOptions,
    ...(node.action && {action: node.action})
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

const HELP_OPTION: OptionDef = {type: 'option', name: 'help', short: ['h', '?']}

export const parse = (argv: string[], root: CommandDef): ParseResult => {
  const processed = preProcess(argv)
  const userArgs = processed.slice(2) // strip node + bin
  return parseNode(userArgs, root, {help: HELP_OPTION}, [root.name])
}
