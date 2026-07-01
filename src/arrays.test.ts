import { describe, expect, it } from 'bun:test'
import { omitEmpty } from './arrays.js'

describe('omitEmpty', () => {
  it('should remove undefined values', () => {
    const value = ['a', undefined, 'b']
    const expected = ['a', 'b']

    expect(omitEmpty(value)).toEqual(expected)
  })

  it('should remove null values', () => {
    const value = ['a', null, 'b']
    const expected = ['a', 'b']

    expect(omitEmpty(value)).toEqual(expected)
  })

  it('should remove empty strings', () => {
    const value = ['a', '', 'b']
    const expected = ['a', 'b']

    expect(omitEmpty(value)).toEqual(expected)
  })

  it('should remove mixed empty values', () => {
    const value = [undefined, 'a', null, '', 'b', undefined]
    const expected = ['a', 'b']

    expect(omitEmpty(value)).toEqual(expected)
  })

  it('should return empty array when all values are empty', () => {
    const value = [undefined, null, '']
    const expected: Array<string> = []

    expect(omitEmpty(value)).toEqual(expected)
  })

  it('should return empty array for empty input', () => {
    const value: Array<string | undefined> = []
    const expected: Array<string> = []

    expect(omitEmpty(value)).toEqual(expected)
  })

  it('should preserve all values when none are empty', () => {
    const value = ['a', 'b', 'c']
    const expected = ['a', 'b', 'c']

    expect(omitEmpty(value)).toEqual(expected)
  })

  it('should work with number arrays', () => {
    const value = [1, undefined, 0, null, 3]
    const expected = [1, 0, 3]

    expect(omitEmpty(value)).toEqual(expected)
  })

  it('should preserve order of remaining values', () => {
    const value = ['c', undefined, 'a', null, 'b']
    const expected = ['c', 'a', 'b']

    expect(omitEmpty(value)).toEqual(expected)
  })
})
