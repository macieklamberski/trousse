import { describe, expect, it } from 'bun:test'
import {
  coerceArray,
  coerceBoolean,
  coerceDate,
  coerceNumber,
  coerceSingular,
  coerceString,
} from './coercions.js'

describe('coerceString', () => {
  it('should return string as-is', () => {
    const value = 'hello'
    const expected = 'hello'

    expect(coerceString(value)).toBe(expected)
  })

  it('should convert number to string', () => {
    const value = 42
    const expected = '42'

    expect(coerceString(value)).toBe(expected)
  })

  it('should return empty string as-is', () => {
    const value = ''
    const expected = ''

    expect(coerceString(value)).toBe(expected)
  })

  it('should convert zero to string', () => {
    const value = 0
    const expected = '0'

    expect(coerceString(value)).toBe(expected)
  })

  it('should convert NaN to string', () => {
    const value = Number.NaN
    const expected = 'NaN'

    expect(coerceString(value)).toBe(expected)
  })

  it('should convert negative number to string', () => {
    const value = -42
    const expected = '-42'

    expect(coerceString(value)).toBe(expected)
  })

  it('should return undefined for boolean', () => {
    expect(coerceString(true)).toBeUndefined()
  })

  it('should return undefined for null', () => {
    expect(coerceString(null)).toBeUndefined()
  })

  it('should return undefined for undefined', () => {
    expect(coerceString(undefined)).toBeUndefined()
  })

  it('should return undefined for object', () => {
    expect(coerceString({ key: 'value' })).toBeUndefined()
  })
})

describe('coerceNumber', () => {
  it('should return number as-is', () => {
    expect(coerceNumber(420)).toBe(420)
    expect(coerceNumber(0)).toBe(0)
    expect(coerceNumber(-1.5)).toBe(-1.5)
  })

  it('should return undefined for NaN', () => {
    expect(coerceNumber(Number.NaN)).toBeUndefined()
  })

  it('should parse integer string to number', () => {
    expect(coerceNumber('42')).toBe(42)
  })

  it('should parse float string to number', () => {
    expect(coerceNumber('36.6')).toBe(36.6)
  })

  it('should parse negative string to number', () => {
    expect(coerceNumber('-1')).toBe(-1)
  })

  it('should parse zero string to number', () => {
    expect(coerceNumber('0')).toBe(0)
  })

  it('should parse string with surrounding whitespace', () => {
    expect(coerceNumber('  42  ')).toBe(42)
  })

  it('should parse scientific notation string', () => {
    expect(coerceNumber('1e3')).toBe(1000)
  })

  it('should parse hexadecimal string', () => {
    expect(coerceNumber('0x10')).toBe(16)
  })

  // Number('Infinity') is not NaN, so Infinity flows through the guard. Pinned so
  // a future finiteness check must update this test deliberately.
  it('should return Infinity for the string Infinity', () => {
    expect(coerceNumber('Infinity')).toBe(Number.POSITIVE_INFINITY)
  })

  it('should return undefined for non-numeric string', () => {
    expect(coerceNumber('javascript')).toBeUndefined()
  })

  it('should return undefined for partially numeric string', () => {
    expect(coerceNumber('42abc')).toBeUndefined()
  })

  it('should return undefined for empty string', () => {
    expect(coerceNumber('')).toBeUndefined()
  })

  it('should return undefined for whitespace-only string', () => {
    expect(coerceNumber('   ')).toBeUndefined()
  })

  it('should return undefined for boolean', () => {
    expect(coerceNumber(true)).toBeUndefined()
  })

  it('should return undefined for array', () => {
    expect(coerceNumber(['javascript', { another: 'typescript' }])).toBeUndefined()
  })

  it('should return undefined for object', () => {
    expect(coerceNumber({ name: 'javascript' })).toBeUndefined()
  })

  it('should return undefined for null and undefined', () => {
    expect(coerceNumber(null)).toBeUndefined()
    expect(coerceNumber(undefined)).toBeUndefined()
  })
})

