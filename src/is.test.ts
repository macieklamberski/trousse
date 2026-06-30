import { describe, expect, it } from 'bun:test'
import {
  isBoolean,
  isFunction,
  isNonEmptyString,
  isNullish,
  isNumber,
  isObject,
  isPlainObject,
  isPresent,
  isString,
  isValidDate,
} from './is.js'

describe('isString', () => {
  it('should return true for string value', () => {
    expect(isString('hello')).toBe(true)
  })

  it('should return true for empty string', () => {
    expect(isString('')).toBe(true)
  })

  it('should return false for number, null, undefined', () => {
    expect(isString(42)).toBe(false)
    expect(isString(null)).toBe(false)
    expect(isString(undefined)).toBe(false)
  })

  it('should return false for object and array', () => {
    expect(isString({})).toBe(false)
    expect(isString([1, 2, 3])).toBe(false)
  })
})

describe('isNumber', () => {
  it('should return true for numbers', () => {
    expect(isNumber(42)).toBe(true)
    expect(isNumber(1.5)).toBe(true)
    expect(isNumber(-1)).toBe(true)
    expect(isNumber(0)).toBe(true)
  })

  it('should return true for NaN and Infinity', () => {
    expect(isNumber(Number.NaN)).toBe(true)
    expect(isNumber(Number.POSITIVE_INFINITY)).toBe(true)
  })

  it('should return false for numeric strings', () => {
    expect(isNumber('42')).toBe(false)
  })

  it('should return false for null, undefined, boolean', () => {
    expect(isNumber(null)).toBe(false)
    expect(isNumber(undefined)).toBe(false)
    expect(isNumber(true)).toBe(false)
  })

  it('should return false for BigInt', () => {
    expect(isNumber(BigInt(123))).toBe(false)
  })
})

describe('isBoolean', () => {
  it('should return true for booleans', () => {
    expect(isBoolean(true)).toBe(true)
    expect(isBoolean(false)).toBe(true)
  })

  it('should return false for truthy and falsy non-booleans', () => {
    expect(isBoolean(1)).toBe(false)
    expect(isBoolean(0)).toBe(false)
    expect(isBoolean('true')).toBe(false)
    expect(isBoolean('')).toBe(false)
  })

  it('should return false for null and undefined', () => {
    expect(isBoolean(null)).toBe(false)
    expect(isBoolean(undefined)).toBe(false)
  })
})

describe('isFunction', () => {
  it('should return true for arrow functions', () => {
    expect(isFunction(() => {})).toBe(true)
  })

  it('should return true for function declarations and built-ins', () => {
    // biome-ignore lint/complexity/useArrowFunction: It's for testing purposes.
    expect(isFunction(function () {})).toBe(true)
    expect(isFunction(Math.sin)).toBe(true)
  })

  it('should return true for classes', () => {
    expect(isFunction(class {})).toBe(true)
  })

  it('should return false for non-functions', () => {
    expect(isFunction({})).toBe(false)
    expect(isFunction('function')).toBe(false)
    expect(isFunction(null)).toBe(false)
    expect(isFunction(undefined)).toBe(false)
  })
})

describe('isPresent', () => {
  it('should return false for null', () => {
    expect(isPresent(null)).toBe(false)
  })

  it('should return false for undefined', () => {
    expect(isPresent(undefined)).toBe(false)
  })

  it('should return true for empty string', () => {
    expect(isPresent('')).toBe(true)
  })

  it('should return true for zero', () => {
    expect(isPresent(0)).toBe(true)
  })

  it('should return true for NaN', () => {
    expect(isPresent(Number.NaN)).toBe(true)
  })

  it('should return true for false', () => {
    expect(isPresent(false)).toBe(true)
  })

  it('should return true for empty objects', () => {
    expect(isPresent({})).toBe(true)
  })

  it('should return true for empty arrays', () => {
    expect(isPresent([])).toBe(true)
  })

  it('should return true for string values', () => {
    expect(isPresent('hello')).toBe(true)
  })

  it('should return true for number values', () => {
    expect(isPresent(123)).toBe(true)
  })

  it('should return true for object values', () => {
    expect(isPresent({ key: 'value' })).toBe(true)
  })

  it('should return true for array values', () => {
    expect(isPresent([1, 2, 3])).toBe(true)
  })

  it('should return true for function values', () => {
    expect(isPresent(() => {})).toBe(true)
  })

  it('should return true for Date objects', () => {
    expect(isPresent(new Date())).toBe(true)
  })

  it('should return true for RegExp objects', () => {
    // biome-ignore lint/performance/useTopLevelRegex: It's for testing purposes.
    expect(isPresent(/test/)).toBe(true)
  })
})

