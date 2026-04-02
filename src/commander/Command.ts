import {
  type CommandDef,
  type Node,
  type OptionDef,
  parse,
  ParseError,
  type ParseResult,
  type RequiresInput
} from '#commands/helper/Parser'
import {findCommand, formatHelp} from '#commands/helper/Help'
import {Option} from './Option.js'
import {type ArgSpec, Argument, type ParseFn} from './Argument.js'
import {fileLogger} from "#logger/ComputedLogger";
import {UserFacingError} from "#lib/errors";

const toCamelCase = (str: string): string =>
  str.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())

export class Command {
  #name: string
  #description?: string
  #requires?: (matched: RequiresInput) => Partial<RequiresInput>
  #aliases: string[] = []
  #argSpecs: ArgSpec[] = []
  #directOpts: OptionDef[] = []
  #children: Map<string, Command> = new Map()
  #defaultChild?: Command
  #action?: unknown
  #examples: { example: string; description?: string }[] = []
  #extendUsage = false

  // Populated before action is called so opts() works inside argument validators
  #parsedOpts: Record<string, unknown> = {}

  constructor(name = '') {
    this.#name = name
  }

  name(n: string): this {
    this.#name = n
    return this
  }

  description(d: string): this {
    this.#description = d
    return this
  }

  requires(fn: (matched: RequiresInput) => Partial<RequiresInput>): this {
    this.#requires = fn
    return this
  }

  alias(a: string): this {
    this.#aliases.push(a)
    return this
  }

  addOption(opt: Option): this {
    this.#directOpts.push(opt.def)
    for (const aliasName of opt.aliases) {
      this.#directOpts.push({
        type: 'option',
        name: aliasName,
        key: opt.def.key ?? toCamelCase(opt.def.name),
        ...(opt.def.argument !== undefined && {argument: opt.def.argument}),
        ...(opt.def.many && {many: true}),
        ...(opt.def.parse !== undefined && {parse: opt.def.parse}),
      })
    }
    if (opt.defaultValue !== undefined) {
      this.#parsedOpts[opt.def.key ?? opt.def.name] = opt.defaultValue
    }
    return this
  }

  addArgument(arg: Argument): this {
    this.#argSpecs.push(arg.spec)
    return this
  }

  addCommand(cmd: Command, options?: { isDefault?: boolean }): this {
    this.#children.set(cmd.#name, cmd)
    for (const alias of cmd.#aliases) this.#children.set(alias, cmd)
    if (options?.isDefault) this.#defaultChild = cmd
    return this
  }

  action<TArgs = Record<string, unknown>, TOpts = Record<string, unknown>>(
    fn: (result: ParseResult<TArgs, TOpts>) => void | Promise<void>
  ): this {
    this.#action = fn
    return this
  }

  addExample(example: string, description?: string): this {
    this.#examples.push({example, ...(description !== undefined && {description})})
    return this
  }

  extendUsage(): this {
    this.#extendUsage = true
    return this
  }

  opts<T = Record<string, unknown>>(): T {
    return this.#parsedOpts as T
  }

  // ─── Builder → CommandDef ─────────────────────────────────────────────────

  #toNode(): CommandDef {
    const self = this
    const children: Node[] = []

    children.push(...this.#directOpts)

    for (const spec of this.#argSpecs) {
      const argDef = {
        type: 'argument' as const,
        name: spec.name,
        ...(spec.required !== undefined && {required: spec.required}),
        ...(spec.many && {many: true}),
        ...(spec.description !== undefined && {description: spec.description}),
        ...(spec.defaultValue !== undefined && {defaultValue: spec.defaultValue}),
        // Wrap parse so opts() works inside validators via #parsedOpts side-effect
        ...(spec.parse && {
          parse: (value: string, result: ParseResult) => {
            self.#parsedOpts = result.options as Record<string, unknown>
            return (spec.parse as ParseFn)(value)
          }
        }),
      }
      children.push(argDef)
    }

    const seen = new Set<Command>()
    for (const cmd of this.#children.values()) {
      if (seen.has(cmd)) continue
      seen.add(cmd)
      const childDef = cmd.#toNode()
      if (cmd === this.#defaultChild) childDef.isDefault = true
      children.push(childDef)
    }

    return {
      type: 'command',
      name: this.#name,
      ...(this.#requires && {requires: this.#requires}),
      ...(this.#description !== undefined && {description: this.#description}),
      ...(this.#aliases.length > 0 && {alias: this.#aliases[0]}),
      ...(this.#extendUsage && {showUsage: 'global' as const}),
      ...(this.#examples.length > 0 && {examples: this.#examples}),
      ...(children.length > 0 && {children}),
      ...(this.#action !== undefined && {action: this.#action as (result: ParseResult) => void}),
    }
  }

  async parseAsync(argv: string[]): Promise<void> {
    const rootDef = this.#toNode()
    let result
    try {
      result = parse(argv, rootDef)
    } catch (e) {
      process.stderr.write(`Error: ${e instanceof Error ? e.message : e}\n`)
      const hint = e instanceof ParseError ? e.commandPath.join(' ') : 'tunli'
      process.stderr.write(`Run '${hint} --help' for usage information.\n`)
      process.exit(1)
    }

    if (result.help) {
      const subPath = result.command.slice(1)
      const nodeDef = findCommand(rootDef, subPath) ?? rootDef
      process.stdout.write(formatHelp(nodeDef, result.command) + '\n')
      process.exit(0)
    }

    if (result.action) {
      try {
        await (result.action as (r: ParseResult) => Promise<void>)(result)
      } catch (e) {
        process.stderr.write((e instanceof Error ? e.message : String(e)) + "\n")
        if (e instanceof UserFacingError) {
          fileLogger().error(e.message)
        } else {
          fileLogger().exception(e)
        }
        process.exit(1)
      }
    }
  }
}

export const program = new Command()
