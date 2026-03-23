import type {ProfileConfig} from "#types/types";
import type {AppEventEmitter} from "#cli-app/AppEventEmitter";

export const initLiveLog = (_config: ProfileConfig, appEventEmitter: AppEventEmitter) => {

  const stdout = (msg: string) => process.stdout.write(`${msg}\n`)

  appEventEmitter.on('response', (req, res) => {
    stdout(`${req.method} ${req.path} - ${res.statusCode} ${res.statusMessage}`)
  }).on('request', (req) => {
    stdout(`→ ${req.method} ${req.path}`)
  }).on('connect', () => {
    stdout('client connected')
  }).on('client-blocked', ip => {
    stdout(`blocked ip ${ip}`)
  }).on('disconnect', () => {
    stdout('client disconnected')
  }).on('connect_error', (e) => {
    stdout(`connection error: ${e.message}`)
  }).on('request-error', (e, meta) => {
    if (meta.isUpgrade) {
      stdout(`[upgrade] TCP error ${meta.requestId}: ${e.message}`)
    } else {
      stdout(`[request] local error ${meta.requestId}: ${e.message}`)
    }
  }).on('ready', (info) => {
    stdout('[auth] registered, token received')
    stdout(`[tunnel] id=${info.proxyIdent}`)
    stdout(`[tunnel] url=${info.proxyURL} → ${info.target.host}:${info.target.port}`)
  })
}
