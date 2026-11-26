import { isNonEmptyString, isNullish, isString } from './is.js'
import type { Pattern, TrimOptions, TrimPredicate } from './types.js'

export { blankCharacterClass } from './internal/blank.js'

export const toPatternList = (
  patterns: Pattern | ReadonlyArray<Pattern>,
): ReadonlyArray<Pattern> => {
  return isString(patterns) || patterns instanceof RegExp ? [patterns] : patterns
}

// Wraps keep so that null and undefined are always dropped, and with blank set, a string
// isNonEmptyString rejects is dropped too.
export const createTrimPredicate = (
  options: TrimOptions,
  fallback: TrimPredicate,
): TrimPredicate => {
  const keep = options.keep ?? fallback
  const isBlankDropped = options.blank

  return (value) => {
    if (isNullish(value)) {
      return false
    }

    if (isBlankDropped && isString(value) && !isNonEmptyString(value)) {
      return false
    }

    return keep(value)
  }
}
