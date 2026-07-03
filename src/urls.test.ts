import { describe, expect, it } from 'bun:test'
import { getPathSegments, isHostOf, isSubdomainOf, parseUrl } from './urls.js'

describe('parseUrl', () => {
  it('should parse a valid URL string', () => {
    expect(parseUrl('https://example.com/path')?.hostname).toBe('example.com')
  })

  it('should return a URL instance as-is', () => {
    const value = new URL('https://example.com/path')

    expect(parseUrl(value)).toBe(value)
  })

  it('should resolve a relative URL against a base', () => {
    expect(parseUrl('/feed.xml', 'https://example.com/blog')?.href).toBe(
      'https://example.com/feed.xml',
    )
  })

  it('should re-resolve a URL instance when a base is given', () => {
    const value = new URL('https://example.com/path')

    expect(parseUrl(value, 'https://other.com')?.href).toBe('https://example.com/path')
  })

  it('should return undefined for invalid URLs', () => {
    expect(parseUrl('not a url')).toBeUndefined()
    expect(parseUrl('')).toBeUndefined()
  })

  it('should return undefined for a relative URL without a base', () => {
    expect(parseUrl('/feed.xml')).toBeUndefined()
  })
})

describe('getPathSegments', () => {
  it('should split the pathname into segments', () => {
    expect(getPathSegments('https://example.com/blog/feed.xml')).toEqual(['blog', 'feed.xml'])
  })

  it('should drop empty segments from leading, trailing, and double slashes', () => {
    expect(getPathSegments('https://example.com/blog//post/')).toEqual(['blog', 'post'])
  })

  it('should return empty array for the root path', () => {
    expect(getPathSegments('https://example.com/')).toEqual([])
    expect(getPathSegments('https://example.com')).toEqual([])
  })

  it('should accept a URL instance', () => {
    expect(getPathSegments(new URL('https://example.com/a/b'))).toEqual(['a', 'b'])
  })

  it('should return empty array for invalid URLs', () => {
    expect(getPathSegments('not a url')).toEqual([])
  })

  it('should ignore query and hash', () => {
    expect(getPathSegments('https://example.com/a/b?c=d#e')).toEqual(['a', 'b'])
  })
})

describe('isHostOf', () => {
  it('should match the exact hostname for a string input', () => {
    expect(isHostOf('https://example.com/path', 'example.com')).toBe(true)
  })

  it('should match the exact hostname for a URL instance', () => {
    const value = new URL('https://example.com/path')

    expect(isHostOf(value, 'example.com')).toBe(true)
  })

  it('should not match a different hostname for a URL instance', () => {
    const value = new URL('https://sub.example.com/path')

    expect(isHostOf(value, 'example.com')).toBe(false)
  })

  it('should match hostnames case-insensitively', () => {
    expect(isHostOf('https://EXAMPLE.com/path', 'example.com')).toBe(true)
  })

  it('should match host patterns case-insensitively', () => {
    expect(isHostOf('https://example.com/path', 'EXAMPLE.com')).toBe(true)
  })

  it('should match hosts given as an array', () => {
    expect(isHostOf('https://example.com/path', ['other.com', 'example.com'])).toBe(true)
  })

  it('should not match subdomains', () => {
    expect(isHostOf('https://sub.example.com/path', 'example.com')).toBe(false)
  })

  it('should return false for invalid URLs', () => {
    expect(isHostOf('not a url', 'example.com')).toBe(false)
  })
})

describe('isSubdomainOf', () => {
  it('should match subdomains for a string input', () => {
    expect(isSubdomainOf('https://sub.example.com/path', 'example.com')).toBe(true)
  })

  it('should match subdomains for a URL instance', () => {
    const value = new URL('https://sub.example.com/path')

    expect(isSubdomainOf(value, 'example.com')).toBe(true)
  })

  it('should not match the bare domain for a URL instance', () => {
    const value = new URL('https://example.com/path')

    expect(isSubdomainOf(value, 'example.com')).toBe(false)
  })

  it('should match domains given as an array', () => {
    expect(isSubdomainOf('https://sub.example.com/path', ['other.com', 'example.com'])).toBe(true)
  })

  it('should match domain patterns case-insensitively', () => {
    expect(isSubdomainOf('https://sub.example.com/path', 'EXAMPLE.com')).toBe(true)
  })

  it('should not match the bare domain', () => {
    expect(isSubdomainOf('https://example.com/path', 'example.com')).toBe(false)
  })

  it('should not match a different domain sharing a suffix', () => {
    expect(isSubdomainOf('https://notexample.com/path', 'example.com')).toBe(false)
  })

  it('should return false for invalid URLs', () => {
    expect(isSubdomainOf('not a url', 'example.com')).toBe(false)
  })
})
