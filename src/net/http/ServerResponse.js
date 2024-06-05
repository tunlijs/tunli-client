import {IncomingMessage} from "#src/net/http/IncomingMessage"
import {TunnelResponse} from "#src/net/http/TunnelResponse"

/**
 * ServerResponse class represents an HTTP response to be sent back to the client.
 */
export class ServerResponse {

  /**
   * @type {IncomingMessage}
   * @private
   */
  #req

  /**
   * @type {Object}
   * @private
   */
  #headers = {}

  /**
   * @type {string}
   * @private
   */
  #httpVersion = '1.1'

  /**
   * @type {TunnelResponse}
   * @private
   */
  #res

  /**
   * @type {string}
   * @private
   */
  #statusMessage = 'OK'

  /**
   * @type {number}
   * @private
   */
  #statusCode = 200

  /**
   * Creates an instance of ServerResponse.
   * @param {IncomingMessage} incomingMessage - The incoming message object.
   */
  constructor(incomingMessage) {
    this.#req = incomingMessage
    this.#res = new TunnelResponse({
      responseId: incomingMessage.id,
      socket: incomingMessage.socket,
    })
  }

  /**
   * Returns the associated IncomingMessage instance.
   * @return {IncomingMessage}
   */
  get req() {
    return this.#req
  }

  /**
   * Sets the status code and message.
   * @param {number} statusCode - The HTTP status code.
   * @param {string} [statusMessage] - The HTTP status message.
   * @return {ServerResponse}
   */
  status(statusCode, statusMessage) {
    this.#statusMessage = statusMessage ?? {
      200: 'OK',
      201: 'Created',
      202: 'Accepted',
      204: 'No Content',
      301: 'Moved Permanently',
      302: 'Found',
      304: 'Not Modified',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      500: 'Internal Server Error',
      501: 'Not Implemented',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout'
    }[statusCode] ?? 'Unknown Status'
    this.#statusCode = statusCode
    return this
  }

  /**
   * Sends the response with the provided body.
   * @param {string|Buffer} body - The body of the response.
   * @return {ServerResponse}
   */
  send(body) {
    this.#res.writeHead(this.#statusCode, this.#statusMessage, this.#headers, this.#httpVersion)
    this.#res.write(body)
    this.#res.end()
    return this
  }

  /**
   * Sets the headers for the response.
   * @param {Object} headers - The headers to set.
   * @return {ServerResponse}
   */
  headers(headers) {
    this.#headers = headers
    return this
  }

  /**
   * Sets the HTTP version for the response.
   * @param {string} httpVersion - The HTTP version to set.
   * @return {ServerResponse}
   */
  httpVersion(httpVersion) {
    this.#httpVersion = httpVersion
    return this
  }
}
