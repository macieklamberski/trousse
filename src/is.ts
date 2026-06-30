export const isString = (value: unknown): value is string => {
  return typeof value === 'string'
}

export const isNumber = (value: unknown): value is number => {
  return typeof value === 'number'
}

export const isBoolean = (value: unknown): value is boolean => {
  return typeof value === 'boolean'
}

export const isFunction = (value: unknown): value is (...args: Array<never>) => unknown => {
  return typeof value === 'function'
}

export const isPresent = <T>(value: T): value is NonNullable<T> => {
  return value != null
}

export const isNullish = (value: unknown): value is null | undefined => {
  return value == null
}

// Narrow to any non-array object, excluding null. Accepts class instances, Date, Map, etc.
export const isObject = (value: unknown): value is object => {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

// Narrow to a plain object created via an object literal or the Object constructor. Rejects
// class instances, built-ins like Date or Map, and prototype-less objects (Object.create(null)).
export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return (
    value != null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    value.constructor === Object
  )
}

const whitespaceOnlyRegex = /^\p{White_Space}*$/u

export const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value !== '' && !whitespaceOnlyRegex.test(value)
}

export const isValidDate = (value: unknown): value is Date => {
  return value instanceof Date && !Number.isNaN(value.getTime())
}
