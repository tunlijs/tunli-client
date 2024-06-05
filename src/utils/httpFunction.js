import {IncomingMessage} from "#src/net/http/IncomingMessage"
import {Socket} from "socket.io-client"

/**
 * Retrieves the remote address from the request headers.
 * @param {http.IncomingMessage|SocketIoRawRequestObject} request - The incoming HTTP or Socket.IO request object.
 * @return {string} - The remote address.
 */
export const getRemoteAddress = (request) => {
  return request.headers['x-real-ip']
    ?? request.headers['x-forwarded-for']
}

/**
 * Creates an IncomingMessage instance from a raw Socket.IO request object.
 * @param {SocketIoRawRequestObject} req - The raw Socket.IO request object.
 * @param {string} requestId - The unique request identifier.
 * @param {Socket} socket - The socket associated with the request.
 * @return {IncomingMessage} - The created IncomingMessage instance.
 */
export const createRequestFromRaw = (req, requestId, socket) => {
  return new IncomingMessage(req, requestId, socket)
}
