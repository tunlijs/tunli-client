import type {StoredRequest, StoredRequestMeta} from '#daemon/protocol'

export class ReplayBuffer {
  readonly #capacity: number
  #entries: StoredRequest[] = []

  constructor(capacity: number) {
    this.#capacity = capacity
  }

  push(req: StoredRequest): void {
    this.#entries.push(req)
    if (this.#entries.length > this.#capacity) this.#entries.shift()
  }

  getAll(limit?: number): StoredRequestMeta[] {
    const entries = [...this.#entries].reverse()
    const sliced = limit ? entries.slice(0, limit) : entries
    return sliced.map(({body: _body, ...rest}) => rest)
  }

  getById(id: string): StoredRequest | undefined {
    return this.#entries.find(e => e.id === id)
  }

  toMeta(): StoredRequestMeta[] {
    return this.#entries.map(({body: _body, ...rest}) => ({...rest, bodyUnavailable: true}))
  }

  restoreFromMeta(entries: StoredRequestMeta[]): void {
    this.#entries = entries.map(e => ({...e, body: null}))
  }

  get size(): number { return this.#entries.length }
}
