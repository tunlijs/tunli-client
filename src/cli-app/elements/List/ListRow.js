import EventEmitter from "node:events";
import {ListCell} from "#src/cli-app/elements/List/ListCell";

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
  #rowBefore
  #deleted = false

  /**
   * @param {ListCell[]} cells
   */
  constructor(cells, rowNodeBefore) {
    super()
    this.#cells = cells
    this.#rowBefore = rowNodeBefore

    rowNodeBefore?.on('delete', (rowBefore) => {
      this.#rowBefore = rowBefore?.#rowBefore
    })

    cells.forEach(cell => cell.row = this)
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

  delete() {
    this.#deleted = true

    for (const cell of this.#cells) {
      cell.delete()
    }
    this.emit('delete', this)
  }
}
