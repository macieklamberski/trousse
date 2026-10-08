import { isBoolean, isNonEmptyString, isNullish, isNumber, isString, isValidDate } from './is.js'
import type { Nullish } from './types.js'

export const coerceString = (value: unknown): string | undefined => {
  if (isString(value)) {
    return value
  }

  if (isNumber(value)) {
    return String(value)
  }
}

export const coerceNumber = (value: unknown): number | undefined => {
  if (isNumber(value)) {
    return Number.isNaN(value) ? undefined : value
  }

  // StringToNumber reads a string of only whitespace as 0. Its whitespace set is the one `trim`
  // strips, which includes U+FEFF, unlike the Unicode White_Space set isNonEmptyString checks.
  // See: https://tc39.es/ecma262/#sec-stringtonumber.
  if (isString(value) && value.trim()) {
    const numeric = +value

    return Number.isNaN(numeric) ? undefined : numeric
  }
}

const trueRegex = /^\p{White_Space}*true\p{White_Space}*$/iu
const falseRegex = /^\p{White_Space}*false\p{White_Space}*$/iu

export const coerceBoolean = (value: unknown): boolean | undefined => {
  if (isBoolean(value)) {
    return value
  }

  if (isNonEmptyString(value)) {
    if (trueRegex.test(value)) {
      return true
    }

    if (falseRegex.test(value)) {
      return false
    }
  }
}

// A digit-only string is a date only as the four-digit year of the ECMAScript date format. Any
// other length falls to implementation-specific parsing, which reads `1` as the year 2001.
// See: https://tc39.es/ecma262/#sec-date-time-string-format.
const nonYearDigitsRegex = /^\s*(\d{1,3}|\d{5,})\s*$/

export const coerceDate = (value: unknown): Date | undefined => {
  if (isValidDate(value)) {
    return value
  }

  if (isString(value) && nonYearDigitsRegex.test(value)) {
    return
  }

  if (isNumber(value) || isNonEmptyString(value)) {
    const date = new Date(value)

    return Number.isNaN(date.getTime()) ? undefined : date
  }
}

export const coerceSingular = <T>(value: T | Array<T>): T | undefined => {
  return Array.isArray(value) ? value[0] : value
}

export const coerceArray = <T>(value: Nullish<T | Array<T>>): Array<T> => {
  if (isNullish(value)) {
    return []
  }

  return Array.isArray(value) ? value : [value]
}
