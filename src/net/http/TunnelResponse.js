import {Duplex} from "stream";

export class TunnelResponse extends Duplex {

  /**
   *
   */
  #socket

  /**
   * uuid v4 request/response id
   * @type {string}
   */
  #responseId

  constructor({socket, responseId, duplex}) {

    super();
    this.#socket = socket;
    this.#responseId = responseId;

    if (duplex) {
      this.#bindEvents()
    }
  }

  #onResponsePipe(responseId, data) {
    if (this.#responseId === responseId) {
      this.push(data);
    }
  }

  #onResponsePipes(responseId, data) {
    if (this.#responseId === responseId) {
      data.forEach((chunk) => {
        this.push(chunk);
      });
    }
  }

  #onResponsePipeError(responseId, error) {
    if (this.#responseId === responseId) {
      this.destroy(new Error(error));
    }
  }

  #onResponsePipeEnd(responseId, data) {
    if (this.#responseId === responseId) {
      if (data) {
        this.push(data);
      }
      this.push(null);
    }
  }

  #bindEvents() {

    const events = {
      'response-pipe': this.#onResponsePipe.bind(this),
      'response-pipes': this.#onResponsePipes.bind(this),
      'response-pipe-error': this.#onResponsePipeError.bind(this),
      'response-pipe-end': this.#onResponsePipeEnd.bind(this)
    };

    for (const [event, handler] of Object.entries(events)) {
      this.#socket.on(event, handler);
    }

    this.once('close', () => {
      console.log('CLOSING CALL')
      for (const [event, handler] of Object.entries(events)) {
        this.#socket.off(event, handler);
      }
    })
  }

  _write(chunk, encoding, callback) {
    this.#socket.emit('response-pipe', this.#responseId, chunk);
    this.#socket.io.engine.once('drain', callback)
  }

  _writev(chunks, callback) {
    this.#socket.emit('response-pipes', this.#responseId, chunks);
    this.#socket.io.engine.once('drain', callback)
  }

  _final(callback) {
    this.#socket.emit('response-pipe-end', this.#responseId);
    this.#socket.io.engine.once('drain', callback)
  }

  _destroy(e, callback) {
    if (e) {
      this.#socket.emit('response-pipe-error', this.#responseId, e && e.message);
      this.#socket.io.engine.once('drain', callback)
      return;
    }
    callback();
  }

  /**
   * @param {number} statusCode
   * @param {string} statusMessage
   * @param {Object} headers
   * @param {string} httpVersion
   */
  writeHead(statusCode, statusMessage, headers, httpVersion) {

    this.#socket.emit('response', this.#responseId, {
      statusCode,
      statusMessage,
      headers,
      httpVersion,
    });
  }

  _read(size) {
  }
}
