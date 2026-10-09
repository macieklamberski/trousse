export const feedMimeTypes = [
  // RSS, never registered with IANA.
  'application/rss+xml',
  'application/rss',
  'text/rss',
  'text/rss+xml',
  'application/x-rss+xml',
  // Atom, registered by RFC 4287.
  'application/atom+xml',
  'application/atom',
  'application/x.atom+xml',
  'application/x-atom+xml',
  'text/atom+xml',
  'text/atom',
  // JSON Feed, the type its 1.1 spec recommends.
  'application/feed+json',
  // RDF, RSS 1.0, registered by RFC 3870.
  'application/rdf+xml',
  'text/rdf',
  'text/rdf+xml',
]

// Containers a feed can be served as, which do not identify a feed alone.
export const genericFeedMimeTypes = [
  'application/xml',
  'text/xml',
  'application/json',
  'text/plain',
]

export const htmlMimeTypes = ['text/html', 'application/xhtml+xml']

const primaryFeedMimeTypes = [
  'application/atom+xml',
  'application/rss+xml',
  'application/feed+json',
  'application/rdf+xml',
]

const getFeedMimeTypeQuality = (type: string): number => {
  if (primaryFeedMimeTypes.includes(type)) {
    return 1
  }

  if (feedMimeTypes.includes(type)) {
    return 0.9
  }

  // Any text is text/plain, so it ranks below every type that can carry a feed structure.
  if (type === 'text/plain') {
    return 0.1
  }

  return 0.8
}

const formatMediaRange = (type: string, quality: number): string => {
  if (quality === 1) {
    return type
  }

  return `${type};q=${quality}`
}

const feedAcceptTypes = new Set([
  ...primaryFeedMimeTypes,
  ...feedMimeTypes,
  ...genericFeedMimeTypes,
])

// Never add */*: Rails reads any Accept with */* as a browser and answers an extensionless
// feed URL with HTML.
export const feedAcceptHeader = [...feedAcceptTypes]
  .map((type) => {
    return formatMediaRange(type, getFeedMimeTypeQuality(type))
  })
  .join(', ')

export const htmlAcceptHeader = `${htmlMimeTypes.join(', ')}, application/xml;q=0.9, */*;q=0.8`