describe('isNullish', () => {
  it('should return true for null', () => {
    expect(isNullish(null)).toBe(true)
  })

  it('should return true for undefined', () => {
    expect(isNullish(undefined)).toBe(true)
  })

  it('should return false for falsy non-nullish values', () => {
    expect(isNullish('')).toBe(false)
    expect(isNullish(0)).toBe(false)
    expect(isNullish(false)).toBe(false)
    expect(isNullish(Number.NaN)).toBe(false)
  })

  it('should return false for objects and arrays', () => {
    expect(isNullish({})).toBe(false)
    expect(isNullish([])).toBe(false)
  })
})

describe('isObject', () => {
  it('should return true for plain objects', () => {
    expect(isObject({})).toBe(true)
    expect(isObject({ url: 'https://example.com' })).toBe(true)
  })

  it('should return true for class instances and built-in objects', () => {
    class CustomClass {}

    expect(isObject(new CustomClass())).toBe(true)
    expect(isObject(new Date())).toBe(true)
    expect(isObject(new Map())).toBe(true)
    expect(isObject(new Set())).toBe(true)
  })

  it('should return true for prototype-less objects', () => {
    expect(isObject(Object.create(null))).toBe(true)
  })

  it('should return false for null', () => {
    expect(isObject(null)).toBe(false)
  })

  it('should return false for arrays', () => {
    expect(isObject([])).toBe(false)
    expect(isObject(['https://example.com'])).toBe(false)
  })

  it('should return false for primitives', () => {
    expect(isObject('https://example.com')).toBe(false)
    expect(isObject(42)).toBe(false)
    expect(isObject(undefined)).toBe(false)
  })

  it('should return false for functions', () => {
    expect(isObject(() => {})).toBe(false)
  })
})

describe('isPlainObject', () => {
  it('should return true for plain objects', () => {
    expect(isPlainObject({})).toBe(true)
    expect(isPlainObject({ a: 1 })).toBe(true)
    expect(isPlainObject({ a: null, b: undefined })).toBe(true)
    expect(isPlainObject({ toString: () => 'custom' })).toBe(true)
  })

  it('should return false for arrays', () => {
    expect(isPlainObject([])).toBe(false)
    expect(isPlainObject([1, 2, 3])).toBe(false)
    expect(isPlainObject(new Array(5))).toBe(false)
  })

  it('should return false for null', () => {
    expect(isPlainObject(null)).toBe(false)
  })

  it('should return false for undefined', () => {
    expect(isPlainObject(undefined)).toBe(false)
  })

  it('should return false for primitive types', () => {
    expect(isPlainObject(42)).toBe(false)
    expect(isPlainObject('string')).toBe(false)
    expect(isPlainObject(true)).toBe(false)
    expect(isPlainObject(Symbol('sym'))).toBe(false)
    expect(isPlainObject(BigInt(123))).toBe(false)
  })

  it('should return false for functions', () => {
    expect(isPlainObject(() => {})).toBe(false)
    // biome-ignore lint/complexity/useArrowFunction: It's for testing purposes.
    expect(isPlainObject(function () {})).toBe(false)
    expect(isPlainObject(Math.sin)).toBe(false)
  })

  it('should return false for objects with custom prototypes', () => {
    class CustomClass {}

    expect(isPlainObject(new CustomClass())).toBe(false)
  })

  it('should return false for prototype-less objects', () => {
    expect(isPlainObject(Object.create(null))).toBe(false)
  })

  it('should return false for built-in objects', () => {
    expect(isPlainObject(new Date())).toBe(false)
    // biome-ignore lint/suspicious/useErrorMessage: It's for testing purposes.
    expect(isPlainObject(new Error())).toBe(false)
    expect(isPlainObject(new Map())).toBe(false)
    expect(isPlainObject(new Set())).toBe(false)
    expect(isPlainObject(new WeakMap())).toBe(false)
    expect(isPlainObject(new WeakSet())).toBe(false)
    // biome-ignore lint/complexity/useRegexLiterals: It's for testing purposes.
    expect(isPlainObject(new RegExp('.'))).toBe(false)
    expect(isPlainObject(new ArrayBuffer(10))).toBe(false)
  })
})

