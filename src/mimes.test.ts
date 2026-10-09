import { describe, expect, it } from 'bun:test'
import {
  createAcceptHeader,
  feedMimeTypes,
  genericFeedMimeTypes,
  genericHtmlMimeTypes,
  htmlMimeTypes,
} from './mimes.js'

describe('createAcceptHeader', () => {
  it('should write a quality of 1 without a q parameter', () => {
    const value = [{ mime: 'application/atom+xml', quality: 1 }]
    const expected = 'application/atom+xml'

    expect(createAcceptHeader(value)).toBe(expected)
  })

  it('should write a quality below 1 as a q parameter', () => {
    const value = [{ mime: 'application/xml', quality: 0.8 }]
    const expected = 'application/xml;q=0.8'

    expect(createAcceptHeader(value)).toBe(expected)
  })

  it('should keep the given order', () => {
    const value = [
      { mime: 'text/plain', quality: 0.1 },
      { mime: 'application/rss+xml', quality: 1 },
    ]
    const expected = 'text/plain;q=0.1, application/rss+xml'

    expect(createAcceptHeader(value)).toBe(expected)
  })

  it('should return an empty string for an empty list', () => {
    expect(createAcceptHeader([])).toBe('')
  })
})

describe('feedMimeTypes and genericFeedMimeTypes', () => {
  it('should list each type once across both lists', () => {
    const mimes = [...feedMimeTypes, ...genericFeedMimeTypes].map((type) => {
      return type.mime
    })

    expect(new Set(mimes).size).toBe(mimes.length)
  })

  it('should not accept any type through a wildcard', () => {
    const mimes = [...feedMimeTypes, ...genericFeedMimeTypes].map((type) => {
      return type.mime
    })

    expect(mimes).not.toContain('*/*')
  })

  it('should build the feed Accept header', () => {
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

    expect(createAcceptHeader([...feedMimeTypes, ...genericFeedMimeTypes])).toBe(expected)
  })
})

describe('htmlMimeTypes and genericHtmlMimeTypes', () => {
  it('should build the HTML Accept header', () => {
    const expected = 'text/html, application/xhtml+xml, application/xml;q=0.9, */*;q=0.8'

    expect(createAcceptHeader([...htmlMimeTypes, ...genericHtmlMimeTypes])).toBe(expected)
  })
})
