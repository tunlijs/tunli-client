import {test, describe} from 'node:test'
import assert from 'node:assert/strict'
import {
  trimEnd,
  trimStart,
  removeControlChars,
  padEndIgnoreControlChars,
} from '../dist/utils/stringFunctions.js'

describe('trimEnd', () => {
  test('trims trailing spaces by default', () => assert.equal(trimEnd('hello   '), 'hello'))
  test('trims custom char', () => assert.equal(trimEnd('hello/', '/'), 'hello'))
  test('trims multiple trailing chars', () => assert.equal(trimEnd('hello///', '/'), 'hello'))
  test('no-op when char not at end', () => assert.equal(trimEnd('hello', '/'), 'hello'))
  test('empty string', () => assert.equal(trimEnd('', '/'), ''))
})

describe('trimStart', () => {
  test('trims leading custom char', () => assert.equal(trimStart('/hello', '/'), 'hello'))
  test('trims multiple leading chars', () => assert.equal(trimStart('///hello', '/'), 'hello'))
  test('no-op when char not at start', () => assert.equal(trimStart('hello/', '/'), 'hello/'))
  test('empty string', () => assert.equal(trimStart('', '/'), ''))
})

describe('removeControlChars', () => {
  test('removes ANSI color codes', () => assert.equal(removeControlChars('\u001b[31mred\u001b[0m'), 'red'))
  test('removes bold escape', () => assert.equal(removeControlChars('\u001b[1mbold\u001b[0m'), 'bold'))
  test('no-op on plain string', () => assert.equal(removeControlChars('hello'), 'hello'))
  test('empty string', () => assert.equal(removeControlChars(''), ''))
  test('only control chars returns empty', () => assert.equal(removeControlChars('\u001b[0m'), ''))
})

describe('padEndIgnoreControlChars', () => {
  test('pads plain string to length', () => assert.equal(padEndIgnoreControlChars('hi', 5), 'hi   '))
  test('no-op when string already at length', () => assert.equal(padEndIgnoreControlChars('hello', 5), 'hello'))
  test('pads string with control chars based on visible length', () => {
    const colored = '\u001b[31mhi\u001b[0m'  // visible length = 2
    const result = padEndIgnoreControlChars(colored, 5)
    assert.equal(removeControlChars(result).length, 5)
  })
  test('returns string as-is when maxLength < 0', () => assert.equal(padEndIgnoreControlChars('hi', -1), 'hi'))
  test('uses custom fill string', () => assert.equal(padEndIgnoreControlChars('hi', 4, '-'), 'hi--'))
  test('autoSubstring true truncates to maxLength', () => {
    assert.equal(padEndIgnoreControlChars('hello world', 5, ' ', true), 'hello')
  })
  test('autoSubstring string appends suffix on truncation', () => {
    assert.equal(padEndIgnoreControlChars('hello world', 8, ' ', '…'), 'hello w…')
  })
  test('autoSubstring not applied when string fits', () => {
    assert.equal(padEndIgnoreControlChars('hi', 5, ' ', '…'), 'hi   ')
  })
})
