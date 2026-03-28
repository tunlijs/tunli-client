import {test, describe} from 'node:test'
import assert from 'node:assert/strict'
import {
  checkInt,
  checkUrl,
  checkProtocol,
  checkInArray,
  checkMd5,
  checkPort,
  checkString,
  checkHost,
} from '../dist/utils/checkFunctions.js'

const throws = (fn, msgPattern) => {
  assert.throws(fn, (e) => {
    if (msgPattern) assert.match(e.message, msgPattern)
    return true
  })
}

describe('checkInt', () => {
  test('accepts integer number', () => assert.equal(checkInt(42), 42))
  test('accepts integer string', () => assert.equal(checkInt('7'), 7))
  test('accepts zero', () => assert.equal(checkInt(0), 0))
  test('rejects float string', () => throws(() => checkInt('3.14')))
  test('rejects non-numeric string', () => throws(() => checkInt('abc')))
  test('rejects null', () => throws(() => checkInt(null)))
  test('rejects undefined', () => throws(() => checkInt(undefined)))
  test('uses custom error message', () => throws(() => checkInt(null, 'custom msg'), /custom msg/))
})

describe('checkPort', () => {
  test('accepts 1', () => assert.equal(checkPort(1), 1))
  test('accepts 8080', () => assert.equal(checkPort(8080), 8080))
  test('accepts 65535', () => assert.equal(checkPort(65535), 65535))
  test('accepts string port', () => assert.equal(checkPort('3000'), 3000))
  test('rejects 0', () => throws(() => checkPort(0), /between/))
  test('rejects 65536', () => throws(() => checkPort(65536), /between/))
  test('rejects non-integer', () => throws(() => checkPort('abc')))
})

describe('checkUrl', () => {
  test('accepts http url', () => assert.equal(checkUrl('http://localhost:3000'), 'http://localhost:3000/'))
  test('accepts https url', () => assert.equal(checkUrl('https://example.com'), 'https://example.com/'))
  test('rejects plain string', () => throws(() => checkUrl('not-a-url'), /Invalid URL/))
  test('rejects empty string', () => throws(() => checkUrl(''), /Invalid URL/))
})

describe('checkInArray', () => {
  test('accepts value in array', () => assert.equal(checkInArray('a', ['a', 'b', 'c']), 'a'))
  test('returns the value', () => assert.equal(checkInArray('foo', ['foo', 'bar']), 'foo'))
  test('rejects value not in array', () => throws(() => checkInArray('x', ['a', 'b']), /must be one of/))
  test('error message includes value name', () => throws(() => checkInArray('x', ['a'], 'Protocol'), /Protocol/))
})

describe('checkProtocol', () => {
  test('accepts http', () => assert.equal(checkProtocol('http'), 'http'))
  test('accepts https', () => assert.equal(checkProtocol('https'), 'https'))
  test('rejects ftp', () => throws(() => checkProtocol('ftp')))
  test('rejects non-string', () => throws(() => checkProtocol(42)))
})

describe('checkMd5', () => {
  test('accepts valid md5 lowercase', () => assert.equal(checkMd5('098f6bcd4621d373cade4e832627b4f6'), '098f6bcd4621d373cade4e832627b4f6'))
  test('accepts valid md5 uppercase, normalises to lowercase', () => assert.equal(checkMd5('098F6BCD4621D373CADE4E832627B4F6'), '098f6bcd4621d373cade4e832627b4f6'))
  test('rejects too short', () => throws(() => checkMd5('abc123'), /not a valid md5/))
  test('rejects invalid chars', () => throws(() => checkMd5('zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'), /not a valid md5/))
  test('rejects empty string', () => throws(() => checkMd5(''), /not a valid md5/))
})

describe('checkString', () => {
  test('accepts string', () => assert.doesNotThrow(() => checkString('hello')))
  test('rejects number', () => throws(() => checkString(42), /must be a string/))
  test('rejects null', () => throws(() => checkString(null), /must be a string/))
  test('uses custom label in error', () => throws(() => checkString(42, 'Protocol'), /Protocol/))
})

describe('checkHost', () => {
  test('accepts string host', () => assert.doesNotThrow(() => checkHost('localhost')))
  test('accepts ip string', () => assert.doesNotThrow(() => checkHost('127.0.0.1')))
  test('rejects number', () => throws(() => checkHost(42), /must be a string/))
  test('rejects null', () => throws(() => checkHost(null), /must be a string/))
})
