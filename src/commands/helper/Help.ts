import type {ArgumentDef, CommandDef, Node, OptionDef} from './Parser.js'

// ─── Formatters ───────────────────────────────────────────────────────────────

const formatArgToken = (arg: ArgumentDef): string => {
  const inner = arg.many ? `${arg.name}...` : arg.name
  return arg.required ? `<${inner}>` : `[${inner}]`
}

const formatOptionToken = (opt: OptionDef): string => {
  const shorts = opt.short
    ? (Array.isArray(opt.short) ? opt.short : [opt.short]).map(s => `-${s}`)
    : []
  const val = opt.argument
    ? opt.many ? ` <${opt.argument}...>` : ` <${opt.argument}>`
    : ''
  return [`--${opt.name}`, ...shorts].join(', ') + val
}

const formatAliasToken = (cmd: CommandDef): string | undefined => {
  const argDefs = (cmd.children ?? []).filter((c): c is ArgumentDef => c.type === 'argument')
  if (cmd.aliasPrefix) {
    const argTokens = argDefs.map(formatArgToken)
    return [`${cmd.aliasPrefix}<${argDefs[0]?.name ?? 'name'}>`, ...argTokens.slice(1)].join(' ')
  } else if (cmd.alias) {
    return [cmd.alias, ...argDefs.map(formatArgToken)].join(' ')
  }
  return
}

const formatCommandToken = (cmd: CommandDef): string => {
  const args = (cmd.children ?? [])
    .filter((c): c is ArgumentDef => c.type === 'argument')
    .map(formatArgToken)
  const hasSubCmds = (cmd.children ?? []).some(c => c.type === 'command')
  const parts = [cmd.name, ...args]
  if (hasSubCmds) parts.push('<command>')
  return parts.join(' ')
}

// ─── Column layout ────────────────────────────────────────────────────────────

const columns = (rows: [string, string | undefined][], indent = 2): string => {
  const width = Math.max(...rows.map(([left]) => left.length))
  return rows
    .map(([left, right]) =>
      ' '.repeat(indent) + left.padEnd(width + 2) + (right ?? '')
    )
    .join('\n')
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const formatHelp = (node: CommandDef, path: string[]): string => {
  const children: Node[] = node.children ?? []
  const subCommands = children.filter((c): c is CommandDef => c.type === 'command')
  const argDefs = children.filter((c): c is ArgumentDef => c.type === 'argument')
  const optDefs = children.filter((c): c is OptionDef => c.type === 'option')

  // Usage line(s)
  const usageParts = [...path]
  for (const arg of argDefs) usageParts.push(formatArgToken(arg))
  if (subCommands.length) usageParts.push('<command>')
  if (optDefs.length) usageParts.push('[options]')

  const lines: string[] = [`Usage: ${usageParts.join(' ')}`]

  // Global usage lines from subcommands
  for (const cmd of subCommands) {
    if (cmd.showUsage === 'global') {
      const cmdArgs = (cmd.children ?? []).filter((c): c is ArgumentDef => c.type === 'argument').map(formatArgToken)
      const hasOpts = (cmd.children ?? []).some(c => c.type === 'option')
      const cmdParts = [...path, cmd.name, ...cmdArgs]
      if (hasOpts) cmdParts.push('[options]')
      lines.push(`       ${cmdParts.join(' ')}`)
      if (cmd.showAliasUsage) {
        const alias = formatAliasToken(cmd)
        if (alias) lines.push(`       ${[...path, alias].join(' ')}`)
      }
    }
  }

  // Additional alias usage line
  if (node.showAliasUsage) {
    if (node.aliasPrefix) {
      const argTokens = argDefs.map(formatArgToken)
      lines.push(`       ${[...path.slice(0, -1), `${node.aliasPrefix}<${argDefs[0]?.name ?? 'name'}>`, ...argTokens.slice(1)].join(' ')}`)
    } else if (node.alias) {
      lines.push(`       ${[...path.slice(0, -1), node.alias, ...argDefs.map(formatArgToken)].join(' ')}`)
    }
  }

  if (node.description) {
    lines.push('', node.description)
  }

  if (subCommands.length) {
    lines.push('', 'Commands:')
    const rows: [string, string | undefined][] = []
    for (const cmd of subCommands) {
      rows.push([formatCommandToken(cmd), cmd.description])
      if (cmd.showUsage === 'global' && cmd.showAliasUsage) {
        const alias = formatAliasToken(cmd)
        if (alias) rows.push([alias, `Alias for '${cmd.name}'`])
      }
    }
    lines.push(columns(rows))
  }

  const helpOpt: OptionDef = {type: 'option', name: 'help', short: ['h', '?'], description: 'Display help'}
  lines.push('', 'Options:')
  lines.push(columns([...optDefs, helpOpt].map(opt => [formatOptionToken(opt), opt.description])))

  const globalExamples = subCommands.flatMap(cmd => cmd.showUsage === 'global' ? cmd.examples ?? [] : [])
  const allExamples = [...(node.examples ?? []), ...globalExamples].map(e => {
    if (typeof e === 'string') {
      return {
        example: e,
      }
    }

    return e
  })
  if (allExamples.length) {
    const bin = path[0] ?? ''
    const hasDescriptions = allExamples.some(e => e.description)
    const padLen = hasDescriptions ? Math.max(...allExamples.map(e => e.example.length)) + 2 : 0
    lines.push('', 'Examples:')
    for (const {example, description} of allExamples) {
      lines.push(`  ${bin} ${hasDescriptions ? example.padEnd(padLen) : example}${description ?? ''}`)
    }
  }

  return lines.join('\n')
}

// ─── Subcommand lookup (for --help on nested commands) ────────────────────────

export const findCommand = (
  root: CommandDef,
  path: string[]
): CommandDef | undefined => {
  let current: CommandDef = root
  for (const segment of path) {
    const next = (current.children ?? []).find(
      (c): c is CommandDef => c.type === 'command' && (c.name === segment || c.alias === segment)
    )
    if (!next) return undefined
    current = next
  }
  return current
}
