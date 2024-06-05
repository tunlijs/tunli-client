import {ServerResponse} from "#src/net/http/ServerResponse"
import {Socket} from "socket.io-client"
import {getRemoteAddress} from "#src/utils/httpFunction"

/**
 * IncomingMessage class represents an HTTP request received by the server.
 */
export class IncomingMessage {
  /**
   * @type {ServerResponse}
   * @private
   */
  #res

  /**
   * @type {string}
   * @private
   */
  #id

  /**
   * @type {Socket}
   * @private
   */
  #socket

  /**
   * @type {string}
   * @private
   */
  #remoteAddress

  /**
   * @type {string}
   * @private
   */
  #url

  /**
   * Creates an instance of IncomingMessage.
   * @param {SocketIoRawRequestObject} request - The raw request object.
   * @param {string} requestId - The unique request identifier.
   * @param {Socket} socket - The socket to communicate over.
   */
  constructor(request, requestId, socket) {
    this.#url = request.path
    this.#id = requestId
    this.#socket = socket
    this.#remoteAddress = getRemoteAddress(request)
  }

  /**
   * Returns the URL path.
   * @return {string}
   */
  get url() {
    return this.#url
  }

  /**
   * Returns the remote address.
   * @return {string}
   */
  get remoteAddress() {
    return this.#remoteAddress
  }

  /**
   * Returns the unique request identifier.
   * @return {string}
   */
  get id() {
    return this.#id
  }

  /**
   * Returns the socket associated with the request.
   * @return {Socket}
   */
  get socket() {
    return this.#socket
  }

  /**
   * Returns the ServerResponse instance, creating it if necessary.
   * @return {ServerResponse}
   */
  get res() {
    this.#res ??= new ServerResponse(this)
    return this.#res
  }
}
