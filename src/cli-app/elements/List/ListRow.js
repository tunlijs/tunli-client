import EventEmitter from "node:events";
import {ListCell} from "#src/cli-app/elements/List/ListCell";
import {isRef} from "#src/core/Ref";

export class ListRow extends EventEmitter {

  /**
   * @param {ListCell[]} cells
   */
  #cells

  /**
   * @type {number}
   */
  #lineNumber
  /**
   * @type {ListRow}
   */
  #_rowBefore
  #deleted = false
  #hidden = false

  /**
   * @param {ListCell[]} cells
   */
  constructor(cells, rowNodeBefore) {
    super()
    this.#cells = cells
    this.#rowBefore = rowNodeBefore

    this.#rowBefore?.on('delete', (rowBefore) => {
      this.#rowBefore = rowBefore?.#rowBefore
    })

    cells.forEach(cell => cell.row = this)
  }

  /**
   * @returns {ListRow}
   */
  get #rowBefore() {
    if (this.#_rowBefore?.hidden) {
      return this.#_rowBefore.#rowBefore
    }

    return this.#_rowBefore
  }

  /**
   * @param {ListRow} rowBefore
   */
  set #rowBefore(rowBefore) {
    this.#_rowBefore = rowBefore
  }

  get length() {
    return this.#cells.length
  }

  get lineNumber() {
    if (this.#rowBefore) {
      return this.#rowBefore?.lineNumber + 1
    }
    return 0
  }

  get deleted() {
    return this.#deleted
  }

  /**
   * @return {ListCell[]}
   */
  get cells() {
    return this.#cells
  }

  /**
   * @return {ListCell}
   */
  get lastCell() {
    return this.#cells[this.#cells.length - 1]
  }

  get hidden() {
    return this.#hidden
  }

  set hidden(hidden) {

    if (this.#hidden === hidden) {
      return
    }

    this.#hidden = hidden
    this.emit(hidden ? 'hide' : 'show')
  }

  if(renderIfCallback) {
    const result = renderIfCallback()
    if (isRef(result)) {
      result.on('update', (val) => this.hidden = !val)
      this.hidden = !result.value
    } else {
      this.hidden = !result
    }
    return this
  }

  delete() {
    this.#deleted = true

    for (const cell of this.#cells) {
      cell.delete()
    }
    this.emit('delete', this)
  }
}
