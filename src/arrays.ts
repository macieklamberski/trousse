import { isPresent } from './is.js'
import { createTrimPredicate } from './objects.js'
import type { Nullish, TrimOptions } from './types.js'

const isPresentAndFilled = (value: unknown): boolean => {
  // biome-ignore lint/plugin/noEmptyStringTest: value is unknown, so a bare test would also drop 0 and false.
  return isPresent(value) && value !== ''
}

export const trimArray = <T>(
  array: Array<Nullish<T>>,
  options: TrimOptions = {},
): Array<T> | undefined => {
  const keep = createTrimPredicate(options, isPresentAndFilled)
  const result: Array<T> = []

  for (const item of array) {
    if (keep(item)) {
      result.push(item as T)
    }
  }

  if (!result.length) {
    return
  }

  return result
}

/** @deprecated Use `trimArray` instead. */
export const omitEmpty = trimArray
