import { describe, expect, it } from 'bun:test'
import type { NormalizeOptions, ParamOptions } from './types.js'
import {
  addMissingScheme,
  composeFragment,
  composeQuery,
  createUrlSpellings,
  createUrlVariants,
  decodePercent,
  decodeSegment,
  encodePathSegment,
  fixMalformedQuery,
  fixMalformedScheme,
  getFragmentParam,
  getFragmentParams,
  getFragmentParamValues,
  getOrigin,
  getPathSegments,
  getQueryParam,
  getQueryParams,
  getQueryParamValues,
  getRegistrableDomain,
  getSubdomain,
  hasFragmentParam,
  hasQueryParam,
  isHostOf,
  isHostOrSubdomainOf,
  isHttpUrl,
  isIpAddress,
  isSubdomainOf,
  normalizeUrl,
  parseUrl,
  resolveFeedScheme,
  resolveUrl,
  stripWww,
  trimUrlValues,
  upgradeScheme,
} from './urls.js'

const defaultOptions: NormalizeOptions = {
  stripScheme: true,
  stripAuthentication: false,
  stripWww: true,
  stripTrailingSlash: true,
  stripRootSlash: true,
  collapseSlashes: true,
  stripHash: true,
  sortQueryParams: true,
  stripQuery: false,
  stripEmptyQuery: true,
  lowercaseQuery: false,
  normalizeEncoding: true,
  normalizeUnicode: true,
}

