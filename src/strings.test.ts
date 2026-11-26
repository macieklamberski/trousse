import { describe, expect, it } from 'bun:test'
import { trimString } from './strings.js'

describe('trimString', () => {
  it('should return the string unchanged when it has no edge whitespace', () => {
    const value = 'Daily digest'

    expect(trimString(value)).toBe(value)
  })

  it('should strip whitespace from both edges', () => {
    const value = ' \t\nDaily digest\r\n '
    const expected = 'Daily digest'

    expect(trimString(value)).toBe(expected)
  })

  it('should strip Unicode whitespace from both edges', () => {
    const value = '\u00a0\u3000Daily digest\u2028 '
    const expected = 'Daily digest'

    expect(trimString(value)).toBe(expected)
  })

  it('should strip a byte order mark from the edges', () => {
    const value = '\uFEFFDaily digest\uFEFF'
    const expected = 'Daily digest'

    expect(trimString(value)).toBe(expected)
  })

  it('should strip NEL from the edges', () => {
    const value = '\u0085 Daily digest \u0085'
    const expected = 'Daily digest'

    expect(trimString(value)).toBe(expected)
  })

  it('should keep inner whitespace', () => {
    const value = ' Daily \u0085\u00a0 digest '
    const expected = 'Daily \u0085\u00a0 digest'

    expect(trimString(value)).toBe(expected)
  })

  it('should return undefined for an empty string', () => {
    const value = ''

    expect(trimString(value)).toBeUndefined()
  })

  it('should return undefined for a whitespace-only string', () => {
    const value = ' \t\n\u00a0\u3000'

    expect(trimString(value)).toBeUndefined()
  })

  it('should return undefined for a byte order mark alone', () => {
    const value = '\uFEFF'

    expect(trimString(value)).toBeUndefined()
  })

  it('should return undefined for NEL alone', () => {
    const value = '\u0085'

    expect(trimString(value)).toBeUndefined()
  })

  it('should return undefined for a number', () => {
    const value = 42

    expect(trimString(value)).toBeUndefined()
  })

  it('should return undefined for null and undefined', () => {
    expect(trimString(null)).toBeUndefined()
    expect(trimString(undefined)).toBeUndefined()
  })

  it('should return undefined for a String object', () => {
    // biome-ignore lint/style/useConsistentBuiltinInstantiation: A String object is the input under test.
    const value = new String('Daily digest')

    expect(trimString(value)).toBeUndefined()
  })

  it('should return a long inner whitespace run in linear time', () => {
    const value = `a${' '.repeat(200_000)}b`
    const start = performance.now()

    expect(trimString(value)).toBe(value)
    expect(performance.now() - start).toBeLessThan(1000)
  })
})
