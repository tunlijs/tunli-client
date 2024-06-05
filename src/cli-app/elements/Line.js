import {ElementNode} from "#src/cli-app/elements/ElementNode";
import blessed from "blessed";

export class Line extends ElementNode {

  /**
   * @param {("horizontal", "vertical")} orientation
   */
  init(orientation = 'horizontal') {

    const line = blessed.line({
      orientation
    })

    this.height = 1
    this.on('position-top', (val) => line.top = val)
    this.on('height', (val) => line.height = val)
    this.on('delete', (val) => line.detach())
    this.screen.append(line)
  }
}