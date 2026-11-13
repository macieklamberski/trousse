export const isString = (value: unknown): value is string => {
  // biome-ignore lint/plugin/useTypeofGuard: This is isString.
  return typeof value === 'string'
}

export const isNumber = (value: unknown): value is number => {
  // biome-ignore lint/plugin/useTypeofGuard: This is isNumber.
  return typeof value === 'number'
}

// Number.isInteger and Number.isFinite narrow nothing, so these narrow to number. Both reject NaN
// and Infinity, which isNumber accepts.
export const isInteger = (value: unknown): value is number => {
  return Number.isInteger(value)
}

export const isFiniteNumber = (value: unknown): value is number => {
  return Number.isFinite(value)
}

export const isBoolean = (value: unknown): value is boolean => {
  // biome-ignore lint/plugin/useTypeofGuard: This is isBoolean.
  return typeof value === 'boolean'
}

type AnyFunction = (...args: Array<never>) => unknown

// A value whose type holds function members narrows to those members, so their signatures stay.
// An unknown or object value narrows to a function that takes any arguments, so it can be called.
type FunctionOf<T> = unknown extends T
  ? (...args: Array<unknown>) => unknown
  : Extract<T, AnyFunction> extends never
    ? T & ((...args: Array<unknown>) => unknown)
    : Extract<T, AnyFunction>

export const isFunction = <T>(value: T): value is FunctionOf<T> & T => {
  // biome-ignore lint/plugin/useTypeofGuard: This is isFunction.
  return typeof value === 'function'
}

export const isPresent = <T>(value: T): value is NonNullable<T> => {
  // biome-ignore lint/plugin/useNullishGuard: This is isPresent.
  return value != null
}

// biome-ignore lint/plugin/useNullishType: Nullish<unknown> collapses to unknown, so the predicate spells the union out.
export const isNullish = (value: unknown): value is null | undefined => {
  // biome-ignore lint/plugin/useNullishGuard: This is isNullish.
  return value == null
}

// Narrow to any non-array object, excluding null. Accepts class instances, Date, Map, etc.
export const isObject = (value: unknown): value is object => {
  // biome-ignore lint/plugin/useIsObject: This is isObject.
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

// Narrow to a plain object created via an object literal or the Object constructor. Rejects
// class instances, built-ins like Date or Map, and prototype-less objects (Object.create(null)).
export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return isObject(value) && Object.getPrototypeOf(value) === Object.prototype
}

// See: https://www.unicode.org/reports/tr44/#White_Space.
const whitespaceOnlyRegex = /^\p{White_Space}*$/u

export const isNonEmptyString = (value: unknown): value is string => {
  if (!isString(value) || !value) {
    return false
  }

  // Fast path: a printable ASCII first character cannot be White_Space, so the string is
  // necessarily non-empty and non-whitespace-only.
  const code = value.charCodeAt(0)

  if (code > 0x20 && code < 0x7f) {
    return true
  }

  return !whitespaceOnlyRegex.test(value)
}

export const isValidDate = (value: unknown): value is Date => {
  // biome-ignore lint/plugin/useIsValidDate: This is isValidDate.
  return value instanceof Date && !Number.isNaN(value.getTime())
}
