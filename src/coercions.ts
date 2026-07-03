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

  if (isNonEmptyString(value)) {
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

export const coerceDate = (value: unknown): Date | undefined => {
  if (isValidDate(value)) {
    return value
  }

  if (isNumber(value) || isNonEmptyString(value)) {
    const date = new Date(value)

    return Number.isNaN(date.getTime()) ? undefined : date
  }
}

export const coerceSingular = <T>(value: T | Array<T>): T => {
  return Array.isArray(value) ? value[0] : value
}

export const coerceArray = <T>(value: Nullish<T | Array<T>>): Array<T> => {
  if (isNullish(value)) {
    return []
  }

  return Array.isArray(value) ? value : [value]
}
