import { isPresent } from './is.js'

export const omitEmpty = <T>(array: Array<T | null | undefined>): Array<T> | undefined => {
  const result = array.filter((item): item is T => isPresent(item) && item !== '')

  return result.length ? result : undefined
}
