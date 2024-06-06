import {isRef} from "#src/core/Ref";
import {removeControlChars} from "#src/utils/stringFunctions";

export class ListCell {
  /**
   * @type {string}
   */
  #content
  /**
   * @type {ListColumn}
   */
  #column

  /**
   * @type {ListRow}
   */
  #row

  #contentLength

  /**
   *
   * @param content
   * @param {ListColumn} column
   */
  constructor(content, column, index) {

    this.index = index
    if (isRef(content)) {
      content = content.value
    }

    content ??= ''

    const toc = typeof content

    if (toc === 'number') {
      content = content.toString()
    } else if (toc !== 'string') {
      if (content) {
        content = content.toString()
      } else {
        content = 'INVALID_STRING'
      }
    }

    this.#contentLength = removeControlChars(content).length
    this.#content = content
    this.#column = column
    this.#column.push(this)
  }

  get row() {
    return this.#row
  }

  set row(row) {
    this.#row = row
  }

  get contentLength() {
    return this.#contentLength
  }

  get content() {
    return this.#content;
  }

  set content(value) {
    this.#content = value;
  }

  /**
   * @return {ListColumn}
   */
  get column() {
    return this.#column
  }

  delete() {
    this.column.deleteCell(this)
  }
}
