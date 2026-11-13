import { isPresent } from './is.js'
import type { Nullish } from './types.js'

export const omitEmpty = <T>(array: Array<Nullish<T>>): Array<T> | undefined => {
  const result: Array<T> = []

  for (const item of array) {
    // biome-ignore lint/plugin/noEmptyStringTest: item is a generic T, so a bare test would also drop 0 and false.
    if (isPresent(item) && item !== '') {
      result.push(item)
    }
  }

  if (!result.length) {
    return
  }

  return result
}