describe('isNonEmptyString', () => {
  it('should return true for non-empty strings', () => {
    expect(isNonEmptyString('hello')).toBe(true)
    expect(isNonEmptyString('0')).toBe(true)
    expect(isNonEmptyString('undefined')).toBe(true)
    expect(isNonEmptyString('null')).toBe(true)
  })

  it('should handle edge cases', () => {
    // biome-ignore lint/style/useConsistentBuiltinInstantiation: It's for testing purposes.
    const stringObject = new String('hello')

    expect(isNonEmptyString(stringObject)).toBe(false)
  })

  it('should return false for empty strings', () => {
    expect(isNonEmptyString('')).toBe(false)
    expect(isNonEmptyString(' ')).toBe(false)
  })

  it('should return false for whitespace-only strings', () => {
    expect(isNonEmptyString('   ')).toBe(false)
    expect(isNonEmptyString('\t\n')).toBe(false)
    expect(isNonEmptyString(' ')).toBe(false)
  })

  it('should return false for number', () => {
    expect(isNonEmptyString(2)).toBe(false)
  })

  it('should return false for arrays', () => {
    expect(isNonEmptyString([])).toBe(false)
    expect(isNonEmptyString([1, 2, 3])).toBe(false)
    expect(isNonEmptyString(['hello'])).toBe(false)
  })

  it('should return false for objects', () => {
    expect(isNonEmptyString({})).toBe(false)
    expect(isNonEmptyString({ key: 'value' })).toBe(false)
    expect(isNonEmptyString(new Date())).toBe(false)
  })

  it('should return false for null and undefined', () => {
    expect(isNonEmptyString(null)).toBe(false)
    expect(isNonEmptyString(undefined)).toBe(false)
  })

  it('should return false for booleans', () => {
    expect(isNonEmptyString(true)).toBe(false)
    expect(isNonEmptyString(false)).toBe(false)
  })

  it('should return false for functions', () => {
    expect(isNonEmptyString(() => {})).toBe(false)
    // biome-ignore lint/complexity/useArrowFunction: It's for testing purposes.
    expect(isNonEmptyString(function () {})).toBe(false)
  })

  it('should return false for symbols', () => {
    expect(isNonEmptyString(Symbol('test'))).toBe(false)
  })

  it('should return false for BigInt', () => {
    expect(isNonEmptyString(BigInt(123))).toBe(false)
  })
})

describe('isValidDate', () => {
  it('should return true for valid Date instances', () => {
    expect(isValidDate(new Date())).toBe(true)
    expect(isValidDate(new Date('2026-01-01'))).toBe(true)
    expect(isValidDate(new Date(0))).toBe(true)
  })

  it('should return false for invalid Date instances', () => {
    expect(isValidDate(new Date('not a date'))).toBe(false)
    expect(isValidDate(new Date(Number.NaN))).toBe(false)
  })

  it('should return false for date-like values that are not Date instances', () => {
    expect(isValidDate('2026-01-01')).toBe(false)
    expect(isValidDate(1750000000000)).toBe(false)
  })

  it('should return false for null and undefined', () => {
    expect(isValidDate(null)).toBe(false)
    expect(isValidDate(undefined)).toBe(false)
  })
})
