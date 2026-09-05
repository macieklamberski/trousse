import { isPresent } from './is.js'

// Drops the null, undefined and empty-string items. Returns undefined when nothing survives, the
// way trimObject does for an object with no field left.
export const omitEmpty = <T>(array: Array<T | null | undefined>): Array<T> | undefined => {
  const result: Array<T> = []

  for (const item of array) {
    if (isPresent(item) && item !== '') {
      result.push(item)
    }
  }

  return result.length ? result : undefined
}
