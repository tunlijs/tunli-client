import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdtemp, readFile, readdir, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {Script} from 'node:vm'
import {startReceiveServer} from '../dist/receive/ReceiveServer.js'

const sha256 = body => createHash('sha256').update(body).digest('hex')

const create = async (base, name, size) => {
  const res = await fetch(`${base}uploads`, {
    method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({name, size}),
  })
  return {status: res.status, data: await res.json()}
}

const put = (base, id, offset, body, digest = sha256(body)) => fetch(`${base}uploads/${id}`, {
  method: 'PUT',
  headers: {'content-type': 'application/octet-stream', 'x-upload-offset': String(offset), 'x-chunk-sha256': digest},
  body,
})

test('chunked upload resumes at a confirmed offset and never exposes a partial file', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tunli-receive-'))
  const received = []
  const receiver = await startReceiveServer(dir, {
    once: false,
    maxBytes: 8 * 1024 * 1024,
    onUpload: (name, bytes) => received.push({name, bytes}),
    onOnceComplete: () => {},
  })
  const base = `http://127.0.0.1:${receiver.port}${receiver.path}/`
  try {
    assert.equal((await fetch(base.slice(0, -1))).status, 200)
    const page = await fetch(base)
    assert.equal(page.status, 200)
    const html = await page.text()
    assert.match(html, /can resume/)
    assert.doesNotThrow(() => new Script(html.split('<script>')[1].split('</script>')[0]))
    assert.equal((await fetch(`http://127.0.0.1:${receiver.port}/`)).status, 404)

    const first = Buffer.alloc(4 * 1024 * 1024, 42)
    const last = Buffer.from('last chunk')
    const {status, data} = await create(base, 'archive.zip', first.length + last.length)
    assert.equal(status, 201)
    assert.equal(data.chunkSize, first.length)
    assert.equal((await put(base, data.id, 0, first)).status, 200)

    const resumed = await (await fetch(`${base}uploads/${data.id}`)).json()
    assert.equal(resumed.offset, first.length)
    assert.deepEqual((await readdir(dir)).filter(name => !name.endsWith('.part')), [])
    assert.equal((await put(base, data.id, 0, first)).status, 409)
    assert.equal((await put(base, data.id, first.length, last, '0'.repeat(64))).status, 400)
    assert.equal((await (await fetch(`${base}uploads/${data.id}`)).json()).offset, first.length)
    assert.equal((await put(base, data.id, first.length, last)).status, 200)

    const completed = await fetch(`${base}uploads/${data.id}/complete`, {method: 'POST'})
    assert.equal(completed.status, 201)
    assert.equal((await completed.json()).savedName, 'archive.zip')
    assert.deepEqual(await readFile(join(dir, 'archive.zip')), Buffer.concat([first, last]))
    assert.deepEqual(received, [{name: 'archive.zip', bytes: first.length + last.length}])

    const next = await create(base, 'archive.zip', 3)
    assert.equal((await put(base, next.data.id, 0, Buffer.from('new'))).status, 200)
    assert.equal((await fetch(`${base}uploads/${next.data.id}/complete`, {method: 'POST'})).status, 201)
    assert.equal((await readFile(join(dir, 'archive (1).zip'), 'utf8')), 'new')
    assert.equal((await create(base, '../evil', 1)).status, 400)
  } finally {
    await receiver.close()
    await rm(dir, {recursive: true, force: true})
  }
})

test('once permits a cancelled session to be replaced and closes after completion', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tunli-receive-'))
  let completed = 0
  const receiver = await startReceiveServer(dir, {
    once: true,
    maxBytes: 4,
    onUpload: () => {},
    onOnceComplete: () => completed++,
  })
  const base = `http://127.0.0.1:${receiver.port}${receiver.path}/`
  try {
    assert.equal((await create(base, 'large', 5)).status, 413)
    const contenders = await Promise.all([create(base, 'cancelled', 3), create(base, 'other', 3)])
    assert.deepEqual(contenders.map(result => result.status).sort(), [201, 410])
    const cancelled = contenders.find(result => result.status === 201)
    assert.equal((await create(base, 'second', 3)).status, 410)
    assert.equal((await fetch(`${base}uploads/${cancelled.data.id}`, {method: 'DELETE'})).status, 204)
    const accepted = await create(base, 'small', 3)
    assert.equal((await put(base, accepted.data.id, 0, Buffer.from('yes'))).status, 200)
    assert.equal((await fetch(`${base}uploads/${accepted.data.id}/complete`, {method: 'POST'})).status, 201)
    assert.equal((await create(base, 'other', 2)).status, 410)
    assert.equal((await readFile(join(dir, 'small'), 'utf8')), 'yes')
    assert.equal(completed, 1)
  } finally {
    await receiver.close()
    await rm(dir, {recursive: true, force: true})
  }
})
