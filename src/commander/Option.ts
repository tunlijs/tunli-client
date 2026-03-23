import type {OptionDef} from '#commands/helper/Parser'

const toCamelCase = (str: string): string =>
  str.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())

export class Option {
  readonly #def: OptionDef
  #aliases: string[] = []
  #defaultValue?: unknown

  constructor(name: string, description?: string) {
    this.#def = {
      type: 'option',
      name,
      key: toCamelCase(name),
      ...(description !== undefined && {description}),
    }
  }

  short(s: string | string[]): this {
    this.#def.short = s
    return this
  }

  alias(name: string): this {
    this.#aliases.push(name)
    return this
  }

  argument(argName: string): this {
    this.#def.argument = argName
    return this
  }

  many(): this {
    this.#def.many = true
    return this
  }

  default(value: unknown): this {
    this.#defaultValue = value
    return this
  }

  parse(fn: (value: string) => unknown): this {
    this.#def.parse = fn
    return this
  }

  // ─── Package-internal ──────────────────────────────────────────────────────
  get def() { return this.#def }
  get aliases() { return this.#aliases }
  get defaultValue() { return this.#defaultValue }
}
