import EventEmitter from "node:events";

export class ElementNode extends EventEmitter {

  _cached = {
    top: null,
    height: null
  }

  /**
   * @type {ElementNode}
   */
  #nextElementSibling
  /**
   * @type {ElementNode}
   */
  #prevElementSibling
  /**
   * @type {Screen}
   */
  #screen
  #height = 0


  #detached = false
  #offsetTop = 0;

  /**
   * @param {Screen} screen
   */
  constructor(screen) {
    super()
    this.#screen = screen

    if (screen.children.length) {
      const before = screen.children[screen.children.length - 1]
      before.#nextElementSibling = this
      this.#prevElementSibling = before
    }

    /**
     * prev element postop and height
     */
    this.on('prev-resize', ({positionTop, height}) => {
      this.emit('position-top', positionTop + height)
      this.nextElementSibling?.emit('prev-resize', this)
    })
  }

  get detached() {
    return this.#detached
  }

  get nextElementSibling() {
    return this.#nextElementSibling
  }

  get positionTop() {
    if (this.#prevElementSibling) {
      return this.#prevElementSibling.positionTop + this.#prevElementSibling.height + this.#offsetTop
    }
    return this.#offsetTop
  }

  set offsetTop(offsetTop) {
    this.#offsetTop = offsetTop ?? 0
  }

  get screen() {
    return this.#screen
  }

  get height() {
    return this.#height
  }

  set height(height) {
    const update = this.#height !== height
    this.#height = height
    if (update) {
      this.emit('height', height)
    }
  }

  delete() {

    this.#screen.emit('delete-element', this)
    this.emit('delete', this)
    this.#detached = true
    const next = this.#nextElementSibling

    if (next) {
      next.#prevElementSibling = this.#prevElementSibling
      this.#nextElementSibling?.emit('prev-resize', this.#prevElementSibling)
    }
  }
}
