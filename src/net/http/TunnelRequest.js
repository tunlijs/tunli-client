import {Readable} from "stream";
import http from "http";
import {TunnelResponse} from "#src/net/http/TunnelResponse";

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
 * @param req
 * @param {EventEmitter} eventEmitter
 */
export const forwardTunnelRequestToProxyTarget = (req, eventEmitter) => {
  const tunnelRequest = new TunnelRequest({
    requestId: req.requestId,
    socket: req.tunnelSocket,
  });

  const isWebSocket = req.headers.upgrade === 'websocket';

  const localReq = http.request(req);
  tunnelRequest.pipe(localReq);

  setupErrorHandlers(tunnelRequest, localReq)

  const onLocalResponse = (localRes) => {
    localReq.off('error', onLocalError);
    if (isWebSocket && localRes.upgrade) {
      return;
    }
    const tunnelResponse = new TunnelResponse({
      responseId: req.requestId,
      socket: req.tunnelSocket,
    });

    tunnelResponse.writeHead(
      localRes.statusCode,
      localRes.statusMessage,
      localRes.headers,
      localRes.httpVersion
    );
    localRes.pipe(tunnelResponse);
    if (!isWebSocket) {
      eventEmitter.emit('response', localRes, req)
    }
  };
  const onLocalError = (error) => {

    let statusCode = 500
    let statusMessage = 'UNKNOWN ERROR'
    if (error.code === 'ECONNREFUSED') {
      statusCode = 502
      statusMessage = 'Bad gateway'
    } else {
      console.error('IMPLEMENT ME')
      console.error(error)
    }

    eventEmitter.emit('response', {statusCode, statusMessage}, req)
    localReq.off('response', onLocalResponse);
    req.tunnelSocket.emit('request-error', req.requestId, error && error.message);
    tunnelRequest.destroy(error);
  };
  const onUpgrade = (localRes, localSocket, localHead) => {
    if (localHead && localHead.length) {
      localSocket.unshift(localHead);
    }

    const tunnelResponse = new TunnelResponse({
      responseId: req.requestId,
      socket: req.tunnelSocket,
      duplex: true,
    });

    tunnelResponse.writeHead(null, null, localRes.headers);
    localSocket
      .pipe(tunnelResponse)
      .pipe(localSocket);
  };

  localReq.once('error', onLocalError);
  localReq.once('response', onLocalResponse);

  if (isWebSocket) {
    localReq.on('upgrade', onUpgrade);
  }
}
