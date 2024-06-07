import {Readable} from "stream";
import {TunnelResponse} from "#src/net/http/TunnelResponse";
import https from "node:https";
import http from "node:http";

class TunnelRequest extends Readable {

  #socket

  /**
   * uuid v4 request/response id
   * @type {string}
   */
  #requestId

  constructor({socket, requestId}) {

    super();
    this.#socket = socket;
    this.#requestId = requestId;

    this.#bindEvents()
  }

  #bindEvents() {
    const events = {
      'request-pipe': this.#onRequestPipe.bind(this),
      'request-pipes': this.#onRequestPipes.bind(this),
      'request-pipe-error': this.#onRequestPipeError.bind(this),
      'request-pipe-end': this.#onRequestPipeEnd.bind(this),
    }

    for (const [event, handler] of Object.entries(events)) {
      this.#socket.on(event, handler);
    }

    this.once('close', () => {
      for (const [event, handler] of Object.entries(events)) {
        this.#socket.off(event, handler);
      }
    })
  }

  #onRequestPipe(requestId, data) {
    if (this.#requestId === requestId) {
      this.push(data);
    }
  }

  #onRequestPipes(requestId, data) {
    if (this.#requestId === requestId) {
      data.forEach((chunk) => {
        this.push(chunk);
      });
    }
  }

  #onRequestPipeError(requestId, error) {
    if (this.#requestId === requestId) {
      this.destroy(new Error(error));
    }
  }

  #onRequestPipeEnd(requestId, data) {
    if (this.#requestId === requestId) {
      if (data) {
        this.push(data);
      }
      this.push(null);
    }
  }

  _read() {
    // No op
  }
}

const setupErrorHandlers = (source, target) => {
  const onTunnelRequestError = (e) => {
    source.off('end', onTunnelRequestEnd);
    target.destroy(e);
  };
  const onTunnelRequestEnd = () => {
    target.off('error', onTunnelRequestError);
  };

  source.once('error', onTunnelRequestError);
  source.once('end', onTunnelRequestEnd);
};


/**
 * @param {SocketIoRawRequestObject} req
 * @param {EventEmitter} eventEmitter
 * @param {tunnelClientOptions} options
 */
export const forwardTunnelRequestToProxyTarget = (req, eventEmitter, options) => {

  const tunnelRequest = new TunnelRequest({
    requestId: req.requestId,
    socket: req.tunnelSocket,
  });

  const isWebSocket = req.headers.upgrade === 'websocket'
  const localReq = options.protocol === 'https' ? https.request(req) : http.request(req)

  tunnelRequest.pipe(localReq)

  setupErrorHandlers(tunnelRequest, localReq)

  const onLocalResponse = (localRes) => {

    localReq.off('error', onLocalError)

    if (isWebSocket && localRes.upgrade) {
      return
    }

    if (!isWebSocket) rewriteResponse(localRes, options)

    const tunnelResponse = new TunnelResponse({
      responseId: req.requestId,
      socket: req.tunnelSocket,
    })

    tunnelResponse.writeHead(
      localRes.statusCode,
      localRes.statusMessage,
      localRes.headers,
      localRes.httpVersion
    )
    localRes.pipe(tunnelResponse)
    if (!isWebSocket) {
      eventEmitter.emit('response', localRes, req)
    }
  }
  const onLocalError = (error) => {

    let statusCode = 500
    let statusMessage = 'UNKNOWN ERROR'
    if (error.code === 'ECONNREFUSED') {
      statusCode = 502
      statusMessage = 'Bad gateway'
    } else if (error.code === 'ECONNRESET') {
      statusCode = 500
      statusMessage = 'Connection reset'
    } else {
      console.error('IMPLEMENT ME')
      console.error(error)
      console.error(error.code)
    }

    eventEmitter.emit('response', {statusCode, statusMessage}, req)
    localReq.off('response', onLocalResponse)
    req.tunnelSocket.emit('request-error', req.requestId, error && error.message)
    tunnelRequest.destroy(error)
  }
  const onUpgrade = (localRes, localSocket, localHead) => {
    if (localHead && localHead.length) {
      localSocket.unshift(localHead)
    }

    const tunnelResponse = new TunnelResponse({
      responseId: req.requestId,
      socket: req.tunnelSocket,
      duplex: true,
    })

    tunnelResponse.writeHead(null, null, localRes.headers)
    localSocket
      .pipe(tunnelResponse)
      .pipe(localSocket)
  }

  localReq.once('error', onLocalError)
  localReq.once('response', onLocalResponse)

  if (isWebSocket) {
    localReq.on('upgrade', onUpgrade)
  }
}


/**
 * @param {Response<IncomingMessage>} localRes
 * @param {tunnelClientOptions} options
 */
const rewriteResponse = (localRes, options) => {

  options.proxyURL ??= options.server

  const hostSearch = options.origin ?? options.host
  const {protocol: protocolReplace, hostname: hostReplace} = new URL(options.proxyURL)
  const baseURL = new URL(`${options.protocol}://${hostSearch}:${options.port}`).toString()

  if (localRes.statusCode === 301) {
    delete localRes.headers.location
  }

  let location = localRes.headers.location
  let setCookie = localRes.headers['set-cookie']

  if (!setCookie || !Array.isArray(setCookie)) {
    setCookie = null
  }

  if (location) {
    location = new URL(location, baseURL).toString()
  }

  if (location && location.charAt(0) !== '/' && location.startsWith(baseURL)) {
    localRes.headers.location = location.replace(baseURL, options.proxyURL)
  }

  if (setCookie) {
    localRes.headers['set-cookie'] = setCookie.map(cookie => {
      return updateCookieDomain(cookie, hostReplace) // TODO MOVE THIS PART TO SERVER
    })
  }
}

function extractDomainFromCookieString(cookie) {
  const domainMatch = cookie.match(/Domain=([^;]+)/);
  return domainMatch ? domainMatch[1] : null;
}

function updateCookieDomain(cookie, newDomain) {
  return cookie.replace(/Domain=[^;]+/, `Domain=${newDomain}`);
}
