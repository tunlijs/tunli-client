import {isRef} from "#src/core/Ref";
import blessed from 'blessed';
import {ListColumn} from "#src/cli-app/elements/List/ListColumn";
import {ListCell} from "#src/cli-app/elements/List/ListCell";
import {ListRow} from "#src/cli-app/elements/List/ListRow";
import {ElementNode} from "#src/cli-app/elements/ElementNode";
import {padEndIgnoreControlChars} from "#src/utils/stringFunctions";

export class List extends ElementNode {

  /**
   * @type {Screen}
   */
  #screen
  #box
  /**
   * @type {ListRow[]}
   */
  #rows = []
  /**
   * @type {ListColumn[]}
   */
  #columns = []
  #needsUpdate = false

  /**
   * @type {cliListOption}
   */
  #options = {}

  /**
   * @param {cliListOption} [options]
   */
  init(options) {

    options ??= {}
    this.#options.length = options.length
    this.#options.maxLength = options.maxLength ?? this.#options.length
    this.#options.minLength = options.minLength ?? options.maxLength ?? this.#options.length ?? 0
    this.#options.minWidth = options.minWidth ?? 0
    this.#options.reverse = options.reverse === true
    this.#screen = this.screen

    this.height = this.#options.minLength

    this.on('position-top', (val) => this.#box.top = val)
    this.on('height', (val) => this.#box.height = val)
    this.on('delete', () => this.#box.detach())

    this.#box = blessed.box({
      top: this.positionTop,
      // top: 'center',
      left: 'center',
      width: '100%',
      height: this.#options.minLength,
      content: '',
      tags: true,
      // border: {
      //   type: 'line'
      // },
      // style: {   // TODO MOVE TO PRESETS
      //   fg: 'white',
      //   bg: 'blue',
      //   border: {
      //     fg: '#f0f0f0'
      //   },
      // }
    });

    this.#screen.append(this.#box)
  }

  /**
   * @returns {?ListRow}
   */
  row(...content) {

    if (this.detached) {
      return null
    }

    this.#needsUpdate = false
    // ACTUNG ES  MÜSSEN SÄMTLICHE REFERNEZNE GELÖSCHT WEWRDEN DELETE CASCADE
    const cells = content.map((x, index) => {
      this.#columns[index] ??= (new ListColumn()).on('width-change', (newValue, oldValue) => {
        this.#needsUpdate = true
      })
      return new ListCell(x, this.#columns[index], index)
    })

    for (let i = 0; i < cells.length; i++) {
      if (isRef(content[i])) {
        content[i].on('update', (value) => {
          const cell = cells[i]
          const widthBefore = cell.column.width
          cell.content = value
          const needsUpdate = widthBefore !== cell.column.width

          if (needsUpdate) {
            this.#render(needsUpdate)
          } else {
            this.#updateRow(cell.row)
          }
          this.#screen.render()
        })
      }
    }

    const rowNodeBefore = this.#rows[this.#rows.length - 1]
    const rowNew = new ListRow(cells, rowNodeBefore)

    this.#rows.push(rowNew)

    let append = true

    if (this.#options.maxLength) {
      this.#needsUpdate = true
      const delRows = this.#rows.splice(0, this.#rows.length - this.#options.maxLength)
      append = !delRows.length
      for (const del of delRows) {
        del.delete()
      }
    }

    rowNew.on('delete', (/** ListRow */ row) => {
      this.#box.deleteLine(row.lineNumber)

      if (this.#rows[row.lineNumber] === row) {
        delete this.#rows[row.lineNumber]
      }
    }).on('hide', () => {
      this.#render(true)
      this.screen.render()
    }).on('show', () => {
      this.#render(true)
      this.screen.render()
    })

    this.#render(this.#needsUpdate, append)

    return rowNew
  }

  /**
   * @param {ListRow} row
   */
  #updateRow(row) {
    let spacing = 1

    const formatRow = (row) => {
      let contentRow = ``

      const lastCell = row.lastCell

      for (const cell of row.cells) {

        if (cell !== lastCell) {
          contentRow += padEndIgnoreControlChars(cell.content, this.#calWidth(cell))
        }
      }

      contentRow += `${lastCell.content}`
      return contentRow
    }
    this.#box.setLine(row.lineNumber, formatRow(row))
    // this.#screen.render()
  }

  /**
   * @param {ListCell} cell
   */
  #calWidth(cell) {
    const spacing = 1
    let set = this.#options.minWidth

    if (Array.isArray(this.#options.minWidth)) {
      set = this.#options.minWidth[cell.index]
    }

    return Math.max(
      set ?? 0,
      cell.column.width + spacing
    )
  }

  #render(needsUpdate, append) {

    this.#rows = this.#rows.filter(x => !x.deleted)
    const rows = this.#rows
    const visibleRows = this.#rows.filter(row => !row.hidden)

    /**
     * @param {ListRow} row
     * @return {string}
     */
    const formatRow = (row) => {
      let contentRow = ``

      const lastCell = row.lastCell

      for (const cell of row.cells) {

        if (cell !== lastCell) {
          contentRow += padEndIgnoreControlChars(cell.content, this.#calWidth(cell))
        }
      }

      contentRow += `${lastCell.content}`
      return contentRow
    }

    if (append) {
      this.#box.insertLine(visibleRows.length - 1, formatRow(rows[rows.length - 1]))
    }

    if (needsUpdate) {
      for (let i = 0; i < visibleRows.length; i++) {
        const rowId = this.#options.reverse ? visibleRows.length - 1 - i : i
        this.#box.setLine(i, formatRow(visibleRows[rowId]))
      }
    }

    this.height = Math.max(visibleRows.length + 2, this.#options.minLength + 2)// border top bottom

    // Clear empty lines

    for (let i = visibleRows.length; i < this.height; i++) {
      this.#box.setLine(i, '')
    }

    this.screen.updateElement(this)
  }
}
