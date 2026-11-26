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

  it('should keep whitespace-only strings by default', () => {
    const value = ['a', '  ', 'b']

    expect(trimArray(value)).toEqual(value)
  })

  it('should drop blank strings with the blank option', () => {
    const value = ['a', '  ', '\u0085', '', null, 'b']
    const expected = ['a', 'b']

    expect(trimArray(value, { blank: true })).toEqual(expected)
  })

  it('should drop the values the keep option rejects', () => {
    const value = [1, 0, undefined, 3]
    const expected = [1, 3]

    expect(trimArray(value, { keep: Boolean })).toEqual(expected)
  })

  it('should drop the values either the keep or the blank option rejects', () => {
    const value = ['a', '  ', 'draft', 'b']
    const expected = ['a', 'b']
    const keep = (item: unknown) => item !== 'draft'

    expect(trimArray(value, { keep, blank: true })).toEqual(expected)
  })
})

describe('omitEmpty', () => {
  it('should be the same function as trimArray', () => {
    expect(omitEmpty).toBe(trimArray)
  })
})