describe('coerceBoolean', () => {
  it('should return boolean true', () => {
    expect(coerceBoolean(true)).toBe(true)
  })

  it('should return boolean false', () => {
    expect(coerceBoolean(false)).toBe(false)
  })

  it('should handle true string', () => {
    expect(coerceBoolean('true')).toBe(true)
  })

  it('should handle false string', () => {
    expect(coerceBoolean('false')).toBe(false)
  })

  it('should handle case insensitive false string', () => {
    expect(coerceBoolean('FaLse')).toBe(false)
  })

  it('should handle values with whitespace around', () => {
    expect(coerceBoolean(' true ')).toBe(true)
    expect(coerceBoolean('\ttrue\t')).toBe(true)
    expect(coerceBoolean('\nTRUE\n')).toBe(true)
    expect(coerceBoolean(' \t\nTrUe\n\t ')).toBe(true)
    expect(coerceBoolean(' false ')).toBe(false)
    expect(coerceBoolean('\tfalse\t')).toBe(false)
    expect(coerceBoolean('\nFALSE\n')).toBe(false)
    expect(coerceBoolean(' \t\nFaLsE\n\t ')).toBe(false)
  })

  it('should handle non-boolean string', () => {
    expect(coerceBoolean('javascript')).toBeUndefined()
  })

  it('should return undefined for number', () => {
    expect(coerceBoolean(420)).toBeUndefined()
  })

  it('should handle array', () => {
    expect(coerceBoolean(['javascript', { another: 'typescript' }])).toBeUndefined()
  })

  it('should handle object', () => {
    expect(coerceBoolean({ name: 'javascript' })).toBeUndefined()
  })

  it('should handle null and undefined', () => {
    expect(coerceBoolean(null)).toBeUndefined()
    expect(coerceBoolean(undefined)).toBeUndefined()
  })
})

describe('coerceDate', () => {
  it('should return valid Date as-is', () => {
    const value = new Date('2026-01-01')

    expect(coerceDate(value)).toBe(value)
  })

  it('should return undefined for invalid Date', () => {
    expect(coerceDate(new Date('not a date'))).toBeUndefined()
  })

  it('should parse ISO date string', () => {
    expect(coerceDate('2026-01-01T12:00:00Z')).toEqual(new Date('2026-01-01T12:00:00Z'))
  })

  it('should parse timestamp number', () => {
    expect(coerceDate(1750000000000)).toEqual(new Date(1750000000000))
  })

  it('should parse zero timestamp', () => {
    expect(coerceDate(0)).toEqual(new Date(0))
  })

  it('should return undefined for non-date string', () => {
    expect(coerceDate('javascript')).toBeUndefined()
  })

  it('should return undefined for empty and whitespace-only strings', () => {
    expect(coerceDate('')).toBeUndefined()
    expect(coerceDate('   ')).toBeUndefined()
  })

  it('should return undefined for NaN', () => {
    expect(coerceDate(Number.NaN)).toBeUndefined()
  })

  it('should return undefined for boolean, object, array', () => {
    expect(coerceDate(true)).toBeUndefined()
    expect(coerceDate({ date: '2026-01-01' })).toBeUndefined()
    expect(coerceDate(['2026-01-01'])).toBeUndefined()
  })

  it('should return undefined for null and undefined', () => {
    expect(coerceDate(null)).toBeUndefined()
    expect(coerceDate(undefined)).toBeUndefined()
  })
})

describe('coerceSingular', () => {
  it('should return the first element of an array', () => {
    expect(coerceSingular([1, 2, 3])).toEqual(1)
    expect(coerceSingular(['a', 'b', 'c'])).toBe('a')
    expect(coerceSingular([{ key: 'value' }, { another: 'object' }])).toEqual({ key: 'value' })
  })

  it('should return the value itself when not an array', () => {
    expect(coerceSingular(42)).toEqual(42)
    expect(coerceSingular('string')).toBe('string')
    expect(coerceSingular(true)).toBe(true)
    expect(coerceSingular({ key: 'value' })).toEqual({ key: 'value' })
  })

  it('should handle empty arrays', () => {
    expect(coerceSingular([])).toBeUndefined()
  })

  it('should handle arrays with undefined or null first elements', () => {
    expect(coerceSingular([undefined, 1, 2])).toBeUndefined()
    expect(coerceSingular([null, 1, 2])).toBeNull()
  })

  it('should handle array-like objects correctly', () => {
    const arrayLike = { 0: 'first', 1: 'second', length: 2 }

    expect(coerceSingular(arrayLike)).toEqual(arrayLike)
  })

  it('should handle null and undefined', () => {
    expect(coerceSingular(null)).toBeNull()
    expect(coerceSingular(undefined)).toBeUndefined()
  })
})

describe('coerceArray', () => {
  it('should return array as-is', () => {
    const value = [1, 2, 3]

    expect(coerceArray(value)).toBe(value)
  })

  it('should wrap scalar values in an array', () => {
    expect(coerceArray(42)).toEqual([42])
    expect(coerceArray('a')).toEqual(['a'])
    expect(coerceArray({ key: 'value' })).toEqual([{ key: 'value' }])
  })

  it('should wrap falsy non-nullish values in an array', () => {
    expect(coerceArray(0)).toEqual([0])
    expect(coerceArray('')).toEqual([''])
    expect(coerceArray(false)).toEqual([false])
  })

  it('should return empty array for null and undefined', () => {
    expect(coerceArray(null)).toEqual([])
    expect(coerceArray(undefined)).toEqual([])
  })

  it('should return empty array as-is', () => {
    const value: Array<string> = []

    expect(coerceArray(value)).toBe(value)
  })
})
