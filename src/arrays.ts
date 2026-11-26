import { createTrimPredicate } from './internal.js'
import { isPresent } from './is.js'
import type { Nullish, TrimOptions } from './types.js'

const isFilled = (value: unknown): boolean => {
  // biome-ignore lint/plugin/noEmptyStringTest: value is unknown, so a bare test would also drop 0 and false.
  return value !== ''
}

export const trimArray = <T>(
  array: Array<Nullish<T>>,
  options: TrimOptions = {},
): Array<T> | undefined => {
  const keep = createTrimPredicate(options, isFilled)
  const result: Array<T> = []

  for (const item of array) {
    if (isPresent(item) && keep(item)) {
      result.push(item)
    }
  }

  if (!result.length) {
    return
  }

  return result
}

/** @deprecated Use `trimArray` instead. */
export const omitEmpty = trimArray
