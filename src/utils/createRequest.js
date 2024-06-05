import {Socket} from "socket.io-client";
import {IncomingRequest} from "#lib/Tunnel/IncomingRequest";

/**
 * @param {IncomingSocketIoRequest} incomingSocketIoRequest
 * @param {RequestId} requestId
 * @param {Socket} socket
 * @returns {IncomingRequest}
 */
export const createRequestFromSocketIoRequest = (incomingSocketIoRequest, requestId, socket) => {
  return new IncomingRequest(incomingSocketIoRequest, requestId, socket)
}
