import { describe, expect, it } from 'bun:test'
import { feedAcceptHeader, feedMimeTypes, genericFeedMimeTypes, htmlAcceptHeader } from './mimes.js'

describe('feedMimeTypes and genericFeedMimeTypes', () => {
  it('should list each type once across both lists', () => {
    const types = [...feedMimeTypes, ...genericFeedMimeTypes]

    expect(new Set(types).size).toBe(types.length)
  })
})

describe('feedAcceptHeader', () => {
  it('should list each feed and generic type exactly once', () => {
    const types = feedAcceptHeader.split(', ').map((range) => range.split(';')[0])
    const expected = [...feedMimeTypes, ...genericFeedMimeTypes]

    expect(types.sort()).toEqual(expected.sort())
  })

  it('should rank the main feed types first, then variants, then generic types', () => {
    const expected = [
      'application/atom+xml',
      'application/rss+xml',
      'application/feed+json',
      'application/rdf+xml',
      'application/rss;q=0.9',
      'text/rss;q=0.9',
      'text/rss+xml;q=0.9',
      'application/x-rss+xml;q=0.9',
      'application/atom;q=0.9',
      'application/x.atom+xml;q=0.9',
      'application/x-atom+xml;q=0.9',
      'text/atom+xml;q=0.9',
      'text/atom;q=0.9',
      'text/rdf;q=0.9',
      'text/rdf+xml;q=0.9',
      'application/xml;q=0.8',
      'text/xml;q=0.8',
      'application/json;q=0.8',
      'text/plain;q=0.1',
    ].join(', ')

    expect(feedAcceptHeader).toBe(expected)
  })

  it('should not accept any type through a wildcard', () => {
    expect(feedAcceptHeader).not.toContain('*/*')
  })
})

describe('htmlAcceptHeader', () => {
  it('should prefer HTML and fall back to any type like a browser', () => {
    const expected = 'text/html, application/xhtml+xml, application/xml;q=0.9, */*;q=0.8'

    expect(htmlAcceptHeader).toBe(expected)
  })
})
