import EventEmitter from "node:events";
import {arrayRemoveEntry} from "#src/utils/arrayFunctions";

export class ListColumn extends EventEmitter {

  /**
   *
   * @type {ListCell[]}
   */
  #cells = []//new Set()

  #width
  /**
   * @return {number}
   */
  get width() {
    // CACHING VIA UPDATE EVENT FROM CELLS?
    const tmp = Math.max(...this.#cells.map(x => x.contentLength))

    if (tmp < 0) {
      return 0
    }

    return tmp
  }

  /**
   * @param {ListCell} cell
   */
  deleteCell(cell) {
    const before = this.width
    this.#cells = arrayRemoveEntry(this.#cells, cell)
    const now = this.width
    if (now !== before) {
      this.emit('width-change', now, before)
    }
  }

  /**
   *
   * @param {ListCell} cell
   */
  push(cell) {
    const before = this.width
    this.#cells.push(cell)//, cell.content.length)
    const now = this.width

    if (now !== before) {
      this.emit('width-change', now, before)
    }
  }
}
