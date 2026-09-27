import { decodeHTMLStrict } from 'entities'
import { endsWithAnyOf, isAnyOf } from './matching.js'
import type { NormalizeOptions } from './types.js'

const httpProtocols = ['http:', 'https:']

export const parseUrl = (value: string | URL, base?: string | URL): URL | undefined => {
  if (value instanceof URL && base === undefined) {
    return value
  }

  try {
    return new URL(value, base)
  } catch {}
}

export const getPathSegments = (value: string | URL): Array<string> => {
  return parseUrl(value)?.pathname.split('/').filter(Boolean) ?? []
}

export const isHostOf = (url: string | URL, hosts: string | ReadonlyArray<string>): boolean => {
  const hostname = parseUrl(url)?.hostname

  if (!hostname) {
    return false
  }

  return isAnyOf(hostname, hosts)
}

export const isSubdomainOf = (
  url: string | URL,
  domains: string | ReadonlyArray<string>,
): boolean => {
  const hostname = parseUrl(url)?.hostname

  if (!hostname) {
    return false
  }

  const list = typeof domains === 'string' ? [domains] : domains

  return endsWithAnyOf(
    hostname,
    list.map((domain) => `.${domain}`),
  )
}

export const isHttpUrl = (url: string | URL): boolean => {
  const protocol = parseUrl(url)?.protocol

  if (!protocol) {
    return false
  }

  return httpProtocols.includes(protocol)
}

export const isHostOrSubdomainOf = (
  url: string | URL,
  domains: string | ReadonlyArray<string>,
): boolean => {
  return isHostOf(url, domains) || isSubdomainOf(url, domains)
}

// The labels in front of the first domain the hostname is a subdomain of, lowercased: `alice` for
// `alice.podbean.com`, `a.b` for `a.b.example.com`. A URL of another scheme keeps the case of its
// hostname, so it is lowercased here, as `isSubdomainOf` compares.
export const getSubdomain = (
  url: string | URL,
  domains: string | ReadonlyArray<string>,
): string | undefined => {
  const hostname = parseUrl(url)?.hostname.toLowerCase()

  if (!hostname) {
    return
  }

  const list = typeof domains === 'string' ? [domains] : domains

  for (const domain of list) {
    const suffix = `.${domain.toLowerCase()}`

    if (hostname.endsWith(suffix) && hostname.length > suffix.length) {
      return hostname.slice(0, -suffix.length)
    }
  }
}

// A path segment arrives percent-encoded, unlike a query value, which `searchParams` decodes. A
// malformed escape such as `%E0` returns undefined, so `decodeSegment(value) ?? value` keeps it.
export const decodeSegment = (segment: string | undefined): string | undefined => {
  if (segment === undefined) {
    return
  }

  try {
    return decodeURIComponent(segment)
  } catch {}
}

const strippedParamsCache = new WeakMap<Array<string>, Set<string>>()

const getStrippedParamsSet = (params: Array<string>): Set<string> => {
  let cached = strippedParamsCache.get(params)

  if (!cached) {
    cached = new Set(params.map((param) => param.toLowerCase()))
    strippedParamsCache.set(params, cached)
  }

  return cached
}

const ipv4Regex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/

// IPv6 addresses have 2-7 colons with hex segments. This is intentionally loose - URL constructor
// validates the actual format, this just filters obvious non-IPv6 strings like single-label
// hostnames.
const ipv6Regex = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i

const wwwPrefixRegex = /^www\./
const ipv6BracketsRegex = /^\[|\]$/g

