import type { WeightedMimeType } from './types.js'

export const feedMimeTypes: Array<WeightedMimeType> = [
  // The type each format's spec names: Atom (RFC 4287), RSS, JSON Feed 1.1, RDF (RFC 3870).
  { mime: 'application/atom+xml', quality: 1 },
  { mime: 'application/rss+xml', quality: 1 },
  { mime: 'application/feed+json', quality: 1 },
  { mime: 'application/rdf+xml', quality: 1 },
  // RSS variants, none registered with IANA.
  { mime: 'application/rss', quality: 0.9 },
  { mime: 'text/rss', quality: 0.9 },
  { mime: 'text/rss+xml', quality: 0.9 },
  { mime: 'application/x-rss+xml', quality: 0.9 },
  // Atom variants.
  { mime: 'application/atom', quality: 0.9 },
  { mime: 'application/x.atom+xml', quality: 0.9 },
  { mime: 'application/x-atom+xml', quality: 0.9 },
  { mime: 'text/atom+xml', quality: 0.9 },
  { mime: 'text/atom', quality: 0.9 },
  // RDF variants.
  { mime: 'text/rdf', quality: 0.9 },
  { mime: 'text/rdf+xml', quality: 0.9 },
]

// Containers a feed can be served as, which do not identify a feed alone. No */* here: Rails
// reads any Accept with */* as a browser and answers an extensionless feed URL with HTML.
export const genericFeedMimeTypes: Array<WeightedMimeType> = [
  { mime: 'application/xml', quality: 0.8 },
  { mime: 'text/xml', quality: 0.8 },
  { mime: 'application/json', quality: 0.8 },
  { mime: 'text/plain', quality: 0.1 }, // Any text is text/plain
]

export const htmlMimeTypes: Array<WeightedMimeType> = [
  { mime: 'text/html', quality: 1 },
  { mime: 'application/xhtml+xml', quality: 1 },
]

export const genericHtmlMimeTypes: Array<WeightedMimeType> = [
  { mime: 'application/xml', quality: 0.9 },
  { mime: '*/*', quality: 0.8 },
]

export const createAcceptHeader = (types: ReadonlyArray<WeightedMimeType>): string => {
  const ranges = types.map((type) => {
    if (type.quality === 1) {
      return type.mime
    }

    return `${type.mime};q=${type.quality}`
  })

  return ranges.join(', ')
}
