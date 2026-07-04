import { describe, expect, it } from 'bun:test'
import {
  anyWordMatchesAnyOf,
  endsWithAnyOf,
  includesAnyOf,
  isAnyOf,
  startsWithAnyOf,
} from './matching.js'

const normalizeMimeType = (type: string): string => {
  return type.split(';')[0].trim().toLowerCase()
}

describe('isAnyOf', () => {
  it('should return true when value exactly matches one of the patterns', () => {
    const value = 'application/rss+xml'
    const patterns = ['application/rss+xml', 'application/atom+xml']

    expect(isAnyOf(value, patterns)).toBe(true)
  })

  it('should return true when value matches pattern with case-insensitive match', () => {
    const value = 'APPLICATION/RSS+XML'
    const patterns = ['application/rss+xml']

    expect(isAnyOf(value, patterns)).toBe(true)
  })

  it('should return true when value has whitespace and matches after trim', () => {
    const value = '  application/rss+xml  '
    const patterns = ['application/rss+xml']

    expect(isAnyOf(value, patterns)).toBe(true)
  })

  it('should return true when using custom parser', () => {
    const value = 'application/rss+xml; charset=utf-8'
    const patterns = ['application/rss+xml']

    expect(isAnyOf(value, patterns, normalizeMimeType)).toBe(true)
  })

  it('should return false when value only partially matches', () => {
    const value = 'application/rss+xml; charset=utf-8'
    const patterns = ['application/rss+xml']

    expect(isAnyOf(value, patterns)).toBe(false)
  })

  it('should return false when value does not match any pattern', () => {
    const value = 'text/html'
    const patterns = ['application/rss+xml', 'application/atom+xml']

    expect(isAnyOf(value, patterns)).toBe(false)
  })

  it('should return false when patterns array is empty', () => {
    const value = 'application/rss+xml'
    const patterns: Array<string> = []

    expect(isAnyOf(value, patterns)).toBe(false)
  })

  it('should handle empty string value', () => {
    const value = ''
    const patterns = ['application/rss+xml']

    expect(isAnyOf(value, patterns)).toBe(false)
  })

  it('should handle whitespace-only value', () => {
    const value = '   '
    const patterns = ['application/rss+xml']

    expect(isAnyOf(value, patterns)).toBe(false)
  })

  it('should handle undefined value', () => {
    const value = undefined
    const patterns = ['application/rss+xml']

    // @ts-expect-error: This is for testing purposes.
    expect(isAnyOf(value, patterns)).toBe(false)
  })

  it('should handle null value', () => {
    const value = null
    const patterns = ['application/rss+xml']

    // @ts-expect-error: This is for testing purposes.
    expect(isAnyOf(value, patterns)).toBe(false)
  })

  it('should handle value with tab characters', () => {
    const value = 'application/rss+xml\t'
    const patterns = ['application/rss+xml']

    expect(isAnyOf(value, patterns)).toBe(true)
  })

  it('should handle pattern with leading whitespace', () => {
    const value = 'application/rss+xml'
    const patterns = ['  application/rss+xml']

    expect(isAnyOf(value, patterns)).toBe(true)
  })

  it('should handle pattern with trailing whitespace', () => {
    const value = 'application/rss+xml'
    const patterns = ['application/rss+xml  ']

    expect(isAnyOf(value, patterns)).toBe(true)
  })

  it('should return true when last pattern matches', () => {
    const value = 'application/json'
    const patterns = ['application/rss+xml', 'application/atom+xml', 'application/json']

    expect(isAnyOf(value, patterns)).toBe(true)
  })

  it('should handle empty pattern in array', () => {
    const value = ''
    const patterns = ['', 'application/rss+xml']

    expect(isAnyOf(value, patterns)).toBe(true)
  })

  it('should return true when value matches a RegExp pattern', () => {
    const value = 'application/rss+xml'
    // biome-ignore lint/performance/useTopLevelRegex: Test-specific pattern.
    const patterns = [/^application\/rss/]

    expect(isAnyOf(value, patterns)).toBe(true)
  })

  it('should return false when value does not match a RegExp pattern', () => {
    const value = 'text/html'
    // biome-ignore lint/performance/useTopLevelRegex: Test-specific pattern.
    const patterns = [/^application\/rss/]

    expect(isAnyOf(value, patterns)).toBe(false)
  })
})