// Characters that are safe in URL path segments and don't need percent encoding.
const safePathCharsRegex = /[a-zA-Z0-9._~!$&'()*+,;=:@-]/
const httpsLetterRegex = /s/i
const protocolPrefixRegex = /^https?:\/\//
const percentEscapeOrLettersRegex = /%[0-9A-Fa-f]{2}|[A-Z]+/g
const plusRegex = /\+/g
const httpProtocolRegex = /^http:\/\//i
const httpsProtocolRegex = /^https:\/\//i

const leadingWhitespaceChars = [' ', '\t', '\n']

// Pre-compiled patterns for fixMalformedProtocol.
// Fast path: valid http(s):// followed by hostname char (excludes lone 'w' to avoid partial 'www').
const validUrlRegex = /^https?:\/\/(?:www\.|[a-vx-z0-9])/i

// A separator between a scheme and the rest carries at least one character that cannot appear in a
// hostname. A run of dots alone is a label boundary, so the host `tp.media` is not `tp://media`.
const schemeSeparator = String.raw`\.*[:\s=\\/][:\s=.\\/]*`

// Doubled/nested protocol pattern - captures the INNER protocol which takes precedence.
// Matches: http:http://, https:https://, http://https//, htp://ttps://, etc.
const doubledProtocolRegex = new RegExp(
  String.raw`^\/?[htps]{2,7}${schemeSeparator}([htps]{2,7})${schemeSeparator}[.,:/]*(www[./]+)?`,
  'i',
)

// Single malformed protocol pattern - for typos, wrong separators, etc. Must start with h (or /h)
// to be HTTP-like. Allows colons within letters (http:s//).
const singleMalformedRegex = new RegExp(
  String.raw`^\/?(?:h[htps():]{1,10}|t{1,2}ps?)${schemeSeparator}[.,:/]*(www[./]+)?`,
  'i',
)

// Fix common malformations in HTTP/HTTPS protocols. Handles:
// - Excess slashes: http:////example.com → http://example.com
// - Leading slash: /http://example.com → http://example.com
// - Typos in protocol: htp://, htps://, hhttps:// → http:// or https://
// - Missing colon: http//example.com → http://example.com
// - Multiple colons: http:::// → http://
// - Wrong separators: http=//, http.\\ → http://
// - Leading junk after protocol: http://./example.com → http://example.com
// - Placeholder syntax: http(s):// → https://
// - Double protocol: http:http://, https:https:// → dedupe
// - Misplaced www: https:www.// → https://www
// - Missing www dot: https://www/ → https://www
export const fixMalformedProtocol = (url: string): string => {
  // Fast path: valid URL without doubled protocol.
  if (validUrlRegex.test(url) && !doubledProtocolRegex.test(url)) {
    return url
  }

  const doubledMatch = doubledProtocolRegex.exec(url)
  if (doubledMatch) {
    const inner = doubledMatch[1]
    const www = doubledMatch[2]
    const rest = url.slice(doubledMatch[0].length)
    const protocol = httpsLetterRegex.test(inner) ? 'https://' : 'http://'
    return protocol + (www ? 'www.' : '') + rest
  }

  const singleMatch = singleMalformedRegex.exec(url)
  if (singleMatch) {
    const fullMatch = singleMatch[0]
    const www = singleMatch[1]
    const rest = url.slice(fullMatch.length)
    const protocol = httpsLetterRegex.test(fullMatch) ? 'https://' : 'http://'
    return protocol + (www ? 'www.' : '') + rest
  }

  return url
}

// Convert known feed-related protocols to HTTPS. Examples:
// - feed://example.com/rss.xml → https://example.com/rss.xml
// - feed:https://example.com/rss.xml → https://example.com/rss.xml
// - rss://example.com/feed.xml → https://example.com/feed.xml
// - pcast://example.com/podcast.xml → https://example.com/podcast.xml
// - itpc://example.com/podcast.xml → https://example.com/podcast.xml
// - itms-podcast://example.com/podcast.xml → https://example.com/podcast.xml
const feedProtocols = [
  'feed:',
  'rss:',
  'podcast:',
  'podcasts:',
  'pcast:',
  'itpc:',
  'itms:',
  'itms-pcast:',
  'itms-pcasts:',
  'itms-podcast:',
  'itms-podcasts:',
]

export const resolveFeedProtocol = (url: string, protocol: 'http' | 'https' = 'https'): string => {
  // Feed schemes start with f, r, p, or i, so anything else returns before lowercasing the whole
  // URL. `| 32` lowercases an ASCII letter.
  const firstCharCode = url.charCodeAt(0) | 32

  if (
    firstCharCode !== 102 && // f
    firstCharCode !== 114 && // r
    firstCharCode !== 112 && // p
    firstCharCode !== 105 // i
  ) {
    return url
  }

  const urlLower = url.toLowerCase()

  for (const scheme of feedProtocols) {
    if (!urlLower.startsWith(scheme)) {
      continue
    }

    // Case 1: Wrapping protocol (e.g., feed:https://example.com).
    if (urlLower.startsWith(`${scheme}http://`) || urlLower.startsWith(`${scheme}https://`)) {
      return url.slice(scheme.length)
    }

    // Case 2: Replacing protocol (e.g., feed://example.com).
    if (urlLower.startsWith(`${scheme}//`)) {
      return `${protocol}:${url.slice(scheme.length)}`
    }
  }

  return url
}

// Adds protocol to URLs missing a scheme. Handles both protocol-relative URLs (//example.com) and
// bare domains (example.com). Examples:
// - //example.com/feed → https://example.com/feed
// - //localhost/api → https://localhost/api
// - //Users/file.xml → //Users/file.xml (unchanged, not a valid URL)
// - example.com/feed → https://example.com/feed
// - /path/to/feed → /path/to/feed (unchanged, relative path)
export const addMissingProtocol = (url: string, protocol: 'http' | 'https' = 'https'): string => {
  // Skip if URL already has a real protocol. No registered IANA scheme contains a dot or slash, so
  // "example.com:8080" won't false-positive as a scheme.
  const colonIndex = url.indexOf(':')

  if (colonIndex > 0) {
    const beforeColon = url.slice(0, colonIndex)
    const hasScheme =
      !beforeColon.includes('.') && !beforeColon.includes('/') && beforeColon !== 'localhost'

    if (hasScheme) {
      return url
    }
  }

  // Case 1: Protocol-relative URL (//example.com).
  if (url.startsWith('//') && !url.startsWith('///')) {
    const parsed = parseUrl(`${protocol}:${url}`)

    if (!parsed) {
      return url
    }

    const hostname = parsed.hostname

    // Valid web hostnames must have at least one of:
    if (hostname.includes('.') || hostname === 'localhost' || isIpAddress(hostname)) {
      return parsed.href
    }

    return url
  }

  // Case 2: Bare domain (example.com/feed).
  // Skip if is a path.
  if (url.startsWith('/') || url.startsWith('.')) {
    return url
  }

  // Dot must be in the hostname (before first slash), not in the path.
  const slashIndex = url.indexOf('/')
  const dotIndex = url.indexOf('.')
  if (dotIndex === -1 || (slashIndex !== -1 && dotIndex > slashIndex)) {
    // Exception: localhost is valid without a dot.
    if (!url.startsWith('localhost')) {
      return url
    }
  }

  // Check if it looks like a domain (no spaces or special chars at start).
  const firstChar = url.charAt(0)
  if (leadingWhitespaceChars.includes(firstChar)) {
    return url
  }

  return `${protocol}://${url}`
}

// Swaps an existing HTTP(S) protocol on a URL. Unlike `addMissingProtocol`, which only acts when
// the protocol is absent, this rewrites the scheme when one is already present. Protocol-relative
// URLs (`//host`) and non-HTTP schemes (`mailto:`, `data:`, `ftp://`) are left unchanged.
// Case-insensitive on the matched protocol; only the leading scheme is touched, not any later
// `http://` substring inside the path or query.
export const upgradeProtocol = (url: string, protocol: 'http' | 'https' = 'https'): string => {
  if (protocol === 'https') {
    return url.replace(httpProtocolRegex, 'https://')
  }

  return url.replace(httpsProtocolRegex, 'http://')
}

// Resolves a URL by converting feed protocols, resolving relative URLs, and ensuring it's a valid
// HTTP(S) URL.
export const resolveUrl = (url: string, base?: string): string | undefined => {
  // Fragment-only URLs can only be resolved against a base URL.
  if (url.startsWith('#') && !base) {
    return
  }

  let resolvedUrl: string | undefined

  // Step 1: Decode HTML entities to recover the intended URL.
  // URLs in XML/HTML are often entity-encoded (e.g., &amp; for &). Strict decoding only expands
  // entities with a trailing semicolon, so a query parameter whose name matches an entity (e.g.
  // `?id=1&copy=2`) is left intact instead of being mangled into `?id=1©=2`.
  resolvedUrl = url.includes('&') ? decodeHTMLStrict(url) : url

  // Step 2: Convert feed-related protocols.
  resolvedUrl = resolveFeedProtocol(resolvedUrl)

  // Step 3: Fix malformed HTTP/HTTPS protocols.
  resolvedUrl = fixMalformedProtocol(resolvedUrl)

  // Step 4: Resolve relative URLs if base is provided.
  if (base) {
    const resolved = parseUrl(resolvedUrl, base)

    if (!resolved) {
      return
    }

    // An absolute http(s) href needs no protocol repair and reparsing it changes nothing, so return
    // it directly.
    if (isHttpUrl(resolved)) {
      return resolved.href
    }

    resolvedUrl = resolved.href
  }

  // Step 5: Add protocol if missing (handles both // and bare domains).
  resolvedUrl = addMissingProtocol(resolvedUrl)

  // Step 6: Validate and reject non-HTTP(S) protocols.
  const parsed = parseUrl(resolvedUrl)

  if (!parsed || !isHttpUrl(parsed)) {
    return
  }

  return parsed.href
}

const decodeAndNormalizeEncoding = (value: string): string => {
  if (!value.includes('%')) {
    return value
  }

  // Decodes unnecessarily percent-encoded characters and normalizes encoding to uppercase.
  return value.replace(/%([0-9A-Fa-f]{2})/g, (_match, hex) => {
    const charCode = Number.parseInt(hex, 16)
    const char = String.fromCharCode(charCode)

    // Decode if it's a safe character that doesn't need encoding.
    if (safePathCharsRegex.test(char)) {
      return char
    }

    // Keep encoded but normalize to uppercase.
    return `%${hex.toUpperCase()}`
  })
}

// Applies the form-urlencoded rules for a key by hand. `new URLSearchParams(pair)` gives the same
// answer, but costs about 0.23µs more per pair for building a whole parser around one string.
const decodeQueryKey = (pair: string): string => {
  const key = pair.split('=')[0].replace(plusRegex, ' ')

  try {
    return decodeURIComponent(key)
  } catch {
    return key
  }
}

// Orders two pairs by their decoded key, comparing code units the way searchParams.sort does.
const compareQueryPairs = (a: string, b: string): number => {
  const keyA = decodeQueryKey(a)
  const keyB = decodeQueryKey(b)

  if (keyA < keyB) {
    return -1
  }

  if (keyA > keyB) {
    return 1
  }

  return 0
}

// Lowercases the literal characters of a pair while leaving percent escapes alone, so the raw
// encoding survives. Escapes keep their uppercase hex, which normalizeEncoding expects.
const lowercaseQueryPair = (pair: string): string => {
  return pair.replace(percentEscapeOrLettersRegex, (match) => {
    return match.startsWith('%') ? match : match.toLowerCase()
  })
}

export const normalizeUrl = (url: string, options: NormalizeOptions): string => {
  try {
    const parsed = new URL(url)

    // Unicode normalization.
    if (options.normalizeUnicode) {
      parsed.hostname = parsed.hostname.normalize('NFC')
      parsed.pathname = parsed.pathname.normalize('NFC')
    }

    // Strip authentication.
    if (options.stripAuthentication) {
      parsed.username = ''
      parsed.password = ''
    }

    // Strip www prefix.
    if (options.stripWww) {
      parsed.hostname = stripWww(parsed.hostname)
    }

    // Strip hash/fragment.
    if (options.stripHash) {
      parsed.hash = ''
    }

    // Handle pathname normalization.
    let pathname = parsed.pathname

    // Normalize percent encoding (decode unnecessarily encoded chars, uppercase hex).
    if (options.normalizeEncoding) {
      pathname = decodeAndNormalizeEncoding(pathname)
    }

    // Collapse multiple slashes.
    if (options.collapseSlashes) {
      pathname = pathname.replace(/\/+/g, '/')
    }

    // Handle trailing slash.
    if (options.stripTrailingSlash && pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1)
    }

    // Handle single slash (root path).
    if (options.stripRootSlash && pathname === '/') {
      pathname = ''
    }

    parsed.pathname = pathname

    // Strip entire query string.
    if (options.stripQuery) {
      parsed.search = ''
    }

    // Query parameters are edited as raw `key=value` pairs. Going through searchParams instead
    // would re-serialize the whole query as form data on any write, so a query a server routes on
    // literally, like `?/feeds/atom10.xml`, would come back as `?%2Ffeeds%2Fatom10.xml=` and stop
    // resolving to the feed.
    if (parsed.search && (options.stripQueryParams || options.lowercaseQuery)) {
      let pairs = parsed.search.slice(1).split('&')

      // Remove tracking/specified parameters (case-insensitive).
      if (options.stripQueryParams) {
        const strippedSet = getStrippedParamsSet(options.stripQueryParams)
        pairs = pairs.filter((pair) => !strippedSet.has(decodeQueryKey(pair).toLowerCase()))
      }

      // Lowercase query parameters.
      if (options.lowercaseQuery) {
        pairs = pairs.map(lowercaseQueryPair)
      }

      parsed.search = pairs.join('&')
    }

    // Sort query parameters. A query holding one pair is already in order, so only a query with a
    // separator is worth splitting. Empty pairs go out first, or they sort ahead of everything and
    // turn `?b=1&` into `?&b=1`.
    if (options.sortQueryParams && parsed.search.includes('&')) {
      const pairs = parsed.search.slice(1).split('&').filter(Boolean)
      parsed.search = pairs.sort(compareQueryPairs).join('&')
    }

    // Remove empty query string.
    if (options.stripEmptyQuery && parsed.href.endsWith('?')) {
      parsed.search = ''
    }

    // Build result URL.
    let result = parsed.href

    // Strip root slash: URL.href always includes "/" for root paths.
    if (options.stripRootSlash && result === `${parsed.origin}/`) {
      result = parsed.origin
    }

    // Strip protocol for comparison.
    if (options.stripProtocol) {
      result = result.replace(protocolPrefixRegex, '')
    }

    return result
  } catch {
    return url
  }
}

