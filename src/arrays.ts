import { isPresent } from './is.js'

export const omitEmpty = <T>(array: Array<T | null | undefined>): Array<T> | undefined => {
  const result: Array<T> = []

  for (const item of array) {
    if (isPresent(item) && item !== '') {
      result.push(item)
    }
  }

  return result.length ? result : undefined
}
