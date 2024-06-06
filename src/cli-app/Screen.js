import {List} from "#src/cli-app/elements/List/List";
import EventEmitter from "node:events";
import {Row} from "#src/cli-app/elements/Row";
import {ElementNode} from "#src/cli-app/elements/ElementNode";
import {arrayRemoveEntry} from "#src/utils/arrayFunctions";
import {Line} from "#src/cli-app/elements/Line";

export class Screen extends EventEmitter {

  #screen

  /**
   * @type {ElementNode[]}
   */
  #elements = []

  constructor(screen) {
    super()
    this.#screen = screen

    for (const proxyFn of ['append']) {
      this[proxyFn] = (...arg) => {
        screen[proxyFn](...arg)
      }
    }

    const ele = new ElementNode(this)
    ele._cached.height = ele.height
    ele._cached.top = ele.positionTop
    this.#elements.push(ele)

    this.on('delete-element', (ele) => {
      this.#elements = arrayRemoveEntry(this.#elements, ele)
    })

    screen.on('keypress', (char, details) => this.emit('keypress', char, /** keypressEventDetails */ details))
  }

  get screen() {
    return this.#screen
  }

  get children() {
    return this.#elements
  }

  /**
   * @param {string|array} key
   * @param {keypressEventListener} callback
   */
  key(key, callback) {
    this.#screen.key(key, callback)
  }

  /**
   * @param {string|array} key
   * @param {keypressEventListener} callback
   */
  onceKey(key, callback) {
    this.#screen.onceKey(key, callback)
  }

  render() {
    this.#screen.render()
  }

  destroy() {
    this.#screen.destroy()
  }

  /**
   *
   * @param {ElementNode} ele
   */
  updateElement(ele) {

    const heightChanged = ele._cached.height === ele.height
    const topChanged = ele._cached.top === ele.positionTop

    ele._cached.height = ele.height
    ele._cached.top = ele.positionTop

    if (heightChanged || topChanged) {
      ele.nextElementSibling?.emit('prev-resize', ele)
    }
  }

  /**
   * @param {cliListOption} [options]
   * @returns {List}
   */
  list(options) {
    const ele = new List(this)
    ele.init(options)

    ele._cached.height = ele.height
    ele._cached.top = ele.positionTop

    this.#elements.push(ele)
    return ele
  }

  /**
   * @param content
   * @param [top]
   * @param [right]
   * @returns {Row}
   */
  row(content, {top, right} = {}) {
    const ele = new Row(this)
    ele.init(content, {top, right})
    ele._cached.height = ele.height
    ele._cached.top = ele.positionTop

    this.#elements.push(ele)
    return ele
  }

  line() {
    const ele = new Line(this)
    ele.init()
    ele._cached.height = ele.height
    ele._cached.top = ele.positionTop
    this.#elements.push(ele)
    return ele
  }
}
