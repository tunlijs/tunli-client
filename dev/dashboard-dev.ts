/**
 * Dev script: starts the dashboard with fake data for UI development.
 * Run with: tsc && node dist/dev/dashboard-dev.js
 */
import {AppEventEmitter} from '#cli-app/AppEventEmitter'
import {initDashboard} from '#cli-app/Dashboard'
import type {ProfileConfig} from '#types/types'
import type {IncomingHttpHeaders} from 'http'

const fakeConfig: ProfileConfig = {
  profileName: 'dev',
  filepath: '~/.tunli/config.json',
  proxy: {
    proxyURL: 'https://dev-abc123.tunli.app',
    connectionPoolSize: 3,
  },
  target: {
    host: 'localhost',
    port: 8080,
  },
  server: {
    apiBaseUrl: 'https://api.tunli.app',
    socketBaseUrl: 'wss://relay.tunli.app',
  },
  allowedCidr: [],
  deniedCidr: [],
}

const emitter = new AppEventEmitter()
initDashboard(fakeConfig, emitter)

// Simulate connect after 800ms
setTimeout(() => {
  emitter.emit('connect')
  emitter.emit('latency', 42)
}, 800)

// Simulate periodic latency updates
setInterval(() => {
  emitter.emit('latency', Math.floor(Math.random() * 120) + 10)
}, 3000)

// Simulate incoming requests
const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
const PATHS = [
  '/api/users',
  '/api/users/42',
  '/api/auth/login',
  '/health',
  '/api/products?page=1&limit=20',
  '/api/orders/9f3a',
  '/static/app.js',
  '/favicon.ico',
  '/api/v2/organizations/f47ac10b-58cc-4372-a567-0e02b2c3d479/members?role=admin&page=2&limit=50',
  '/api/v1/reports/monthly/2024-03/export?format=csv&include=summary,details,breakdown',
]
const STATUSES: {statusCode: number; statusMessage: string}[] = [
  {statusCode: 200, statusMessage: 'OK'},
  {statusCode: 200, statusMessage: 'OK'},
  {statusCode: 200, statusMessage: 'OK'},
  {statusCode: 201, statusMessage: 'Created'},
  {statusCode: 204, statusMessage: 'No Content'},
  {statusCode: 301, statusMessage: 'Moved Permanently'},
  {statusCode: 400, statusMessage: 'Bad Request'},
  {statusCode: 401, statusMessage: 'Unauthorized'},
  {statusCode: 404, statusMessage: 'Not Found'},
  {statusCode: 422, statusMessage: 'Unprocessable Entity'},
  {statusCode: 500, statusMessage: 'Internal Server Error'},
]

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!

let reqId = 0
const fakeHeaders: IncomingHttpHeaders = {'content-type': 'application/json', 'user-agent': 'curl/8.0'}

const sendFakeRequest = () => {
  const id = `req-${reqId++}`
  const method = pick(METHODS)
  const path = pick(PATHS)
  const status = pick(STATUSES)

  emitter.emit('request', {method, path, headers: fakeHeaders, requestId: id, isUpgrade: false})

  setTimeout(() => {
    emitter.emit('response',
      {host: 'localhost', port: 8080, method, path, headers: fakeHeaders, requestId: id},
      {statusCode: status.statusCode, statusMessage: status.statusMessage, httpVersion: '1.1', headers: {}},
    )
  }, Math.random() * 200 + 20)
}

// First request after 1.5s, then random intervals
setTimeout(() => {
  sendFakeRequest()
  setInterval(sendFakeRequest, Math.random() * 1500 + 500)
}, 1500)

// Simulate a disconnect/reconnect after 10s
setTimeout(() => {
  emitter.emit('disconnect', 'transport close')
  setTimeout(() => {
    emitter.emit('connect')
    emitter.emit('latency', 67)
  }, 2000)
}, 10_000)
