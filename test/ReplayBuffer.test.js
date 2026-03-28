import {test, describe} from 'node:test'
import assert from 'node:assert/strict'
import {ReplayBuffer} from '../dist/daemon/ReplayBuffer.js'

const req = (id, body = 'body') => ({
  id,
  timestamp: Date.now(),
  method: 'GET',
  path: '/test',
  headers: {},
  bodyUnavailable: false,
  replayOf: undefined,
  response: {status: 200, durationMs: 10},
  body,
})

describe('push / size', () => {
  test('starts empty', () => {
    const buf = new ReplayBuffer(3)
    assert.equal(buf.size, 0)
  })

  test('increments size on push', () => {
    const buf = new ReplayBuffer(3)
    buf.push(req('a'))
    buf.push(req('b'))
    assert.equal(buf.size, 2)
  })

  test('evicts oldest when capacity is exceeded', () => {
    const buf = new ReplayBuffer(3)
    buf.push(req('a'))
    buf.push(req('b'))
    buf.push(req('c'))
    buf.push(req('d'))
    assert.equal(buf.size, 3)
    assert.equal(buf.getById('a'), undefined)
    assert.ok(buf.getById('d'))
  })

  test('capacity 1 keeps only latest', () => {
    const buf = new ReplayBuffer(1)
    buf.push(req('a'))
    buf.push(req('b'))
    assert.equal(buf.size, 1)
    assert.equal(buf.getById('a'), undefined)
    assert.ok(buf.getById('b'))
  })
})

describe('getAll', () => {
  test('returns entries in reverse order (newest first)', () => {
    const buf = new ReplayBuffer(5)
    buf.push(req('a'))
    buf.push(req('b'))
    buf.push(req('c'))
    const all = buf.getAll()
    assert.deepEqual(all.map(e => e.id), ['c', 'b', 'a'])
  })

  test('strips body from returned entries', () => {
    const buf = new ReplayBuffer(5)
    buf.push(req('a', 'secret'))
    const [entry] = buf.getAll()
    assert.equal('body' in entry, false)
  })

  test('respects limit', () => {
    const buf = new ReplayBuffer(5)
    buf.push(req('a'))
    buf.push(req('b'))
    buf.push(req('c'))
    assert.equal(buf.getAll(2).length, 2)
    assert.deepEqual(buf.getAll(2).map(e => e.id), ['c', 'b'])
  })

  test('returns all when limit exceeds size', () => {
    const buf = new ReplayBuffer(5)
    buf.push(req('a'))
    assert.equal(buf.getAll(10).length, 1)
  })

  test('returns empty array when empty', () => {
    assert.deepEqual(new ReplayBuffer(5).getAll(), [])
  })
})

describe('getById', () => {
  test('returns matching entry with body', () => {
    const buf = new ReplayBuffer(5)
    buf.push(req('x', 'payload'))
    const entry = buf.getById('x')
    assert.ok(entry)
    assert.equal(entry.id, 'x')
    assert.equal(entry.body, 'payload')
  })

  test('returns undefined for unknown id', () => {
    const buf = new ReplayBuffer(5)
    buf.push(req('a'))
    assert.equal(buf.getById('z'), undefined)
  })

  test('returns undefined after entry was evicted', () => {
    const buf = new ReplayBuffer(2)
    buf.push(req('a'))
    buf.push(req('b'))
    buf.push(req('c'))
    assert.equal(buf.getById('a'), undefined)
  })
})

describe('toMeta', () => {
  test('strips body and sets bodyUnavailable on all entries', () => {
    const buf = new ReplayBuffer(5)
    buf.push(req('a', 'payload'))
    buf.push(req('b', null))
    const meta = buf.toMeta()
    assert.equal(meta.length, 2)
    for (const m of meta) {
      assert.equal('body' in m, false)
      assert.equal(m.bodyUnavailable, true)
    }
  })

  test('preserves order (oldest first)', () => {
    const buf = new ReplayBuffer(5)
    buf.push(req('a'))
    buf.push(req('b'))
    assert.deepEqual(buf.toMeta().map(e => e.id), ['a', 'b'])
  })

  test('returns empty array when buffer is empty', () => {
    assert.deepEqual(new ReplayBuffer(5).toMeta(), [])
  })
})

describe('restoreFromMeta', () => {
  test('restores entries with body set to null', () => {
    const buf = new ReplayBuffer(5)
    buf.restoreFromMeta([
      {id: 'a', timestamp: 1, method: 'GET', path: '/', headers: {}, bodyUnavailable: true, response: null},
      {id: 'b', timestamp: 2, method: 'POST', path: '/', headers: {}, bodyUnavailable: true, response: null},
    ])
    assert.equal(buf.size, 2)
    assert.equal(buf.getById('a')?.body, null)
    assert.equal(buf.getById('b')?.body, null)
  })

  test('replaces existing entries', () => {
    const buf = new ReplayBuffer(5)
    buf.push(req('old'))
    buf.restoreFromMeta([
      {id: 'new', timestamp: 1, method: 'GET', path: '/', headers: {}, bodyUnavailable: true, response: null},
    ])
    assert.equal(buf.size, 1)
    assert.equal(buf.getById('old'), undefined)
    assert.ok(buf.getById('new'))
  })

  test('round-trip: toMeta → restoreFromMeta preserves metadata', () => {
    const buf = new ReplayBuffer(5)
    buf.push({...req('a', 'body'), method: 'POST', path: '/submit', response: {status: 201, durationMs: 50}})
    const meta = buf.toMeta()

    const buf2 = new ReplayBuffer(5)
    buf2.restoreFromMeta(meta)
    const restored = buf2.getById('a')
    assert.equal(restored?.method, 'POST')
    assert.equal(restored?.path, '/submit')
    assert.equal(restored?.response?.status, 201)
    assert.equal(restored?.body, null)
    assert.equal(restored?.bodyUnavailable, true)
  })
})
