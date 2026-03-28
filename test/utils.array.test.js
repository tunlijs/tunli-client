import {test, describe} from 'node:test'
import assert from 'node:assert/strict'
import {arrayUnique, arrayMerge, arraySub, arrayRemoveEntry} from '../dist/utils/arrayFunctions.js'

describe('arrayUnique', () => {
  test('removes duplicates', () => assert.deepEqual(arrayUnique([1, 2, 2, 3]), [1, 2, 3]))
  test('preserves order', () => assert.deepEqual(arrayUnique(['b', 'a', 'b']), ['b', 'a']))
  test('no-op on already unique array', () => assert.deepEqual(arrayUnique([1, 2, 3]), [1, 2, 3]))
  test('returns empty array for empty input', () => assert.deepEqual(arrayUnique([]), []))
  test('returns null for non-array', () => assert.equal(arrayUnique('string'), null))
  test('returns null for null', () => assert.equal(arrayUnique(null), null))
  test('works with mixed types', () => assert.deepEqual(arrayUnique([1, '1', 1]), [1, '1']))
})

describe('arrayMerge', () => {
  test('merges two arrays', () => assert.deepEqual(arrayMerge([1, 2], [3, 4]), [1, 2, 3, 4]))
  test('treats null arr1 as empty', () => assert.deepEqual(arrayMerge(null, [1, 2]), [1, 2]))
  test('treats null arr2 as empty', () => assert.deepEqual(arrayMerge([1, 2], null), [1, 2]))
  test('both null returns empty array', () => assert.deepEqual(arrayMerge(null, null), []))
  test('preserves duplicates across arrays', () => assert.deepEqual(arrayMerge([1], [1]), [1, 1]))
})

describe('arraySub', () => {
  test('subtracts elements', () => assert.deepEqual(arraySub([1, 2, 3], [2]), [1, 3]))
  test('no overlap returns original', () => assert.deepEqual(arraySub([1, 2], [3, 4]), [1, 2]))
  test('full overlap returns empty', () => assert.deepEqual(arraySub([1, 2], [1, 2]), []))
  test('treats null arr1 as empty', () => assert.deepEqual(arraySub(null, [1]), []))
  test('treats null arr2 as empty (nothing subtracted)', () => assert.deepEqual(arraySub([1, 2], null), [1, 2]))
})

describe('arrayRemoveEntry', () => {
  test('removes existing entry', () => assert.deepEqual(arrayRemoveEntry([1, 2, 3], 2), [1, 3]))
  test('removes first occurrence only', () => assert.deepEqual(arrayRemoveEntry([1, 2, 2, 3], 2), [1, 2, 3]))
  test('no-op when entry not found', () => assert.deepEqual(arrayRemoveEntry([1, 2, 3], 9), [1, 2, 3]))
  test('works with strings', () => assert.deepEqual(arrayRemoveEntry(['a', 'b', 'c'], 'b'), ['a', 'c']))
  test('returns new array (immutable)', () => {
    const original = [1, 2, 3]
    const result = arrayRemoveEntry(original, 2)
    assert.deepEqual(original, [1, 2, 3])
    assert.deepEqual(result, [1, 3])
  })
})
