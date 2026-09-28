import http, {type IncomingMessage, type ServerResponse} from 'node:http'
import {createWriteStream} from 'node:fs'
import {link, mkdir, open, realpath, stat, truncate, unlink} from 'node:fs/promises'
import {basename, join} from 'node:path'
import {createHash, randomBytes, randomUUID} from 'node:crypto'
import {Transform} from 'node:stream'
import {pipeline} from 'node:stream/promises'
import {renderReceivePage} from '#receive/ReceivePage'

export type ReceiveServer = {port: number; path: string; close: () => Promise<void>}

type ReceiveOptions = {
  once: boolean
  maxBytes: number
  onUpload: (name: string, bytes: number) => void
  onOnceComplete: () => void
}

type Upload = {
  id: string
  name: string
  size: number
  offset: number
  temp: string
  active: boolean
  updatedAt: number
  savedName?: string
}

const CHUNK_SIZE = 4 * 1024 * 1024
const SESSION_TTL = 60 * 60 * 1000
const MAX_SESSIONS = 100

const send = (res: ServerResponse, status: number, data: Record<string, unknown>) => {
  if (res.destroyed) return
  res.writeHead(status, {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'})
  res.end(JSON.stringify(data))
}

const validName = (name: unknown): name is string =>
  typeof name === 'string' && !!name && name !== '.' && name !== '..' &&
  name === basename(name) && !/[\\/\x00-\x1f\x7f]/u.test(name) && Buffer.byteLength(name) <= 240

const readMetadata = async (req: IncomingMessage): Promise<unknown> => {
  const parts: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > 8192) throw new Error('Metadata is too large')
    parts.push(chunk)
  }
  return JSON.parse(Buffer.concat(parts).toString('utf8')) as unknown
}

const snapshot = (upload: Upload) => ({
  id: upload.id,
  name: upload.name,
  size: upload.size,
  offset: upload.offset,
  chunkSize: CHUNK_SIZE,
  ...(upload.savedName ? {savedName: upload.savedName} : {}),
})

