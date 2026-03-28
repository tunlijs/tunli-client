import {test, describe} from 'node:test'
import assert from 'node:assert/strict'
import {md5, sha256} from '../dist/utils/hashFunctions.js'

describe('md5', () => {
  test('known hash for "test"', () => assert.equal(md5('test'), '098f6bcd4621d373cade4e832627b4f6'))
  test('known hash for empty string', () => assert.equal(md5(''), 'd41d8cd98f00b204e9800998ecf8427e'))
  test('returns lowercase hex string', () => assert.match(md5('x'), /^[0-9a-f]{32}$/))
  test('different inputs produce different hashes', () => assert.notEqual(md5('a'), md5('b')))
  test('accepts object with toString()', () => assert.equal(md5({toString: () => 'test'}), '098f6bcd4621d373cade4e832627b4f6'))
})

describe('sha256', () => {
  test('known hash for "test"', () => assert.equal(sha256('test'), '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'))
  test('known hash for empty string', () => assert.equal(sha256(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'))
  test('returns lowercase hex string', () => assert.match(sha256('x'), /^[0-9a-f]{64}$/))
  test('different inputs produce different hashes', () => assert.notEqual(sha256('a'), sha256('b')))
})
