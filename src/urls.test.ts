import { describe, expect, it } from 'bun:test'
import type { NormalizeOptions } from './types.js'
import {
  addMissingProtocol,
  decodeSegment,
  fixMalformedProtocol,
  getPathSegments,
  getRegistrableDomain,
  getSubdomain,
  isHostOf,
  isHostOrSubdomainOf,
  isHttpUrl,
  isIpAddress,
  isSubdomainOf,
  normalizeUrl,
  parseUrl,
  resolveFeedProtocol,
  resolveUrl,
  stripWww,
  upgradeProtocol,
} from './urls.js'

const defaultOptions: NormalizeOptions = {
  stripProtocol: true,
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
  it('should return the label in front of a domain written in Unicode', () => {
    expect(getSubdomain('https://shop.bücher.de/feed', 'bücher.de')).toBe('shop')
  })

  it('should return the label of a fully qualified host with a trailing dot', () => {
    expect(getSubdomain('https://alice.podbean.com./feed', 'podbean.com')).toBe('alice')
  })

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

  it('should lowercase the hostname of a URL with another scheme', () => {
    expect(getSubdomain('javascript://FOO.EXBLOG.JP/', 'exblog.jp')).toBe('foo')
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

describe('resolveFeedProtocol', () => {
  it('should convert feed:// to https://', () => {
    const value = 'feed://example.com/rss.xml'
    const expected = 'https://example.com/rss.xml'

    expect(resolveFeedProtocol(value)).toBe(expected)
  })

  it('should convert rss:// to https://', () => {
    const value = 'rss://example.com/feed.xml'
    const expected = 'https://example.com/feed.xml'

    expect(resolveFeedProtocol(value)).toBe(expected)
  })

  it('should convert pcast:// to https://', () => {
    const value = 'pcast://example.com/podcast.xml'
    const expected = 'https://example.com/podcast.xml'

    expect(resolveFeedProtocol(value)).toBe(expected)
  })

  it('should convert itpc:// to https://', () => {
    const value = 'itpc://example.com/podcast.xml'
    const expected = 'https://example.com/podcast.xml'

    expect(resolveFeedProtocol(value)).toBe(expected)
  })

  it('should convert podcast:// to https://', () => {
    const value = 'podcast://example.com/feed.xml'
    const expected = 'https://example.com/feed.xml'

    expect(resolveFeedProtocol(value)).toBe(expected)
  })

  it('should unwrap feed:https:// to https://', () => {
    const value = 'feed:https://example.com/rss.xml'
    const expected = 'https://example.com/rss.xml'

    expect(resolveFeedProtocol(value)).toBe(expected)
  })

  it('should unwrap feed:http:// to http://', () => {
    const value = 'feed:http://example.com/rss.xml'
    const expected = 'http://example.com/rss.xml'

    expect(resolveFeedProtocol(value)).toBe(expected)
  })

  it('should unwrap rss:https:// to https://', () => {
    const value = 'rss:https://example.com/feed.xml'
    const expected = 'https://example.com/feed.xml'

    expect(resolveFeedProtocol(value)).toBe(expected)
  })

  it('should unwrap pcast:https:// to https://', () => {
    const value = 'pcast:https://example.com/podcast.xml'
    const expected = 'https://example.com/podcast.xml'

    expect(resolveFeedProtocol(value)).toBe(expected)
  })

  it('should unwrap itpc:http:// to http://', () => {
    const value = 'itpc:http://example.com/podcast.xml'
    const expected = 'http://example.com/podcast.xml'

    expect(resolveFeedProtocol(value)).toBe(expected)
  })

  it('should unwrap podcast:https:// to https://', () => {
    const value = 'podcast:https://example.com/feed.xml'
    const expected = 'https://example.com/feed.xml'

    expect(resolveFeedProtocol(value)).toBe(expected)
  })

  it('should convert podcasts:// to https://', () => {
    const value = 'podcasts://example.com/feed.xml'
    const expected = 'https://example.com/feed.xml'

    expect(resolveFeedProtocol(value)).toBe(expected)
  })

  it('should unwrap podcasts:https:// to https://', () => {
    const value = 'podcasts:https://example.com/feed.xml'
    const expected = 'https://example.com/feed.xml'

    expect(resolveFeedProtocol(value)).toBe(expected)
  })

  it('should convert itms:// to https://', () => {
    const value = 'itms://example.com/podcast.xml'
    const expected = 'https://example.com/podcast.xml'

    expect(resolveFeedProtocol(value)).toBe(expected)
  })

  it('should convert itms-pcast:// to https://', () => {
    const value = 'itms-pcast://example.com/podcast.xml'
    const expected = 'https://example.com/podcast.xml'

    expect(resolveFeedProtocol(value)).toBe(expected)
  })

  it('should convert itms-pcasts:// to https://', () => {
    const value = 'itms-pcasts://example.com/podcast.xml'
    const expected = 'https://example.com/podcast.xml'

    expect(resolveFeedProtocol(value)).toBe(expected)
  })

  it('should convert itms-podcast:// to https://', () => {
    const value = 'itms-podcast://example.com/podcast.xml'
    const expected = 'https://example.com/podcast.xml'

    expect(resolveFeedProtocol(value)).toBe(expected)
  })

  it('should convert itms-podcasts:// to https://', () => {
    const value = 'itms-podcasts://example.com/podcast.xml'
    const expected = 'https://example.com/podcast.xml'

    expect(resolveFeedProtocol(value)).toBe(expected)
  })

  it('should unwrap itms-podcast:https:// to https://', () => {
    const value = 'itms-podcast:https://example.com/podcast.xml'
    const expected = 'https://example.com/podcast.xml'

    expect(resolveFeedProtocol(value)).toBe(expected)
  })

  it('should return https URLs unchanged', () => {
    const value = 'https://example.com/feed.xml'

    expect(resolveFeedProtocol(value)).toBe(value)
  })

  it('should return http URLs unchanged', () => {
    const value = 'http://example.com/rss.xml'

    expect(resolveFeedProtocol(value)).toBe(value)
  })

  it('should return non-feed URLs starting with feed-scheme letters unchanged', () => {
    expect(resolveFeedProtocol('ftp://example.com/feed.xml')).toBe('ftp://example.com/feed.xml')
    expect(resolveFeedProtocol('irc://irc.example.com/feeds')).toBe('irc://irc.example.com/feeds')
    expect(resolveFeedProtocol('feeds.example.com/rss')).toBe('feeds.example.com/rss')
    expect(resolveFeedProtocol('podcasts.example.com/feed')).toBe('podcasts.example.com/feed')
    expect(resolveFeedProtocol('rss.example.com/feed')).toBe('rss.example.com/feed')
  })

  it('should return absolute path URLs unchanged', () => {
    const value = '/path/to/feed'

    expect(resolveFeedProtocol(value)).toBe(value)
  })

  it('should return relative path URLs unchanged', () => {
    const value = 'relative/feed.xml'

    expect(resolveFeedProtocol(value)).toBe(value)
  })

  it('should handle feed URLs with paths and query params', () => {
    const value = 'feed://example.com/path/to/feed?format=rss'
    const expected = 'https://example.com/path/to/feed?format=rss'

    expect(resolveFeedProtocol(value)).toBe(expected)
  })

  it('should handle feed URLs with ports', () => {
    const value = 'feed://example.com:8080/feed.xml'
    const expected = 'https://example.com:8080/feed.xml'

    expect(resolveFeedProtocol(value)).toBe(expected)
  })

  it('should handle uppercase feed protocols', () => {
    expect(resolveFeedProtocol('FEED://example.com/rss.xml')).toBe('https://example.com/rss.xml')
    expect(resolveFeedProtocol('Feed://example.com/rss.xml')).toBe('https://example.com/rss.xml')
    expect(resolveFeedProtocol('FEED:https://example.com/rss.xml')).toBe(
      'https://example.com/rss.xml',
    )
    expect(resolveFeedProtocol('RSS://example.com/feed.xml')).toBe('https://example.com/feed.xml')
    expect(resolveFeedProtocol('PCAST://example.com/podcast.xml')).toBe(
      'https://example.com/podcast.xml',
    )
  })

  it('should handle mixed case in wrapped URL protocol', () => {
    expect(resolveFeedProtocol('feed:HTTPS://example.com/rss.xml')).toBe(
      'HTTPS://example.com/rss.xml',
    )
    expect(resolveFeedProtocol('feed:Http://example.com/rss.xml')).toBe(
      'Http://example.com/rss.xml',
    )
  })

  it('should return empty string unchanged', () => {
    expect(resolveFeedProtocol('')).toBe('')
  })

  it('should return malformed feed URL unchanged', () => {
    const value = 'feed:example.com'

    expect(resolveFeedProtocol(value)).toBe(value)
  })

  it('should handle feed URLs with authentication', () => {
    const value = 'feed://user:pass@example.com/rss.xml'
    const expected = 'https://user:pass@example.com/rss.xml'

    expect(resolveFeedProtocol(value)).toBe(expected)
  })

  it('should handle feed URLs with hash fragment', () => {
    const value = 'feed://example.com/rss.xml#latest'
    const expected = 'https://example.com/rss.xml#latest'

    expect(resolveFeedProtocol(value)).toBe(expected)
  })

  it('should use fallbackProtocol for feed:// URLs', () => {
    expect(resolveFeedProtocol('feed://example.com/feed', 'http')).toBe('http://example.com/feed')
    expect(resolveFeedProtocol('rss://example.com/feed', 'http')).toBe('http://example.com/feed')
  })

  it('should ignore fallbackProtocol for wrapped URLs with explicit protocol', () => {
    expect(resolveFeedProtocol('feed:https://example.com/feed', 'http')).toBe(
      'https://example.com/feed',
    )
    expect(resolveFeedProtocol('feed:http://example.com/feed', 'https')).toBe(
      'http://example.com/feed',
    )
  })
})

describe('fixMalformedProtocol', () => {
  const leadingSlashCases: Array<[string, string]> = [
    ['/http://example.com', 'http://example.com'],
    ['/https://example.com', 'https://example.com'],
  ]

  it.each(leadingSlashCases)(
    'should strip leading slash before protocol (%s)',
    (value, expected) => {
      expect(fixMalformedProtocol(value)).toBe(expected)
    },
  )

  const protocolTypoCases: Array<[string, string]> = [
    ['htp://example.com', 'http://example.com'],
    ['htps://example.com', 'https://example.com'],
    ['hhttps://example.com', 'https://example.com'],
    ['httpss://example.com', 'https://example.com'],
    ['ttp://example.com', 'http://example.com'],
  ]

  it.each(protocolTypoCases)('should fix protocol typos (%s)', (value, expected) => {
    expect(fixMalformedProtocol(value)).toBe(expected)
  })

  const wrongSeparatorCases: Array<[string, string]> = [
    ['http=//example.com', 'http://example.com'],
    ['http.//example.com', 'http://example.com'],
    ['http\\//example.com', 'http://example.com'],
    ['https=//example.com', 'https://example.com'],
  ]

  it.each(wrongSeparatorCases)(
    'should fix wrong separators after protocol (%s)',
    (value, expected) => {
      expect(fixMalformedProtocol(value)).toBe(expected)
    },
  )

  const singleSlashCases: Array<[string, string]> = [
    ['http:/example.com', 'http://example.com'],
    ['https:/example.com', 'https://example.com'],
    ['http:/www.example.com', 'http://www.example.com'],
    ['https:/example.com/feed', 'https://example.com/feed'],
  ]

  it.each(singleSlashCases)('should fix single slash after protocol (%s)', (value, expected) => {
    expect(fixMalformedProtocol(value)).toBe(expected)
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
      expect(fixMalformedProtocol(value)).toBe(expected)
    },
  )

  const leadingJunkCases: Array<[string, string]> = [
    ['http://./example.com', 'http://example.com'],
    ['http://,example.com', 'http://example.com'],
    ['https://...example.com', 'https://example.com'],
  ]

  it.each(leadingJunkCases)('should remove leading junk after protocol (%s)', (value, expected) => {
    expect(fixMalformedProtocol(value)).toBe(expected)
  })

  const placeholderCases: Array<[string, string]> = [
    ['http(s)://example.com', 'https://example.com'],
    ['HTTP(S)://example.com/feed', 'https://example.com/feed'],
  ]

  it.each(placeholderCases)('should fix placeholder syntax (%s)', (value, expected) => {
    expect(fixMalformedProtocol(value)).toBe(expected)
  })

  const splitProtocolCases: Array<[string, string]> = [
    ['http:s//example.com', 'https://example.com'],
    ['https:s//example.com', 'https://example.com'],
    ['ht:tps//example.com', 'https://example.com'],
    ['htt:p//example.com', 'http://example.com'],
    ['h:ttp//example.com', 'http://example.com'],
    ['ht:tp//example.com', 'http://example.com'],
  ]

  it.each(splitProtocolCases)(
    'should fix colon within protocol letters (%s)',
    (value, expected) => {
      expect(fixMalformedProtocol(value)).toBe(expected)
    },
  )

  const doubledPrefixCases: Array<[string, string]> = [
    ['http:http://example.com', 'http://example.com'],
    ['https:https://example.com', 'https://example.com'],
    ['http:https://example.com', 'https://example.com'],
    ['https:http://example.com', 'http://example.com'],
    ['http::http://example.com', 'http://example.com'],
  ]

  it.each(doubledPrefixCases)('should fix double protocol prefix (%s)', (value, expected) => {
    expect(fixMalformedProtocol(value)).toBe(expected)
  })

  const misplacedWwwCases: Array<[string, string]> = [
    ['http:www.//example.com', 'http://www.example.com'],
    ['https:www.//example.com', 'https://www.example.com'],
  ]

  it.each(misplacedWwwCases)('should fix misplaced www after protocol (%s)', (value, expected) => {
    expect(fixMalformedProtocol(value)).toBe(expected)
  })

  const missingWwwDotCases: Array<[string, string]> = [
    ['http://www/example.com', 'http://www.example.com'],
    ['https://www/example.com/feed', 'https://www.example.com/feed'],
  ]

  it.each(missingWwwDotCases)('should fix missing dot after www (%s)', (value, expected) => {
    expect(fixMalformedProtocol(value)).toBe(expected)
  })

  const nestedProtocolCases: Array<[string, string]> = [
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

  it.each(nestedProtocolCases)('should fix nested double protocols (%s)', (value, expected) => {
    expect(fixMalformedProtocol(value)).toBe(expected)
  })

  const strayColonCases: Array<[string, string]> = [
    ['http://:/example.com', 'http://example.com'],
    ['https://:/example.com', 'https://example.com'],
    ['http://:/path/to/feed', 'http://path/to/feed'],
  ]

  it.each(strayColonCases)(
    'should fix stray colon after protocol slashes (%s)',
    (value, expected) => {
      expect(fixMalformedProtocol(value)).toBe(expected)
    },
  )

  const portCases: Array<[string, string]> = [
    ['htp://example.com:8080', 'http://example.com:8080'],
    ['htps://example.com:443/feed', 'https://example.com:443/feed'],
    ['hhttps://example.com:3000', 'https://example.com:3000'],
  ]

  it.each(portCases)(
    'should preserve port numbers when fixing protocol typos (%s)',
    (value, expected) => {
      expect(fixMalformedProtocol(value)).toBe(expected)
    },
  )

  const queryStringCases: Array<[string, string]> = [
    ['htp://example.com?a=1', 'http://example.com?a=1'],
    ['htps://example.com/feed?format=rss&id=123', 'https://example.com/feed?format=rss&id=123'],
    ['hhttps://example.com?foo=bar#anchor', 'https://example.com?foo=bar#anchor'],
  ]

  it.each(queryStringCases)(
    'should preserve query strings when fixing protocol typos (%s)',
    (value, expected) => {
      expect(fixMalformedProtocol(value)).toBe(expected)
    },
  )

  const protocolInPathUrls: Array<string> = [
    'http://example.com/path/http://file',
    'https://example.com/redirect?url=http://other.com',
    'http://example.com/api/https://callback',
  ]

  it.each(protocolInPathUrls)('should not modify protocol-like strings in path (%s)', (value) => {
    expect(fixMalformedProtocol(value)).toBe(value)
  })

  const protocolLikeHostnameUrls: Array<string> = [
    'https://tp.srgssr.ch/p/srf/embed',
    'https://ps.w.org/plugin/icon.png',
    'http://tp.media/x',
    'https://tps.org/a',
    'https://https.example.com/feed',
    'tp.media/x',
    'https://ps.tp.example.com/a',
  ]

  it.each(protocolLikeHostnameUrls)(
    'should not mistake a leading hostname label for a protocol (%s)',
    (value) => {
      expect(fixMalformedProtocol(value)).toBe(value)
    },
  )

  const protocolLikePathUrls: Array<string> = [
    '/hp/support',
    '/tp/feed.xml',
    '/http/feed.xml',
    'tps/x.xml',
    'hh/x.xml',
    '/tps/tps/feed',
  ]

  it.each(protocolLikePathUrls)(
    'should not mistake a relative path segment for a protocol (%s)',
    (value) => {
      expect(fixMalformedProtocol(value)).toBe(value)
    },
  )

  const protocolLikePortHostUrls: Array<string> = [
    'http://tps:8080/feed',
    'http://php:8080/feed',
    'http://sh:8080/feed',
  ]

  it.each(protocolLikePortHostUrls)(
    'should not mistake a host with a port for a doubled protocol (%s)',
    (value) => {
      expect(fixMalformedProtocol(value)).toBe(value)
    },
  )

  const nonHttpUrls: Array<string> = [
    'ftp://example.com/file',
    'mailto:user@example.com',
    'file:///path/to/file',
    'data:text/plain;base64,SGVsbG8=',
    'tel:+1234567890',
  ]

  it.each(nonHttpUrls)('should preserve non-HTTP protocols unchanged (%s)', (value) => {
    expect(fixMalformedProtocol(value)).toBe(value)
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
    expect(fixMalformedProtocol(value)).toBe(value)
  })

  it('should return empty string unchanged', () => {
    expect(fixMalformedProtocol('')).toBe('')
  })
})

describe('addMissingProtocol', () => {
  it('should add protocol to a bare IPv6 host', () => {
    const value = '[::1]:8080/feed'
    const expected = 'https://[::1]:8080/feed'

    expect(addMissingProtocol(value)).toBe(expected)
  })

  it('should leave an invalid bracketed host unchanged', () => {
    const value = '[not-ipv6]/feed'

    expect(addMissingProtocol(value)).toBe(value)
  })

  describe('protocol-relative URLs', () => {
    const values = [
      { value: '//example.com/feed', expected: 'https://example.com/feed' },
      { value: '//cdn.example.com/style.css', expected: 'https://cdn.example.com/style.css' },
      { value: '//localhost/api', expected: 'https://localhost/api' },
      { value: '//192.168.1.1/api', expected: 'https://192.168.1.1/api' },
      { value: '//example.com:8080/feed', expected: 'https://example.com:8080/feed' },
      { value: '//[::1]/feed', expected: 'https://[::1]/feed' },
      { value: '//[2001:db8::1]/feed', expected: 'https://[2001:db8::1]/feed' },
    ]

    for (const { value, expected } of values) {
      it(`should convert ${value} to ${expected}`, () => {
        expect(addMissingProtocol(value)).toBe(expected)
      })
    }

    it('should use http when specified', () => {
      const value = '//example.com/feed'
      const expected = 'http://example.com/feed'

      expect(addMissingProtocol(value, 'http')).toBe(expected)
    })
  })

  describe('bare domains', () => {
    it('should add https:// to domain without protocol', () => {
      const value = 'example.com/feed'
      const expected = 'https://example.com/feed'

      expect(addMissingProtocol(value)).toBe(expected)
    })

    it('should add https:// to domain with subdomain', () => {
      const value = 'www.example.com/feed.xml'
      const expected = 'https://www.example.com/feed.xml'

      expect(addMissingProtocol(value)).toBe(expected)
    })

    it('should use http when specified', () => {
      const value = 'example.com/feed'
      const expected = 'http://example.com/feed'

      expect(addMissingProtocol(value, 'http')).toBe(expected)
    })

    it('should handle domain with query string', () => {
      const value = 'example.com/feed?format=rss'
      const expected = 'https://example.com/feed?format=rss'

      expect(addMissingProtocol(value)).toBe(expected)
    })

    it('should add https:// to bare IPv4 address', () => {
      const value = '192.168.1.1/feed'
      const expected = 'https://192.168.1.1/feed'

      expect(addMissingProtocol(value)).toBe(expected)
    })
  })

  describe('URLs that should not be modified', () => {
    it('should not modify http:// URLs', () => {
      const value = 'http://example.com/feed'

      expect(addMissingProtocol(value)).toBe(value)
    })

    it('should not modify https:// URLs', () => {
      const value = 'https://example.com/feed'

      expect(addMissingProtocol(value)).toBe(value)
    })

    it('should not modify absolute path URLs', () => {
      const value = '/path/to/feed'

      expect(addMissingProtocol(value)).toBe(value)
    })

    it('should not modify relative path URLs starting with dot', () => {
      const value = './feed.xml'

      expect(addMissingProtocol(value)).toBe(value)
    })

    it('should not modify relative path URLs starting with double dot', () => {
      const value = '../feed.xml'

      expect(addMissingProtocol(value)).toBe(value)
    })

    it('should handle localhost', () => {
      expect(addMissingProtocol('localhost')).toBe('https://localhost')
      expect(addMissingProtocol('localhost/')).toBe('https://localhost/')
      expect(addMissingProtocol('localhost:3000')).toBe('https://localhost:3000')
    })
  })

  describe('invalid protocol-relative URLs', () => {
    const values = ['//Users/file.xml', '//home/user/file.txt', '///triple-slash', '//singlelabel']

    for (const value of values) {
      it(`should return ${value} unchanged`, () => {
        expect(addMissingProtocol(value)).toBe(value)
      })
    }

    it('should handle malformed URLs gracefully', () => {
      const value = '//not valid url $#@'

      expect(addMissingProtocol(value)).toBe(value)
    })
  })

  describe('additional edge cases', () => {
    it('should handle bare domain with hash', () => {
      const value = 'example.com/feed#section'
      const expected = 'https://example.com/feed#section'

      expect(addMissingProtocol(value)).toBe(expected)
    })

    it('should not modify feed:// URLs', () => {
      expect(addMissingProtocol('feed://example.com/rss')).toBe('feed://example.com/rss')
      expect(addMissingProtocol('rss://example.com/feed')).toBe('rss://example.com/feed')
    })

    it('should handle domain with many subdomains', () => {
      const value = 'a.b.c.d.example.com/feed'
      const expected = 'https://a.b.c.d.example.com/feed'

      expect(addMissingProtocol(value)).toBe(expected)
    })

    it('should handle IDN bare domain', () => {
      const value = 'münchen.de/feed'
      const expected = 'https://münchen.de/feed'

      expect(addMissingProtocol(value)).toBe(expected)
    })

    it('should handle protocol-relative with query', () => {
      const value = '//example.com/feed?format=rss&page=1'
      const expected = 'https://example.com/feed?format=rss&page=1'

      expect(addMissingProtocol(value)).toBe(expected)
    })

    it('should handle bare domain without path', () => {
      const value = 'example.com'
      const expected = 'https://example.com'

      expect(addMissingProtocol(value)).toBe(expected)
    })

    it('should not modify mailto: URLs', () => {
      expect(addMissingProtocol('mailto:test@example.com')).toBe('mailto:test@example.com')
    })

    it('should not modify data: URLs', () => {
      expect(addMissingProtocol('data:text/html,<h1>Test</h1>')).toBe(
        'data:text/html,<h1>Test</h1>',
      )
    })

    it('should return URLs with leading whitespace unchanged', () => {
      expect(addMissingProtocol(' example.com')).toBe(' example.com')
      expect(addMissingProtocol('\texample.com')).toBe('\texample.com')
      expect(addMissingProtocol('\nexample.com')).toBe('\nexample.com')
    })
  })
})

describe('upgradeProtocol', () => {
  describe('default (upgrade to https)', () => {
    const values = [
      { value: 'http://example.com/feed', expected: 'https://example.com/feed' },
      {
        value: 'http://example.com:8080/path?a=1#frag',
        expected: 'https://example.com:8080/path?a=1#frag',
      },
      { value: 'http://user:pass@example.com/', expected: 'https://user:pass@example.com/' },
      { value: 'http://localhost/', expected: 'https://localhost/' },
      { value: 'http://192.168.1.1/api', expected: 'https://192.168.1.1/api' },
    ]

    for (const { value, expected } of values) {
      it(`should upgrade ${value} to ${expected}`, () => {
        expect(upgradeProtocol(value)).toBe(expected)
      })
    }

    it('should be case-insensitive on the protocol', () => {
      expect(upgradeProtocol('HTTP://example.com/feed')).toBe('https://example.com/feed')
      expect(upgradeProtocol('Http://example.com/feed')).toBe('https://example.com/feed')
    })

    it('should only touch the leading protocol, not occurrences inside the URL', () => {
      const value = 'http://proxy.example/?target=http://other.example/page'
      const expected = 'https://proxy.example/?target=http://other.example/page'

      expect(upgradeProtocol(value)).toBe(expected)
    })
  })

  describe('downgrade to http', () => {
    it('should rewrite https:// to http://', () => {
      expect(upgradeProtocol('https://example.com/feed', 'http')).toBe('http://example.com/feed')
    })

    it('should be case-insensitive on the protocol', () => {
      expect(upgradeProtocol('HTTPS://example.com/feed', 'http')).toBe('http://example.com/feed')
    })

    it('should leave http:// unchanged', () => {
      expect(upgradeProtocol('http://example.com/feed', 'http')).toBe('http://example.com/feed')
    })
  })

  describe('unchanged inputs', () => {
    it('should leave https:// unchanged when upgrading to https', () => {
      expect(upgradeProtocol('https://example.com/feed')).toBe('https://example.com/feed')
    })

    it('should leave protocol-relative URLs unchanged', () => {
      expect(upgradeProtocol('//example.com/feed')).toBe('//example.com/feed')
    })

    it('should leave non-http schemes unchanged', () => {
      expect(upgradeProtocol('mailto:user@example.com')).toBe('mailto:user@example.com')
      expect(upgradeProtocol('data:image/png;base64,iVBOR')).toBe('data:image/png;base64,iVBOR')
      expect(upgradeProtocol('ftp://example.com/file')).toBe('ftp://example.com/file')
      expect(upgradeProtocol('feed://example.com/rss.xml')).toBe('feed://example.com/rss.xml')
    })

    it('should leave bare domains and paths unchanged', () => {
      expect(upgradeProtocol('example.com/feed')).toBe('example.com/feed')
      expect(upgradeProtocol('/path/to/feed')).toBe('/path/to/feed')
    })

    it('should leave an empty string unchanged', () => {
      expect(upgradeProtocol('')).toBe('')
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

  it('should resolve a relative path whose first segment looks like a protocol', () => {
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

  describe('feed protocol resolution', () => {
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

  describe('hostname labels spelled like protocols', () => {
    it('should keep a label that is a suffix of https', () => {
      const value = 'https://tp.srgssr.ch/p/srf/embed'

      expect(resolveUrl(value)).toBe(value)
    })

    it('should keep an apex domain spelled like a protocol', () => {
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

  describe('protocol-relative URLs', () => {
    it('should convert // to https:// by default', () => {
      const value = '//example.com/feed.xml'
      const expected = 'https://example.com/feed.xml'

      expect(resolveUrl(value)).toBe(expected)
    })

    it('should inherit protocol from base URL', () => {
      const value = '//example.com/feed.xml'
      const base = 'http://other.com'
      const expected = 'http://example.com/feed.xml'

      expect(resolveUrl(value, base)).toBe(expected)
    })

    it('should return undefined for invalid protocol-relative URLs', () => {
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

    it('should return undefined for non-HTTP protocol when base is provided', () => {
      expect(resolveUrl('mailto:feed@example.com', base)).toBeUndefined()
      expect(resolveUrl('ftp://example.com/feed.xml', base)).toBeUndefined()
    })

    it('should add protocol to localhost with port when base is provided', () => {
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

    it('should apply entity decoding and protocol conversion together', () => {
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

    it('should return undefined for ftp:// protocol', () => {
      expect(resolveUrl('ftp://example.com/feed.xml')).toBeUndefined()
    })

    it('should return undefined for mailto: protocol', () => {
      expect(resolveUrl('mailto:feed@example.com')).toBeUndefined()
    })

    it('should return undefined for tel: protocol', () => {
      expect(resolveUrl('tel:+1234567890')).toBeUndefined()
    })

    it('should return undefined for javascript: protocol', () => {
      expect(resolveUrl('javascript:alert(1)')).toBeUndefined()
    })

    it('should return undefined for data: protocol', () => {
      expect(resolveUrl('data:text/xml,<feed/>')).toBeUndefined()
    })

    it('should return undefined for file:// protocol', () => {
      expect(resolveUrl('file:///etc/passwd')).toBeUndefined()
    })

    it('should return undefined for malformed URL', () => {
      expect(resolveUrl('not a valid url')).toBeUndefined()
    })

    it('should return undefined for protocol only', () => {
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
  describe('protocol stripping', () => {
    it('should strip https:// protocol by default', () => {
      const value = 'https://example.com/feed'
      const expected = 'example.com/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should strip http:// protocol by default', () => {
      const value = 'http://example.com/feed'
      const expected = 'example.com/feed'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
    })

    it('should preserve protocol when stripProtocol is false', () => {
      const value = 'https://example.com/feed'
      const options = { stripProtocol: false }

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
      const options = { stripAuthentication: true, stripProtocol: false }
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
      const options = { ...defaultOptions, stripWww: false }
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
      const options = { ...defaultOptions, stripRootSlash: false }
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
      const options = { ...defaultOptions, collapseSlashes: false }
      const expected = 'example.com/path//to///feed'

      expect(normalizeUrl(value, options)).toBe(expected)
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
      const options = { ...defaultOptions, stripHash: false }
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
      const options = { ...defaultOptions, sortQueryParams: false }
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
      const expected = 'example.com/feed?%61=2&b=1'

      expect(normalizeUrl(value, defaultOptions)).toBe(expected)
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
      const options = { ...defaultOptions, stripQueryParams: ['custom'] }
      const expected = 'example.com/feed?keep=2'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should accept a readonly array of stripped params', () => {
      const value = 'https://example.com/feed?custom=1&keep=2'
      const stripQueryParams = ['custom'] as const
      const options = { ...defaultOptions, stripQueryParams }
      const expected = 'example.com/feed?keep=2'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should strip uppercase tracking parameters', () => {
      const value = 'https://example.com/feed?UTM_SOURCE=twitter&FBCLID=abc&id=123'
      const options = { ...defaultOptions, stripQueryParams: ['utm_source', 'fbclid'] }
      const expected = 'example.com/feed?id=123'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should strip mixed case tracking parameters', () => {
      const value = 'https://example.com/feed?Utm_Source=twitter&FbClId=abc&id=123'
      const options = { ...defaultOptions, stripQueryParams: ['utm_source', 'fbclid'] }
      const expected = 'example.com/feed?id=123'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should strip params case-insensitively with multiple variants', () => {
      const value = 'https://example.com/feed?CUSTOM=1&Custom=2&custom=3&keep=4'
      const options = { ...defaultOptions, stripQueryParams: ['custom'] }
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
      const options = { ...defaultOptions, stripQueryParams: ['utm_source'] }
      const expected = 'example.com/feed'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should preserve raw encoding of the params it keeps', () => {
      const value = 'https://example.com/feed?utm_source=twitter&path=a/b&when=12:00'
      const options = { ...defaultOptions, stripQueryParams: ['utm_source'] }
      const expected = 'example.com/feed?path=a/b&when=12:00'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should keep a valueless param that is not stripped', () => {
      const value = 'https://example.com/feed?utm_source=twitter&atom'
      const options = { ...defaultOptions, stripQueryParams: ['utm_source'] }
      const expected = 'example.com/feed?atom'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should match a param for stripping by its decoded key', () => {
      const value = 'https://example.com/feed?utm%5Fsource=twitter&id=123'
      const options = { ...defaultOptions, stripQueryParams: ['utm_source'] }
      const expected = 'example.com/feed?id=123'

      expect(normalizeUrl(value, options)).toBe(expected)
    })
  })

  describe('query string stripping', () => {
    it('should strip entire query string when stripQuery is true', () => {
      const value = 'https://example.com/feed?a=1&b=2&c=3'
      const options = { ...defaultOptions, stripQuery: true }
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
      const options = { ...defaultOptions, sortQueryParams: false }
      const expected = 'example.com/feed'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should remove empty query string followed by a fragment', () => {
      const value = 'https://example.com/feed?#top'
      const options = { ...defaultOptions, stripHash: false }
      const expected = 'example.com/feed#top'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should preserve empty query string when stripEmptyQuery is false', () => {
      const value = 'https://example.com/feed?'
      const options = { ...defaultOptions, sortQueryParams: false, stripEmptyQuery: false }
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
      const options = { ...defaultOptions, lowercaseQuery: true }
      const expected = 'example.com/feed?format=rss'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should lowercase query param values when lowercaseQuery is true', () => {
      const value = 'https://example.com/feed?format=RSS'
      const options = { ...defaultOptions, lowercaseQuery: true }
      const expected = 'example.com/feed?format=rss'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should lowercase both names and values when lowercaseQuery is true', () => {
      const value = 'https://example.com/feed?Format=RSS'
      const options = { ...defaultOptions, lowercaseQuery: true }
      const expected = 'example.com/feed?format=rss'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should handle multiple query params', () => {
      const value = 'https://example.com/feed?A=X&B=Y'
      const options = { ...defaultOptions, lowercaseQuery: true }
      const expected = 'example.com/feed?a=x&b=y'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should handle empty query value', () => {
      const value = 'https://example.com/feed?Key='
      const options = { ...defaultOptions, lowercaseQuery: true }
      const expected = 'example.com/feed?key='

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should work with sortQueryParams', () => {
      const value = 'https://example.com/feed?Z=1&A=2'
      const options = { ...defaultOptions, lowercaseQuery: true, sortQueryParams: true }
      const expected = 'example.com/feed?a=2&z=1'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should preserve raw encoding while lowercasing', () => {
      const value = 'https://example.com/feed?Path=A/B&When=12:00'
      const options = { ...defaultOptions, lowercaseQuery: true }
      const expected = 'example.com/feed?path=a/b&when=12:00'

      expect(normalizeUrl(value, options)).toBe(expected)
    })

    it('should leave percent escapes alone when lowercasing', () => {
      const value = 'https://example.com/feed?Q=A%2FB'
      const options = { ...defaultOptions, lowercaseQuery: true }
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

    it('should preserve encoding when normalizeEncoding is false', () => {
      const value = 'https://example.com/path%2Dto%2Dfeed'
      const options = { ...defaultOptions, normalizeEncoding: false }
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
      const options = { ...defaultOptions, normalizeUnicode: false }
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
        stripProtocol: false,
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
      const options = { ...defaultOptions, stripHash: false }
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

  it('should strip only the first www label', () => {
    expect(stripWww('www.www.example.com')).toBe('www.example.com')
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
    expect(getRegistrableDomain('https://alice.wordpress.org/feed')).toBe('wordpress.org')
    expect(getRegistrableDomain('https://bob.wordpress.org/feed')).toBe('wordpress.org')
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
    expect(getRegistrableDomain('https://pages.github.io/feed')).toBe('github.io')
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
})