export const startReceiveServer = async (directory: string, options: ReceiveOptions): Promise<ReceiveServer> => {
  await mkdir(directory, {recursive: true})
  const target = await realpath(directory)
  if (!(await stat(target)).isDirectory()) throw new Error('Destination is not a directory')
  const path = `/receive/${randomBytes(24).toString('base64url')}`
  const uploads = new Map<string, Upload>()
  let completed = false
  let creatingOnce = false

  const discard = async (upload: Upload) => {
    uploads.delete(upload.id)
    await unlink(upload.temp).catch(() => {})
  }

  const cleanup = setInterval(() => {
    const cutoff = Date.now() - SESSION_TTL
    for (const upload of uploads.values()) {
      if (!upload.active && upload.updatedAt < cutoff) void discard(upload)
    }
  }, 60_000)
  cleanup.unref()

  const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('x-content-type-options', 'nosniff')
    res.setHeader('referrer-policy', 'no-referrer')
    let url: URL
    try {url = new URL(req.url ?? '/', 'http://localhost')} catch {send(res, 400, {message: 'Invalid URL'}); return}
    if ((url.pathname === path || url.pathname === `${path}/`) && req.method === 'GET') {
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'content-security-policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'",
      })
      res.end(renderReceivePage(`${path}/`, options.once, options.maxBytes))
      return
    }
    if (!url.pathname.startsWith(`${path}/uploads`)) {send(res, 404, {message: 'Not found'}); return}
    const suffix = url.pathname.slice(`${path}/uploads`.length)

    if (suffix === '' && req.method === 'POST') {
      if (options.once && (completed || creatingOnce || uploads.size > 0)) {
        send(res, 410, {message: 'This link has already been used'})
        return
      }
      if ([...uploads.values()].filter(upload => !upload.savedName).length >= MAX_SESSIONS) {
        send(res, 429, {message: 'Too many active uploads'})
        return
      }
      if (options.once) creatingOnce = true
      try {
        let metadata: unknown
        try {metadata = await readMetadata(req)} catch {send(res, 400, {message: 'Invalid upload metadata'}); return}
        const {name, size} = metadata && typeof metadata === 'object' ? metadata as Record<string, unknown> : {}
        if (!validName(name) || typeof size !== 'number' || !Number.isSafeInteger(size) || size < 0) {
          send(res, 400, {message: 'Invalid file name or size'})
          return
        }
        if (size > options.maxBytes) {send(res, 413, {message: 'File is too large'}); return}
        const id = randomBytes(24).toString('base64url')
        const temp = join(target, `.tunli-upload-${randomUUID()}.part`)
        try {
          const handle = await open(temp, 'wx', 0o600)
          await handle.close()
        } catch {send(res, 500, {message: 'Could not create upload'}); return}
        const upload: Upload = {id, name, size, offset: 0, temp, active: false, updatedAt: Date.now()}
        uploads.set(id, upload)
        send(res, 201, snapshot(upload))
      } finally {
        creatingOnce = false
      }
      return
    }

    const match = /^\/([A-Za-z0-9_-]{32})(\/complete)?$/.exec(suffix)
    if (!match) {send(res, 404, {message: 'Not found'}); return}
    const upload = uploads.get(match[1]!)
    if (!upload) {send(res, 404, {message: 'Upload session expired or not found'}); return}
    upload.updatedAt = Date.now()

    if (!match[2] && req.method === 'GET') {send(res, 200, snapshot(upload)); return}
    if (!match[2] && req.method === 'DELETE') {
      if (upload.active) {send(res, 409, {message: 'Chunk is still uploading'}); return}
      if (upload.savedName) {send(res, 409, {message: 'Upload already completed'}); return}
      upload.active = true
      await discard(upload)
      send(res, 204, {})
      return
    }
    if (!match[2] && req.method === 'PUT') {
      if (upload.savedName) {send(res, 409, snapshot(upload)); return}
      if (upload.active) {send(res, 409, {message: 'Chunk is still uploading'}); return}
      const offset = Number(req.headers['x-upload-offset'])
      const digest = req.headers['x-chunk-sha256']
      if (!Number.isSafeInteger(offset) || offset !== upload.offset) {
        send(res, 409, {...snapshot(upload), message: 'Offset mismatch'})
        return
      }
      const expected = Math.min(CHUNK_SIZE, upload.size - upload.offset)
      if (expected <= 0) {send(res, 409, {...snapshot(upload), message: 'All chunks received'}); return}
      if (typeof digest !== 'string' || !/^[a-f0-9]{64}$/i.test(digest)) {
        send(res, 400, {message: 'Missing chunk checksum'})
        return
      }
      const declaredSize = Number(req.headers['content-length'])
      if (Number.isFinite(declaredSize) && declaredSize !== expected) {
        send(res, 400, {message: 'Incorrect chunk size'})
        return
      }
      upload.active = true
      let bytes = 0
      const hash = createHash('sha256')
      const check = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          bytes += chunk.length
          if (bytes > expected) {callback(new Error('Chunk is too large')); return}
          hash.update(chunk)
          callback(null, chunk)
        },
      })
      try {
        await pipeline(req, check, createWriteStream(upload.temp, {flags: 'r+', start: offset}))
        if (bytes !== expected) throw new Error('Incomplete chunk')
        if (hash.digest('hex') !== digest.toLowerCase()) throw new Error('Chunk checksum mismatch')
        upload.offset += bytes
        send(res, 200, snapshot(upload))
      } catch (error) {
        await truncate(upload.temp, upload.offset).catch(() => {})
        send(res, 400, {message: error instanceof Error ? error.message : 'Chunk failed', offset: upload.offset})
      } finally {
        upload.active = false
        upload.updatedAt = Date.now()
      }
      return
    }

    if (match[2] && req.method === 'POST') {
      if (upload.savedName) {send(res, 200, snapshot(upload)); return}
      if (upload.active || upload.offset !== upload.size) {
        send(res, 409, {...snapshot(upload), message: 'Upload is incomplete'})
        return
      }
      upload.active = true
      try {
        let savedName = upload.name
        for (let index = 1; ; index++) {
          try {await link(upload.temp, join(target, savedName)); break}
          catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
            const dot = upload.name.lastIndexOf('.')
            const stem = dot > 0 ? upload.name.slice(0, dot) : upload.name
            const ext = dot > 0 ? upload.name.slice(dot) : ''
            savedName = `${stem} (${index})${ext}`
          }
        }
        upload.savedName = savedName
        completed = true
        await unlink(upload.temp).catch(() => {})
        options.onUpload(savedName, upload.size)
        send(res, 201, snapshot(upload))
        if (options.once) res.once('finish', options.onOnceComplete)
      } catch (error) {
        send(res, 500, {message: error instanceof Error ? error.message : 'Could not complete upload'})
      } finally {
        upload.active = false
      }
      return
    }
    send(res, 404, {message: 'Not found'})
  })

  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => {server.off('error', reject); resolve()})
    })
  } catch (error) {
    clearInterval(cleanup)
    server.close()
    throw error
  }
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Could not start upload server')
  return {port: address.port, path, close: () => new Promise(resolve => {
    clearInterval(cleanup)
    server.close(() => {
      void Promise.all([...uploads.values()].filter(upload => !upload.savedName).map(discard)).then(() => resolve())
    })
    server.closeAllConnections()
  })}
}