describe('parseUrl', () => {
  it('should parse a valid URL string', () => {
    expect(parseUrl('https://example.com/path')?.hostname).toBe('example.com')
  })

  it('should return undefined for an undefined value', () => {
    expect(parseUrl(undefined)).toBeUndefined()
  })

  it('should return undefined for a null value even with a base', () => {
    expect(parseUrl(null, 'https://example.com/')).toBeUndefined()
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

  it('should fall back to the constructor when URL.parse is missing', () => {
    const nativeParse = URL.parse
    Object.defineProperty(URL, 'parse', { value: undefined, configurable: true })

    try {
      expect(parseUrl('https://example.com/path')?.hostname).toBe('example.com')
      expect(parseUrl('not a url')).toBeUndefined()
    } finally {
      Object.defineProperty(URL, 'parse', { value: nativeParse, configurable: true })
    }
  })
})

describe('getOrigin', () => {
  it('should return the scheme, host and port of a url', () => {
    expect(getOrigin('https://social.example:8443/@alice/123')).toBe('https://social.example:8443')
  })

  it('should accept a URL instance', () => {
    expect(getOrigin(new URL('https://example.com/feed.xml'))).toBe('https://example.com')
  })

  it('should return undefined for a url with no host', () => {
    expect(getOrigin('javascript:/@alice/123')).toBeUndefined()
  })

  it('should return undefined for a scheme with an opaque origin', () => {
    expect(getOrigin('podcast://example.com/feed.xml')).toBeUndefined()
  })

  it('should return undefined for an invalid or missing url', () => {
    expect(getOrigin('not a url')).toBeUndefined()
    expect(getOrigin(undefined)).toBeUndefined()
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
  it('should match a host written in Unicode', () => {
    expect(isHostOf('https://bücher.de/feed', 'bücher.de')).toBe(true)
    expect(isHostOf('https://bücher.de/feed', ['example.com', 'bücher.de'])).toBe(true)
  })

  it('should not match a Unicode pattern that is not a valid host', () => {
    expect(isHostOf('https://bücher.de/feed', 'bü cher.de')).toBe(false)
  })

  it('should match a fully qualified host with a trailing dot', () => {
    expect(isHostOf('https://example.com./feed', 'example.com')).toBe(true)
  })

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

  it('should match a pattern with a trailing dot', () => {
    expect(isHostOf('https://example.com./feed', 'example.com.')).toBe(true)
    expect(isHostOf('https://example.com/feed', 'example.com.')).toBe(true)
  })
})

describe('isSubdomainOf', () => {
  it('should match a subdomain of a domain written in Unicode', () => {
    expect(isSubdomainOf('https://shop.bücher.de/feed', 'bücher.de')).toBe(true)
  })

  it('should match a fully qualified subdomain with a trailing dot', () => {
    expect(isSubdomainOf('https://sub.example.com./feed', 'example.com')).toBe(true)
  })

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
    expect(isSubdomainOf('https://myshop.example/path', 'shop.example')).toBe(false)
  })

  it('should return false for invalid URLs', () => {
    expect(isSubdomainOf('not a url', 'example.com')).toBe(false)
  })

  it('should match a pattern with surrounding spaces or a trailing dot', () => {
    expect(isSubdomainOf('https://a.example.com/feed', ' example.com ')).toBe(true)
    expect(isSubdomainOf('https://a.example.com/feed', 'example.com.')).toBe(true)
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
    expect(isHostOrSubdomainOf('https://example.com/@alice', 'example.com')).toBe(true)
  })

  it('should match a subdomain', () => {
    expect(isHostOrSubdomainOf('https://alice.example.com/', 'example.com')).toBe(true)
  })

  it('should match domains given as an array', () => {
    expect(isHostOrSubdomainOf('https://alice.example.org/', ['example.com', 'example.org'])).toBe(
      true,
    )
  })

  it('should not match a different domain sharing a suffix', () => {
    expect(isHostOrSubdomainOf('https://myshop.example/', 'shop.example')).toBe(false)
  })

  it('should return false for invalid URLs', () => {
    expect(isHostOrSubdomainOf('not a url', 'example.com')).toBe(false)
  })
})

describe('getSubdomain', () => {
  it('should return the label in front of a domain written in Unicode', () => {
    expect(getSubdomain('https://shop.bücher.de/feed', 'bücher.de')).toBe('shop')
  })

  it('should return the label of a fully qualified host with a trailing dot', () => {
    expect(getSubdomain('https://alice.example.net./feed', 'example.net')).toBe('alice')
  })

  it('should return the label in front of the domain', () => {
    expect(getSubdomain('https://alice.example.net/e/episode', 'example.net')).toBe('alice')
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
    expect(getSubdomain(new URL('https://alice.example.net/'), 'example.net')).toBe('alice')
  })

  it('should lowercase the hostname of a URL with another scheme', () => {
    expect(getSubdomain('javascript://BLOG.EXBLOG.JP/', 'exblog.jp')).toBe('blog')
  })

  it('should return undefined for the bare domain', () => {
    expect(getSubdomain('https://example.net/', 'example.net')).toBeUndefined()
  })

  it('should return undefined for another domain sharing a suffix', () => {
    expect(getSubdomain('https://myshop.example/', 'shop.example')).toBeUndefined()
  })

  it('should return undefined for invalid URLs', () => {
    expect(getSubdomain('not a url', 'example.net')).toBeUndefined()
  })

  it('should read a pattern with surrounding spaces or a trailing dot', () => {
    expect(getSubdomain('https://a.example.com/feed', ' example.com ')).toBe('a')
    expect(getSubdomain('https://a.example.com/feed', 'example.com.')).toBe('a')
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

describe('decodePercent', () => {
  it('should decode a percent-encoded url', () => {
    const value = 'https%3A%2F%2Fexample.com%2Fcaf%C3%A9%3Fq%3D1'
    const expected = 'https://example.com/café?q=1'

    expect(decodePercent(value)).toBe(expected)
  })

  it('should keep a percent sign without two hex digits', () => {
    const value = 'https://www.sweetwater.com/store/search.php?s=ultimate%ears'

    expect(decodePercent(value)).toBe(value)
  })

  it('should keep the bytes of a Windows-1251 path', () => {
    const value = 'http%3A%2F%2Fru.wikipedia.org%2Fwiki%2F%C0%EC%E2%F0%EE%F1%E8%E9'
    const expected = 'http://ru.wikipedia.org/wiki/%C0%EC%E2%F0%EE%F1%E8%E9'

    expect(decodePercent(value)).toBe(expected)
  })

  it('should decode the valid sequences around an invalid one', () => {
    const value = 'caf%C3%A9%2F%E0%A4%2Fna%C3%AFve'
    const expected = 'café/%E0%A4/naïve'

    expect(decodePercent(value)).toBe(expected)
  })

  it('should decode a four-byte sequence beside a byte no sequence starts with', () => {
    expect(decodePercent('%F0%9F%98%80%FF')).toBe('😀%FF')
  })

  it('should keep a sequence cut short at the end', () => {
    expect(decodePercent('https://example.com/%E2%80')).toBe('https://example.com/%E2%80')
  })

  it('should keep an overlong encoding and a surrogate', () => {
    expect(decodePercent('%C0%AF')).toBe('%C0%AF')
    expect(decodePercent('%ED%A0%80')).toBe('%ED%A0%80')
  })

  it('should decode an escaped percent sign once', () => {
    expect(decodePercent('100%25off')).toBe('100%off')
  })

  it('should keep a plus sign', () => {
    expect(decodePercent('a+b%20c')).toBe('a+b c')
  })

  it('should return a value without escapes unchanged', () => {
    expect(decodePercent('photography')).toBe('photography')
  })
})

describe('encodePathSegment', () => {
  it('should escape the characters that would open a segment, a query or a fragment', () => {
    const value = '123/../x?autoplay=1#t'
    const expected = '123%2F..%2Fx%3Fautoplay=1%23t'

    expect(encodePathSegment(value)).toBe(expected)
  })

  it('should escape whitespace', () => {
    const value = 'off\tnow later'
    const expected = 'off%09now%20later'

    expect(encodePathSegment(value)).toBe(expected)
  })

  it('should escape a backslash, which a url parser reads as a slash', () => {
    const value = '..\\..\\x'
    const expected = '..%5C..%5Cx'

    expect(encodePathSegment(value)).toBe(expected)
  })

  it('should leave the characters a path segment may hold as written', () => {
    const value = '35408001@N04:urn=a&b'

    expect(encodePathSegment(value)).toBe(value)
  })

  it('should leave an already percent-encoded value as written', () => {
    const value = 'caf%C3%A9'

    expect(encodePathSegment(value)).toBe(value)
  })

  it('should leave a non-ASCII value as written', () => {
    const value = 'ニュース'

    expect(encodePathSegment(value)).toBe(value)
  })

  it('should leave a whole value of two dots as written', () => {
    expect(encodePathSegment('..')).toBe('..')
  })

  it('should leave a whole value of one dot as written', () => {
    expect(encodePathSegment('.')).toBe('.')
  })
})

describe('getQueryParam', () => {
  it('should read a parameter by its name', () => {
    const value = new URLSearchParams('v=dQw4w9WgXcQ')

    expect(getQueryParam(value, 'v')).toBe('dQw4w9WgXcQ')
  })

  it('should read a parameter named in another case', () => {
    const value = new URLSearchParams('V=dQw4w9WgXcQ')

    expect(getQueryParam(value, 'v')).toBe('dQw4w9WgXcQ')
  })

  it('should read a camel-case name written in lowercase', () => {
    const value = new URLSearchParams('videoid=6331')

    expect(getQueryParam(value, 'videoId')).toBe('6331')
  })

  it('should return the value as written', () => {
    const value = new URLSearchParams('ID=AbC')

    expect(getQueryParam(value, 'id')).toBe('AbC')
  })

  it('should take the first of a parameter repeated across cases', () => {
    const value = new URLSearchParams('ID=10&id=90')

    expect(getQueryParam(value, 'id')).toBe('10')
  })

  it('should read the query of a url', () => {
    const value = new URL('https://example.com/watch?v=dQw4w9WgXcQ#t=30')

    expect(getQueryParam(value, 'v')).toBe('dQw4w9WgXcQ')
  })

  it('should read bare query text', () => {
    expect(getQueryParam('v=dQw4w9WgXcQ&t=30', 't')).toBe('30')
  })

  it('should read bare query text opening with a question mark', () => {
    expect(getQueryParam('?v=dQw4w9WgXcQ', 'v')).toBe('dQw4w9WgXcQ')
  })

  it('should read a string as query text, not as a url', () => {
    expect(getQueryParam('https://example.com/watch?v=dQw4w9WgXcQ', 'v')).toBeUndefined()
  })

  it('should trim whitespace around a value', () => {
    const value = new URLSearchParams('v=%20dQw4w9WgXcQ%0A')

    expect(getQueryParam(value, 'v')).toBe('dQw4w9WgXcQ')
  })

  it('should read a valueless parameter as missing', () => {
    const value = new URLSearchParams('live')

    expect(getQueryParam(value, 'live')).toBeUndefined()
  })

  it('should read a whitespace-only value as missing', () => {
    const value = new URLSearchParams('v=%20')

    expect(getQueryParam(value, 'v')).toBeUndefined()
  })

  it('should skip an empty value for the next one of the same name', () => {
    const value = new URLSearchParams('t=&t=30')

    expect(getQueryParam(value, 't')).toBe('30')
  })

  it('should return undefined for a missing parameter', () => {
    const value = new URLSearchParams('v=dQw4w9WgXcQ')

    expect(getQueryParam(value, 'list')).toBeUndefined()
  })

  it('should return undefined for an undefined source', () => {
    expect(getQueryParam(undefined, 'v')).toBeUndefined()
  })

  it('should read the first value as written with decodeValues off', () => {
    const value = new URL('https://example.com/redirect?url=a%2Bb+c&url=d')

    expect(getQueryParam(value, 'url', { decodeValues: false })).toBe('a%2Bb+c')
  })

  it('should return an empty first value with preserveEmptyValues on', () => {
    const value = new URL('https://example.com/watch?live&live=1')

    expect(getQueryParam(value, 'live', { preserveEmptyValues: true })).toBe('')
  })
})

const rawQueryCases: Array<[string, Array<string>]> = [
  [
    'https://example.com/redirect?url=https%3A%2F%2Fexample.org%2Fa%2Bb',
    ['https%3A%2F%2Fexample.org%2Fa%2Bb'],
  ],
  [
    'https://example.com/redirect?url=https://example.org/search?q=a+b',
    ['https://example.org/search?q=a+b'],
  ],
  [
    'https://example.com/redirect?url=https%3A%2F%2Fexample.org%2F%3Fa%3D1%26b%3D2',
    ['https%3A%2F%2Fexample.org%2F%3Fa%3D1%26b%3D2'],
  ],
  [
    'https://example.com/redirect?url=https://example.org/path?id=1',
    ['https://example.org/path?id=1'],
  ],
  ['https://example.com/redirect?url=https://example.org/100%2', ['https://example.org/100%2']],
]

describe('getQueryParamValues', () => {
  it('should read every value of a parameter in any case, in query order', () => {
    const value = new URLSearchParams('q=rust&Q=wasm&limit=10')

    expect(getQueryParamValues(value, 'q')).toEqual(['rust', 'wasm'])
  })

  it('should read a bracketed name', () => {
    const value = new URLSearchParams('list[]=a&LIST[]=b&other=c')

    expect(getQueryParamValues(value, 'list[]')).toEqual(['a', 'b'])
  })

  it('should read the query of a url', () => {
    const value = new URL('https://example.com/search?q=rust&q=wasm')

    expect(getQueryParamValues(value, 'q')).toEqual(['rust', 'wasm'])
  })

  it('should read bare query text', () => {
    expect(getQueryParamValues('q=rust&q=wasm', 'q')).toEqual(['rust', 'wasm'])
  })

  it('should trim each value and leave out an empty one', () => {
    const value = new URLSearchParams('q=%20rust&q=&q=wasm%20')

    expect(getQueryParamValues(value, 'q')).toEqual(['rust', 'wasm'])
  })

  it('should return an empty array for a missing parameter', () => {
    const value = new URLSearchParams('limit=10')

    expect(getQueryParamValues(value, 'q')).toEqual([])
  })

  it('should return an empty array for an undefined source', () => {
    expect(getQueryParamValues(undefined, 'q')).toEqual([])
  })

  it.each(rawQueryCases)('should read %s as written with decodeValues off', (url, expected) => {
    expect(getQueryParamValues(new URL(url), 'url', { decodeValues: false })).toEqual(expected)
  })

  it('should match the name in any case with decodeValues off', () => {
    const value = new URL('https://example.com/redirect?URL=a%2Bb&url=c+d')

    expect(getQueryParamValues(value, 'url', { decodeValues: false })).toEqual(['a%2Bb', 'c+d'])
  })

  it('should match a percent-encoded name with decodeValues off', () => {
    const value = new URL('https://example.com/redirect?%75rl=a%2Bb')

    expect(getQueryParamValues(value, 'url', { decodeValues: false })).toEqual(['a%2Bb'])
  })

  it('should trim each value and leave out an empty one with decodeValues off', () => {
    expect(getQueryParamValues('url= a%2Bb &url=&url', 'url', { decodeValues: false })).toEqual([
      'a%2Bb',
    ])
  })

  it('should read bare query text with a leading ? as written with decodeValues off', () => {
    expect(getQueryParamValues('?url=a%2Bb+c', 'url', { decodeValues: false })).toEqual(['a%2Bb+c'])
  })

  it('should read a URLSearchParams source as its toString encodes it with decodeValues off', () => {
    const value = new URLSearchParams('url=a%2bb%20c&url=100%2')

    expect(getQueryParamValues(value, 'url', { decodeValues: false })).toEqual([
      'a%2Bb+c',
      '100%252',
    ])
  })

  it('should return an empty array for an undefined source with decodeValues off', () => {
    expect(getQueryParamValues(undefined, 'url', { decodeValues: false })).toEqual([])
  })

  it('should keep whitespace around a value with trimValues off', () => {
    const value = new URL('https://example.com/search?q=%20rust%20')

    expect(getQueryParamValues(value, 'q', { trimValues: false })).toEqual([' rust '])
  })

  it('should keep an empty value with preserveEmptyValues on', () => {
    const value = new URL('https://example.com/search?q=&q=rust')

    expect(getQueryParamValues(value, 'q', { preserveEmptyValues: true })).toEqual(['', 'rust'])
  })

  it('should read a valueless flag as an empty value with preserveEmptyValues on', () => {
    const value = new URL('https://example.com/watch?live')

    expect(getQueryParamValues(value, 'live', { preserveEmptyValues: true })).toEqual([''])
  })

  it('should keep a value emptied by trimming with preserveEmptyValues on', () => {
    const value = new URL('https://example.com/search?a=%20')

    expect(getQueryParamValues(value, 'a', { preserveEmptyValues: true })).toEqual([''])
  })

  it('should keep a whitespace value untrimmed with preserveEmptyValues on and trimValues off', () => {
    const value = new URL('https://example.com/search?a=%20')
    const options: ParamOptions = { preserveEmptyValues: true, trimValues: false }

    expect(getQueryParamValues(value, 'a', options)).toEqual([' '])
  })

  it('should read a value as written and untrimmed with decodeValues and trimValues off', () => {
    const options: ParamOptions = { decodeValues: false, trimValues: false }

    expect(getQueryParamValues('q= a%2Bb+c ', 'q', options)).toEqual([' a%2Bb+c '])
  })

  it('should read a valueless flag as an empty value with decodeValues off and preserveEmptyValues on', () => {
    const value = new URL('https://example.com/watch?live&t=30')
    const options: ParamOptions = { decodeValues: false, preserveEmptyValues: true }

    expect(getQueryParamValues(value, 'live', options)).toEqual([''])
  })
})

describe('getQueryParams', () => {
  it('should read the first value of each name, keyed by the names passed', () => {
    const value = new URL('https://example.com/watch?t=30&list=a&list=b')
    const expected = {
      t: '30',
      list: 'a',
    }

    expect(getQueryParams(value, ['t', 'list'])).toEqual(expected)
  })

  it('should key a name matched in another case by the name passed', () => {
    const value = new URLSearchParams('START=90')
    const expected = { start: '90' }

    expect(getQueryParams(value, ['start'])).toEqual(expected)
  })

  it('should read bare query text', () => {
    const value = 'v=dQw4w9WgXcQ&t=30'
    const expected = { t: '30' }

    expect(getQueryParams(value, ['t'])).toEqual(expected)
  })

  it('should trim each value', () => {
    const value = new URLSearchParams('t=%2030%20')
    const expected = { t: '30' }

    expect(getQueryParams(value, ['t'])).toEqual(expected)
  })

  it('should leave out an empty value', () => {
    const value = new URLSearchParams('live&t=30')
    const expected = {
      t: '30',
    }

    expect(getQueryParams(value, ['live', 't'])).toEqual(expected)
  })

  it('should leave out a missing name', () => {
    const value = new URLSearchParams('t=30')
    const expected = { t: '30' }

    expect(getQueryParams(value, ['t', 'list'])).toEqual(expected)
  })

  it('should return an empty record for no names', () => {
    const value = new URLSearchParams('t=30')

    expect(getQueryParams(value, [])).toEqual({})
  })

  it('should return an empty record for an undefined source', () => {
    expect(getQueryParams(undefined, ['t'])).toEqual({})
  })

  it('should read each value as written with decodeValues off', () => {
    const value = new URL('https://example.com/redirect?url=a%2Bb&ref=c+d')
    const expected: Record<string, string> = { url: 'a%2Bb', ref: 'c+d' }

    expect(getQueryParams(value, ['url', 'ref'], { decodeValues: false })).toEqual(expected)
  })

  it('should map a name with an empty value to an empty string with preserveEmptyValues on', () => {
    const value = new URL('https://example.com/watch?live&t=30')
    const expected: Record<string, string> = { live: '', t: '30' }

    expect(getQueryParams(value, ['live', 't'], { preserveEmptyValues: true })).toEqual(expected)
  })
})

describe('getFragmentParam', () => {
  it('should read the fragment of a url', () => {
    const value = new URL('https://example.com/watch?t=10#t=30')

    expect(getFragmentParam(value, 't')).toBe('30')
  })

  it('should read bare fragment text opening with a hash', () => {
    expect(getFragmentParam('#t=30&x=1', 'x')).toBe('1')
  })

  it('should read bare fragment text without a hash', () => {
    expect(getFragmentParam('t=30&x=1', 't')).toBe('30')
  })

  it('should read a fragment held in search params', () => {
    const value = new URLSearchParams('t=30')

    expect(getFragmentParam(value, 't')).toBe('30')
  })

  it('should read a parameter named in another case', () => {
    expect(getFragmentParam('#T=30', 't')).toBe('30')
  })

  it('should trim whitespace around a value', () => {
    expect(getFragmentParam('#t=%2030%20', 't')).toBe('30')
  })

  it('should read a valueless parameter as missing', () => {
    expect(getFragmentParam('#autoplay', 'autoplay')).toBeUndefined()
  })

  it('should return undefined for a url without a fragment', () => {
    const value = new URL('https://example.com/watch?t=30')

    expect(getFragmentParam(value, 't')).toBeUndefined()
  })

  it('should return undefined for an undefined source', () => {
    expect(getFragmentParam(undefined, 't')).toBeUndefined()
  })

  it('should read the first value as written with decodeValues off', () => {
    expect(getFragmentParam('#url=a%2Bb+c&url=d', 'url', { decodeValues: false })).toBe('a%2Bb+c')
  })

  it('should return an empty first value with preserveEmptyValues on', () => {
    const options: ParamOptions = { preserveEmptyValues: true }

    expect(getFragmentParam('#autoplay&autoplay=1', 'autoplay', options)).toBe('')
  })
})

const rawFragmentCases: Array<[string, Array<string>]> = [
  [
    'https://example.com/redirect#url=https%3A%2F%2Fexample.org%2Fa%2Bb',
    ['https%3A%2F%2Fexample.org%2Fa%2Bb'],
  ],
  [
    'https://example.com/redirect#url=https://example.org/search?q=a+b',
    ['https://example.org/search?q=a+b'],
  ],
  [
    'https://example.com/redirect#url=https%3A%2F%2Fexample.org%2F%3Fa%3D1%26b%3D2',
    ['https%3A%2F%2Fexample.org%2F%3Fa%3D1%26b%3D2'],
  ],
  [
    'https://example.com/redirect#url=https://example.org/path?id=1',
    ['https://example.org/path?id=1'],
  ],
  ['https://example.com/redirect#url=https://example.org/100%2', ['https://example.org/100%2']],
]

describe('getFragmentParamValues', () => {
  it('should read every value of a parameter in any case, in fragment order', () => {
    expect(getFragmentParamValues('#t=30&T=60&x=1', 't')).toEqual(['30', '60'])
  })

  it('should read the fragment of a url', () => {
    const value = new URL('https://example.com/watch#t=30&t=60')

    expect(getFragmentParamValues(value, 't')).toEqual(['30', '60'])
  })

  it('should return an empty array for an undefined source', () => {
    expect(getFragmentParamValues(undefined, 't')).toEqual([])
  })

  it.each(rawFragmentCases)('should read %s as written with decodeValues off', (url, expected) => {
    expect(getFragmentParamValues(new URL(url), 'url', { decodeValues: false })).toEqual(expected)
  })

  it('should match the name in any case with decodeValues off', () => {
    const value = new URL('https://example.com/redirect#URL=a%2Bb&url=c+d')

    expect(getFragmentParamValues(value, 'url', { decodeValues: false })).toEqual(['a%2Bb', 'c+d'])
  })

  it('should trim each value and leave out an empty one with decodeValues off', () => {
    expect(getFragmentParamValues('#url= a%2Bb &url=', 'url', { decodeValues: false })).toEqual([
      'a%2Bb',
    ])
  })

  it('should read a URLSearchParams source as its toString encodes it with decodeValues off', () => {
    const value = new URLSearchParams('url=a%2bb%20c')

    expect(getFragmentParamValues(value, 'url', { decodeValues: false })).toEqual(['a%2Bb+c'])
  })

  it('should return an empty array for a url without a fragment with decodeValues off', () => {
    const value = new URL('https://example.com/redirect?url=a%2Bb')

    expect(getFragmentParamValues(value, 'url', { decodeValues: false })).toEqual([])
  })

  it('should keep whitespace around a value with trimValues off', () => {
    expect(getFragmentParamValues('#t=%2030%20', 't', { trimValues: false })).toEqual([' 30 '])
  })

  it('should keep an empty value with preserveEmptyValues on', () => {
    expect(getFragmentParamValues('#t=&t=30', 't', { preserveEmptyValues: true })).toEqual([
      '',
      '30',
    ])
  })

  it('should read a valueless flag as an empty value with preserveEmptyValues on', () => {
    const value = new URL('https://example.com/watch#autoplay')

    expect(getFragmentParamValues(value, 'autoplay', { preserveEmptyValues: true })).toEqual([''])
  })

  it('should keep a whitespace value untrimmed with preserveEmptyValues on and trimValues off', () => {
    const options: ParamOptions = { preserveEmptyValues: true, trimValues: false }

    expect(getFragmentParamValues('#a=%20', 'a', options)).toEqual([' '])
  })

  it('should read a value as written and untrimmed with decodeValues and trimValues off', () => {
    const options: ParamOptions = { decodeValues: false, trimValues: false }

    expect(getFragmentParamValues('#t= a%2Bb ', 't', options)).toEqual([' a%2Bb '])
  })
})

describe('getFragmentParams', () => {
  it('should read the first value of each name, keyed by the names passed', () => {
    const value = new URL('https://example.com/watch#T=30&x=1&x=2')
    const expected = {
      t: '30',
      x: '1',
    }

    expect(getFragmentParams(value, ['t', 'x'])).toEqual(expected)
  })

  it('should read bare fragment text', () => {
    const value = '#t=30&x=1'
    const expected = { t: '30' }

    expect(getFragmentParams(value, ['t'])).toEqual(expected)
  })

  it('should leave out an empty value', () => {
    const value = '#autoplay&t=30'
    const expected = {
      t: '30',
    }

    expect(getFragmentParams(value, ['autoplay', 't'])).toEqual(expected)
  })

  it('should return an empty record for an undefined source', () => {
    expect(getFragmentParams(undefined, ['t'])).toEqual({})
  })

  it('should read each value as written with decodeValues off', () => {
    const value = new URL('https://example.com/redirect#url=a%2Bb&ref=c+d')
    const expected: Record<string, string> = { url: 'a%2Bb', ref: 'c+d' }

    expect(getFragmentParams(value, ['url', 'ref'], { decodeValues: false })).toEqual(expected)
  })

  it('should map a name with an empty value to an empty string with preserveEmptyValues on', () => {
    const value = new URL('https://example.com/watch#autoplay&t=30')
    const expected: Record<string, string> = { autoplay: '', t: '30' }

    expect(getFragmentParams(value, ['autoplay', 't'], { preserveEmptyValues: true })).toEqual(
      expected,
    )
  })
})

describe('composeQuery', () => {
  it('should prefix a single parameter with a question mark', () => {
    const value = { start: '90' }
    const expected = '?start=90'

    expect(composeQuery(value)).toBe(expected)
  })

  it('should write a number value as its digits', () => {
    const value = {
      width: 640,
      height: 360,
    }
    const expected = '?width=640&height=360'

    expect(composeQuery(value)).toBe(expected)
  })

  it('should join several parameters in the order given', () => {
    const value = {
      start: '90',
      list: 'PLabc',
      index: '4',
    }
    const expected = '?start=90&list=PLabc&index=4'

    expect(composeQuery(value)).toBe(expected)
  })

  it('should keep a slash, an at sign and a non-ASCII character as written', () => {
    const value = {
      clipt: 'a/b',
      user_id: '17367418@N03',
      title: 'zürich',
    }
    const expected = '?clipt=a/b&user_id=17367418@N03&title=zürich'

    expect(composeQuery(value)).toBe(expected)
  })

  it('should escape a percent sign in a value, so a decoded escape is not decoded twice', () => {
    const value = { media_url: 'https://example.com/a%2Cb.mp3' }
    const expected = '?media_url=https://example.com/a%252Cb.mp3'

    expect(composeQuery(value)).toBe(expected)
  })

  it('should escape a plus sign in a value, so it is not read back as a space', () => {
    const value = { tags: 'c++' }
    const expected = '?tags=c%2B%2B'

    expect(composeQuery(value)).toBe(expected)
  })

  it('should escape an ampersand, a hash and whitespace in a value', () => {
    const value = { vid: 'a&b=1#c d\te' }
    const expected = '?vid=a%26b=1%23c%20d%09e'

    expect(composeQuery(value)).toBe(expected)
  })

  it('should escape an ampersand, a hash, a percent sign, a plus sign and whitespace in a name', () => {
    const value = { 'a&b#c d%e+f': '1' }
    const expected = '?a%26b%23c%20d%25e%2Bf=1'

    expect(composeQuery(value)).toBe(expected)
  })

  it('should leave out a parameter whose value is empty', () => {
    const value = {
      start: '90',
      theme: '',
    }
    const expected = '?start=90'

    expect(composeQuery(value)).toBe(expected)
  })

  it('should keep a zero value', () => {
    const value = { start: 0 }
    const expected = '?start=0'

    expect(composeQuery(value)).toBe(expected)
  })

  it('should return an empty string when every value is empty', () => {
    const value = { theme: '' }

    expect(composeQuery(value)).toBe('')
  })

  it('should return an empty string for an empty record', () => {
    expect(composeQuery({})).toBe('')
  })

  it('should return an empty string when nothing is passed', () => {
    expect(composeQuery()).toBe('')
  })
})

describe('resolveFeedScheme', () => {
  it('should convert feed:// to https://', () => {
    const value = 'feed://example.com/rss.xml'
    const expected = 'https://example.com/rss.xml'

    expect(resolveFeedScheme(value)).toBe(expected)
  })

  it('should convert rss:// to https://', () => {
    const value = 'rss://example.com/feed.xml'
    const expected = 'https://example.com/feed.xml'

    expect(resolveFeedScheme(value)).toBe(expected)
  })

  it('should convert pcast:// to https://', () => {
    const value = 'pcast://example.com/podcast.xml'
    const expected = 'https://example.com/podcast.xml'

    expect(resolveFeedScheme(value)).toBe(expected)
  })

  it('should convert itpc:// to https://', () => {
    const value = 'itpc://example.com/podcast.xml'
    const expected = 'https://example.com/podcast.xml'

    expect(resolveFeedScheme(value)).toBe(expected)
  })

  it('should convert podcast:// to https://', () => {
    const value = 'podcast://example.com/feed.xml'
    const expected = 'https://example.com/feed.xml'

    expect(resolveFeedScheme(value)).toBe(expected)
  })

  it('should unwrap feed:https:// to https://', () => {
    const value = 'feed:https://example.com/rss.xml'
    const expected = 'https://example.com/rss.xml'

    expect(resolveFeedScheme(value)).toBe(expected)
  })

  it('should unwrap feed:http:// to http://', () => {
    const value = 'feed:http://example.com/rss.xml'
    const expected = 'http://example.com/rss.xml'

    expect(resolveFeedScheme(value)).toBe(expected)
  })

  it('should unwrap rss:https:// to https://', () => {
    const value = 'rss:https://example.com/feed.xml'
    const expected = 'https://example.com/feed.xml'

    expect(resolveFeedScheme(value)).toBe(expected)
  })

  it('should unwrap pcast:https:// to https://', () => {
    const value = 'pcast:https://example.com/podcast.xml'
    const expected = 'https://example.com/podcast.xml'

    expect(resolveFeedScheme(value)).toBe(expected)
  })

  it('should unwrap itpc:http:// to http://', () => {
    const value = 'itpc:http://example.com/podcast.xml'
    const expected = 'http://example.com/podcast.xml'

    expect(resolveFeedScheme(value)).toBe(expected)
  })

  it('should unwrap podcast:https:// to https://', () => {
    const value = 'podcast:https://example.com/feed.xml'
    const expected = 'https://example.com/feed.xml'

    expect(resolveFeedScheme(value)).toBe(expected)
  })

  it('should convert podcasts:// to https://', () => {
    const value = 'podcasts://example.com/feed.xml'
    const expected = 'https://example.com/feed.xml'

    expect(resolveFeedScheme(value)).toBe(expected)
  })

  it('should unwrap podcasts:https:// to https://', () => {
    const value = 'podcasts:https://example.com/feed.xml'
    const expected = 'https://example.com/feed.xml'

    expect(resolveFeedScheme(value)).toBe(expected)
  })

  it('should convert itms:// to https://', () => {
    const value = 'itms://example.com/podcast.xml'
    const expected = 'https://example.com/podcast.xml'

    expect(resolveFeedScheme(value)).toBe(expected)
  })

  it('should convert itms-pcast:// to https://', () => {
    const value = 'itms-pcast://example.com/podcast.xml'
    const expected = 'https://example.com/podcast.xml'

    expect(resolveFeedScheme(value)).toBe(expected)
  })

  it('should convert itms-pcasts:// to https://', () => {
    const value = 'itms-pcasts://example.com/podcast.xml'
    const expected = 'https://example.com/podcast.xml'

    expect(resolveFeedScheme(value)).toBe(expected)
  })

  it('should convert itms-podcast:// to https://', () => {
    const value = 'itms-podcast://example.com/podcast.xml'
    const expected = 'https://example.com/podcast.xml'

    expect(resolveFeedScheme(value)).toBe(expected)
  })

  it('should convert itms-podcasts:// to https://', () => {
    const value = 'itms-podcasts://example.com/podcast.xml'
    const expected = 'https://example.com/podcast.xml'

    expect(resolveFeedScheme(value)).toBe(expected)
  })

  it('should unwrap itms-podcast:https:// to https://', () => {
    const value = 'itms-podcast:https://example.com/podcast.xml'
    const expected = 'https://example.com/podcast.xml'

    expect(resolveFeedScheme(value)).toBe(expected)
  })

  it('should return https URLs unchanged', () => {
    const value = 'https://example.com/feed.xml'

    expect(resolveFeedScheme(value)).toBe(value)
  })

  it('should return http URLs unchanged', () => {
    const value = 'http://example.com/rss.xml'

    expect(resolveFeedScheme(value)).toBe(value)
  })

  it('should return non-feed URLs starting with feed-scheme letters unchanged', () => {
    expect(resolveFeedScheme('ftp://example.com/feed.xml')).toBe('ftp://example.com/feed.xml')
    expect(resolveFeedScheme('irc://irc.example.com/feeds')).toBe('irc://irc.example.com/feeds')
    expect(resolveFeedScheme('feeds.example.com/rss')).toBe('feeds.example.com/rss')
    expect(resolveFeedScheme('podcasts.example.com/feed')).toBe('podcasts.example.com/feed')
    expect(resolveFeedScheme('rss.example.com/feed')).toBe('rss.example.com/feed')
  })

  it('should return absolute path URLs unchanged', () => {
    const value = '/path/to/feed'

    expect(resolveFeedScheme(value)).toBe(value)
  })

  it('should return relative path URLs unchanged', () => {
    const value = 'relative/feed.xml'

    expect(resolveFeedScheme(value)).toBe(value)
  })

  it('should handle feed URLs with paths and query params', () => {
    const value = 'feed://example.com/path/to/feed?format=rss'
    const expected = 'https://example.com/path/to/feed?format=rss'

    expect(resolveFeedScheme(value)).toBe(expected)
  })

  it('should handle feed URLs with ports', () => {
    const value = 'feed://example.com:8080/feed.xml'
    const expected = 'https://example.com:8080/feed.xml'

    expect(resolveFeedScheme(value)).toBe(expected)
  })

  it('should handle uppercase feed schemes', () => {
    expect(resolveFeedScheme('FEED://example.com/rss.xml')).toBe('https://example.com/rss.xml')
    expect(resolveFeedScheme('Feed://example.com/rss.xml')).toBe('https://example.com/rss.xml')
    expect(resolveFeedScheme('FEED:https://example.com/rss.xml')).toBe(
      'https://example.com/rss.xml',
    )
    expect(resolveFeedScheme('RSS://example.com/feed.xml')).toBe('https://example.com/feed.xml')
    expect(resolveFeedScheme('PCAST://example.com/podcast.xml')).toBe(
      'https://example.com/podcast.xml',
    )
  })

  it('should handle mixed case in wrapped URL scheme', () => {
    expect(resolveFeedScheme('feed:HTTPS://example.com/rss.xml')).toBe(
      'HTTPS://example.com/rss.xml',
    )
    expect(resolveFeedScheme('feed:Http://example.com/rss.xml')).toBe('Http://example.com/rss.xml')
  })

  it('should return empty string unchanged', () => {
    expect(resolveFeedScheme('')).toBe('')
  })

  it('should return malformed feed URL unchanged', () => {
    const value = 'feed:example.com'

    expect(resolveFeedScheme(value)).toBe(value)
  })

  it('should handle feed URLs with authentication', () => {
    const value = 'feed://user:pass@example.com/rss.xml'
    const expected = 'https://user:pass@example.com/rss.xml'

    expect(resolveFeedScheme(value)).toBe(expected)
  })

  it('should handle feed URLs with hash fragment', () => {
    const value = 'feed://example.com/rss.xml#latest'
    const expected = 'https://example.com/rss.xml#latest'

    expect(resolveFeedScheme(value)).toBe(expected)
  })

  it('should use the fallback scheme for feed:// URLs', () => {
    expect(resolveFeedScheme('feed://example.com/feed', 'http')).toBe('http://example.com/feed')
    expect(resolveFeedScheme('rss://example.com/feed', 'http')).toBe('http://example.com/feed')
  })

  it('should ignore the fallback scheme for wrapped URLs with explicit scheme', () => {
    expect(resolveFeedScheme('feed:https://example.com/feed', 'http')).toBe(
      'https://example.com/feed',
    )
    expect(resolveFeedScheme('feed:http://example.com/feed', 'https')).toBe(
      'http://example.com/feed',
    )
  })
})

describe('fixMalformedScheme', () => {
  const leadingSlashCases: Array<[string, string]> = [
    ['/http://example.com', 'http://example.com'],
    ['/https://example.com', 'https://example.com'],
  ]

  it.each(leadingSlashCases)('should strip leading slash before scheme (%s)', (value, expected) => {
    expect(fixMalformedScheme(value)).toBe(expected)
  })

  const schemeTypoCases: Array<[string, string]> = [
    ['htp://example.com', 'http://example.com'],
    ['htps://example.com', 'https://example.com'],
    ['hhttps://example.com', 'https://example.com'],
    ['httpss://example.com', 'https://example.com'],
    ['ttp://example.com', 'http://example.com'],
  ]

  it.each(schemeTypoCases)('should fix scheme typos (%s)', (value, expected) => {
    expect(fixMalformedScheme(value)).toBe(expected)
  })

  const encodedSpaceCases: Array<[string, string]> = [
    ['http://%20www.example.com/coop', 'http://www.example.com/coop'],
    ['http://%C2%A0example.com/', 'http://example.com/'],
    ['http://%20https://itunes.apple.com/app/id1230', 'https://itunes.apple.com/app/id1230'],
    ['http://%20https//www.example.com/store/', 'https://www.example.com/store/'],
    ['http://%20%20example.com', 'http://example.com'],
  ]

  it.each(encodedSpaceCases)(
    'should drop a percent-encoded space after the scheme (%s)',
    (value, expected) => {
      expect(fixMalformedScheme(value)).toBe(expected)
    },
  )

  it('should keep a percent-encoded space later in the url', () => {
    const value = 'https://example.com/%20page?q=a%20b'

    expect(fixMalformedScheme(value)).toBe(value)
  })

  const wrongSeparatorCases: Array<[string, string]> = [
    ['http=//example.com', 'http://example.com'],
    ['http.//example.com', 'http://example.com'],
    ['http\\//example.com', 'http://example.com'],
    ['https=//example.com', 'https://example.com'],
  ]

  it.each(wrongSeparatorCases)(
    'should fix wrong separators after scheme (%s)',
    (value, expected) => {
      expect(fixMalformedScheme(value)).toBe(expected)
    },
  )

  const singleSlashCases: Array<[string, string]> = [
    ['http:/example.com', 'http://example.com'],
    ['https:/example.com', 'https://example.com'],
    ['http:/www.example.com', 'http://www.example.com'],
    ['https:/example.com/feed', 'https://example.com/feed'],
  ]

  it.each(singleSlashCases)('should fix single slash after scheme (%s)', (value, expected) => {
    expect(fixMalformedScheme(value)).toBe(expected)
  })

  const repeatedColonAndSlashCases: Array<[string, string]> = [
    ['http:://example.com', 'http://example.com'],
    ['http:///example.com', 'http://example.com'],
    ['http:////example.com', 'http://example.com'],
    ['https:::///example.com', 'https://example.com'],
    ['http://///example.com', 'http://example.com'],
    ['https://////www.example.com', 'https://www.example.com'],
  ]

  it.each(repeatedColonAndSlashCases)(
    'should fix multiple colons and slashes (%s)',
    (value, expected) => {
      expect(fixMalformedScheme(value)).toBe(expected)
    },
  )

  const leadingJunkCases: Array<[string, string]> = [
    ['http://./example.com', 'http://example.com'],
    ['http://,example.com', 'http://example.com'],
    ['https://...example.com', 'https://example.com'],
  ]

  it.each(leadingJunkCases)('should remove leading junk after scheme (%s)', (value, expected) => {
    expect(fixMalformedScheme(value)).toBe(expected)
  })

  const placeholderCases: Array<[string, string]> = [
    ['http(s)://example.com', 'https://example.com'],
    ['HTTP(S)://example.com/feed', 'https://example.com/feed'],
  ]

  it.each(placeholderCases)('should fix placeholder syntax (%s)', (value, expected) => {
    expect(fixMalformedScheme(value)).toBe(expected)
  })

  const splitSchemeCases: Array<[string, string]> = [
    ['http:s//example.com', 'https://example.com'],
    ['https:s//example.com', 'https://example.com'],
    ['ht:tps//example.com', 'https://example.com'],
    ['htt:p//example.com', 'http://example.com'],
    ['h:ttp//example.com', 'http://example.com'],
    ['ht:tp//example.com', 'http://example.com'],
  ]

  it.each(splitSchemeCases)('should fix colon within scheme letters (%s)', (value, expected) => {
    expect(fixMalformedScheme(value)).toBe(expected)
  })

  const doubledPrefixCases: Array<[string, string]> = [
    ['http:http://example.com', 'http://example.com'],
    ['https:https://example.com', 'https://example.com'],
    ['http:https://example.com', 'https://example.com'],
    ['https:http://example.com', 'http://example.com'],
    ['http::http://example.com', 'http://example.com'],
  ]

  it.each(doubledPrefixCases)('should fix double scheme prefix (%s)', (value, expected) => {
    expect(fixMalformedScheme(value)).toBe(expected)
  })

  const misplacedWwwCases: Array<[string, string]> = [
    ['http:www.//example.com', 'http://www.example.com'],
    ['https:www.//example.com', 'https://www.example.com'],
  ]

  it.each(misplacedWwwCases)('should fix misplaced www after scheme (%s)', (value, expected) => {
    expect(fixMalformedScheme(value)).toBe(expected)
  })

  const missingWwwDotCases: Array<[string, string]> = [
    ['http://www/example.com', 'http://www.example.com'],
    ['https://www/example.com/feed', 'https://www.example.com/feed'],
  ]

  it.each(missingWwwDotCases)('should fix missing dot after www (%s)', (value, expected) => {
    expect(fixMalformedScheme(value)).toBe(expected)
  })

  const nestedSchemeCases: Array<[string, string]> = [
    ['http://https//example.com', 'https://example.com'],
    ['http://https/example.com', 'https://example.com'],
    ['https://https//example.com', 'https://example.com'],
    ['http://http/example.com', 'http://example.com'],
    ['http://http//example.com', 'http://example.com'],
    ['http://ttp://example.com', 'http://example.com'],
    ['http://ttps://example.com', 'https://example.com'],
    ['htp://ttps://example.com', 'https://example.com'],
    ['htps://ttp://example.com', 'http://example.com'],
    ['hs://hp://example.com', 'http://example.com'],
    ['httpss://htps://example.com', 'https://example.com'],
  ]

  it.each(nestedSchemeCases)('should fix nested double schemes (%s)', (value, expected) => {
    expect(fixMalformedScheme(value)).toBe(expected)
  })

  const strayColonCases: Array<[string, string]> = [
    ['http://:/example.com', 'http://example.com'],
    ['https://:/example.com', 'https://example.com'],
    ['http://:/path/to/feed', 'http://path/to/feed'],
  ]

  it.each(strayColonCases)(
    'should fix stray colon after scheme slashes (%s)',
    (value, expected) => {
      expect(fixMalformedScheme(value)).toBe(expected)
    },
  )

  const portCases: Array<[string, string]> = [
    ['htp://example.com:8080', 'http://example.com:8080'],
    ['htps://example.com:443/feed', 'https://example.com:443/feed'],
    ['hhttps://example.com:3000', 'https://example.com:3000'],
  ]

  it.each(portCases)(
    'should preserve port numbers when fixing scheme typos (%s)',
    (value, expected) => {
      expect(fixMalformedScheme(value)).toBe(expected)
    },
  )

  const queryStringCases: Array<[string, string]> = [
    ['htp://example.com?a=1', 'http://example.com?a=1'],
    ['htps://example.com/feed?format=rss&id=123', 'https://example.com/feed?format=rss&id=123'],
    ['hhttps://example.com?foo=bar#anchor', 'https://example.com?foo=bar#anchor'],
  ]

  it.each(queryStringCases)(
    'should preserve query strings when fixing scheme typos (%s)',
    (value, expected) => {
      expect(fixMalformedScheme(value)).toBe(expected)
    },
  )

  const schemeInPathUrls: Array<string> = [
    'http://example.com/path/http://file',
    'https://example.com/redirect?url=http://other.com',
    'http://example.com/api/https://callback',
  ]

  it.each(schemeInPathUrls)('should not modify scheme-like strings in path (%s)', (value) => {
    expect(fixMalformedScheme(value)).toBe(value)
  })

  const schemeLikeHostnameUrls: Array<string> = [
    'https://tp.srgssr.ch/p/srf/embed',
    'https://ps.w.org/plugin/icon.png',
    'http://tp.media/x',
    'https://tps.org/a',
    'https://https.example.com/feed',
    'tp.media/x',
    'https://ps.tp.example.com/a',
  ]

  it.each(schemeLikeHostnameUrls)(
    'should not mistake a leading hostname label for a scheme (%s)',
    (value) => {
      expect(fixMalformedScheme(value)).toBe(value)
    },
  )

  const schemeLikePathUrls: Array<string> = [
    '/hp/support',
    '/tp/feed.xml',
    '/http/feed.xml',
    'tps/x.xml',
    'hh/x.xml',
    '/tps/tps/feed',
  ]

  it.each(schemeLikePathUrls)(
    'should not mistake a relative path segment for a scheme (%s)',
    (value) => {
      expect(fixMalformedScheme(value)).toBe(value)
    },
  )

  const schemeLikeSingleLabelHostUrls: Array<string> = [
    'http://hp/support',
    'http://ssh/feed.xml',
    'https://sh/x',
  ]

  it.each(schemeLikeSingleLabelHostUrls)(
    'should not mistake a single-label host for a doubled scheme (%s)',
    (value) => {
      expect(fixMalformedScheme(value)).toBe(value)
    },
  )

  const schemeLikeDoubleSlashPathUrls: Array<string> = ['hp//x', 'hh//x']

  it.each(schemeLikeDoubleSlashPathUrls)(
    'should not mistake a path with a double slash for a scheme (%s)',
    (value) => {
      expect(fixMalformedScheme(value)).toBe(value)
    },
  )

  const schemeLikePortHostUrls: Array<string> = [
    'http://tps:8080/feed',
    'http://php:8080/feed',
    'http://sh:8080/feed',
  ]

  it.each(schemeLikePortHostUrls)(
    'should not mistake a host with a port for a doubled scheme (%s)',
    (value) => {
      expect(fixMalformedScheme(value)).toBe(value)
    },
  )

  const schemeLikeUsernameUrls: Array<string> = [
    'https://http:secret@example.com/feed',
    'https://ps:secret@example.com/feed',
    'https://http=user@example.com/feed',
    'https://https=user@example.com/feed',
  ]

  it.each(schemeLikeUsernameUrls)(
    'should not mistake a username for a doubled scheme (%s)',
    (value) => {
      expect(fixMalformedScheme(value)).toBe(value)
    },
  )

  it('should fix a nested double scheme before credentials', () => {
    const value = 'http://https://user:secret@example.com/feed'
    const expected = 'https://user:secret@example.com/feed'

    expect(fixMalformedScheme(value)).toBe(expected)
  })

  const nonHttpUrls: Array<string> = [
    'ftp://example.com/file',
    'mailto:user@example.com',
    'file:///path/to/file',
    'data:text/plain;base64,SGVsbG8=',
    'tel:+1234567890',
  ]

  it.each(nonHttpUrls)('should preserve non-HTTP schemes unchanged (%s)', (value) => {
    expect(fixMalformedScheme(value)).toBe(value)
  })

  const validUrls: Array<string> = [
    'http://example.com',
    'https://example.com',
    'http://example.com/path/to/feed',
    'https://example.com/feed?format=rss',
    'http://example.com:8080/feed',
    'ftp://example.com/file',
    '/path/to/feed',
  ]

  it.each(validUrls)('should preserve valid URLs unchanged (%s)', (value) => {
    expect(fixMalformedScheme(value)).toBe(value)
  })

  it('should return empty string unchanged', () => {
    expect(fixMalformedScheme('')).toBe('')
  })
})

describe('fixMalformedQuery', () => {
  describe('ampersand glued onto the path', () => {
    it('should open the query at the first pair', () => {
      const value = 'https://example.com/v/abc123&hl=en&fs=1'
      const expected = 'https://example.com/v/abc123?hl=en&fs=1'

      expect(fixMalformedQuery(value)).toBe(expected)
    })

    it('should join a later query to the opened one', () => {
      const value = 'https://example.com/v/abc123&hl=en&fs=1?rel=0'
      const expected = 'https://example.com/v/abc123?hl=en&fs=1&rel=0'

      expect(fixMalformedQuery(value)).toBe(expected)
    })

    it('should open an empty query at a trailing ampersand', () => {
      const value = 'https://example.com/v/abc123&'
      const expected = 'https://example.com/v/abc123?'

      expect(fixMalformedQuery(value)).toBe(expected)
    })

    it('should open the query at a name with no value', () => {
      const value = 'https://example.com/v/abc123&feature'
      const expected = 'https://example.com/v/abc123?feature'

      expect(fixMalformedQuery(value)).toBe(expected)
    })

    it('should open the query at a bare word a pair follows', () => {
      const value = 'https://example.com/v/abc123&feature&hl=en'
      const expected = 'https://example.com/v/abc123?feature&hl=en'

      expect(fixMalformedQuery(value)).toBe(expected)
    })

    it('should drop an ampersand directly before the query', () => {
      const value = 'https://example.com/v/abc123&?rel=0'
      const expected = 'https://example.com/v/abc123?rel=0'

      expect(fixMalformedQuery(value)).toBe(expected)
    })

    it('should repair a scheme-relative url', () => {
      const value = '//example.com/embed/abc123&t=6s'
      const expected = '//example.com/embed/abc123?t=6s'

      expect(fixMalformedQuery(value)).toBe(expected)
    })

    it('should keep the fragment', () => {
      const value = 'https://example.com/embed/abc123&autoplay=1#t=30'
      const expected = 'https://example.com/embed/abc123?autoplay=1#t=30'

      expect(fixMalformedQuery(value)).toBe(expected)
    })

    it('should join the query after a name with no value', () => {
      const value = 'https://example.com/embed/abc123&t?autoplay=0&loop=1'
      const expected = 'https://example.com/embed/abc123?t&autoplay=0&loop=1'

      expect(fixMalformedQuery(value)).toBe(expected)
    })

    it('should leave an ampersand inside a slug alone', () => {
      const value = 'https://example.com/company/pack-&-cool-ltd'

      expect(fixMalformedQuery(value)).toBe(value)
    })

    it('should leave an ampersand in a folder name before a file alone', () => {
      const value = 'https://example.com/x/a&b/img.jpg'

      expect(fixMalformedQuery(value)).toBe(value)
    })

    it('should still open the query at a slug followed by a pair', () => {
      const value = 'https://example.com/company/pack-&utm_source=feed'
      const expected = 'https://example.com/company/pack-?utm_source=feed'

      expect(fixMalformedQuery(value)).toBe(expected)
    })

    it('should leave an ampersand in the credentials alone', () => {
      const value = 'https://user&name@example.com/feed'

      expect(fixMalformedQuery(value)).toBe(value)
    })

    it('should leave an ampersand in a url with no path alone', () => {
      const value = 'https://example.com:8080&a=1'

      expect(fixMalformedQuery(value)).toBe(value)
    })

    it('should return its own output unchanged', () => {
      const value = 'https://example.com/v/abc123?hl=en&fs=1&rel=0'

      expect(fixMalformedQuery(value)).toBe(value)
    })
  })

  describe('question mark inside a value', () => {
    it('should turn it into an ampersand', () => {
      const value = 'https://example.com/embed/abc123?list=PL123?ecver=2'
      const expected = 'https://example.com/embed/abc123?list=PL123&ecver=2'

      expect(fixMalformedQuery(value)).toBe(expected)
    })

    it('should turn every one into an ampersand', () => {
      const value = 'https://example.com/player?a=1?b=2?c=3'
      const expected = 'https://example.com/player?a=1&b=2&c=3'

      expect(fixMalformedQuery(value)).toBe(expected)
    })

    it('should leave a question mark in the fragment alone', () => {
      const value = 'https://example.com/player?a=1#b?c=2'

      expect(fixMalformedQuery(value)).toBe(value)
    })
  })

  describe('question mark inside a fragment pair', () => {
    it('should turn it into an ampersand', () => {
      const value = 'https://example.com/embed/abc123#t=98?wmode=opaque'
      const expected = 'https://example.com/embed/abc123#t=98&wmode=opaque'

      expect(fixMalformedQuery(value)).toBe(expected)
    })

    it('should repair it behind a well-formed query', () => {
      const value = 'https://example.com/player?a=1#t=1?b=2'
      const expected = 'https://example.com/player?a=1#t=1&b=2'

      expect(fixMalformedQuery(value)).toBe(expected)
    })

    it('should repair it behind a query glued onto the path', () => {
      const value = 'https://example.com/embed/abc123&autoplay=1#t=30?rel=0'
      const expected = 'https://example.com/embed/abc123?autoplay=1#t=30&rel=0'

      expect(fixMalformedQuery(value)).toBe(expected)
    })

    it('should keep the question mark that opens the fragment', () => {
      const value = 'https://example.com/embed/#?secret=abc123#?secret=def456'
      const expected = 'https://example.com/embed/#?secret=abc123#&secret=def456'

      expect(fixMalformedQuery(value)).toBe(expected)
    })

    it('should leave a nested url in the fragment alone', () => {
      const value = 'https://example.com/viewer#panorama=https://example.org/a.jpg?b=1?c=2'

      expect(fixMalformedQuery(value)).toBe(value)
    })
  })

  describe('question mark after a name with no value', () => {
    it('should leave it alone', () => {
      const value = 'https://example.com/document/d/abc123/pub?embedded?start=false&loop=false'

      expect(fixMalformedQuery(value)).toBe(value)
    })

    it('should leave a doubled question mark alone', () => {
      const value = 'https://example.com/embed/abc123??list=TL123&rel=0'

      expect(fixMalformedQuery(value)).toBe(value)
    })
  })

  describe('whitespace in place of an ampersand', () => {
    it('should turn it into an ampersand', () => {
      const value = 'https://example.com/video/123?h=abc123 portrait=0&color=fff'
      const expected = 'https://example.com/video/123?h=abc123&portrait=0&color=fff'

      expect(fixMalformedQuery(value)).toBe(expected)
    })

    it('should turn a run of whitespace into one ampersand', () => {
      const value = 'https://example.com/video/123?h=abc123 \n portrait=0'
      const expected = 'https://example.com/video/123?h=abc123&portrait=0'

      expect(fixMalformedQuery(value)).toBe(expected)
    })

    it('should repair it in a query glued onto the path', () => {
      const value = 'https://example.com/v/abc123&hl=en fs=1'
      const expected = 'https://example.com/v/abc123?hl=en&fs=1'

      expect(fixMalformedQuery(value)).toBe(expected)
    })

    it('should leave whitespace inside a value that no parameter follows alone', () => {
      const value = 'https://example.com/player?fonts=Arial Black&skin=f6f6f6'

      expect(fixMalformedQuery(value)).toBe(value)
    })

    it('should leave whitespace in the fragment alone', () => {
      const value = 'https://example.com/player?id=123#t=1 start=2'

      expect(fixMalformedQuery(value)).toBe(value)
    })
  })

  describe('slash closing a value', () => {
    it('should drop it before the next pair', () => {
      const value = 'https://example.com/slideshow?set_id=123/&text='
      const expected = 'https://example.com/slideshow?set_id=123&text='

      expect(fixMalformedQuery(value)).toBe(expected)
    })

    it('should drop it at the end of the query', () => {
      const value = 'https://example.com/player.swf?clip_id=123//'
      const expected = 'https://example.com/player.swf?clip_id=123'

      expect(fixMalformedQuery(value)).toBe(expected)
    })

    it('should drop it before the fragment', () => {
      const value = 'https://example.com/player.swf?clip_id=123/#t=30'
      const expected = 'https://example.com/player.swf?clip_id=123#t=30'

      expect(fixMalformedQuery(value)).toBe(expected)
    })

    it('should keep the closing slash of a value that holds a path', () => {
      const value = 'https://example.com/player?path=albums/2024/'

      expect(fixMalformedQuery(value)).toBe(value)
    })

    it('should leave a slash in the path alone', () => {
      const value = 'https://example.com/feed/'

      expect(fixMalformedQuery(value)).toBe(value)
    })
  })

  describe('nested url', () => {
    it('should leave the query of a url held in a value alone', () => {
      const value = 'https://example.com/frame?url=http://example.org/a?b=1'

      expect(fixMalformedQuery(value)).toBe(value)
    })

    it('should leave the query of a bare nested url alone', () => {
      const value = 'https://example.com/player/?http://example.org/a.swf?url=x&color=1'

      expect(fixMalformedQuery(value)).toBe(value)
    })

    it('should leave the query of a url with a percent-encoded colon alone', () => {
      const value =
        'https://example.com/player/?url=https%3A//example.org/tracks/1?secret_token=s-1'

      expect(fixMalformedQuery(value)).toBe(value)
    })

    it('should leave the query of a url with percent-encoded slashes alone', () => {
      const value =
        'https://example.com/player/?url=https%3A%2F%2Fexample.org/tracks/1?secret_token=s-1'

      expect(fixMalformedQuery(value)).toBe(value)
    })

    it('should leave an ampersand after a nested url in the path alone', () => {
      const value = 'https://example.com/https://example.org/a&b=1'

      expect(fixMalformedQuery(value)).toBe(value)
    })

    it('should leave the query of a scheme-relative url held in a value alone', () => {
      const value = 'https://example.com/player/?url=//example.org/tracks/1?secret_token=s-1'

      expect(fixMalformedQuery(value)).toBe(value)
    })

    it('should leave whitespace and slashes in a query carrying a url alone', () => {
      const value = 'https://example.com/player/?url=https%3A//example.org/tracks/1/ visual=true'

      expect(fixMalformedQuery(value)).toBe(value)
    })
  })

  describe('well-formed urls', () => {
    const wellFormedUrls = [
      'https://example.com/feed?format=rss&page=2',
      'https://example.com/feed',
      '/path/to/feed?a=1',
      '',
    ]

    it.each(wellFormedUrls)('should return %s unchanged', (value) => {
      expect(fixMalformedQuery(value)).toBe(value)
    })
  })

  describe('value that is not an http url', () => {
    it('should leave a data url alone', () => {
      const value = 'data:text/html,a&b?c=d?e'

      expect(fixMalformedQuery(value)).toBe(value)
    })

    it('should leave a relative path alone', () => {
      const value = '/v/abc123&hl=en'

      expect(fixMalformedQuery(value)).toBe(value)
    })
  })

  it('should repair 200 KB of question marks within a second', () => {
    const value = `https://example.com/player?a=1${'?b=2'.repeat(50_000)}`
    const start = performance.now()

    expect(fixMalformedQuery(value)).toBe(`https://example.com/player?a=1${'&b=2'.repeat(50_000)}`)
    expect(performance.now() - start).toBeLessThan(1000)
  })

  it('should read 200 KB of whitespace and slashes within a second', () => {
    const value = `https://example.com/player?a=${' '.repeat(100_000)}${'=x/'.repeat(30_000)}`
    const start = performance.now()

    fixMalformedQuery(value)

    expect(performance.now() - start).toBeLessThan(1000)
  })
})

describe('trimUrlValues', () => {
  it('should trim a space written before the next pair', () => {
    const value = 'https://example.com/slideshow?user_id=123@N03 &tags='
    const expected = 'https://example.com/slideshow?user_id=123@N03&tags='

    expect(trimUrlValues(value)).toBe(expected)
  })

  it('should trim an escaped space at the end of a value', () => {
    const value = 'https://example.com/playlist?list=PL123%20'
    const expected = 'https://example.com/playlist?list=PL123'

    expect(trimUrlValues(value)).toBe(expected)
  })

  it('should trim an escaped space at the start of a value', () => {
    const value = 'https://example.com/watch?v=%20abc123'
    const expected = 'https://example.com/watch?v=abc123'

    expect(trimUrlValues(value)).toBe(expected)
  })

  it('should trim a plus at the end of a value', () => {
    const value = 'https://example.com/watch?v=abc123+&t=10'
    const expected = 'https://example.com/watch?v=abc123&t=10'

    expect(trimUrlValues(value)).toBe(expected)
  })

  it('should trim an escaped tab and line break at the end of a value', () => {
    const value = 'https://example.com/watch?v=abc123%09%0A'
    const expected = 'https://example.com/watch?v=abc123'

    expect(trimUrlValues(value)).toBe(expected)
  })

  it('should trim an escaped space at the end of a path segment', () => {
    const value = 'https://example.com/photos/name%20/'
    const expected = 'https://example.com/photos/name/'

    expect(trimUrlValues(value)).toBe(expected)
  })

  it('should trim a space written at the start of a path segment', () => {
    const value = 'https://example.com/photos/ name/123'
    const expected = 'https://example.com/photos/name/123'

    expect(trimUrlValues(value)).toBe(expected)
  })

  it('should keep a plus at the end of a path segment', () => {
    const value = 'https://example.com/tags/c++/'

    expect(trimUrlValues(value)).toBe(value)
  })

  it('should keep whitespace inside a value', () => {
    const value = 'https://example.com/search%20page?q=two%20words'

    expect(trimUrlValues(value)).toBe(value)
  })

  it('should keep a value of whitespace alone', () => {
    const value = 'https://example.com/a/%20/b?q=%20'

    expect(trimUrlValues(value)).toBe(value)
  })

  it('should keep a name followed by whitespace', () => {
    const value = 'https://example.com/watch?v%20=abc123'

    expect(trimUrlValues(value)).toBe(value)
  })

  it('should keep a pair with no value', () => {
    const value = 'https://example.com/watch?autoplay&v=abc123'

    expect(trimUrlValues(value)).toBe(value)
  })

  it('should trim an escaped space at the end of a fragment value', () => {
    const value = 'https://example.com/watch?v=abc123#t=10%20'
    const expected = 'https://example.com/watch?v=abc123#t=10'

    expect(trimUrlValues(value)).toBe(expected)
  })

  it('should keep a plus at the end of a fragment value', () => {
    const value = 'https://example.com/search#q=c++'

    expect(trimUrlValues(value)).toBe(value)
  })

  it('should keep a fragment with no pair as written', () => {
    const value = 'https://example.com/page#section%20'

    expect(trimUrlValues(value)).toBe(value)
  })

  it('should trim a scheme-relative url', () => {
    const value = '//example.com/embed/abc123%20?rel=0'
    const expected = '//example.com/embed/abc123?rel=0'

    expect(trimUrlValues(value)).toBe(expected)
  })

  it('should keep a url with no path', () => {
    const value = 'https://example.com'

    expect(trimUrlValues(value)).toBe(value)
  })

  it('should keep a value that is not an http url', () => {
    const value = 'javascript:alert(1)?a=b%20'

    expect(trimUrlValues(value)).toBe(value)
  })

  it('should read a long run of whitespace inside a value in linear time', () => {
    const value = `https://example.com/a?v=a${' '.repeat(300000)}b`
    const start = performance.now()

    trimUrlValues(value)

    expect(performance.now() - start).toBeLessThan(1000)
  })
})

describe('addMissingScheme', () => {
  it('should add scheme to a bare IPv6 host', () => {
    const value = '[::1]:8080/feed'
    const expected = 'https://[::1]:8080/feed'

    expect(addMissingScheme(value)).toBe(expected)
  })

  it('should leave an invalid bracketed host unchanged', () => {
    const value = '[not-ipv6]/feed'

    expect(addMissingScheme(value)).toBe(value)
  })

  describe('scheme-relative URLs', () => {
    const schemeRelativeCases: Array<[string, string]> = [
      ['//example.com/feed', 'https://example.com/feed'],
      ['//cdn.example.com/style.css', 'https://cdn.example.com/style.css'],
      ['//localhost/api', 'https://localhost/api'],
      ['//192.168.1.1/api', 'https://192.168.1.1/api'],
      ['//example.com:8080/feed', 'https://example.com:8080/feed'],
      ['//[::1]/feed', 'https://[::1]/feed'],
      ['//[2001:db8::1]/feed', 'https://[2001:db8::1]/feed'],
    ]

    it.each(schemeRelativeCases)('should convert %s to %s', (value, expected) => {
      expect(addMissingScheme(value)).toBe(expected)
    })

    it('should use http when specified', () => {
      const value = '//example.com/feed'
      const expected = 'http://example.com/feed'

      expect(addMissingScheme(value, 'http')).toBe(expected)
    })
  })

  describe('bare domains', () => {
    it('should add https:// to domain without scheme', () => {
      const value = 'example.com/feed'
      const expected = 'https://example.com/feed'

      expect(addMissingScheme(value)).toBe(expected)
    })

    it('should add https:// to domain with subdomain', () => {
      const value = 'www.example.com/feed.xml'
      const expected = 'https://www.example.com/feed.xml'

      expect(addMissingScheme(value)).toBe(expected)
    })

    it('should use http when specified', () => {
      const value = 'example.com/feed'
      const expected = 'http://example.com/feed'

      expect(addMissingScheme(value, 'http')).toBe(expected)
    })

    it('should handle domain with query string', () => {
      const value = 'example.com/feed?format=rss'
      const expected = 'https://example.com/feed?format=rss'

      expect(addMissingScheme(value)).toBe(expected)
    })

    it('should add https:// to bare IPv4 address', () => {
      const value = '192.168.1.1/feed'
      const expected = 'https://192.168.1.1/feed'

      expect(addMissingScheme(value)).toBe(expected)
    })
  })

  describe('URLs that should not be modified', () => {
    it('should not modify http:// URLs', () => {
      const value = 'http://example.com/feed'

      expect(addMissingScheme(value)).toBe(value)
    })

    it('should not modify https:// URLs', () => {
      const value = 'https://example.com/feed'

      expect(addMissingScheme(value)).toBe(value)
    })

    it('should not modify absolute path URLs', () => {
      const value = '/path/to/feed'

      expect(addMissingScheme(value)).toBe(value)
    })

    it('should not modify relative path URLs starting with dot', () => {
      const value = './feed.xml'

      expect(addMissingScheme(value)).toBe(value)
    })

    it('should not modify relative path URLs starting with double dot', () => {
      const value = '../feed.xml'

      expect(addMissingScheme(value)).toBe(value)
    })

    it('should handle localhost', () => {
      expect(addMissingScheme('localhost')).toBe('https://localhost')
      expect(addMissingScheme('localhost/')).toBe('https://localhost/')
      expect(addMissingScheme('localhost:3000')).toBe('https://localhost:3000')
    })
  })

  describe('invalid scheme-relative URLs', () => {
    const invalidSchemeRelativeUrls: Array<string> = [
      '//Users/file.xml',
      '//home/user/file.txt',
      '///triple-slash',
      '//singlelabel',
    ]

    it.each(invalidSchemeRelativeUrls)('should return %s unchanged', (value) => {
      expect(addMissingScheme(value)).toBe(value)
    })

    it('should handle malformed URLs gracefully', () => {
      const value = '//not valid url $#@'

      expect(addMissingScheme(value)).toBe(value)
    })
  })

  describe('additional edge cases', () => {
    it('should handle bare domain with hash', () => {
      const value = 'example.com/feed#section'
      const expected = 'https://example.com/feed#section'

      expect(addMissingScheme(value)).toBe(expected)
    })

    it('should not modify feed:// URLs', () => {
      expect(addMissingScheme('feed://example.com/rss')).toBe('feed://example.com/rss')
      expect(addMissingScheme('rss://example.com/feed')).toBe('rss://example.com/feed')
    })

    it('should handle domain with many subdomains', () => {
      const value = 'a.b.c.d.example.com/feed'
      const expected = 'https://a.b.c.d.example.com/feed'

      expect(addMissingScheme(value)).toBe(expected)
    })

    it('should handle IDN bare domain', () => {
      const value = 'münchen.de/feed'
      const expected = 'https://münchen.de/feed'

      expect(addMissingScheme(value)).toBe(expected)
    })

    it('should handle scheme-relative with query', () => {
      const value = '//example.com/feed?format=rss&page=1'
      const expected = 'https://example.com/feed?format=rss&page=1'

      expect(addMissingScheme(value)).toBe(expected)
    })

    it('should handle bare domain without path', () => {
      const value = 'example.com'
      const expected = 'https://example.com'

      expect(addMissingScheme(value)).toBe(expected)
    })

    it('should not modify mailto: URLs', () => {
      expect(addMissingScheme('mailto:test@example.com')).toBe('mailto:test@example.com')
    })

    it('should not modify data: URLs', () => {
      expect(addMissingScheme('data:text/html,<h1>Test</h1>')).toBe('data:text/html,<h1>Test</h1>')
    })

    it('should return URLs with leading whitespace unchanged', () => {
      expect(addMissingScheme(' example.com')).toBe(' example.com')
      expect(addMissingScheme('\texample.com')).toBe('\texample.com')
      expect(addMissingScheme('\nexample.com')).toBe('\nexample.com')
    })

    it('should not prefix a query or a fragment', () => {
      expect(addMissingScheme('?page=a.b')).toBe('?page=a.b')
      expect(addMissingScheme('#sec.1')).toBe('#sec.1')
    })

    it('should not read a host starting with localhost as localhost', () => {
      expect(addMissingScheme('localhosting/feed')).toBe('localhosting/feed')
    })

    it('should handle localhost in any case', () => {
      expect(addMissingScheme('LOCALHOST:3000')).toBe('https://LOCALHOST:3000')
      expect(addMissingScheme('LocalHost/feed')).toBe('https://LocalHost/feed')
    })
  })
})

describe('upgradeScheme', () => {
  describe('default (upgrade to https)', () => {
    const upgradeCases: Array<[string, string]> = [
      ['http://example.com/feed', 'https://example.com/feed'],
      ['http://example.com:8080/path?a=1#frag', 'https://example.com:8080/path?a=1#frag'],
      ['http://user:pass@example.com/', 'https://user:pass@example.com/'],
      ['http://localhost/', 'https://localhost/'],
      ['http://192.168.1.1/api', 'https://192.168.1.1/api'],
    ]

    it.each(upgradeCases)('should upgrade %s to %s', (value, expected) => {
      expect(upgradeScheme(value)).toBe(expected)
    })

    it('should be case-insensitive on the scheme', () => {
      expect(upgradeScheme('HTTP://example.com/feed')).toBe('https://example.com/feed')
      expect(upgradeScheme('Http://example.com/feed')).toBe('https://example.com/feed')
    })

    it('should only touch the leading scheme, not occurrences inside the URL', () => {
      const value = 'http://proxy.example/?target=http://other.example/page'
      const expected = 'https://proxy.example/?target=http://other.example/page'

      expect(upgradeScheme(value)).toBe(expected)
    })

    it('should drop the port that is the https default', () => {
      expect(upgradeScheme('http://example.com:443/feed')).toBe('https://example.com/feed')
    })

    it('should drop the port that was the http default', () => {
      expect(upgradeScheme('http://example.com:80/feed')).toBe('https://example.com/feed')
    })

    it('should swap the scheme of a URL that does not parse', () => {
      expect(upgradeScheme('http://example.com:99999/feed')).toBe('https://example.com:99999/feed')
    })
  })

  describe('downgrade to http', () => {
    it('should rewrite https:// to http://', () => {
      expect(upgradeScheme('https://example.com/feed', 'http')).toBe('http://example.com/feed')
    })

    it('should drop the port that was the https default', () => {
      expect(upgradeScheme('https://example.com:443/feed', 'http')).toBe('http://example.com/feed')
    })

    it('should drop the port that is the http default', () => {
      expect(upgradeScheme('https://example.com:80/feed', 'http')).toBe('http://example.com/feed')
    })

    it('should be case-insensitive on the scheme', () => {
      expect(upgradeScheme('HTTPS://example.com/feed', 'http')).toBe('http://example.com/feed')
    })

    it('should leave http:// unchanged', () => {
      expect(upgradeScheme('http://example.com/feed', 'http')).toBe('http://example.com/feed')
    })
  })

  describe('unchanged inputs', () => {
    it('should leave https:// unchanged when upgrading to https', () => {
      expect(upgradeScheme('https://example.com/feed')).toBe('https://example.com/feed')
    })

    it('should leave scheme-relative URLs unchanged', () => {
      expect(upgradeScheme('//example.com/feed')).toBe('//example.com/feed')
    })

    it('should leave non-http schemes unchanged', () => {
      expect(upgradeScheme('mailto:user@example.com')).toBe('mailto:user@example.com')
      expect(upgradeScheme('data:image/png;base64,iVBOR')).toBe('data:image/png;base64,iVBOR')
      expect(upgradeScheme('ftp://example.com/file')).toBe('ftp://example.com/file')
      expect(upgradeScheme('feed://example.com/rss.xml')).toBe('feed://example.com/rss.xml')
    })

    it('should leave bare domains and paths unchanged', () => {
      expect(upgradeScheme('example.com/feed')).toBe('example.com/feed')
      expect(upgradeScheme('/path/to/feed')).toBe('/path/to/feed')
    })

    it('should leave an empty string unchanged', () => {
      expect(upgradeScheme('')).toBe('')
    })
  })
})

describe('resolveUrl', () => {
  const leadingSpaceCases = [
    [' htp://example.com/feed', 'http://example.com/feed'],
    [' feed://example.com/feed', 'https://example.com/feed'],
    [' example.com/feed', 'https://example.com/feed'],
    ['\thttp:example.com/feed', 'http://example.com/feed'],
  ]

  it.each(leadingSpaceCases)(
    'should resolve a URL with surrounding spaces (%s)',
    (value, expected) => {
      expect(resolveUrl(`${value} `)).toBe(expected)
    },
  )

  it('should resolve a relative path whose first segment looks like a scheme', () => {
    const value = '/hp/support'
    const base = 'https://example.com/'
    const expected = 'https://example.com/hp/support'

    expect(resolveUrl(value, base)).toBe(expected)
  })

  describe('HTML entity decoding', () => {
    it('should decode &amp; to &', () => {
      const value = 'https://example.com/feed?a=1&amp;b=2'
      const expected = 'https://example.com/feed?a=1&b=2'

      expect(resolveUrl(value)).toBe(expected)
    })

    it('should decode numeric entities', () => {
      const value = 'https://example.com/feed&#x3F;query=1'
      const expected = 'https://example.com/feed?query=1'

      expect(resolveUrl(value)).toBe(expected)
    })

    it('should decode named entities', () => {
      const value = 'https://example.com/feed?q=a&lt;b'
      const expected = 'https://example.com/feed?q=a%3Cb'

      expect(resolveUrl(value)).toBe(expected)
    })

    it('should decode entities in path', () => {
      const value = 'https://example.com/path&amp;name/feed'
      const expected = 'https://example.com/path&name/feed'

      expect(resolveUrl(value)).toBe(expected)
    })

    it('should handle multiple encoded ampersands', () => {
      const value = 'https://example.com/feed?a=1&amp;b=2&amp;c=3'
      const expected = 'https://example.com/feed?a=1&b=2&c=3'

      expect(resolveUrl(value)).toBe(expected)
    })

    it('should decode accented character entities', () => {
      const value = 'https://example.com/caf&eacute;'
      const expected = 'https://example.com/caf%C3%A9'

      expect(resolveUrl(value)).toBe(expected)
    })

    it('should not decode a query parameter whose name matches an entity', () => {
      const value = 'https://example.com/feed?id=1&copy=2&reg=us'

      expect(resolveUrl(value)).toBe(value)
    })

    it('should not decode an unterminated entity in the query', () => {
      const value = 'https://example.com/feed?a=1&sect=2&times=3'

      expect(resolveUrl(value)).toBe(value)
    })
  })

  describe('standard HTTP/HTTPS URLs', () => {
    it('should return https URL unchanged', () => {
      const value = 'https://example.com/feed.xml'

      expect(resolveUrl(value)).toBe(value)
    })

    it('should return http URL unchanged', () => {
      const value = 'http://example.com/feed.xml'

      expect(resolveUrl(value)).toBe(value)
    })

    it('should preserve query parameters', () => {
      const value = 'https://example.com/feed?format=rss&page=1'

      expect(resolveUrl(value)).toBe(value)
    })

    it('should preserve hash fragments', () => {
      const value = 'https://example.com/feed#latest'

      expect(resolveUrl(value)).toBe(value)
    })

    it('should preserve authentication credentials', () => {
      const value = 'https://user:pass@example.com/feed.xml'

      expect(resolveUrl(value)).toBe(value)
    })

    it('should preserve credentials whose username reads as a scheme', () => {
      const value = 'https://http:secret@example.com/feed'

      expect(resolveUrl(value)).toBe(value)
    })

    it('should preserve non-standard ports', () => {
      const value = 'https://example.com:8443/feed.xml'

      expect(resolveUrl(value)).toBe(value)
    })

    it('should strip default HTTPS port', () => {
      const value = 'https://example.com:443/feed.xml'
      const expected = 'https://example.com/feed.xml'

      expect(resolveUrl(value)).toBe(expected)
    })

    it('should strip default HTTP port', () => {
      const value = 'http://example.com:80/feed.xml'
      const expected = 'http://example.com/feed.xml'

      expect(resolveUrl(value)).toBe(expected)
    })
  })

  describe('feed scheme resolution', () => {
    it('should convert feed:// to https://', () => {
      const value = 'feed://example.com/rss.xml'
      const expected = 'https://example.com/rss.xml'

      expect(resolveUrl(value)).toBe(expected)
    })

    it('should unwrap feed:https:// to https://', () => {
      const value = 'feed:https://example.com/rss.xml'
      const expected = 'https://example.com/rss.xml'

      expect(resolveUrl(value)).toBe(expected)
    })

    it('should convert rss:// to https://', () => {
      const value = 'rss://example.com/feed.xml'
      const expected = 'https://example.com/feed.xml'

      expect(resolveUrl(value)).toBe(expected)
    })
  })

  describe('hostname labels spelled like schemes', () => {
    it('should keep a label that is a suffix of https', () => {
      const value = 'https://tp.srgssr.ch/p/srf/embed'

      expect(resolveUrl(value)).toBe(value)
    })

    it('should keep an apex domain spelled like a scheme', () => {
      const value = 'https://tps.org/a'

      expect(resolveUrl(value)).toBe(value)
    })

    it('should not downgrade https to http', () => {
      const value = 'https://tp.media/x'

      expect(resolveUrl(value)).toBe(value)
    })

    it('should keep the label on a bare domain', () => {
      const value = 'ps.w.org/plugin/icon.png'
      const expected = 'https://ps.w.org/plugin/icon.png'

      expect(resolveUrl(value)).toBe(expected)
    })
  })

  describe('scheme-relative URLs', () => {
    it('should convert // to https:// by default', () => {
      const value = '//example.com/feed.xml'
      const expected = 'https://example.com/feed.xml'

      expect(resolveUrl(value)).toBe(expected)
    })

    it('should inherit scheme from base URL', () => {
      const value = '//example.com/feed.xml'
      const base = 'http://other.com'
      const expected = 'http://example.com/feed.xml'

      expect(resolveUrl(value, base)).toBe(expected)
    })

    it('should return undefined for invalid scheme-relative URLs', () => {
      expect(resolveUrl('//Users/file.xml')).toBeUndefined()
      expect(resolveUrl('//intranet/feed.xml')).toBeUndefined()
    })
  })

  describe('bare domains', () => {
    it('should add https:// to bare domain', () => {
      const value = 'example.com/feed.xml'
      const expected = 'https://example.com/feed.xml'

      expect(resolveUrl(value)).toBe(expected)
    })

    it('should handle localhost', () => {
      const value = 'localhost:3000/feed.xml'
      const expected = 'https://localhost:3000/feed.xml'

      expect(resolveUrl(value)).toBe(expected)
    })
  })

  describe('relative URL resolution with base', () => {
    const base = 'https://example.com/blog/posts/'

    it('should resolve simple filename', () => {
      const value = 'feed.xml'
      const expected = 'https://example.com/blog/posts/feed.xml'

      expect(resolveUrl(value, base)).toBe(expected)
    })

    it('should resolve current directory reference', () => {
      const value = './feed.xml'
      const expected = 'https://example.com/blog/posts/feed.xml'

      expect(resolveUrl(value, base)).toBe(expected)
    })

    it('should resolve single parent directory', () => {
      const value = '../feed.xml'
      const expected = 'https://example.com/blog/feed.xml'

      expect(resolveUrl(value, base)).toBe(expected)
    })

    it('should resolve multiple parent directories', () => {
      const value = '../../feed.xml'
      const expected = 'https://example.com/feed.xml'

      expect(resolveUrl(value, base)).toBe(expected)
    })

    it('should resolve root-relative path', () => {
      const value = '/feed.xml'
      const expected = 'https://example.com/feed.xml'

      expect(resolveUrl(value, base)).toBe(expected)
    })

    it('should resolve query-only reference', () => {
      const value = '?format=atom'
      const expected = 'https://example.com/blog/posts/?format=atom'

      expect(resolveUrl(value, base)).toBe(expected)
    })

    it('should not modify absolute URL when base is provided', () => {
      const value = 'https://other.com/feed.xml'

      expect(resolveUrl(value, base)).toBe(value)
    })

    it('should convert feed:// URL when base is provided', () => {
      const value = 'feed://other.com/feed.xml'
      const expected = 'https://other.com/feed.xml'

      expect(resolveUrl(value, base)).toBe(expected)
    })

    it('should inherit http from base when resolving relative URL', () => {
      const value = 'feed.xml'
      const expected = 'http://example.com/blog/feed.xml'

      expect(resolveUrl(value, 'http://example.com/blog/')).toBe(expected)
    })

    it('should return undefined for non-HTTP scheme when base is provided', () => {
      expect(resolveUrl('mailto:feed@example.com', base)).toBeUndefined()
      expect(resolveUrl('ftp://example.com/feed.xml', base)).toBeUndefined()
    })

    it('should add scheme to localhost with port when base is provided', () => {
      const value = 'localhost:8080/feed.xml'
      const expected = 'https://localhost:8080/feed.xml'

      expect(resolveUrl(value, base)).toBe(expected)
    })
  })

  describe('URL normalization', () => {
    it('should normalize path segments (/../)', () => {
      const value = 'https://example.com/a/b/../feed.xml'
      const expected = 'https://example.com/a/feed.xml'

      expect(resolveUrl(value)).toBe(expected)
    })

    it('should normalize path segments (/./)', () => {
      const value = 'https://example.com/./feed.xml'
      const expected = 'https://example.com/feed.xml'

      expect(resolveUrl(value)).toBe(expected)
    })

    it('should lowercase hostname', () => {
      const value = 'https://EXAMPLE.COM/Feed.xml'
      const expected = 'https://example.com/Feed.xml'

      expect(resolveUrl(value)).toBe(expected)
    })

    it('should preserve path case', () => {
      const value = 'https://example.com/Blog/Feed.XML'

      expect(resolveUrl(value)).toBe(value)
    })

    it('should add trailing slash to root path', () => {
      const value = 'https://example.com'
      const expected = 'https://example.com/'

      expect(resolveUrl(value)).toBe(expected)
    })
  })

  describe('additional edge cases', () => {
    it('should resolve fragment-only URL against base', () => {
      expect(resolveUrl('#section', 'https://example.com/page')).toBe(
        'https://example.com/page#section',
      )
    })

    it('should return undefined for invalid base URL', () => {
      const value = 'feed.xml'
      const base = 'not a valid base'

      expect(resolveUrl(value, base)).toBeUndefined()
    })

    it('should resolve an absolute URL when the base is invalid', () => {
      const value = 'https://example.com/a'
      const expected = 'https://example.com/a'

      expect(resolveUrl(value, 'not a valid base')).toBe(expected)
      expect(resolveUrl(value, '/blog/')).toBe(expected)
    })

    it('should keep a relative path spelled like a scheme on the base host', () => {
      const value = 'hp//x'
      const base = 'https://example.com/a/'
      const expected = 'https://example.com/a/hp//x'

      expect(resolveUrl(value, base)).toBe(expected)
    })

    const baseRelativeSchemeLikePaths: Array<[string, string]> = [
      ['tps//x', 'https://example.com/a/tps//x'],
      ['ttp//x', 'https://example.com/a/ttp//x'],
      ['https/./x', 'https://example.com/a/https/x'],
    ]

    it.each(baseRelativeSchemeLikePaths)(
      'should keep the scheme-like relative path %s on the base host',
      (value, expected) => {
        expect(resolveUrl(value, 'https://example.com/a/')).toBe(expected)
      },
    )

    it('should repair an exact scheme missing its colon against a base', () => {
      const value = 'http//example.org/feed'
      const base = 'https://example.com/a/'
      const expected = 'http://example.org/feed'

      expect(resolveUrl(value, base)).toBe(expected)
    })

    it('should keep a path that starts with a scheme on the base host', () => {
      const value = '/http://other.com/x'
      const base = 'https://example.com/'
      const expected = 'https://example.com/http://other.com/x'

      expect(resolveUrl(value, base)).toBe(expected)
    })

    it('should return undefined for an empty or blank URL with base', () => {
      expect(resolveUrl('', 'https://example.com/post')).toBeUndefined()
      expect(resolveUrl('   ', 'https://example.com/post')).toBeUndefined()
    })

    it('should handle double-encoded characters', () => {
      const value = 'https://example.com/path%2520with%2520spaces'

      expect(resolveUrl(value)).toBe(value)
    })

    it('should handle URLs with unicode in path', () => {
      const value = 'https://example.com/café/feed'
      const expected = 'https://example.com/caf%C3%A9/feed'

      expect(resolveUrl(value)).toBe(expected)
    })

    it('should handle URLs with special query characters', () => {
      const value = 'https://example.com/feed?q=hello%20world&tag=%23test'

      expect(resolveUrl(value)).toBe(value)
    })

    it('should handle URLs with embedded newline', () => {
      const value = 'https://example.com/feed\n.xml'
      const expected = 'https://example.com/feed.xml'

      expect(resolveUrl(value)).toBe(expected)
    })

    it('should handle bare domain with very long TLD', () => {
      const value = 'example.photography/feed'
      const expected = 'https://example.photography/feed'

      expect(resolveUrl(value)).toBe(expected)
    })

    it('should handle URL with empty path segments', () => {
      const value = 'https://example.com//feed//rss.xml'

      expect(resolveUrl(value)).toBe(value)
    })

    it('should apply entity decoding and scheme conversion together', () => {
      const value = 'feed:https://example.com/feed?x=1&amp;y=2'
      const expected = 'https://example.com/feed?x=1&y=2'

      expect(resolveUrl(value)).toBe(expected)
    })
  })

  describe('invalid and rejected inputs', () => {
    it('should return undefined for empty string', () => {
      expect(resolveUrl('')).toBeUndefined()
    })

    it('should return undefined for whitespace only', () => {
      expect(resolveUrl('   ')).toBeUndefined()
    })

    it('should return undefined for relative path without base', () => {
      expect(resolveUrl('path/to/feed')).toBeUndefined()
      expect(resolveUrl('path/to/feed.xml')).toBeUndefined()
    })

    it('should return undefined for ftp:// scheme', () => {
      expect(resolveUrl('ftp://example.com/feed.xml')).toBeUndefined()
    })

    it('should return undefined for mailto: scheme', () => {
      expect(resolveUrl('mailto:feed@example.com')).toBeUndefined()
    })

    it('should return undefined for tel: scheme', () => {
      expect(resolveUrl('tel:+1234567890')).toBeUndefined()
    })

    it('should return undefined for javascript: scheme', () => {
      expect(resolveUrl('javascript:alert(1)')).toBeUndefined()
    })

    it('should return undefined for data: scheme', () => {
      expect(resolveUrl('data:text/xml,<feed/>')).toBeUndefined()
    })

    it('should return undefined for file:// scheme', () => {
      expect(resolveUrl('file:///etc/passwd')).toBeUndefined()
    })

    it('should return undefined for malformed URL', () => {
      expect(resolveUrl('not a valid url')).toBeUndefined()
    })

    it('should return undefined for scheme only', () => {
      expect(resolveUrl('https://')).toBeUndefined()
    })

    it('should return undefined for fragment-only URL', () => {
      expect(resolveUrl('#section')).toBeUndefined()
    })

    it('should resolve fragment-only URL against base without path', () => {
      expect(resolveUrl('#section', 'https://example.com')).toBe('https://example.com/#section')
    })

    it('should return undefined for bare fragment', () => {
      expect(resolveUrl('#')).toBeUndefined()
    })

    it('should resolve fragment-only URL against base with path', () => {
      expect(resolveUrl('#top', 'https://example.com/page')).toBe('https://example.com/page#top')
    })
  })

  describe('edge cases', () => {
    it('should trim leading and trailing whitespace', () => {
      expect(resolveUrl('  https://example.com/feed')).toBe('https://example.com/feed')
      expect(resolveUrl('https://example.com/feed  ')).toBe('https://example.com/feed')
    })

    it('should handle tabs and carriage returns in URL', () => {
      expect(resolveUrl('https://example.com/\tfeed')).toBe('https://example.com/feed')
      expect(resolveUrl('https://example.com/\rfeed')).toBe('https://example.com/feed')
    })

    it('should convert backslashes to forward slashes in path', () => {
      const value = 'https://example.com\\feed\\rss.xml'
      const expected = 'https://example.com/feed/rss.xml'

      expect(resolveUrl(value)).toBe(expected)
    })

    it('should preserve trailing dot in hostname', () => {
      const value = 'https://example.com./feed'

      expect(resolveUrl(value)).toBe(value)
    })

    it('should handle dot segments and excessive parent traversal', () => {
      expect(resolveUrl('https://example.com/a/./b/../c/feed')).toBe('https://example.com/a/c/feed')
      expect(resolveUrl('https://example.com/../../../feed')).toBe('https://example.com/feed')
    })

    it('should preserve empty path segments', () => {
      const value = 'https://example.com///feed///rss'

      expect(resolveUrl(value)).toBe(value)
    })

    it('should handle special characters in path and query', () => {
      expect(resolveUrl('https://example.com/user@domain/feed')).toBe(
        'https://example.com/user@domain/feed',
      )
      expect(resolveUrl('https://example.com/time:12:30/feed')).toBe(
        'https://example.com/time:12:30/feed',
      )
      expect(resolveUrl('https://example.com/feed[1]/rss')).toBe('https://example.com/feed[1]/rss')
      expect(resolveUrl('https://example.com/feed?filter=a|b')).toBe(
        'https://example.com/feed?filter=a|b',
      )
    })

    it('should encode null byte in URL path', () => {
      const value = 'https://example.com/feed\x00.xml'
      const expected = 'https://example.com/feed%00.xml'

      expect(resolveUrl(value)).toBe(expected)
    })

    it('should handle unicode control characters', () => {
      expect(resolveUrl('https://example.com/fe\u200Bed')).toBeDefined()
      expect(resolveUrl('https://example.com/\u202Efeed')).toBeDefined()
    })
  })
})

describe('normalizeUrl', () => {
  describe('scheme stripping', () => {
    it('should strip https:// scheme by default', () => {
      const value = 'https://example.com/feed'
      const expected = 'example.com/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should strip http:// scheme by default', () => {
      const value = 'http://example.com/feed'
      const expected = 'example.com/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should preserve scheme when stripScheme is false', () => {
      const value = 'https://example.com/feed'
      const options = { stripScheme: false }

      expect(normalizeUrl(value, options)).toBe(value)
    })

    it('should strip scheme when the deprecated stripProtocol is true', () => {
      const value = 'https://example.com/feed'
      const expected = 'example.com/feed'
      const options = { stripProtocol: true }

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should let stripScheme win over stripProtocol', () => {
      const value = 'https://example.com/feed'
      const options = {
        stripScheme: false,
        stripProtocol: true,
      }

      expect(normalizeUrl(value, options)).toBe(value)
    })
  })

  describe('authentication handling', () => {
    it('should preserve username and password by default', () => {
      const value = 'https://user:pass@example.com/feed'
      const expected = 'user:pass@example.com/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should preserve username only by default', () => {
      const value = 'https://user@example.com/feed'
      const expected = 'user@example.com/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should strip authentication when stripAuthentication is true', () => {
      const value = 'https://user:pass@example.com/feed'
      const options = {
        stripAuthentication: true,
        stripScheme: false,
      }
      const expected = 'https://example.com/feed'

      expect(normalizeUrl(value, options)).toBe(expected)
    })
  })

  describe('www stripping', () => {
    it('should strip www prefix by default', () => {
      const value = 'https://www.example.com/feed'
      const expected = 'example.com/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should preserve www when stripWww is false', () => {
      const value = 'https://www.example.com/feed'
      const options = {
        ...defaultOptions,
        stripWww: false,
      }
      const expected = 'www.example.com/feed'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should not affect non-www subdomains', () => {
      const value = 'https://cdn.example.com/feed'
      const expected = 'cdn.example.com/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should handle www in subdomain correctly', () => {
      const value = 'https://www.blog.example.com/feed'
      const expected = 'blog.example.com/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should give the same result when normalizing a repeated www prefix twice', () => {
      const value = 'https://www.www.example.com/feed'
      const options = {
        ...defaultOptions,
        stripScheme: false,
      }
      const once = normalizeUrl(value, options)

      expect(normalizeUrl(once, options)).toBe(once)
    })
  })

  describe('port stripping', () => {
    it('should strip default HTTPS port 443', () => {
      const value = 'https://example.com:443/feed'
      const expected = 'example.com/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should strip default HTTP port 80', () => {
      const value = 'http://example.com:80/feed'
      const expected = 'example.com/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should preserve non-default ports', () => {
      const value = 'https://example.com:8080/feed'
      const expected = 'example.com:8080/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should not strip port 80 for HTTPS', () => {
      const value = 'https://example.com:80/feed'
      const expected = 'example.com:80/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should not strip port 443 for HTTP', () => {
      const value = 'http://example.com:443/feed'
      const expected = 'example.com:443/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })
  })

  describe('host trailing dot stripping', () => {
    it('should strip the trailing dot of the host when stripHostTrailingDot is true', () => {
      const value = 'https://example.com./feed'
      const options = { stripHostTrailingDot: true }
      const expected = 'https://example.com/feed'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should preserve the trailing dot of the host by default', () => {
      const value = 'https://example.com./feed'
      const expected = 'example.com./feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should keep the port when stripping the trailing dot', () => {
      const value = 'https://example.com.:8080/feed'
      const options = { stripHostTrailingDot: true }
      const expected = 'https://example.com:8080/feed'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should keep an IPv4 host whole', () => {
      const value = 'http://192.168.1.1./feed'
      const options = { stripHostTrailingDot: true }
      const expected = 'http://192.168.1.1/feed'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should keep an IPv6 host whole', () => {
      const value = 'http://[2001:db8::1]:8080/feed'
      const options = { stripHostTrailingDot: true }
      const expected = 'http://[2001:db8::1]:8080/feed'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should keep a host that is only a dot', () => {
      const value = 'http://./feed'
      const options = { stripHostTrailingDot: true }
      const expected = 'http://./feed'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should keep www on a top-level domain written with a trailing dot', () => {
      const value = 'https://www.com./feed'
      const options = {
        stripHostTrailingDot: true,
        stripWww: true,
      }
      const expected = 'https://www.com/feed'

      expect(normalizeUrl(value, options)).toBe(expected)
    })
  })

  describe('trailing slash removal', () => {
    it('should remove trailing slash from path by default', () => {
      const value = 'https://example.com/feed/'
      const expected = 'example.com/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should preserve trailing slash when stripTrailingSlash is false', () => {
      const value = 'https://example.com/feed/'
      const options = {
        ...defaultOptions,
        stripTrailingSlash: false,
        stripRootSlash: false,
      }
      const expected = 'example.com/feed/'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should handle multiple trailing slashes after collapse', () => {
      const value = 'https://example.com/feed///'
      const expected = 'example.com/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })
  })

  describe('single slash (root path) handling', () => {
    it('should strip root slash by default', () => {
      const value = 'https://example.com/'
      const expected = 'example.com'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should strip root slash from URL without trailing slash', () => {
      const value = 'https://example.com'
      const expected = 'example.com'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should preserve root slash when stripRootSlash is false', () => {
      const value = 'https://example.com/'
      const options = {
        ...defaultOptions,
        stripRootSlash: false,
      }
      const expected = 'example.com/'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should preserve path when stripping root slash', () => {
      const value = 'https://example.com/path'
      const expected = 'example.com/path'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should preserve slash before query string', () => {
      const value = 'https://example.com/?a=1'
      const expected = 'example.com/?a=1'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should strip root slash with port number', () => {
      const value = 'https://example.com:8080/'
      const expected = 'example.com:8080'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })
  })

  describe('multiple slashes collapsing', () => {
    it('should collapse multiple slashes in path by default', () => {
      const value = 'https://example.com/path//to///feed'
      const expected = 'example.com/path/to/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should preserve multiple slashes when collapseSlashes is false', () => {
      const value = 'https://example.com/path//to///feed'
      const options = {
        ...defaultOptions,
        collapseSlashes: false,
      }
      const expected = 'example.com/path//to///feed'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should collapse a leading run of slashes', () => {
      const value = 'https://example.com//p/662741/feed'
      const expected = 'example.com/p/662741/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should keep the slashes of a url carried in the path', () => {
      const value = 'https://example.com/web/20140327055211/https://example.org/feed'
      const expected = 'example.com/web/20140327055211/https://example.org/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should keep the slashes of a url carried in the path with an encoded colon', () => {
      const value = 'https://example.com/l/abc/https%3A//example.org/feed'
      const expected = 'example.com/l/abc/https%3A//example.org/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should keep the slashes after a lowercase encoded colon', () => {
      const value = 'https://example.com/l/abc/https%3a//example.org/feed'
      const expected = 'example.com/l/abc/https%3A//example.org/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should collapse 200 KB of slashes within a second', () => {
      const value = `https://example.com/${'/'.repeat(200_000)}feed`
      const start = performance.now()

      expect(normalizeUrl(value, defaultOptions)).toBe('example.com/feed')
      expect(performance.now() - start).toBeLessThan(1000)
    })
  })

  describe('hash/fragment stripping', () => {
    it('should strip hash fragment by default', () => {
      const value = 'https://example.com/feed#section'
      const expected = 'example.com/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should preserve hash when stripHash is false', () => {
      const value = 'https://example.com/feed#section'
      const options = {
        ...defaultOptions,
        stripHash: false,
      }
      const expected = 'example.com/feed#section'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should handle empty hash', () => {
      const value = 'https://example.com/feed#'
      const expected = 'example.com/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })
  })

  describe('query parameter sorting', () => {
    it('should sort query parameters alphabetically by default', () => {
      const value = 'https://example.com/feed?z=3&a=1&m=2'
      const expected = 'example.com/feed?a=1&m=2&z=3'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should preserve query order when sortQueryParams is false', () => {
      const value = 'https://example.com/feed?z=3&a=1&m=2'
      const options = {
        ...defaultOptions,
        sortQueryParams: false,
      }
      const expected = 'example.com/feed?z=3&a=1&m=2'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    // Serendipity blogs route on the raw query string, so encoding the slashes or appending the
    // value separator makes the URL serve the homepage instead of the feed.
    it('should preserve a path-shaped query when sorting', () => {
      const value = 'http://example.com/blog/index.php?/feeds/atom10.xml'
      const expected = 'example.com/blog/index.php?/feeds/atom10.xml'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should preserve raw encoding of the pairs it reorders', () => {
      const value = 'https://example.com/feed?z=a/b&a=c:d'
      const expected = 'example.com/feed?a=c:d&z=a/b'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should preserve a space encoded as %20 rather than as a plus', () => {
      const value = 'https://example.com/feed?q=two%20words'
      const expected = 'example.com/feed?q=two%20words'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should keep the original order of params sharing a key', () => {
      const value = 'https://example.com/feed?z=1&a=3&a=1&a=2'
      const expected = 'example.com/feed?a=3&a=1&a=2&z=1'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should sort by decoded key', () => {
      const value = 'https://example.com/feed?b=1&%61=2'
      const options = {
        ...defaultOptions,
        normalizeEncoding: false,
      }
      const expected = 'example.com/feed?%61=2&b=1'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should drop a trailing separator instead of sorting it to the front', () => {
      const value = 'https://example.com/feed?b=1&'
      const expected = 'example.com/feed?b=1'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should drop a doubled separator instead of sorting it to the front', () => {
      const value = 'https://example.com/feed?b=1&&a=2'
      const expected = 'example.com/feed?a=2&b=1'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should sort a key with a malformed percent escape by its raw form', () => {
      const value = 'https://example.com/feed?z=1&%zz=2&a=3'
      const expected = 'example.com/feed?%zz=2&a=3&z=1'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })
  })

  describe('tracking parameter stripping', () => {
    it('should keep tracking parameters with default options', () => {
      const value = 'https://example.com/feed?utm_source=twitter&fbclid=abc&id=123'
      const expected = 'example.com/feed?fbclid=abc&id=123&utm_source=twitter'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should use custom stripped params when array is provided', () => {
      const value = 'https://example.com/feed?custom=1&keep=2'
      const options = {
        ...defaultOptions,
        stripQueryParams: ['custom'],
      }
      const expected = 'example.com/feed?keep=2'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should accept a readonly array of stripped params', () => {
      const value = 'https://example.com/feed?custom=1&keep=2'
      const stripQueryParams = ['custom'] as const
      const options = {
        ...defaultOptions,
        stripQueryParams,
      }
      const expected = 'example.com/feed?keep=2'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should strip uppercase tracking parameters', () => {
      const value = 'https://example.com/feed?UTM_SOURCE=twitter&FBCLID=abc&id=123'
      const options = {
        ...defaultOptions,
        stripQueryParams: ['utm_source', 'fbclid'],
      }
      const expected = 'example.com/feed?id=123'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should strip mixed case tracking parameters', () => {
      const value = 'https://example.com/feed?Utm_Source=twitter&FbClId=abc&id=123'
      const options = {
        ...defaultOptions,
        stripQueryParams: ['utm_source', 'fbclid'],
      }
      const expected = 'example.com/feed?id=123'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should strip params case-insensitively with multiple variants', () => {
      const value = 'https://example.com/feed?CUSTOM=1&Custom=2&custom=3&keep=4'
      const options = {
        ...defaultOptions,
        stripQueryParams: ['custom'],
      }
      const expected = 'example.com/feed?keep=4'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should strip params and lowercase remaining query together', () => {
      const value = 'https://example.com/feed?UTM_Source=Twitter&Format=RSS'
      const options = {
        ...defaultOptions,
        stripQueryParams: ['utm_source'],
        lowercaseQuery: true,
      }
      const expected = 'example.com/feed?format=rss'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should strip empty query left after stripping all params', () => {
      const value = 'https://example.com/feed?utm_source=twitter'
      const options = {
        ...defaultOptions,
        stripQueryParams: ['utm_source'],
      }
      const expected = 'example.com/feed'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should preserve raw encoding of the params it keeps', () => {
      const value = 'https://example.com/feed?utm_source=twitter&path=a/b&when=12:00'
      const options = {
        ...defaultOptions,
        stripQueryParams: ['utm_source'],
      }
      const expected = 'example.com/feed?path=a/b&when=12:00'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should drop a trailing separator left by stripping', () => {
      const value = 'https://example.com/feed?id=1&utm_source=twitter&'
      const options = { stripQueryParams: ['utm_source'] }
      const expected = 'https://example.com/feed?id=1'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should drop a doubled separator left by stripping', () => {
      const value = 'https://example.com/feed?id=1&&utm_source=twitter'
      const options = { stripQueryParams: ['utm_source'] }
      const expected = 'https://example.com/feed?id=1'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should keep a valueless param that is not stripped', () => {
      const value = 'https://example.com/feed?utm_source=twitter&atom'
      const options = {
        ...defaultOptions,
        stripQueryParams: ['utm_source'],
      }
      const expected = 'example.com/feed?atom'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should match a param for stripping by its decoded key', () => {
      const value = 'https://example.com/feed?utm%5Fsource=twitter&id=123'
      const options = {
        ...defaultOptions,
        stripQueryParams: ['utm_source'],
      }
      const expected = 'example.com/feed?id=123'

      expect(normalizeUrl(value, options)).toBe(expected)
    })
  })

  describe('query string stripping', () => {
    it('should strip entire query string when stripQuery is true', () => {
      const value = 'https://example.com/feed?a=1&b=2&c=3'
      const options = {
        ...defaultOptions,
        stripQuery: true,
      }
      const expected = 'example.com/feed'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should preserve query string by default', () => {
      const value = 'https://example.com/feed?id=123'
      const expected = 'example.com/feed?id=123'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })
  })

  describe('empty query removal', () => {
    it('should remove empty query string by default', () => {
      const value = 'https://example.com/feed?'
      const expected = 'example.com/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should remove empty query string when sortQueryParams is false', () => {
      const value = 'https://example.com/feed?'
      const options = {
        ...defaultOptions,
        sortQueryParams: false,
      }
      const expected = 'example.com/feed'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should remove empty query string followed by a fragment', () => {
      const value = 'https://example.com/feed?#top'
      const options = {
        ...defaultOptions,
        stripHash: false,
      }
      const expected = 'example.com/feed#top'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should preserve empty query string when stripEmptyQuery is false', () => {
      const value = 'https://example.com/feed?'
      const options = {
        ...defaultOptions,
        sortQueryParams: false,
        stripEmptyQuery: false,
      }
      const expected = 'example.com/feed?'

      expect(normalizeUrl(value, options)).toBe(expected)
    })
  })

  describe('query lowercasing', () => {
    it('should not lowercase query by default', () => {
      const value = 'https://example.com/feed?Format=RSS'
      const expected = 'example.com/feed?Format=RSS'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should lowercase query param names when lowercaseQuery is true', () => {
      const value = 'https://example.com/feed?Format=rss'
      const options = {
        ...defaultOptions,
        lowercaseQuery: true,
      }
      const expected = 'example.com/feed?format=rss'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should lowercase query param values when lowercaseQuery is true', () => {
      const value = 'https://example.com/feed?format=RSS'
      const options = {
        ...defaultOptions,
        lowercaseQuery: true,
      }
      const expected = 'example.com/feed?format=rss'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should lowercase both names and values when lowercaseQuery is true', () => {
      const value = 'https://example.com/feed?Format=RSS'
      const options = {
        ...defaultOptions,
        lowercaseQuery: true,
      }
      const expected = 'example.com/feed?format=rss'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should handle multiple query params', () => {
      const value = 'https://example.com/feed?A=X&B=Y'
      const options = {
        ...defaultOptions,
        lowercaseQuery: true,
      }
      const expected = 'example.com/feed?a=x&b=y'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should handle empty query value', () => {
      const value = 'https://example.com/feed?Key='
      const options = {
        ...defaultOptions,
        lowercaseQuery: true,
      }
      const expected = 'example.com/feed?key='

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should work with sortQueryParams', () => {
      const value = 'https://example.com/feed?Z=1&A=2'
      const options = {
        ...defaultOptions,
        lowercaseQuery: true,
        sortQueryParams: true,
      }
      const expected = 'example.com/feed?a=2&z=1'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should preserve raw encoding while lowercasing', () => {
      const value = 'https://example.com/feed?Path=A/B&When=12:00'
      const options = {
        ...defaultOptions,
        lowercaseQuery: true,
      }
      const expected = 'example.com/feed?path=a/b&when=12:00'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should leave percent escapes alone when lowercasing', () => {
      const value = 'https://example.com/feed?Q=A%2FB'
      const options = {
        ...defaultOptions,
        lowercaseQuery: true,
      }
      const expected = 'example.com/feed?q=a%2Fb'

      expect(normalizeUrl(value, options)).toBe(expected)
    })
  })

  describe('percent encoding normalization', () => {
    it('should decode unnecessarily encoded safe chars by default', () => {
      const value = 'https://example.com/path%2Dto%2Dfeed'
      const expected = 'example.com/path-to-feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should normalize lowercase hex to uppercase', () => {
      const value = 'https://example.com/path%2fencoded'
      const expected = 'example.com/path%2Fencoded'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should keep unsafe characters encoded', () => {
      const value = 'https://example.com/hello%20world'
      const expected = 'example.com/hello%20world'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should keep reserved characters encoded', () => {
      const value = 'https://example.com/a%2Bb%3Dc%26d%2ce'
      const expected = 'example.com/a%2Bb%3Dc%26d%2Ce'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should decode unreserved characters and uppercase hex in the query', () => {
      const value = 'https://example.com/feed?q=%7e%41%3a'
      const expected = 'https://example.com/feed?q=~A%3A'

      expect(normalizeUrl(value, { normalizeEncoding: true })).toBe(expected)
    })

    it('should keep reserved characters encoded in the query', () => {
      const value = 'https://example.com/feed?q=a%26b%3Dc'
      const expected = 'https://example.com/feed?q=a%26b%3Dc'

      expect(normalizeUrl(value, { normalizeEncoding: true })).toBe(expected)
    })

    it('should decode unreserved characters and uppercase hex in the fragment', () => {
      const value = 'https://example.com/feed#%7e%41%3a'
      const expected = 'https://example.com/feed#~A%3A'

      expect(normalizeUrl(value, { normalizeEncoding: true })).toBe(expected)
    })

    it('should keep an empty query when the fragment is encoded', () => {
      const value = 'https://example.com/feed?#%41'
      const expected = 'https://example.com/feed?#A'

      expect(normalizeUrl(value, { normalizeEncoding: true })).toBe(expected)
    })

    it('should preserve encoding when normalizeEncoding is false', () => {
      const value = 'https://example.com/path%2Dto%2Dfeed'
      const options = {
        ...defaultOptions,
        normalizeEncoding: false,
      }
      const expected = 'example.com/path%2Dto%2Dfeed'

      expect(normalizeUrl(value, options)).toBe(expected)
    })
  })

  describe('unicode normalization', () => {
    it('should normalize unicode in hostname by default', () => {
      const value = 'https://caf\u00e9.com/feed'
      const expected = 'xn--caf-dma.com/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should normalize unicode in pathname by default', () => {
      const value = 'https://example.com/cafe\u0301'
      const expected = 'example.com/caf%C3%A9'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should normalize unicode in query by default', () => {
      const value = 'https://example.com/feed?q=cafe\u0301'
      const expected = 'example.com/feed?q=caf%C3%A9'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should skip unicode normalization when normalizeUnicode is false', () => {
      const value = 'https://example.com/cafe\u0301'
      const options = {
        ...defaultOptions,
        normalizeUnicode: false,
      }
      const expected = 'example.com/cafe%CC%81'

      expect(normalizeUrl(value, options)).toBe(expected)
    })
  })

  describe('punycode normalization', () => {
    it('should convert IDN to punycode by default', () => {
      const value = 'https://münchen.example.com/feed'
      const expected = 'xn--mnchen-3ya.example.com/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })
  })

  describe('case normalization', () => {
    it('should lowercase hostname by default', () => {
      const value = 'https://EXAMPLE.COM/Feed'
      const expected = 'example.com/Feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should not lowercase pathname', () => {
      const value = 'https://example.com/UPPERCASE/Path'
      const expected = 'example.com/UPPERCASE/Path'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })
  })

  describe('combined normalizations', () => {
    it('should apply all default normalizations', () => {
      const value = 'https://user:pass@www.EXAMPLE.COM:443/path//to/feed/?z=2&a=1#section'
      const expected = 'user:pass@example.com/path/to/feed?a=1&z=2'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should apply minimal normalizations when all options are false', () => {
      const value = 'https://www.example.com:8080/feed/'
      const options: NormalizeOptions = {
        stripScheme: false,
        stripAuthentication: false,
        stripWww: false,
        stripTrailingSlash: false,
        stripRootSlash: false,
        collapseSlashes: false,
        stripHash: false,
        sortQueryParams: false,
        stripQueryParams: [],
        stripEmptyQuery: false,
        normalizeUnicode: false,
      }
      const expected = 'https://www.example.com:8080/feed/'

      expect(normalizeUrl(value, options)).toBe(expected)
    })
  })

  describe('edge cases', () => {
    it('should handle URL without path', () => {
      const value = 'https://example.com'
      const expected = 'example.com'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should handle URL with only query', () => {
      const value = 'https://example.com?query=value'
      const expected = 'example.com/?query=value'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should handle IPv4 address hosts', () => {
      const value = 'https://192.168.1.1/feed'
      const expected = '192.168.1.1/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should handle IPv6 address hosts', () => {
      const value = 'https://[::1]/feed'
      const expected = '[::1]/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should handle special characters in query values', () => {
      const value = 'https://example.com/feed?q=hello+world&tag=%23test'
      const expected = 'example.com/feed?q=hello+world&tag=%23test'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should handle multiple query params with same key', () => {
      const value = 'https://example.com/feed?a=1&a=2&a=3'
      const expected = 'example.com/feed?a=1&a=2&a=3'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should handle query param with no value', () => {
      const value = 'https://example.com/feed?key'
      const expected = 'example.com/feed?key'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should handle query param with empty value', () => {
      const value = 'https://example.com/feed?key='
      const expected = 'example.com/feed?key='

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should handle IDN with www prefix', () => {
      const value = 'https://www.münchen.de/feed'
      const expected = 'xn--mnchen-3ya.de/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should handle hash with special characters', () => {
      const value = 'https://example.com/feed#section/sub?param=1'
      const options = {
        ...defaultOptions,
        stripHash: false,
      }
      const expected = 'example.com/feed#section/sub?param=1'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should handle URL with only hash', () => {
      const value = 'https://example.com/#section'
      const expected = 'example.com'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should handle combining www strip with IDN', () => {
      const value = 'https://www.例え.jp/feed'
      const expected = 'xn--r8jz45g.jp/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should preserve matrix parameters in path', () => {
      expect(normalizeUrl('https://example.com/feed;type=rss', defaultOptions)).toBe(
        'example.com/feed;type=rss',
      )
      expect(normalizeUrl('https://example.com/feed;a=1;b=2', defaultOptions)).toBe(
        'example.com/feed;a=1;b=2',
      )
    })

    it('should encode special characters in query param values', () => {
      expect(normalizeUrl('https://example.com/feed?expr=a=b', defaultOptions)).toBe(
        'example.com/feed?expr=a=b',
      )
      expect(normalizeUrl('https://example.com/feed?q=a%26b', defaultOptions)).toBe(
        'example.com/feed?q=a%26b',
      )
      expect(normalizeUrl('https://example.com/feed?q=日本語', defaultOptions)).toBe(
        'example.com/feed?q=%E6%97%A5%E6%9C%AC%E8%AA%9E',
      )
    })

    it('should handle unencoded and mixed encoding in path', () => {
      expect(normalizeUrl('https://example.com/path with spaces', defaultOptions)).toBe(
        'example.com/path%20with%20spaces',
      )
      expect(normalizeUrl('https://example.com/a%2Fb/c', defaultOptions)).toBe(
        'example.com/a%2Fb/c',
      )
    })
  })

  describe('invalid inputs', () => {
    it('should return original string for invalid URL', () => {
      const value = 'not a valid url'

      expect(normalizeUrl(value, defaultOptions)).toBe(value)
    })

    it('should return original string for empty string', () => {
      const value = ''

      expect(normalizeUrl(value, defaultOptions)).toBe(value)
    })

    it('should return original string for relative path', () => {
      const value = '/path/to/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(value)
    })

    it('should handle malformed URLs gracefully', () => {
      const value = 'https://example.com:not-a-port/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(value)
    })

    it('should convert IDN hostnames to punycode', () => {
      const value = 'https://münchen.example.com/feed'
      const expected = 'xn--mnchen-3ya.example.com/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })
  })
})

describe('stripWww', () => {
  it('should strip a leading www label', () => {
    expect(stripWww('www.example.com')).toBe('example.com')
  })

  it('should keep a host without a www label', () => {
    expect(stripWww('blog.example.com')).toBe('blog.example.com')
  })

  it('should keep www inside a label', () => {
    expect(stripWww('wwwexample.com')).toBe('wwwexample.com')
  })

  it('should strip every leading www label', () => {
    expect(stripWww('www.www.example.com')).toBe('example.com')
  })

  it('should keep the last www label when only the top-level domain would remain', () => {
    expect(stripWww('www.www.com')).toBe('www.com')
  })

  it('should keep www when only the top-level domain would remain', () => {
    expect(stripWww('www.com')).toBe('www.com')
  })
})

describe('isIpAddress', () => {
  it('should accept an IPv4 address', () => {
    expect(isIpAddress('146.75.121.140')).toBe(true)
  })

  it('should accept an IPv6 address', () => {
    expect(isIpAddress('2606:4700::1111')).toBe(true)
  })

  it('should accept a bracketed IPv6 address from URL.hostname', () => {
    expect(isIpAddress('[2606:4700::1111]')).toBe(true)
  })

  it('should reject a domain', () => {
    expect(isIpAddress('example.com')).toBe(false)
  })

  it('should reject a single-label host', () => {
    expect(isIpAddress('localhost')).toBe(false)
  })
})

describe('createUrlSpellings', () => {
  it('should swap every plus sign in the query to %20 at once', () => {
    const value = 'https://example.com/search?q=a+b+c&tag=x+y'
    const expected = [value, 'https://example.com/search?q=a%20b%20c&tag=x%20y']

    expect(createUrlSpellings(value)).toEqual(expected)
  })

  it('should swap every %20 in the query to a plus sign at once', () => {
    const value = 'https://example.com/search?q=a%20b%20c'
    const expected = [value, 'https://example.com/search?q=a+b+c']

    expect(createUrlSpellings(value)).toEqual(expected)
  })

  it('should swap an at sign in the query to %40', () => {
    const value = 'https://example.com/feed?user=alice@example.org'
    const expected = [value, 'https://example.com/feed?user=alice%40example.org']

    expect(createUrlSpellings(value)).toEqual(expected)
  })

  it('should swap %40 in the query to an at sign', () => {
    const value = 'https://example.com/feed?user=alice%40example.org'
    const expected = [value, 'https://example.com/feed?user=alice@example.org']

    expect(createUrlSpellings(value)).toEqual(expected)
  })

  it('should swap a colon in the query to %3A', () => {
    const value = 'https://example.com/search?q=tag:news'
    const expected = [value, 'https://example.com/search?q=tag%3Anews']

    expect(createUrlSpellings(value)).toEqual(expected)
  })

  it('should swap %3A in the query to a colon', () => {
    const value = 'https://example.com/search?q=tag%3Anews'
    const expected = [
      value,
      'https://example.com/search?q=tag:news',
      'https://example.com/search?q=tag%3anews',
    ]

    expect(createUrlSpellings(value)).toEqual(expected)
  })

  it('should leave a colon in the path as written', () => {
    const value = 'https://example.com/tag:news/feed'

    expect(createUrlSpellings(value)).toEqual([value])
  })

  it('should uppercase lowercase percent-escape hex in the path and the query', () => {
    const value = 'https://example.com/caf%c3%a9/feed?q=a%2cb'
    const expected = [value, 'https://example.com/caf%C3%A9/feed?q=a%2Cb']

    expect(createUrlSpellings(value)).toEqual(expected)
  })

  it('should lowercase uppercase percent-escape hex in the path and the query', () => {
    const value = 'https://example.com/caf%C3%A9/feed?q=a%2Cb'
    const expected = [value, 'https://example.com/caf%c3%a9/feed?q=a%2cb']

    expect(createUrlSpellings(value)).toEqual(expected)
  })

  it('should give both hex cases for a url mixing them', () => {
    const value = 'https://example.com/caf%C3%a9/feed'
    const expected = [
      value,
      'https://example.com/caf%C3%A9/feed',
      'https://example.com/caf%c3%a9/feed',
    ]

    expect(createUrlSpellings(value)).toEqual(expected)
  })

  it('should include the lowercase-hex colon in the query for an uppercase-hex url', () => {
    const value = 'https://example.com/search?q=a%3Ab'

    expect(createUrlSpellings(value)).toContain('https://example.com/search?q=a%3ab')
  })

  it('should include the uppercase-hex colon in the query for a lowercase-hex url', () => {
    const value = 'https://example.com/search?q=a%3ab'

    expect(createUrlSpellings(value)).toContain('https://example.com/search?q=a%3Ab')
  })

  it('should lowercase the colon a query swap encodes in a url with an escape', () => {
    const value = 'https://example.com/caf%C3%A9/feed?q=a:b'

    expect(createUrlSpellings(value)).toContain('https://example.com/caf%c3%a9/feed?q=a%3ab')
  })

  it('should give no lowercase-hex spelling to a url without an escape', () => {
    const value = 'https://example.com/search?q=a:b'
    const expected = [value, 'https://example.com/search?q=a%3Ab']

    expect(createUrlSpellings(value)).toEqual(expected)
  })

  it('should return at most 24 spellings for a mixed-case url with every kind in the query', () => {
    const value = 'https://example.com/caf%C3%a9/feed?q=a+b:c@d'

    expect(createUrlSpellings(value)).toHaveLength(24)
  })

  it('should combine every spelling of two kinds in the query', () => {
    const value = 'https://example.com/feed?q=a+b&user=alice@example.org'
    const expected = [
      value,
      'https://example.com/feed?q=a+b&user=alice%40example.org',
      'https://example.com/feed?q=a%20b&user=alice@example.org',
      'https://example.com/feed?q=a%20b&user=alice%40example.org',
    ]

    expect(createUrlSpellings(value)).toEqual(expected)
  })

  it('should combine every spelling of three kinds in the query', () => {
    const value = 'https://example.com/feed?q=a+b:c@d'
    const expected = [
      value,
      'https://example.com/feed?q=a+b:c%40d',
      'https://example.com/feed?q=a+b%3Ac@d',
      'https://example.com/feed?q=a+b%3Ac%40d',
      'https://example.com/feed?q=a%20b:c@d',
      'https://example.com/feed?q=a%20b:c%40d',
      'https://example.com/feed?q=a%20b%3Ac@d',
      'https://example.com/feed?q=a%20b%3Ac%40d',
    ]

    expect(createUrlSpellings(value)).toEqual(expected)
  })

  it('should include the encoded colons with plus signs for a query written with colons and %20', () => {
    const value = 'https://example.com/search?q=by:spyed%20sort:time%20meta:all'

    expect(createUrlSpellings(value)).toContain(
      'https://example.com/search?q=by%3Aspyed+sort%3Atime+meta%3Aall',
    )
  })

  it('should combine the hex case with the query spellings and leave the rest of the path', () => {
    const value = 'https://example.com/caf%c3%a9/a+b:c@d/feed?q=a+b'
    const expected = [
      value,
      'https://example.com/caf%c3%a9/a+b:c@d/feed?q=a%20b',
      'https://example.com/caf%C3%A9/a+b:c@d/feed?q=a+b',
      'https://example.com/caf%C3%A9/a+b:c@d/feed?q=a%20b',
    ]

    expect(createUrlSpellings(value)).toEqual(expected)
  })

  it('should give both directions when the query holds both spellings', () => {
    const value = 'https://example.com/search?q=a+b%20c'
    const expected = [
      value,
      'https://example.com/search?q=a+b+c',
      'https://example.com/search?q=a%20b%20c',
    ]

    expect(createUrlSpellings(value)).toEqual(expected)
  })

  it('should return one spelling per combination however often each kind repeats', () => {
    const value = `https://example.com/search?q=${'a+b:'.repeat(1000)}`

    expect(createUrlSpellings(value)).toHaveLength(4)
  })

  it('should finish a 200 KB query of plus signs and colons within a second', () => {
    const value = `https://example.com/search?q=${'+:'.repeat(100_000)}`
    const start = performance.now()

    createUrlSpellings(value)

    expect(performance.now() - start).toBeLessThan(1000)
  })

  it('should leave an at sign in the path as written', () => {
    const value = 'https://example.com/@alice/feed'

    expect(createUrlSpellings(value)).toEqual([value])
  })

  it('should leave a plus sign and %20 in the path as written', () => {
    const value = 'https://example.com/a+b/c%20d/feed'

    expect(createUrlSpellings(value)).toEqual([value])
  })

  it('should leave the fragment as written', () => {
    const value = 'https://example.com/feed?q=a+b#c+d'
    const expected = [value, 'https://example.com/feed?q=a%20b#c+d']

    expect(createUrlSpellings(value)).toEqual(expected)
  })

  it('should leave a question mark in the fragment as written', () => {
    const value = 'https://example.com/feed#a?b+c'

    expect(createUrlSpellings(value)).toEqual([value])
  })

  it('should return the url alone when nothing can be spelled another way', () => {
    const value = 'https://example.com/feed?q=a,b'

    expect(createUrlSpellings(value)).toEqual([value])
  })
})

describe('createUrlVariants', () => {
  it('should return every scheme, www and trailing slash variant', () => {
    const expected = [
      'https://example.com/feed',
      'https://example.com/feed/',
      'https://www.example.com/feed',
      'https://www.example.com/feed/',
      'http://example.com/feed',
      'http://example.com/feed/',
      'http://www.example.com/feed',
      'http://www.example.com/feed/',
    ]

    expect(createUrlVariants('https://example.com/feed')).toEqual(expected)
  })

  it('should return the same variants for a URL with www and a trailing slash', () => {
    const expected = [
      'https://example.com/feed',
      'https://example.com/feed/',
      'https://www.example.com/feed',
      'https://www.example.com/feed/',
      'http://example.com/feed',
      'http://example.com/feed/',
      'http://www.example.com/feed',
      'http://www.example.com/feed/',
    ]

    expect(createUrlVariants('http://www.example.com/feed/')).toEqual(expected)
  })

  it('should skip the trailing slash after a file extension', () => {
    const expected = [
      'https://example.com/feed.xml',
      'https://www.example.com/feed.xml',
      'http://example.com/feed.xml',
      'http://www.example.com/feed.xml',
    ]

    expect(createUrlVariants('https://example.com/feed.xml')).toEqual(expected)
  })

  it('should skip the trailing slash after an uncommon file extension', () => {
    const expected = [
      'https://example.com/news.ashx',
      'https://www.example.com/news.ashx',
      'http://example.com/news.ashx',
      'http://www.example.com/news.ashx',
    ]

    expect(createUrlVariants('https://example.com/news.ashx')).toEqual(expected)
  })

  it('should keep the trailing slash a URL has after a file extension', () => {
    const expected = [
      'https://example.com/feed.xml',
      'https://example.com/feed.xml/',
      'https://www.example.com/feed.xml',
      'https://www.example.com/feed.xml/',
      'http://example.com/feed.xml',
      'http://example.com/feed.xml/',
      'http://www.example.com/feed.xml',
      'http://www.example.com/feed.xml/',
    ]

    expect(createUrlVariants('https://example.com/feed.xml/')).toEqual(expected)
  })

  it('should add the trailing slash after a segment ending in a version number', () => {
    const expected = [
      'https://example.com/rss/2.0',
      'https://example.com/rss/2.0/',
      'https://www.example.com/rss/2.0',
      'https://www.example.com/rss/2.0/',
      'http://example.com/rss/2.0',
      'http://example.com/rss/2.0/',
      'http://www.example.com/rss/2.0',
      'http://www.example.com/rss/2.0/',
    ]

    expect(createUrlVariants('https://example.com/rss/2.0')).toEqual(expected)
  })

  it('should add the trailing slash when only a directory has a dot', () => {
    const expected = [
      'https://example.com/v1.beta/feed',
      'https://example.com/v1.beta/feed/',
      'https://www.example.com/v1.beta/feed',
      'https://www.example.com/v1.beta/feed/',
      'http://example.com/v1.beta/feed',
      'http://example.com/v1.beta/feed/',
      'http://www.example.com/v1.beta/feed',
      'http://www.example.com/v1.beta/feed/',
    ]

    expect(createUrlVariants('https://example.com/v1.beta/feed')).toEqual(expected)
  })

  it('should return one path variant for the root path', () => {
    const expected = [
      'https://example.com/',
      'https://www.example.com/',
      'http://example.com/',
      'http://www.example.com/',
    ]

    expect(createUrlVariants('https://example.com')).toEqual(expected)
  })

  it('should keep the query', () => {
    const expected = [
      'https://example.com/feed?format=rss',
      'https://example.com/feed/?format=rss',
      'https://www.example.com/feed?format=rss',
      'https://www.example.com/feed/?format=rss',
      'http://example.com/feed?format=rss',
      'http://example.com/feed/?format=rss',
      'http://www.example.com/feed?format=rss',
      'http://www.example.com/feed/?format=rss',
    ]

    expect(createUrlVariants('https://example.com/feed?format=rss')).toEqual(expected)
  })

  it('should keep the port', () => {
    const expected = [
      'https://example.com:8080/feed.xml',
      'https://www.example.com:8080/feed.xml',
      'http://example.com:8080/feed.xml',
      'http://www.example.com:8080/feed.xml',
    ]

    expect(createUrlVariants('https://example.com:8080/feed.xml')).toEqual(expected)
  })

  it('should keep the credentials', () => {
    const expected = [
      'https://user:secret@example.com/feed.xml',
      'https://user:secret@www.example.com/feed.xml',
      'http://user:secret@example.com/feed.xml',
      'http://user:secret@www.example.com/feed.xml',
    ]

    expect(createUrlVariants('https://user:secret@example.com/feed.xml')).toEqual(expected)
  })

  it('should keep a subdomain under the www variant', () => {
    const expected = [
      'https://blog.example.com/feed.xml',
      'https://www.blog.example.com/feed.xml',
      'http://blog.example.com/feed.xml',
      'http://www.blog.example.com/feed.xml',
    ]

    expect(createUrlVariants('https://blog.example.com/feed.xml')).toEqual(expected)
  })

  it('should skip the www variant for an IP address', () => {
    const expected = ['https://192.0.2.1/feed.xml', 'http://192.0.2.1/feed.xml']

    expect(createUrlVariants('https://192.0.2.1/feed.xml')).toEqual(expected)
  })

  it('should skip the www variant for a single-label host', () => {
    const expected = ['https://localhost/feed.xml', 'http://localhost/feed.xml']

    expect(createUrlVariants('https://localhost/feed.xml')).toEqual(expected)
  })

  it('should return an empty array for a scheme other than http and https', () => {
    expect(createUrlVariants('ftp://example.com/feed.xml')).toEqual([])
  })

  it('should return an empty array for a string that is not a URL', () => {
    expect(createUrlVariants('not a url')).toEqual([])
  })
})

describe('getRegistrableDomain', () => {
  it('should return the host when it is already registrable', () => {
    expect(getRegistrableDomain('https://example.com/feed')).toBe('example.com')
  })

  it('should drop a subdomain', () => {
    expect(getRegistrableDomain('https://blog.example.com/feed')).toBe('example.com')
  })

  it('should drop several subdomains', () => {
    expect(getRegistrableDomain('https://feeds.blog.example.com/atom')).toBe('example.com')
  })

  it('should group blogs on a hosting platform', () => {
    expect(getRegistrableDomain('https://alice.example.org/feed')).toBe('example.org')
    expect(getRegistrableDomain('https://bob.example.org/feed')).toBe('example.org')
  })

  it('should keep the registrable label under a country code suffix', () => {
    expect(getRegistrableDomain('https://news.example.co.uk/feed')).toBe('example.co.uk')
    expect(getRegistrableDomain('https://example.co.uk/feed')).toBe('example.co.uk')
    expect(getRegistrableDomain('https://shop.example.com.au/feed')).toBe('example.com.au')
    expect(getRegistrableDomain('https://dept.example.ac.uk/feed')).toBe('example.ac.uk')
  })

  // A two-letter suffix alone does not make the label before it a public suffix.
  it('should not mistake a short domain for a country code suffix', () => {
    expect(getRegistrableDomain('https://blog.example.io/feed')).toBe('example.io')
  })

  it('should ignore a port', () => {
    expect(getRegistrableDomain('https://example.com:8080/feed')).toBe('example.com')
    expect(getRegistrableDomain('https://test.domain.co.uk:8080/feed')).toBe('domain.co.uk')
  })

  it('should return an IP address unchanged', () => {
    expect(getRegistrableDomain('https://146.75.121.140/feed')).toBe('146.75.121.140')
    expect(getRegistrableDomain('https://[2606:4700::1111]/feed')).toBe('[2606:4700::1111]')
  })

  it('should drop the trailing dot of a fully qualified host', () => {
    expect(getRegistrableDomain('https://www.example.com./feed')).toBe('example.com')
    expect(getRegistrableDomain('https://example.com./feed')).toBe('example.com')
  })

  it('should return a single-label host unchanged', () => {
    expect(getRegistrableDomain('http://localhost/feed')).toBe('localhost')
  })

  it('should accept a URL instance', () => {
    expect(getRegistrableDomain(new URL('https://blog.example.com/feed'))).toBe('example.com')
  })

  it('should return undefined for an unparseable URL', () => {
    expect(getRegistrableDomain('not a url')).toBeUndefined()
  })

  it('should lowercase the host of a non-HTTP URL', () => {
    expect(getRegistrableDomain('foo://WWW.Example.COM/')).toBe('example.com')
  })

  describe('with suffixes', () => {
    const suffixes = [
      'example',
      'co.example',
      '*.wild.example',
      '!keep.wild.example',
      'bücher.example',
    ]

    it('should keep the label before a multi-label rule', () => {
      const value = 'https://shop.co.example/feed'

      expect(getRegistrableDomain(value, { suffixes })).toBe('shop.co.example')
    })

    it('should treat a wildcard rule as matching any one label', () => {
      const value = 'https://a.b.wild.example/feed'

      expect(getRegistrableDomain(value, { suffixes })).toBe('a.b.wild.example')
    })

    it('should let an exception rule win over a wildcard', () => {
      const value = 'https://www.keep.wild.example/feed'

      expect(getRegistrableDomain(value, { suffixes })).toBe('keep.wild.example')
    })

    it('should fall back to the last label when no rule matches', () => {
      const value = 'https://blog.example.test/feed'

      expect(getRegistrableDomain(value, { suffixes })).toBe('example.test')
    })

    it('should return a host that is itself a public suffix unchanged', () => {
      const value = 'https://co.example/feed'

      expect(getRegistrableDomain(value, { suffixes })).toBe('co.example')
    })

    it('should match a rule written in Unicode against a punycode host', () => {
      const value = 'https://shop.bücher.example/feed'

      expect(getRegistrableDomain(value, { suffixes })).toBe('shop.xn--bcher-kva.example')
    })

    it('should match a rule written in uppercase', () => {
      const value = 'https://shop.co.example/feed'
      const options = { suffixes: ['CO.EXAMPLE'] }

      expect(getRegistrableDomain(value, options)).toBe('shop.co.example')
    })

    it('should drop every subdomain above the registrable domain', () => {
      const value = 'https://feeds.blog.example.com/atom'
      const options = { suffixes: ['com'] }

      expect(getRegistrableDomain(value, options)).toBe('example.com')
    })
  })
})

describe('composeFragment', () => {
  it('should prefix a single parameter with a hash', () => {
    const value = { t: '30' }
    const expected = '#t=30'

    expect(composeFragment(value)).toBe(expected)
  })

  it('should join several parameters in the order given', () => {
    const value = {
      t: '30',
      autoplay: 1,
    }
    const expected = '#t=30&autoplay=1'

    expect(composeFragment(value)).toBe(expected)
  })

  it('should escape a name and a value as composeQuery does', () => {
    const value = { 'a&b c': 'x%y+z#w@v' }
    const expected = '#a%26b%20c=x%25y%2Bz%23w@v'

    expect(composeFragment(value)).toBe(expected)
    expect(composeQuery(value)).toBe('?a%26b%20c=x%25y%2Bz%23w@v')
  })

  it('should leave out a parameter whose value is empty', () => {
    const value = {
      t: '30',
      autoplay: '',
    }
    const expected = '#t=30'

    expect(composeFragment(value)).toBe(expected)
  })

  it('should return an empty string for an empty record', () => {
    expect(composeFragment({})).toBe('')
  })

  it('should return an empty string when nothing is passed', () => {
    expect(composeFragment()).toBe('')
  })
})

describe('hasQueryParam', () => {
  it('should find a valueless flag', () => {
    expect(hasQueryParam('live&t=30', 'live')).toBe(true)
  })

  it('should find a name in any case', () => {
    expect(hasQueryParam(new URL('https://example.com/?LIVE'), 'live')).toBe(true)
  })

  it('should find a parameter with a value', () => {
    expect(hasQueryParam(new URLSearchParams('t=30'), 't')).toBe(true)
  })

  it('should return false for a missing parameter', () => {
    expect(hasQueryParam('t=30', 'live')).toBe(false)
  })

  it('should return false for an undefined source', () => {
    expect(hasQueryParam(undefined, 'live')).toBe(false)
  })
})

describe('hasFragmentParam', () => {
  it('should find a valueless flag', () => {
    expect(hasFragmentParam('#autoplay&t=30', 'autoplay')).toBe(true)
  })

  it('should find a name in any case', () => {
    expect(hasFragmentParam(new URL('https://example.com/#AUTOPLAY'), 'autoplay')).toBe(true)
  })

  it('should read the fragment, not the query', () => {
    expect(hasFragmentParam(new URL('https://example.com/?autoplay#t=30'), 'autoplay')).toBe(false)
  })

  it('should return false for an undefined source', () => {
    expect(hasFragmentParam(undefined, 'autoplay')).toBe(false)
  })
})
