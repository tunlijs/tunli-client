import blessed from 'blessed';
import {Screen} from "#src/cli-app/Screen";
import {isRef, ref} from "#src/core/Ref";

/**
 * @param {string} [title]
 * @returns {Screen}
 */
export const createScreen = (title) => {
  const screen = blessed.screen({
    smartCSR: true,
    title
  });
  return new Screen(screen)
}

/**
 * @param {string|Ref|number} values
 * @returns {Ref}
 */
export const concat = (...values) => {

  const update = () => {
    finalValue.value = values.map((x) => {


      return x.value
    }).join('')
  }

  const finalValue = ref()
  values = values.map(value => {
    if (!isRef(value)) {
      return ref(value)
    } else {
      value.on('update', update)
    }
    return value
  })
  update()
  return finalValue
}
