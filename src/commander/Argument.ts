export type ParseFn = (value: string, previous?: unknown) => unknown

export interface ArgSpec {
  name: string
  required: boolean
  many: boolean
  description?: string | undefined
  parse?: ParseFn | undefined
  defaultValue?: unknown
}

export class Argument {
  readonly #spec: ArgSpec

  constructor(name: string, description?: string) {
    this.#spec = {name, required: false, many: false, ...(description !== undefined && {description})}
  }

  required(): this {
    this.#spec.required = true
    return this
  }

  many(): this {
    this.#spec.many = true
    return this
  }

  default(value: unknown): this {
    this.#spec.defaultValue = value
    return this
  }

  parse(fn: (value: string, previous?: unknown) => unknown): this {
    this.#spec.parse = fn as ParseFn
    return this
  }

  // ─── Package-internal ──────────────────────────────────────────────────────
  get spec() { return this.#spec }
}
