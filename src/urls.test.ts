import { describe, expect, it } from 'bun:test'
import {
  decodeSegment,
  getPathSegments,
  getSubdomain,
  isHostOf,
  isHostOrSubdomainOf,
  isHttpUrl,
  isSubdomainOf,
  parseUrl,
} from './urls.js'

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

  it('should accept a readonly array of hosts', () => {
    const hosts: ReadonlyArray<string> = ['other.com', 'example.com']

    expect(isHostOf('https://example.com/path', hosts)).toBe(true)
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

  it('should accept a readonly array of domains', () => {
    const domains: ReadonlyArray<string> = ['other.com', 'example.com']

    expect(isSubdomainOf('https://sub.example.com/path', domains)).toBe(true)
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

describe('isHttpUrl', () => {
  it('should return true for http and https URLs', () => {
    expect(isHttpUrl('https://example.com/feed.xml')).toBe(true)
    expect(isHttpUrl('http://example.com/feed.xml')).toBe(true)
  })

  it('should return true for a URL instance', () => {
    expect(isHttpUrl(new URL('https://example.com'))).toBe(true)
  })

  it('should match the scheme case-insensitively', () => {
    expect(isHttpUrl('HTTPS://example.com')).toBe(true)
  })

  it('should return false for other schemes', () => {
    expect(isHttpUrl('javascript:subscribe()')).toBe(false)
    expect(isHttpUrl('mailto:rss@example.com')).toBe(false)
    expect(isHttpUrl('file:///Users/alice/feed.xml')).toBe(false)
    expect(isHttpUrl('ftp://example.com/feed.xml')).toBe(false)
  })

  it('should return false for relative and invalid URLs', () => {
    expect(isHttpUrl('/feed.xml')).toBe(false)
    expect(isHttpUrl('not a url')).toBe(false)
  })
})

describe('isHostOrSubdomainOf', () => {
  it('should match the bare domain', () => {
    expect(isHostOrSubdomainOf('https://medium.com/@alice', 'medium.com')).toBe(true)
  })

  it('should match a subdomain', () => {
    expect(isHostOrSubdomainOf('https://alice.medium.com/', 'medium.com')).toBe(true)
  })

  it('should match domains given as an array', () => {
    expect(isHostOrSubdomainOf('https://alice.itch.io/', ['medium.com', 'itch.io'])).toBe(true)
  })

  it('should not match a different domain sharing a suffix', () => {
    expect(isHostOrSubdomainOf('https://notmedium.com/', 'medium.com')).toBe(false)
  })

  it('should return false for invalid URLs', () => {
    expect(isHostOrSubdomainOf('not a url', 'medium.com')).toBe(false)
  })
})

describe('getSubdomain', () => {
  it('should return the label in front of the domain', () => {
    expect(getSubdomain('https://alice.podbean.com/e/episode', 'podbean.com')).toBe('alice')
  })

  it('should return every label in front of the domain', () => {
    expect(getSubdomain('https://a.b.example.com/', 'example.com')).toBe('a.b')
  })

  it('should return the lowercased label', () => {
    expect(getSubdomain('https://Alice.Podbean.com/', 'PODBEAN.com')).toBe('alice')
  })

  it('should use the first domain in a list that matches', () => {
    expect(getSubdomain('https://alice.blog.fc2.com/', ['fc2.com', 'blog.fc2.com'])).toBe(
      'alice.blog',
    )
  })

  it('should accept a URL instance', () => {
    expect(getSubdomain(new URL('https://alice.podbean.com/'), 'podbean.com')).toBe('alice')
  })

  it('should return undefined for the bare domain', () => {
    expect(getSubdomain('https://podbean.com/', 'podbean.com')).toBeUndefined()
  })

  it('should return undefined for another domain sharing a suffix', () => {
    expect(getSubdomain('https://notpodbean.com/', 'podbean.com')).toBeUndefined()
  })

  it('should return undefined for invalid URLs', () => {
    expect(getSubdomain('not a url', 'podbean.com')).toBeUndefined()
  })
})

describe('decodeSegment', () => {
  it('should decode a percent-encoded segment', () => {
    expect(decodeSegment('caf%C3%A9')).toBe('café')
  })

  it('should decode an encoded slash', () => {
    expect(decodeSegment('a%2Fb')).toBe('a/b')
  })

  it('should return a plain segment unchanged', () => {
    expect(decodeSegment('photography')).toBe('photography')
  })

  it('should return undefined for a malformed escape', () => {
    expect(decodeSegment('100%')).toBeUndefined()
    expect(decodeSegment('%E0%A4%A')).toBeUndefined()
  })

  it('should return undefined for undefined', () => {
    expect(decodeSegment(undefined)).toBeUndefined()
  })
})
