import blessed from 'blessed';
import {ElementNode} from "#src/cli-app/elements/ElementNode";

export class Row extends ElementNode {

  #content
  #row

  set content(content) {
    this.height = content.split("\n").length
    this.#row.content = content
    this.screen.updateElement(this)
  }

  /**
   * @param {string|Ref} content
   */
  init(content, {top, right}) {

    this.offsetTop = top

    this.#content = content
    // this.#rowBefore = rowNodeBefore
    this.#row = blessed.text({
      top: this.positionTop,
      right,
      content
    })

    this.height = 1

    this.on('position-top', (val) => this.#row.top = val)
    this.on('height', (val) => this.#row.height = val)
    this.on('delete', (val) => this.#row.detach())

    this.screen.append(this.#row)
  }
}
