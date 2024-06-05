/**
 * Removes duplicate elements from an array.
 * @param {any[]} value - The array from which to remove duplicates.
 * @returns {any[]|null} - A new array with unique elements, or null if the input is not an array.
 */
export const arrayUnique = (value) => {
  if (!Array.isArray(value)) {
    return null
  }
  return Array.from(new Set(value))
}

/**
 * @template A
 * @template B
 * Merges two arrays into one.
 * @param {A[]} arr1 - The first array.
 * @param {B[]} arr2 - The second array.
 * @returns {[A, B]} - A new array containing elements from both input arrays.
 */
export const arrayMerge = (arr1, arr2) => {
  arr1 ??= []
  arr2 ??= []
  return [...arr1, ...arr2]
}

/**
 * Subtracts elements of the second array from the first array.
 * @param {any[]} arr1 - The array from which to subtract elements.
 * @param {any[]} arr2 - The array containing elements to subtract.
 * @returns {any[]} - A new array containing elements from arr1 that are not in arr2.
 */
export const arraySub = (arr1, arr2) => {
  arr1 ??= []
  arr2 ??= []
  return arr1.filter(x => !arr2.includes(x))
}

export const arrayRemoveEntry = (array, search) => {
  const delPos = array.indexOf(search)
  if (delPos > -1) {
    array = [...array.slice(0, delPos), ...array.slice(delPos + 1)]
  }
  return array
}
