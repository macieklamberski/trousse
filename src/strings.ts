import { isString } from './is.js'

// The blank set of isNonEmptyString. String#trim strips all of it except U+0085, so the edges are
// stripped with this set and a string trimString empties is one isNonEmptyString rejects.
const blankCharRegex = /[\p{White_Space}\uFEFF]/u

export const trimString = (value: unknown): string | undefined => {
  if (!isString(value)) {
    return
  }

  let start = 0
  let end = value.length

  while (start < end && blankCharRegex.test(value.charAt(start))) {
    start++
  }

  while (end > start && blankCharRegex.test(value.charAt(end - 1))) {
    end--
  }

  if (start === end) {
    return
  }

  return value.slice(start, end)
}