describe('includesAnyOf', () => {
  it('should return true when value includes one of the patterns', () => {
    const value = 'application/rss+xml'
    const patterns = ['application/rss+xml', 'application/atom+xml']

    expect(includesAnyOf(value, patterns)).toBe(true)
  })

  it('should return true when value includes pattern with case-insensitive match', () => {
    const value = 'APPLICATION/RSS+XML'
    const patterns = ['application/rss+xml']

    expect(includesAnyOf(value, patterns)).toBe(true)
  })

  it('should return true when patterns have mixed case', () => {
    const value = 'subscribe to our feed'
    const patterns = ['RSS', 'Feed']

    expect(includesAnyOf(value, patterns)).toBe(true)
  })

  it('should return true when value partially includes pattern', () => {
    const value = 'application/rss+xml; charset=utf-8'
    const patterns = ['rss+xml']

    expect(includesAnyOf(value, patterns)).toBe(true)
  })

  it('should return true when using custom parser', () => {
    const value = 'application/rss+xml; charset=utf-8'
    const patterns = ['application/rss+xml']

    expect(includesAnyOf(value, patterns, normalizeMimeType)).toBe(true)
  })

  it('should return false when value does not include any pattern', () => {
    const value = 'text/html'
    const patterns = ['application/rss+xml', 'application/atom+xml']

    expect(includesAnyOf(value, patterns)).toBe(false)
  })

  it('should return false when patterns array is empty', () => {
    const value = 'application/rss+xml'
    const patterns: Array<string> = []

    expect(includesAnyOf(value, patterns)).toBe(false)
  })

  it('should handle empty string value', () => {
    const value = ''
    const patterns = ['application/rss+xml']

    expect(includesAnyOf(value, patterns)).toBe(false)
  })

  it('should handle undefined value', () => {
    const value = undefined
    const patterns = ['application/rss+xml']

    // @ts-expect-error: This is for testing purposes.
    expect(includesAnyOf(value, patterns)).toBe(false)
  })

  it('should handle null value', () => {
    const value = null
    const patterns = ['application/rss+xml']

    // @ts-expect-error: This is for testing purposes.
    expect(includesAnyOf(value, patterns)).toBe(false)
  })

  it('should return true when multiple patterns match', () => {
    const value = 'application/rss+xml feed'
    const patterns = ['rss', 'feed', 'atom']

    expect(includesAnyOf(value, patterns)).toBe(true)
  })

  it('should handle special characters in patterns', () => {
    const value = 'Subscribe via RSS/Atom'
    const patterns = ['RSS/Atom']

    expect(includesAnyOf(value, patterns)).toBe(true)
  })

  it('should handle whitespace-only value', () => {
    const value = '   '
    const patterns = ['rss']

    expect(includesAnyOf(value, patterns)).toBe(false)
  })

  it('should handle pattern with numbers', () => {
    const value = 'RSS 2.0 feed'
    const patterns = ['2.0']

    expect(includesAnyOf(value, patterns)).toBe(true)
  })

  it('should return false when pattern is empty string', () => {
    expect(includesAnyOf('anything', [''])).toBe(false)
  })

  it('should return true when value matches a RegExp pattern', () => {
    const value = '/rss/now.xml'
    // biome-ignore lint/performance/useTopLevelRegex: Test-specific pattern.
    const patterns = [/\/rss\//]

    expect(includesAnyOf(value, patterns)).toBe(true)
  })

  it('should return false when value does not match a RegExp pattern', () => {
    const value = '/blog/post.html'
    // biome-ignore lint/performance/useTopLevelRegex: Test-specific pattern.
    const patterns = [/\/rss\//]

    expect(includesAnyOf(value, patterns)).toBe(false)
  })

  it('should handle mixed string and RegExp patterns', () => {
    const value = '/rss/now.xml'
    // biome-ignore lint/performance/useTopLevelRegex: Test-specific pattern.
    const patterns = ['atom', /\/rss\//]

    expect(includesAnyOf(value, patterns)).toBe(true)
  })
})

describe('startsWithAnyOf', () => {
  it('should return true when value starts with a pattern', () => {
    const value = 'feed.xml'
    const patterns = ['feed', 'rss']

    expect(startsWithAnyOf(value, patterns)).toBe(true)
  })

  it('should return false when value does not start with any pattern', () => {
    const value = 'index.html'
    const patterns = ['feed', 'rss']

    expect(startsWithAnyOf(value, patterns)).toBe(false)
  })

  it('should return false when pattern appears later in the value', () => {
    const value = 'my-feed.xml'
    const patterns = ['feed']

    expect(startsWithAnyOf(value, patterns)).toBe(false)
  })

  it('should match case-insensitively', () => {
    const value = 'FEED.XML'
    const patterns = ['feed']

    expect(startsWithAnyOf(value, patterns)).toBe(true)
  })

  it('should match patterns case-insensitively', () => {
    const value = 'feed.xml'
    const patterns = ['FEED']

    expect(startsWithAnyOf(value, patterns)).toBe(true)
  })

  it('should return false for empty patterns array', () => {
    const value = 'feed.xml'
    const patterns: Array<string> = []

    expect(startsWithAnyOf(value, patterns)).toBe(false)
  })

  it('should return false for empty value', () => {
    const value = ''
    const patterns = ['feed', 'rss']

    expect(startsWithAnyOf(value, patterns)).toBe(false)
  })

  it('should return false when pattern is empty string', () => {
    expect(startsWithAnyOf('anything', [''])).toBe(false)
  })

  it('should return true when value matches a RegExp pattern', () => {
    const value = '/rss/now.xml'
    // biome-ignore lint/performance/useTopLevelRegex: Test-specific pattern.
    const patterns = [/\/rss\//]

    expect(startsWithAnyOf(value, patterns)).toBe(true)
  })

  it('should return false when value does not match a RegExp pattern', () => {
    const value = '/blog/post.html'
    // biome-ignore lint/performance/useTopLevelRegex: Test-specific pattern.
    const patterns = [/\/rss\//]

    expect(startsWithAnyOf(value, patterns)).toBe(false)
  })

  it('should handle mixed string and RegExp patterns', () => {
    const value = '/rss/now.xml'
    // biome-ignore lint/performance/useTopLevelRegex: Test-specific pattern.
    const patterns = ['.html', /\/rss\//]

    expect(startsWithAnyOf(value, patterns)).toBe(true)
  })
})

describe('endsWithAnyOf', () => {
  it('should return true when value ends with a pattern', () => {
    const value = '/blog/feed.xml'
    const patterns = ['.xml', '.rss']

    expect(endsWithAnyOf(value, patterns)).toBe(true)
  })

  it('should return false when value does not end with any pattern', () => {
    const value = '/blog/index.html'
    const patterns = ['.xml', '.rss']

    expect(endsWithAnyOf(value, patterns)).toBe(false)
  })

  it('should match case-insensitively', () => {
    const value = '/blog/FEED.XML'
    const patterns = ['.xml', '.rss']

    expect(endsWithAnyOf(value, patterns)).toBe(true)
  })

  it('should match patterns case-insensitively', () => {
    const value = '/blog/feed.xml'
    const patterns = ['.XML', '.RSS']

    expect(endsWithAnyOf(value, patterns)).toBe(true)
  })

  it('should return false for empty patterns array', () => {
    const value = '/blog/feed.xml'
    const patterns: Array<string> = []

    expect(endsWithAnyOf(value, patterns)).toBe(false)
  })

  it('should return false for empty value', () => {
    const value = ''
    const patterns = ['.xml', '.rss']

    expect(endsWithAnyOf(value, patterns)).toBe(false)
  })

  it('should match full pattern at end', () => {
    const value = '/feed'
    const patterns = ['/feed', '/rss']

    expect(endsWithAnyOf(value, patterns)).toBe(true)
  })

  it('should return false when pattern is empty string', () => {
    expect(endsWithAnyOf('anything', [''])).toBe(false)
  })

  it('should return true when value matches a RegExp pattern', () => {
    const value = '/rss/now.xml'
    // biome-ignore lint/performance/useTopLevelRegex: Test-specific pattern.
    const patterns = [/\/rss\//]

    expect(endsWithAnyOf(value, patterns)).toBe(true)
  })

  it('should return false when value does not match a RegExp pattern', () => {
    const value = '/blog/post.html'
    // biome-ignore lint/performance/useTopLevelRegex: Test-specific pattern.
    const patterns = [/\/rss\//]

    expect(endsWithAnyOf(value, patterns)).toBe(false)
  })

  it('should handle mixed string and RegExp patterns', () => {
    const value = '/rss/now.xml'
    // biome-ignore lint/performance/useTopLevelRegex: Test-specific pattern.
    const patterns = ['.html', /\/rss\//]

    expect(endsWithAnyOf(value, patterns)).toBe(true)
  })
})

describe('anyWordMatchesAnyOf', () => {
  it('should return true when a word matches a pattern', () => {
    const value = 'alternate feed'
    const patterns = ['feed', 'rss']

    expect(anyWordMatchesAnyOf(value, patterns)).toBe(true)
  })

  it('should return true when multiple words match patterns', () => {
    const value = 'alternate rss feed'
    const patterns = ['feed', 'rss']

    expect(anyWordMatchesAnyOf(value, patterns)).toBe(true)
  })

  it('should return false when no words match patterns', () => {
    const value = 'alternate stylesheet'
    const patterns = ['feed', 'rss']

    expect(anyWordMatchesAnyOf(value, patterns)).toBe(false)
  })

  it('should match case-insensitively', () => {
    const value = 'ALTERNATE FEED'
    const patterns = ['feed', 'rss']

    expect(anyWordMatchesAnyOf(value, patterns)).toBe(true)
  })

  it('should match patterns case-insensitively', () => {
    const value = 'alternate feed'
    const patterns = ['FEED', 'RSS']

    expect(anyWordMatchesAnyOf(value, patterns)).toBe(true)
  })

  it('should not match partial words', () => {
    const value = 'feedburner'
    const patterns = ['feed']

    expect(anyWordMatchesAnyOf(value, patterns)).toBe(false)
  })

  it('should handle multiple whitespace characters', () => {
    const value = 'alternate   feed\trss'
    const patterns = ['rss']

    expect(anyWordMatchesAnyOf(value, patterns)).toBe(true)
  })

  it('should return false for empty patterns array', () => {
    const value = 'alternate feed'
    const patterns: Array<string> = []

    expect(anyWordMatchesAnyOf(value, patterns)).toBe(false)
  })

  it('should return false for empty value', () => {
    const value = ''
    const patterns = ['feed', 'rss']

    expect(anyWordMatchesAnyOf(value, patterns)).toBe(false)
  })

  it('should return true when a word matches a RegExp pattern', () => {
    const value = 'alternate feed'
    // biome-ignore lint/performance/useTopLevelRegex: Test-specific pattern.
    const patterns = [/^feed$/]

    expect(anyWordMatchesAnyOf(value, patterns)).toBe(true)
  })

  it('should return false when no word matches a RegExp pattern', () => {
    const value = 'alternate stylesheet'
    // biome-ignore lint/performance/useTopLevelRegex: Test-specific pattern.
    const patterns = [/^feed$/]

    expect(anyWordMatchesAnyOf(value, patterns)).toBe(false)
  })

  it('should handle mixed string and RegExp patterns', () => {
    const value = 'sponsored episode notes'
    // biome-ignore lint/performance/useTopLevelRegex: Test-specific pattern.
    const patterns = [/^ad(vert)?s?$/, 'sponsored']

    expect(anyWordMatchesAnyOf(value, patterns)).toBe(true)
  })

  it('should trim patterns before comparing', () => {
    const value = 'alternate feed'
    const patterns = ['  FEED  ']

    expect(anyWordMatchesAnyOf(value, patterns)).toBe(true)
  })

  it('should handle leading and trailing whitespace in value', () => {
    const value = '  alternate feed  '
    const patterns = ['feed']

    expect(anyWordMatchesAnyOf(value, patterns)).toBe(true)
  })
})
