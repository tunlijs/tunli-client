import {Option} from "commander";

export const deleteOption = (desc = 'delete config entry') => {
  const option = new Option('--del', desc)
  return option
}
