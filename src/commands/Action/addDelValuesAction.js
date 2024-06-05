import {arrayMerge, arraySub, arrayUnique} from "#src/utils/arrayFunctions";

/**
 * @param configKey
 * @param {Ref} configRef
 * @returns {(function(*, {add: *, del: *}): void)|*}
 */
export const addDelValuesAction = (configKey, configRef) => {

  return (argValues, {add, del}) => {

    /** @type {LocalConfig|GlobalConfig} */
    const config = configRef.value

    if (!argValues.length && !del && !add) {
      console.log(config[configKey].join(', '))
      return
    }

    if (!argValues.length) {
      argValues = config[configKey]
    }

    argValues = arrayUnique(arraySub(arrayMerge(argValues, add), del))
    config[configKey] = argValues
    config.save()
  }
}

/**
 * @param configKey
 * @param configRef
 * @returns {(function(*, {add: *, del: *}): void)|*}
 */
export const addGetDeleteValueAction = (configKey, configRef) => {

  return (value, opts) => {

    /** @type {LocalConfig|GlobalConfig} */
    const config = configRef.value

    if (opts.del) {
      config.del(configKey)
      config.save()
      return;
    }

    if (value === undefined) {
      console.log(config[configKey])
      return
    }

    config[configKey] = value
    config.save()
  }
}
