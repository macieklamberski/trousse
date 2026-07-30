import { describe, expect, it } from 'bun:test'
import { omit, pick } from './objects.js'

describe('pick', () => {
  it('should keep only the listed keys', () => {
    const value = { id: 1, title: 'Post', author: 'Ada' }
    const expected = { id: 1, title: 'Post' }

    expect(pick(value, ['id', 'title'])).toEqual(expected)
  })

  it('should preserve the order of the listed keys', () => {
    const value = { id: 1, title: 'Post', author: 'Ada' }

    expect(Object.keys(pick(value, ['author', 'id']))).toEqual(['author', 'id'])
  })

  it('should skip keys the object does not have', () => {
    const value: { id: number; title?: string } = { id: 1 }

    expect(pick(value, ['id', 'title'])).toEqual({ id: 1 })
    expect('title' in pick(value, ['id', 'title'])).toBe(false)
  })

  it('should keep a key explicitly set to undefined', () => {
    const value: { id: number; title?: string } = { id: 1, title: undefined }
    const result = pick(value, ['id', 'title'])

    expect('title' in result).toBe(true)
    expect(result.title).toBeUndefined()
  })

  it('should keep falsy values', () => {
    const value = { count: 0, label: '', flag: false }
    const expected = { count: 0, label: '', flag: false }

    expect(pick(value, ['count', 'label', 'flag'])).toEqual(expected)
  })

  it('should return an empty object for an empty key list', () => {
    const value = { id: 1, title: 'Post' }

    expect(pick(value, [])).toEqual({})
  })

  it('should copy nested values by reference', () => {
    const nested = { name: 'Ada' }
    const value = { id: 1, nested }

    expect(pick(value, ['nested']).nested).toBe(nested)
  })

  it('should leave the source object untouched', () => {
    const value = { id: 1, title: 'Post' }
    pick(value, ['id'])

    expect(value).toEqual({ id: 1, title: 'Post' })
  })

  it('should accept a readonly key list', () => {
    const value = { id: 1, title: 'Post', author: 'Ada' }
    const keys = ['id', 'title'] as const

    expect(pick(value, keys)).toEqual({ id: 1, title: 'Post' })
  })
})

describe('omit', () => {
  it('should drop the listed keys', () => {
    const value = { id: 1, title: 'Post', author: 'Ada' }
    const expected = { id: 1 }

    expect(omit(value, ['title', 'author'])).toEqual(expected)
  })

  it('should ignore keys the object does not have', () => {
    const value: { id: number; title?: string } = { id: 1 }

    expect(omit(value, ['title'])).toEqual({ id: 1 })
  })

  it('should drop a key explicitly set to undefined', () => {
    const value: { id: number; title?: string } = { id: 1, title: undefined }

    expect('title' in omit(value, ['title'])).toBe(false)
  })

  it('should keep falsy values of the remaining keys', () => {
    const value = { count: 0, label: '', flag: false }
    const expected = { count: 0, label: '' }

    expect(omit(value, ['flag'])).toEqual(expected)
  })

  it('should return a copy of the object for an empty key list', () => {
    const value = { id: 1, title: 'Post' }
    const result = omit(value, [])

    expect(result).toEqual(value)
    expect(result).not.toBe(value)
  })

  it('should copy nested values by reference', () => {
    const nested = { name: 'Ada' }
    const value = { id: 1, nested }

    expect(omit(value, ['id']).nested).toBe(nested)
  })

  it('should leave the source object untouched', () => {
    const value = { id: 1, title: 'Post' }
    omit(value, ['title'])

    expect(value).toEqual({ id: 1, title: 'Post' })
  })

  it('should accept a readonly key list', () => {
    const value = { id: 1, title: 'Post', author: 'Ada' }
    const keys = ['title', 'author'] as const

    expect(omit(value, keys)).toEqual({ id: 1 })
  })
})
