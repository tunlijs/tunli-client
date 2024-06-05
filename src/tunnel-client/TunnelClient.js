import {securedHttpClient} from "#lib/HttpClient";
import HttpsProxyAgent from "https-proxy-agent";
import {forwardTunnelRequestToProxyTarget} from "#src/net/http/TunnelRequest";
import {io} from "socket.io-client";
import EventEmitter from "node:events";
import {ref} from "#src/core/Ref";
import {isValidRemoteAddress} from "#commands/helper/BindArgs";
import {createRequestFromRaw} from "#src/utils/httpFunction";

export class TunnelClient extends EventEmitter {

  /**
   * @type {tunnelClientOptions}
   */
  #options
  #socket
  #latency = ref(0)

  /**
   * @param {tunnelClientOptions} options
   */
  constructor(options) {
    super()
    this.#options = options
  }

  get latency() {
    return this.#latency
  }

  #bindEvents() {

    const socket = this.#socket
    const options = this.#options

    socket.on('connect', () => {
      if (socket.connected) {
        this.emit('tunnel-connection-established')
      }
    })

    socket.on('connect_error', (e) => {
      this.emit('tunnel-connection-error', e)
    })

    socket.on('disconnect', () => {
      this.emit('tunnel-connection-closed')
    })

    socket.on('request', ( /** string */ requestId, /** SocketIoRawRequestObject */ request) => {

      const req = createRequestFromRaw(request, requestId, socket)
      request.requestId = requestId
      request.tunnelSocket = socket

      if (!isValidRemoteAddress(req.remoteAddress, options)) {
        this.emit('blocked', req.remoteAddress)
        req.res.status(401).send(`Access denied for ip ${req.remoteAddress}`)
        return;
      }

      const isWebSocket = request.headers.upgrade === 'websocket';

      request.port = options.port;
      request.hostname = options.host;

      if (options.origin) {
        request.headers.host = options.origin;
      }

      if (!isWebSocket) {
        this.emit('request', request)
      }

      forwardTunnelRequestToProxyTarget(request, this)
    })
  }

  async #keepAlive() {
    const ping = () => {
      const start = Date.now();
      this.#socket.volatile.emit('ping', () => {
        this.#latency.value = Date.now() - start;
      });
    }

    while (this.#latency.value === 0) {
      ping()
      await new Promise((resolve) => setTimeout((resolve), 100))
    }

    setInterval(ping, 5000)
  }

  async init(dashboard) {
    const params = await this.#createParameters(dashboard)
    this.#socket = io(this.#options.server, params)
    this.#bindEvents()
    this.#keepAlive();
    return this
  }

  async #createParameters(dashboard) {
    const options = this.#options
    const webSocketCapturePath = await securedHttpClient(options.authToken).get('/capture_path')

    if (webSocketCapturePath.error) {
      dashboard.destroy()
      if (webSocketCapturePath.error?.message === 'Request failed with status code 401') {
        console.error('missing authorization, check your registration and try again')
      } else {
        console.error('could not connect to remote server. pls try again later')
      }

      process.exit(1)
    }

    const initParams = {
      path: webSocketCapturePath.data,
      transports: ['websocket'],
      auth: {
        token: options.authToken,
      },
      extraHeaders: {},
    };

    if (options.path) {
      initParams.extraHeaders['path-prefix'] = options.path;
    }

    const http_proxy = process.env.https_proxy || process.env.http_proxy;
    if (http_proxy) {
      initParams.agent = new HttpsProxyAgent(http_proxy);
    }

    return initParams
  }
}
