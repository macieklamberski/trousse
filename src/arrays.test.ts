import { describe, expect, it } from 'bun:test'
import { omitEmpty, trimArray } from './arrays.js'

describe('trimArray', () => {
  it('should remove undefined values', () => {
    const value = ['a', undefined, 'b']
    const expected = ['a', 'b']

    expect(trimArray(value)).toEqual(expected)
  })

  it('should remove null values', () => {
    const value = ['a', null, 'b']
    const expected = ['a', 'b']

    expect(trimArray(value)).toEqual(expected)
  })

  it('should remove empty strings', () => {
    const value = ['a', '', 'b']
    const expected = ['a', 'b']

    expect(trimArray(value)).toEqual(expected)
  })

  it('should remove mixed empty values', () => {
    const value = [undefined, 'a', null, '', 'b', undefined]
    const expected = ['a', 'b']

    expect(trimArray(value)).toEqual(expected)
  })

  it('should return undefined when all values are empty', () => {
    const value = [undefined, null, '']

    expect(trimArray(value)).toBeUndefined()
  })

  it('should return undefined for empty input', () => {
    const value: Array<string | undefined> = []

    expect(trimArray(value)).toBeUndefined()
  })

  it('should preserve all values when none are empty', () => {
    const value = ['a', 'b', 'c']
    const expected = ['a', 'b', 'c']

    expect(trimArray(value)).toEqual(expected)
  })

  it('should work with number arrays', () => {
    const value = [1, undefined, 0, null, 3]
    const expected = [1, 0, 3]

    expect(trimArray(value)).toEqual(expected)
  })

  it('should preserve order of remaining values', () => {
    const value = ['c', undefined, 'a', null, 'b']
    const expected = ['c', 'a', 'b']

    expect(trimArray(value)).toEqual(expected)
  })
})

describe('omitEmpty', () => {
  it('should be the same function as trimArray', () => {
    expect(omitEmpty).toBe(trimArray)
  })
})