export const stripWww = (hostname: string): string => {
  return hostname.replace(wwwPrefixRegex, '')
}

// URL.hostname wraps an IPv6 address in brackets, so they are accepted here.
export const isIpAddress = (hostname: string): boolean => {
  return ipv4Regex.test(hostname) || ipv6Regex.test(hostname.replace(ipv6BracketsRegex, ''))
}

// Two-label public suffixes take the form generic-second-level under a country code: co.uk,
// com.au, edu.pl. Matching the shape covers the common ones without carrying the list.
const genericSecondLevels = [
  'ac',
  'co',
  'com',
  'edu',
  'go',
  'gob',
  'gov',
  'id',
  'ne',
  'net',
  'or',
  'org',
]

// The name a site owner registered, plus its public suffix, so every subdomain of a hosting
// platform resolves to one name. Never returns more labels than the host it came from.
export const getRegistrableDomain = (url: string | URL): string | undefined => {
  const hostname = parseUrl(url)?.hostname

  if (!hostname) {
    return
  }

  if (isIpAddress(hostname)) {
    return hostname
  }

  const parts = hostname.split('.')

  if (parts.length <= 2) {
    return hostname
  }

  const [secondLevel, topLevel] = parts.slice(-2)
  const labels = topLevel.length === 2 && genericSecondLevels.includes(secondLevel) ? 3 : 2

  return parts.slice(-labels).join('.')
}
